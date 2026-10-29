# Cody’s Arduino launcher: analysis and proposed control PCB

Source: [codyhsu, Mobile01, 9 August 2019](https://www.mobile01.com/topicdetail.php?f=696&t=5867234). Inspected 27 October 2026, including the photographed parts list, wiring overview, assembled controller and complete prototype. Page 2 contains replies, not additional design files in the retrieved version.

The second website tab is available at `?launcher=mobile01`. Its diagrams are explanatory reconstructions. The control breakout and GPIO map are new proposals; they are not the author’s PCB or verified original firmware assignments.

## Source evidence

| Evidence                                                                                                         | What it establishes                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Parts table](https://attach.mobile01.com/attach/201908/mobile01-648702c64fc3497936b695ff3c3013fb.jpg)           | Mega 2560, L293D shield, 1:220 feeder motor, MG90S servo, SS-5GL switch, three B10K pots and knobs, HX1838/NEC IR set, passive buzzer, LM2596S, battery accessories, two launch motors, tire set and reused structure |
| [Wiring overview](https://attach.mobile01.com/attach/201908/mobile01-701cd1c7b89264b9347baedd1e138310.jpg)       | Motor shield, servo, ball switch, IR receiver, buzzer and three analog controls; exact GPIO labels are not reliably legible                                                                                           |
| [Controller photograph](https://attach.mobile01.com/attach/201908/mobile01-150dbf04c77ef777777047bf131995a1.jpg) | Mega and shield in a reused enclosure, wired knobs, receiver, battery holder and breadboard construction                                                                                                              |
| [Whole prototype](https://attach.mobile01.com/attach/201908/mobile01-c4314842cb29287db5d2d39f2102e488.jpg)       | Bucket hopper, wood frame, tube, launch wheels and external control box                                                                                                                                               |

The source’s brief describes rotary feeding, ball-detected aiming and a rotatable launch head. Its library notes move IRremote 2.2.3 to Timer4 and restrict Servo to Timer5. AFMotor v1 and Tone are also named. No complete sketch, dimensioned CAD or manufacturing PCB files were found in the inspected material. Historical prices and battery capacity claims are not verified purchasing specifications.

## Mechanism interpretation

Gravity fills the rotary feeder. Its geared motor advances a ball into the tube. The microswitch detects ball presence; it does not measure velocity. The tube delivers the ball to two driven tire surfaces. Their surface motion must carry the ball toward the exit. The servo acts on a hinge/linkage to change the aiming angle.

For an ideal symmetric no-slip wheel pair, average contact speed relates to translation and contact-speed difference to spin. Real tire compliance, gap, slip and motor droop matter. Equal PWM settings do not establish equal rim speeds or a spin-free shot. The illustration is not a dimensioned model; measure clearances, wheel gap and structural loads on a prototype.

## Proposed connections

[Connection CSV](downloads/mobile01-connections.csv) and [system/net-label schematic](assets/mobile01/schematic.svg) define the proposal. The source wiring image is retained as a separate external reference.

| Function                                | Proposed assignment                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Feed, speed, sweep potentiometer wipers | A0, A1, A2; pot ends to logic 5 V and GND                                                      |
| Ball switch                             | D22 to NO, COM to GND; INPUT_PULLUP and firmware debounce                                      |
| IR module output                        | D24; module supply from logic 5 V, subject to its specification                                |
| Passive buzzer driver input             | D26; external 5 V module must accept logic pulses, not an internally oscillating active buzzer |
| Servo signal                            | D9; servo power comes directly from a separate regulated supply                                |
| Left wheel, right wheel, feeder         | Shield M1, M2, M3 respectively; M4 unused                                                      |

J1 is a single-row **wired harness**, not a Mega shield header. Its pin order is 1 GND, 2 +5V_LOGIC, 3 FEED_A0, 4 SPEED_A1, 5 SWEEP_A2, 6 BALL_D22, 7 IR_D24, 8 TONE_D26.

J2/J3/J4 each use 1 GND, 2 wiper, 3 +5V_LOGIC. J5 uses 1 GND and 2 BALL_D22. J6/J7 each use 1 GND, 2 +5V_LOGIC, 3 signal. Verify the selected module pin order and build the harness accordingly. This header order does not claim to match a commercial module’s physical connector.

The v1 shield reserves D3/D5/D6/D11 for motor PWM, D4/D7/D8/D12 for its latch, and D9/D10 for servo headers. See [Adafruit’s v1 pin-use reference](https://learn.adafruit.com/adafruit-motor-shield/faq). These pins remain free of the proposed analog and digital controls. A v2 I²C shield is a different driver and firmware interface.

## Power and current

For bench verification, power the Mega by USB. Supply motors through a separately fused and switched supply connected to shield EXT_PWR with the shield power jumper removed. Confirm polarity and motor voltage first. Connect grounds, while keeping supply positives separate. [Adafruit describes this split-supply arrangement](https://learn.adafruit.com/adafruit-motor-shield/power-requirements).

Provide the servo with a separate regulated 5 V supply chosen for its measured peak load. Wire its positive and return directly to that supply; connect the D9 signal and common ground. If using the shield’s servo header, do not connect the external positive to its existing 5 V rail: use a separate harness with only the signal taken from the shield. The control breakout carries neither motor nor servo supply current.

[Adafruit specifies 0.6 A continuous and 1.2 A peak per L293D bridge](https://learn.adafruit.com/adafruit-motor-shield/using-dc-motors). Check startup, stall and combined thermal load before choosing motors or retaining this driver. A heatsink does not change the chip’s electrical rating. If measured currents exceed the driver, a different driver and matching firmware are required.

The source battery holder topology and cell protection are not established. A charger listed for individual cells does not establish a safe assembled-pack charging method. The LM2596S is a buck regulator; verify adequate input headroom and set the output under load before attaching electronics. The guide does not copy an unverified battery circuit.

## PCB deliverables and scope

- [80 × 55 mm KiCad placement draft](downloads/mobile01-control-breakout.kicad_pcb): two copper layers declared, seven control headers, two capacitors, four 3.2 mm mounting holes, and named pad nets.
- [Placement drawing](assets/mobile01/pcb.svg): generated from the same coordinates as the board.
- [Pad-to-net CSV](downloads/mobile01-pcb-netlist.csv): intended connectivity for every electrical pad.
- C1: 100 nF ceramic; C2: 10 µF, at least 10 V. Both connect logic 5 V to GND; C2 pad 1 is positive. Positions and lead spacing are draft selections.

**The PCB is unrouted and not for fabrication.** There are no copper segments, zones or Gerbers. Footprints are provisional pad geometry; they need component body outlines, courtyards and a fit check. It is a control breakout, not a replacement Mega or motor driver. The existing L293D shield remains off board. A complete KiCad schematic project and ERC/DRC results are not supplied. The SVG and net map document the intended circuit; they are not an electrically validated design.

Before fabrication: choose connector and module variants; confirm footprint and orientation; route signals and logic power with short returns; check capacitor placement; add silkscreen polarity/net labels and assembly clearances; run KiCad DRC and an independent wiring review. Validate the circuit on a breadboard first. No physical performance is claimed.

## Firmware and prototype checks

The original complete firmware is unavailable in the inspected post. Historical library edits do not establish compatibility with current releases. Reproduce a pinned, isolated toolchain before testing the full timer combination; verify that IR decoding, servo pulses, motor PWM and Tone do not interfere.

1. Read pots, switch polarity and debounce with motors disconnected.
2. Check IR remote decoding and the passive buzzer driver separately.
3. Measure each motor’s load and check direction at low duty.
4. Sweep the servo without the mechanical linkage, then set travel limits.
5. Fit wheel/feeder guards and feed one ball before automated aiming.

The website animation is an explanatory sequence, not recovered control logic or timing.

## Assets and maintenance

`data/mobile01.json`, the HTML tables and the CSVs record the same parts and connection proposal. Diagrams and the board are generated by `python3 scripts/create-mobile01-assets.py`; all generated outputs are committed so the normal site build stays Node-only. Source photos are linked, not bundled. No license to redistribute the original photographs was established.
