# PingPongThrower firmware configuration (MicroPython, Raspberry Pi Pico 2 W / WH).
# Everything a builder may need to tune lives here. Pin numbers are GPIO numbers
# (GPn), not physical pin numbers — see docs/wiring.md for the physical pins.

# --- POC test phase (docs/POC.md) --------------------------------------------
# Build and test the robot in stages; the firmware only drives what is fitted.
#   1 head      : wheel motors only, head clamped on the bench, phone remote,
#                 balls dropped in by hand
#   2 throw rig : the same, with the head hung in the cheeks on the bench plate
#   3 feed      : + SG90 escapement (FEED / one ball)
#   4 aim       : + MG90S swing turret (sweep, L-C-R, random)
#   5 panel     : + buttons, knobs and READY LED = the finished robot
PHASE = 5

# --- motor driver: DRV8833 ---------------------------------------------------
PIN_TOP_IN1 = 2          # AIN1  (physical pin 4)
PIN_TOP_IN2 = 3          # AIN2  (pin 5)
PIN_BOT_IN1 = 4          # BIN1  (pin 6)
PIN_BOT_IN2 = 5          # BIN2  (pin 7)
PIN_DRV_SLEEP = 6        # nSLEEP / EEP: high = driver enabled (pin 9)
PIN_DRV_FAULT = 7        # nFAULT / ULT: low = over-current or over-heat (pin 10)

MOTOR_PWM_HZ = 20_000    # above hearing range
TOP_REVERSED = True      # the two wheels must spin in opposite directions
BOT_REVERSED = False     # (flip these instead of re-soldering motor wires)
MIN_DUTY = 0.30          # SPEED knob fully left (N20s stall below ~0.2 with a wheel)
MAX_DUTY = 1.00          # SPEED knob fully right
SPIN_MAX = 0.45          # SPIN knob end stops: ±45 % speed difference top/bottom
SPIN_DEADBAND = 0.06     # knob region around the centre that means "no spin"
RAMP_PER_S = 0.8         # soft start: duty change per second (protects AA cells)
SPINUP_S = 1.2           # extra settle time before the first ball

# --- servos (SG90 / MG90S: 500–2500 µs ≈ 0–180°) -----------------------------
PIN_SWING_SERVO = 14     # pin 19
PIN_FEED_SERVO = 15      # pin 20 (same PWM slice, both 50 Hz)
SERVO_HZ = 50
SERVO_MIN_US = 500
SERVO_MAX_US = 2500

SWING_CENTER = 90        # servo angle that points the head straight ahead
SWING_WIDTH = 25         # default sweep half-width in degrees (max SWING_LIMIT)
SWING_LIMIT = 35         # mechanical limit of the turret (do not exceed)
SWING_PERIOD_S = 4.0     # full left-right-left time in SWEEP mode
SWING_SETTLE_S = 0.35    # time the head gets to reach a new aim before a ball

FEED_CENTER = 90         # rocker neutral (both fingers half in)
FEED_ALPHA = 18          # rocker swing each way (matches esc_alpha in the CAD)
FEED_RELEASE_S = 0.28    # how long the lower finger stays out per ball
FEED_INTERVAL_MIN = 0.8  # RATE knob fully right: one ball every 0.8 s
FEED_INTERVAL_MAX = 5.0  # RATE knob fully left: one ball every 5 s

# --- buttons, LED, knobs -----------------------------------------------------
PIN_BTN_MOTORS = 16      # pin 21, button to GND (internal pull-up)
PIN_BTN_SWING = 17       # pin 22
PIN_BTN_FEED = 18        # pin 24
PIN_LED_READY = 19       # pin 25, LED + 220 Ω to GND
LONG_PRESS_S = 0.8
DEBOUNCE_MS = 30

PIN_POT_SPEED = 26       # ADC0, pin 31
PIN_POT_SPIN = 27        # ADC1, pin 32
PIN_POT_RATE = 28        # ADC2, pin 34
POT_SMOOTH = 0.15        # exponential smoothing factor per 10 ms tick
POT_PICKUP = 0.05        # after a phone change, a knob takes over once moved this much

# --- Wi-Fi phone control (Pico 2 W) ------------------------------------------
WIFI_ENABLED = True
WIFI_SSID = "PingPongThrower"
WIFI_PASSWORD = "pingpong123"   # ≥ 8 characters; change it
WIFI_PORT = 80

CONTROL_HZ = 100
