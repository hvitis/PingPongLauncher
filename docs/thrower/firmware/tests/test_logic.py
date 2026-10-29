"""Unit tests for the pure control logic (run on a PC: make test)."""
import sys
import types
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import config as cfg  # noqa: E402
import logic  # noqa: E402
from logic import Thrower, interval_from_knob, speed_from_knob, spin_from_knob, wheel_duties  # noqa: E402
from web import handle_api  # noqa: E402


def run(t, until, start, dt=0.01):
    """Step the thrower from `start` to `until` seconds; return the last output."""
    out = None
    n = int(round((until - start) / dt))
    for i in range(1, n + 1):
        out = t.update(start + i * dt)
    return out


class Mapping(unittest.TestCase):
    def test_speed_range(self):
        self.assertAlmostEqual(speed_from_knob(0, cfg), cfg.MIN_DUTY)
        self.assertAlmostEqual(speed_from_knob(1, cfg), cfg.MAX_DUTY)

    def test_spin_deadband_and_sign(self):
        self.assertEqual(spin_from_knob(0.5, cfg), 0.0)
        self.assertEqual(spin_from_knob(0.52, cfg), 0.0)
        self.assertAlmostEqual(spin_from_knob(1.0, cfg), cfg.SPIN_MAX)
        self.assertAlmostEqual(spin_from_knob(0.0, cfg), -cfg.SPIN_MAX)

    def test_topspin_means_top_faster(self):
        top, bot = wheel_duties(0.6, spin_from_knob(1.0, cfg))
        self.assertGreater(top, bot)
        self.assertLessEqual(top, 1.0)

    def test_interval_monotonic(self):
        self.assertAlmostEqual(interval_from_knob(0, cfg), cfg.FEED_INTERVAL_MAX)
        self.assertAlmostEqual(interval_from_knob(1, cfg), cfg.FEED_INTERVAL_MIN)
        self.assertGreater(interval_from_knob(0.3, cfg), interval_from_knob(0.7, cfg))


class Behaviour(unittest.TestCase):
    def setUp(self):
        self.t = Thrower(cfg, rng=lambda: 0.9)
        for k in ("speed", "spin", "rate"):
            self.t.knobs[k].feed(0.5)
        self.t.update(0.0)

    def test_soft_start_and_ready(self):
        self.t.press("motors")
        out = self.t.update(0.1)
        self.assertLess(out["top"], 0.1)                     # ramping, not jumping
        self.assertFalse(self.t.ready())
        run(self.t, 3.0, 0.1)
        self.assertTrue(self.t.ready())
        self.assertTrue(self.t.status()["motors"])

    def test_motors_button_toggles_and_stops_feed(self):
        self.t.press("feed")                                 # feed also starts motors
        self.assertTrue(self.t.motors_on and self.t.feeding)
        self.t.press("motors")
        self.assertFalse(self.t.motors_on or self.t.feeding)
        out = run(self.t, 3.0, 0.0)
        self.assertEqual(out["top"], 0.0)

    def test_no_ball_before_ready(self):
        self.t.press("feed")
        run(self.t, 0.5, 0.0)
        self.assertEqual(self.t.balls, 0)

    def test_feed_rate(self):
        self.t.knobs["rate"].feed(1.0)                       # fastest: one per 0.8 s
        self.t.press("feed")
        run(self.t, 10.0, 0.0)
        # ready after ~1.2-1.5 s, then every 0.8 s
        self.assertTrue(9 <= self.t.balls <= 12, self.t.balls)

    def test_release_pulse(self):
        self.t.press("motors")
        run(self.t, 3.0, 0.0)
        self.t.press("feed", long=True)                      # single ball
        out = self.t.update(3.01)
        self.assertEqual(out["feed"], cfg.FEED_CENTER - cfg.FEED_ALPHA)
        out = run(self.t, 3.5, 3.01)
        self.assertEqual(out["feed"], cfg.FEED_CENTER + cfg.FEED_ALPHA)
        self.assertEqual(self.t.balls, 1)

    def test_long_press_motors_is_emergency_stop(self):
        self.t.press("feed")
        self.t.press("motors", long=True)
        self.assertFalse(self.t.motors_on)

    def test_sweep_stays_inside_limits(self):
        self.t.swing_width = 90                              # asks for too much
        self.t.set_swing(logic.SWEEP)
        lo, hi = 999, -999
        for i in range(1000):
            a = self.t.update(i * 0.01)["swing"] - cfg.SWING_CENTER
            lo, hi = min(lo, a), max(hi, a)
        self.assertGreaterEqual(lo, -cfg.SWING_LIMIT - 1e-9)
        self.assertLessEqual(hi, cfg.SWING_LIMIT + 1e-9)
        self.assertGreater(hi, cfg.SWING_LIMIT - 1)

    def test_step3_cycles_left_centre_right(self):
        self.t.set_swing(logic.STEP3)
        self.t.knobs["rate"].feed(1.0)
        self.t.press("feed")
        aims, last = [], None
        for i in range(1, 1200):
            a = round(self.t.update(i * 0.01)["swing"] - cfg.SWING_CENTER)
            if a != last:
                aims.append(a)
                last = a
        w = cfg.SWING_WIDTH
        self.assertEqual(aims[:5], [0, -w, 0, w, 0])

    def test_swing_button(self):
        self.t.press("swing")
        self.assertEqual(self.t.swing_mode, logic.SWEEP)
        self.t.press("swing", long=True)
        self.assertEqual(self.t.swing_mode, logic.STEP3)
        self.t.press("swing")
        self.assertEqual(self.t.swing_mode, logic.OFF)
        self.t.press("swing")
        self.assertEqual(self.t.swing_mode, logic.STEP3)    # remembers the pattern

    def test_driver_fault_cuts_motors(self):
        self.t.press("motors")
        run(self.t, 3.0, 0.0)
        self.t.fault = True
        out = run(self.t, 5.0, 3.0)
        self.assertEqual(out["top"], 0.0)
        self.assertFalse(self.t.ready())


class PhoneOverride(unittest.TestCase):
    def test_phone_value_holds_until_knob_moves(self):
        t = Thrower(cfg, rng=lambda: 0.5)
        t.knobs["speed"].feed(0.2)
        handle_api(t, "/api/set?speed=0.9")
        t.knobs["speed"].feed(0.21)                          # knob noise: phone still wins
        self.assertAlmostEqual(t.knobs["speed"].value, 0.9)
        t.knobs["speed"].feed(0.4)                           # knob turned: it takes over
        self.assertAlmostEqual(t.knobs["speed"].value, 0.4)

    def test_api_commands(self):
        t = Thrower(cfg, rng=lambda: 0.5)
        s = handle_api(t, "/api/cmd?b=motors")
        self.assertTrue(s["motors"])
        s = handle_api(t, "/api/swing?mode=random")
        self.assertEqual(s["swing"], "random")
        s = handle_api(t, "/api/set?width=80&period=0.1")
        self.assertEqual(s["width"], cfg.SWING_LIMIT)
        self.assertEqual(s["period"], 1.0)


def phase_cfg(phase):
    """config.py with PHASE replaced, as a POC build would set it."""
    return types.SimpleNamespace(**{**{k: getattr(cfg, k) for k in dir(cfg) if k.isupper()}, "PHASE": phase})


class Phases(unittest.TestCase):
    """POC test phases: the firmware must ignore subsystems that are not fitted yet."""

    def ready_thrower(self, phase):
        t = Thrower(phase_cfg(phase), rng=lambda: 0.9)
        t.update(0.0)
        t.press("motors")
        run(t, 3.0, 0.0)
        return t

    def test_feature_table(self):
        none = {"feed": False, "swing": False, "panel": False}
        self.assertEqual(logic.features(1), none)
        self.assertEqual(logic.features(2), none)
        self.assertEqual(logic.features(3), {"feed": True, "swing": False, "panel": False})
        self.assertEqual(logic.features(4), {"feed": True, "swing": True, "panel": False})
        self.assertEqual(logic.features(5), {"feed": True, "swing": True, "panel": True})
        self.assertEqual(cfg.PHASE, logic.LAST_PHASE, "ship config.py at the full-robot phase")

    def test_phases_1_2_throw_but_never_feed_or_swing(self):
        for phase in (1, 2):
            with self.subTest(phase=phase):
                self.check_motors_only(phase)

    def check_motors_only(self, phase):
        t = self.ready_thrower(phase)
        self.assertTrue(t.ready())
        out0 = t.update(3.01)
        t.press("feed")
        t.press("feed", long=True)
        t.press("swing")
        handle_api(t, "/api/swing?mode=sweep")
        out = run(t, 6.0, 3.01)
        self.assertEqual(t.balls, 0)
        self.assertFalse(t.feeding)
        self.assertEqual(t.swing_mode, logic.OFF)
        self.assertEqual(out["swing"], cfg.SWING_CENTER)
        self.assertEqual(out["feed"], out0["feed"])          # rocker never commanded to release
        self.assertTrue(out["led"])                          # on-board LED shows READY
        s = t.status()
        self.assertEqual((s["phase"], s["has"]["feed"], s["has"]["swing"]), (phase, False, False))

    def test_phase3_feeds_without_swinging(self):
        t = self.ready_thrower(3)
        t.press("feed")
        t.press("swing")
        run(t, 8.0, 3.0)
        self.assertGreaterEqual(t.balls, 2)
        self.assertEqual(t.swing_mode, logic.OFF)
        self.assertEqual(t.swing_angle, 0.0)

    def test_phase4_swings(self):
        t = self.ready_thrower(4)
        t.press("swing")
        self.assertEqual(t.swing_mode, logic.SWEEP)
        run(t, 4.0, 3.0)
        self.assertNotEqual(t.swing_angle, 0.0)


if __name__ == "__main__":
    unittest.main()
