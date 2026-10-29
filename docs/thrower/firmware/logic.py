# PingPongThrower control logic — pure Python, no hardware imports.
# Runs unchanged on MicroPython (the robot) and CPython (the unit tests).
#
#   inputs  : knob positions 0..1, button events, phone overrides, time
#   outputs : wheel duties (−1..1), swing servo angle, feed servo angle, LED
#
# Time is passed in as seconds (float) so tests can drive it deterministically.
import math

OFF, SWEEP, STEP3, RANDOM = "off", "sweep", "step3", "random"
PATTERNS = (SWEEP, STEP3, RANDOM)
FEATURES = {"feed": 3, "swing": 4, "panel": 5}    # first test phase that has each (docs/POC.md)
LAST_PHASE = max(FEATURES.values())                # the finished robot


def features(phase):
    """Which optional subsystems exist in POC test phase `phase` (1..LAST_PHASE)."""
    return {k: phase >= p for k, p in FEATURES.items()}


def clamp(x, lo, hi):
    return lo if x < lo else hi if x > hi else x


def speed_from_knob(v, cfg):
    """SPEED knob 0..1 → base duty between MIN_DUTY and MAX_DUTY."""
    return cfg.MIN_DUTY + clamp(v, 0.0, 1.0) * (cfg.MAX_DUTY - cfg.MIN_DUTY)


def spin_from_knob(v, cfg):
    """SPIN knob 0..1 → −SPIN_MAX..+SPIN_MAX with a dead band at the centre.
    Positive = top wheel faster = topspin; negative = backspin."""
    s = (clamp(v, 0.0, 1.0) - 0.5) * 2.0
    if abs(s) < cfg.SPIN_DEADBAND:
        return 0.0
    sign = 1.0 if s > 0 else -1.0
    s = (abs(s) - cfg.SPIN_DEADBAND) / (1.0 - cfg.SPIN_DEADBAND)
    return sign * s * cfg.SPIN_MAX


def interval_from_knob(v, cfg):
    """RATE knob 0..1 → seconds between balls (geometric, so slow rates are fine-grained)."""
    v = clamp(v, 0.0, 1.0)
    return cfg.FEED_INTERVAL_MAX * (cfg.FEED_INTERVAL_MIN / cfg.FEED_INTERVAL_MAX) ** v


def wheel_duties(base, spin):
    """Split the base duty into (top, bottom) so the average stays `base`."""
    top = clamp(base * (1.0 + spin), 0.0, 1.0)
    bot = clamp(base * (1.0 - spin), 0.0, 1.0)
    return top, bot


class Ramp:
    """Slew-rate limiter: the motors never jump, which keeps AA cells from sagging."""

    def __init__(self, rate_per_s):
        self.rate = rate_per_s
        self.value = 0.0

    def step(self, target, dt):
        d = self.rate * dt
        if self.value < target:
            self.value = min(target, self.value + d)
        else:
            self.value = max(target, self.value - d)
        return self.value


class Knob:
    """A physical knob that a phone setting can override until the knob is moved."""

    def __init__(self, pickup):
        self.pickup = pickup
        self.raw = 0.5
        self.override = None
        self.raw_at_override = 0.0

    def feed(self, raw):
        self.raw = raw
        if self.override is not None and abs(raw - self.raw_at_override) > self.pickup:
            self.override = None

    def set(self, value):
        self.override = clamp(value, 0.0, 1.0)
        self.raw_at_override = self.raw

    @property
    def value(self):
        return self.raw if self.override is None else self.override


class Thrower:
    def __init__(self, cfg, rng):
        self.cfg = cfg
        self.rng = rng                      # callable → float 0..1
        self.phase = getattr(cfg, "PHASE", LAST_PHASE)
        self.has = features(self.phase)
        self.knobs = {k: Knob(cfg.POT_PICKUP) for k in ("speed", "spin", "rate")}
        self.top = Ramp(cfg.RAMP_PER_S)
        self.bot = Ramp(cfg.RAMP_PER_S)
        self.motors_on = False
        self.motors_since = 0.0
        self.feeding = False
        self.swing_mode = OFF
        self.last_pattern = SWEEP
        self.swing_width = cfg.SWING_WIDTH
        self.swing_period = cfg.SWING_PERIOD_S
        self.swing_angle = 0.0              # offset from centre, degrees
        self.swing_target = 0.0
        self.swing_moved_at = -1e9
        self.step_index = 0
        self.next_ball_at = 0.0
        self.release_until = -1.0           # lower finger out until this time
        self.balls = 0
        self.fault = False
        self.now = 0.0
        self._last = None

    # ---------------- commands (buttons and phone) ----------------
    def press(self, button, long=False):
        if button == "motors":
            if long or self.motors_on:
                self.stop()
            else:
                self.start_motors()
        elif button == "swing" and self.has["swing"]:
            if long:
                i = PATTERNS.index(self.last_pattern) if self.last_pattern in PATTERNS else -1
                self.set_swing(PATTERNS[(i + 1) % len(PATTERNS)])
            else:
                self.set_swing(OFF if self.swing_mode != OFF else self.last_pattern)
        elif button == "feed" and self.has["feed"]:
            if long:
                self.fire_one()
            elif self.feeding:
                self.feeding = False
            else:
                if not self.motors_on:
                    self.start_motors()
                self.feeding = True
                self.next_ball_at = self.now

    def start_motors(self):
        if not self.motors_on:
            self.motors_on = True
            self.motors_since = self.now

    def stop(self):
        self.motors_on = False
        self.feeding = False

    def set_swing(self, mode):
        if not self.has["swing"]:
            mode = OFF
        if mode != OFF:
            self.last_pattern = mode
            self.step_index = -1                            # first ball goes left
        self.swing_mode = mode
        if mode == OFF:
            self._aim(0.0)

    def fire_one(self):
        if self.has["feed"] and self.ready():
            self._release()

    # ---------------- state ----------------
    def targets(self):
        base = speed_from_knob(self.knobs["speed"].value, self.cfg)
        spin = spin_from_knob(self.knobs["spin"].value, self.cfg)
        return wheel_duties(base, spin) if self.motors_on and not self.fault else (0.0, 0.0)

    def ready(self):
        if not self.motors_on or self.fault:
            return False
        t_top, t_bot = self.targets()
        at_speed = abs(self.top.value - t_top) < 0.02 and abs(self.bot.value - t_bot) < 0.02
        return at_speed and self.now - self.motors_since >= self.cfg.SPINUP_S

    def interval(self):
        return max(interval_from_knob(self.knobs["rate"].value, self.cfg),
                   self.cfg.FEED_RELEASE_S + self.cfg.SWING_SETTLE_S)

    # ---------------- internals ----------------
    def _aim(self, offset):
        offset = clamp(offset, -self.cfg.SWING_LIMIT, self.cfg.SWING_LIMIT)
        if offset != self.swing_target:
            self.swing_target = offset
            self.swing_moved_at = self.now

    def _release(self):
        self.release_until = self.now + self.cfg.FEED_RELEASE_S
        self.balls += 1
        # discrete patterns pick the next aim right after a ball leaves
        w = min(self.swing_width, self.cfg.SWING_LIMIT)
        if self.swing_mode == STEP3:
            self.step_index = (self.step_index + 1) % 4          # L, C, R, C ...
            self._aim((-w, 0.0, w, 0.0)[self.step_index])
        elif self.swing_mode == RANDOM:
            self._aim((self.rng() * 2.0 - 1.0) * w)

    def update(self, now):
        """Advance to time `now` (seconds). Returns the output dict."""
        dt = 0.0 if self._last is None else max(0.0, now - self._last)
        self._last = now
        self.now = now

        t_top, t_bot = self.targets()
        self.top.step(t_top, dt)
        self.bot.step(t_bot, dt)

        w = min(self.swing_width, self.cfg.SWING_LIMIT)
        if self.swing_mode == SWEEP:
            phase = 2.0 * math.pi * now / max(0.5, self.swing_period)
            self.swing_target = w * math.sin(phase)
            self.swing_moved_at = -1e9                           # continuous: never "settling"
        self.swing_angle = self.swing_target

        if self.feeding and not self.motors_on:
            self.feeding = False
        if (self.feeding and self.ready() and now >= self.next_ball_at
                and now >= self.release_until and now - self.swing_moved_at >= self.cfg.SWING_SETTLE_S):
            self._release()
            self.next_ball_at = now + self.interval()

        releasing = now < self.release_until
        feed_angle = self.cfg.FEED_CENTER + (-self.cfg.FEED_ALPHA if releasing else self.cfg.FEED_ALPHA)

        if not self.motors_on:
            led = False
        elif self.ready():
            led = not releasing                                  # flicker per ball
        else:
            led = int(now * 4) % 2 == 0                          # blinking while spinning up
        return {
            "top": self.top.value, "bot": self.bot.value,
            "swing": self.cfg.SWING_CENTER + self.swing_angle,
            "feed": feed_angle,
            "led": led,
        }

    def status(self):
        t_top, t_bot = self.targets()
        return {
            "motors": self.motors_on, "ready": self.ready(), "feeding": self.feeding,
            "swing": self.swing_mode, "pattern": self.last_pattern,
            "speed": round(self.knobs["speed"].value, 3), "spin": round(self.knobs["spin"].value, 3),
            "rate": round(self.knobs["rate"].value, 3), "width": self.swing_width,
            "period": self.swing_period, "interval": round(self.interval(), 2),
            "top": round(self.top.value, 3), "bot": round(self.bot.value, 3),
            "target_top": round(t_top, 3), "target_bot": round(t_bot, 3),
            "aim": round(self.swing_angle, 1), "balls": self.balls, "fault": self.fault,
            "phase": self.phase, "has": self.has,
        }
