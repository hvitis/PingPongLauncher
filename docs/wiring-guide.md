# Wiring and commissioning

The spreadsheet specifies three PWM controllers, two 12 V 550 motors, one 12 V geared motor, and a 12 V / 3 A supply. No source schematic, controller model number, current measurements, or terminal pinout is supplied.

## Functional topology

```text
Enclosed, isolated 12 V DC supply
  +12 V ── DC switch / suitable protection ──┬── PWM 1 supply input ── output → left launch motor
                                            ├── PWM 2 supply input ── output → right launch motor
                                            └── PWM 3 supply input ── output → geared feed motor
     0 V ────────────────────────────────────── return to each PWM supply input
```

Each controller has one motor. The three controller supply inputs connect in parallel. Motor outputs do not connect together. Each motor connects to its controller output terminals, not directly to the shared return unless the controller documentation explicitly requires it.

This diagram describes functions. It does not specify terminal order, fuse placement or values, connector pinout, switch rating, or conductor ratings.

## Before wiring

1. Get the terminal diagram for each selected controller.
2. Confirm the controller voltage and continuous-current ratings.
3. Confirm motor running and stall currents from documentation or controlled measurements.
4. Size the supply, connectors, switch, wire, and branch protection for the actual system.
5. Keep mains wiring inside an enclosed, isolated supply.

The original CAD contains a power-supply envelope inside the base. This envelope does not establish electrical insulation or approve an exposed supply. An external enclosed adapter can require a different inlet and mounting arrangement.

The source suggests 0.5 mm² wire and a 3 A supply. Neither suggestion establishes a verified current budget. A starting or stalled motor can draw substantially more current than a running motor.

## Connect with power disconnected

1. Disconnect the supply from the launcher.
2. Set all three speed controls to zero.
3. Identify the positive and negative supply terminals on each controller.
4. Identify each controller output pair from its documentation.
5. Connect one motor to each output pair.
6. Connect the three supply inputs in parallel through the selected protection.
7. Put a suitable DC-rated switch in the positive DC supply lead.
8. Add insulation and strain relief at each connection.
9. Keep leads clear of the feeder, wheels, gears, and tilt support.
10. Inspect polarity and continuity before power-on.

## First power-on

WARNING: Keep hands, clothing, and loose leads clear of the wheels and feeder. Moving parts can trap fingers.

1. Secure the launcher and fit guards around accessible rotating parts.
2. Keep the hopper empty and the outlet clear.
3. Use a current-limited supply for the initial checks.
4. Run one motor at a time at its lowest stable setting.
5. Confirm that both wheel contact surfaces move toward the outlet.
6. Confirm that the feeder moves balls toward the wheels.
7. Stop power if a part binds, vibrates, loosens, or overheats.
8. Record the measured current and stable control settings.

If a motor direction is wrong, disconnect power before changing its wiring. Confirm that reversing its output leads is compatible with the selected motor and controller.

## One-ball trial

1. Aim at a clear table or a suitable catch net.
2. Wear eye protection.
3. Keep hands clear of all moving parts.
4. Start the launch wheels before starting the feeder.
5. Introduce one ball.
6. Stop the feeder before stopping the launch wheels.
7. Disconnect power before any mechanical adjustment.

The first trial establishes observations for your build. It does not validate a launch rate, range, lifetime, or continuous-duty rating.
