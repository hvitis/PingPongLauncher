# PingPongThrower hardware layer (MicroPython rp2 port only).
from machine import ADC, PWM, Pin
import time

from logic import LAST_PHASE, features


class Motor:
    """One DRV8833 channel. PWM on IN1 with IN2 low = forward, coast between pulses.
    `reverse` swaps the pins so a wrongly-spinning wheel is fixed in config.py."""

    def __init__(self, in1, in2, freq, reverse=False):
        a, b = (in2, in1) if reverse else (in1, in2)
        self.fwd = PWM(Pin(a), freq=freq, duty_u16=0)
        self.low = PWM(Pin(b), freq=freq, duty_u16=0)

    def set(self, duty):
        duty = max(0.0, min(1.0, duty))
        self.fwd.duty_u16(int(duty * 65535))
        self.low.duty_u16(0)

    def off(self):
        self.set(0.0)


class Servo:
    def __init__(self, pin, cfg):
        self.cfg = cfg
        self.pwm = PWM(Pin(pin), freq=cfg.SERVO_HZ)
        self.last = None

    def angle(self, deg):
        deg = max(0.0, min(180.0, deg))
        if self.last is not None and abs(deg - self.last) < 0.2:
            return
        self.last = deg
        us = self.cfg.SERVO_MIN_US + (self.cfg.SERVO_MAX_US - self.cfg.SERVO_MIN_US) * deg / 180.0
        self.pwm.duty_ns(int(us * 1000))


class Button:
    """Active-low button with debounce. poll() returns None, "short" or "long".
    A long press fires while still held (after LONG_PRESS_S); release then reports nothing."""

    def __init__(self, pin, cfg):
        self.pin = Pin(pin, Pin.IN, Pin.PULL_UP)
        self.cfg = cfg
        self.stable = 1
        self.changed = time.ticks_ms()
        self.down_at = None
        self.long_sent = False

    def poll(self):
        now = time.ticks_ms()
        v = self.pin.value()
        if v != self.stable and time.ticks_diff(now, self.changed) >= self.cfg.DEBOUNCE_MS:
            self.stable = v
            self.changed = now
            if v == 0:
                self.down_at = now
                self.long_sent = False
            else:
                was_long = self.long_sent
                self.down_at = None
                if not was_long:
                    return "short"
        elif v == self.stable:
            self.changed = now
        if self.stable == 0 and self.down_at is not None and not self.long_sent:
            if time.ticks_diff(now, self.down_at) >= int(self.cfg.LONG_PRESS_S * 1000):
                self.long_sent = True
                return "long"
        return None


class Pot:
    def __init__(self, pin, cfg):
        self.adc = ADC(Pin(pin))
        self.k = cfg.POT_SMOOTH
        self.value = self.adc.read_u16() / 65535

    def read(self):
        self.value += self.k * (self.adc.read_u16() / 65535 - self.value)
        return self.value


class Hardware:
    """Only what the configured POC phase has fitted is driven; unfitted pins stay inputs."""

    def __init__(self, cfg):
        self.cfg = cfg
        has = features(getattr(cfg, "PHASE", LAST_PHASE))
        self.sleep = Pin(cfg.PIN_DRV_SLEEP, Pin.OUT, value=1)
        self.fault = Pin(cfg.PIN_DRV_FAULT, Pin.IN, Pin.PULL_UP)
        self.top = Motor(cfg.PIN_TOP_IN1, cfg.PIN_TOP_IN2, cfg.MOTOR_PWM_HZ, cfg.TOP_REVERSED)
        self.bot = Motor(cfg.PIN_BOT_IN1, cfg.PIN_BOT_IN2, cfg.MOTOR_PWM_HZ, cfg.BOT_REVERSED)
        self.swing = Servo(cfg.PIN_SWING_SERVO, cfg) if has["swing"] else None
        self.feed = Servo(cfg.PIN_FEED_SERVO, cfg) if has["feed"] else None
        # before the panel exists, the Pico's on-board LED shows READY
        self.led = Pin(cfg.PIN_LED_READY if has["panel"] else "LED", Pin.OUT, value=0)
        self.buttons = {
            "motors": Button(cfg.PIN_BTN_MOTORS, cfg),
            "swing": Button(cfg.PIN_BTN_SWING, cfg),
            "feed": Button(cfg.PIN_BTN_FEED, cfg),
        } if has["panel"] else {}
        self.pots = {
            "speed": Pot(cfg.PIN_POT_SPEED, cfg),
            "spin": Pot(cfg.PIN_POT_SPIN, cfg),
            "rate": Pot(cfg.PIN_POT_RATE, cfg),
        } if has["panel"] else {}

    def driver_fault(self):
        return self.fault.value() == 0

    def apply(self, out):
        self.top.set(out["top"])
        self.bot.set(out["bot"])
        if self.swing:
            self.swing.angle(out["swing"])
        if self.feed:
            self.feed.angle(out["feed"])
        self.led.value(1 if out["led"] else 0)

    def safe(self):
        self.top.off()
        self.bot.off()
        self.led.value(0)
