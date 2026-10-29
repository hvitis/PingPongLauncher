# Potential improvements

These ideas came from reviewing the concept: the CAD, the firmware, the simulation and the five POC test phases (docs/POC.md). None of them is needed for the robot to work. They are sorted by value for effort, and each says which test phase it fits or which test result would justify it.

**Cost key:** € under 15 zł · €€ 15–60 zł · €€€ more than 60 zł.
**Effort key:** S = an evening · M = a weekend · L = a redesign.

## Do these first (cheap, and they make the tests better)

| # | Improvement | Why | Cost | Effort | When |
|---|---|---|---|---|---|
| 1 | **Watchdog in the firmware** (`machine.WDT`, ~2 s, fed from the control loop) | The phone server runs in the same asyncio loop as the motor control. A request that blocks would freeze the last PWM value and leave the wheels spinning while the buttons do nothing. With a watchdog the Pico resets: its pins float, and the DRV8833's internal pull-downs on IN1/IN2 and nSLEEP stop the motors. | free | S | Phase 1 |
| 2 | **Current and voltage sensor** (INA219 module on I²C, GP0/GP1, in series with the battery) | Phase 1 tests current, heat and brown-out with a meter, by hand. An INA219 puts battery volts and amps on the phone page and logs the peak current at every start. It also makes #3 possible. | € | S | Phase 1 |
| 3 | **Battery-sag compensation** (scale the duty by 6.0 V / V<sub>bat</sub>) | Ball speed now drops as the cells run down: the simulation shows 4.6 V against 6.0 V. Measuring the pack voltage (#2) and scaling the duty keeps SPEED meaning the same ball all session. All four ADC pins are already in use (three pots, plus VSYS on GP29, which is shared with the Wi-Fi chip), so the INA219 is the simplest way to measure the voltage. | free with #2 | S | Phase 1 |
| 4 | **Ball gate at the head exit**: two IR break-beam pairs 20 mm apart (GP8/GP9) | It counts the balls that really leave, catches jams (the feed released but no ball arrived within 300 ms, so it stops and blinks), and measures exit speed: at 7 m/s the ball crosses 20 mm in 2.9 ms, easy to time with an IRQ. That replaces the slow-motion video test in phase 1 and the counting in phase 3. Two more wires through the turret cable. | € | M | Phase 1–3 |
| 5 | **Fit coupon before the long prints** | The head halves are the longest prints. Print one `wheel_hub` and one `motor_clamp` first (about 20 minutes) to check the D-shaft, wheel-stub and N20 fits, and the hole compensation on your printer. | free | S | Before phase 1 |
| 6 | **Reverse-polarity protection and a fuse** (P-MOSFET "ideal diode" or a Schottky in the battery lead, plus a 2 A polyfuse) | One wrong battery swap or a pinched wire in the turret loop would kill the DRV8833 and the servos. | € | S | Phase 1 |
| 7 | **Change the default Wi-Fi password at first boot** | `pingpong123` is in a public repo. Derive it from the Pico's unique ID and print it to the USB console, or make the page ask for a new one. | free | S | Phase 1 |

## Better throwing

| # | Improvement | Why | Cost | Effort | When |
|---|---|---|---|---|---|
| 8 | **Closed-loop wheel speed**: N20s with magnetic encoders, counted by the RP2350's PIO | Same ball every time, whatever the battery level or wheel wear. The rpm dip when a ball passes also shows grip. Needs 4 more signal wires through the turret (8–10 core cable) and 4 GPIOs (GP10–GP13 are free). | €€ | M | If the phase 1 speed varies by more than ~10 % |
| 9 | **More flywheel mass** (brass or steel washers in the hubs, or heavier rims) | The 31 g TT wheels already carry more inertia than most LEGO wheels, but N20s still lose speed per ball, so fast feeding gives uneven balls. More inertia smooths that out, at the cost of a longer spin-up. | € | S | If phase 3 shows the second ball of a quick pair is slower |
| 10 | **Higher-speed option**: 6 V N20s at 6000 rpm | Exit speed tops out around 8 m/s with the 65 mm wheels, which is fine for practice rallies but not for smashes. Larger wheels barely help (69 mm, the largest that fit, adds 6 %). Faster N20s double the rim speed but have less torque per ball. | €€ | S | After phase 1, if you want more pace |
| 11 | **Sidespin**: let the head roll about the launch axis (0–45°), or add a third wheel | Top and bottom wheels only give topspin and backspin. Rolling the wheel pair is how commercial robots make sidespin. It needs another pivot and servo in the head. | €€ | L | Version 2 |
| 12 | **Motorised elevation** (a servo or a worm-geared N20 instead of the lock knob) | Each ball could then be (aim, elevation, speed, spin), which gives real drills: short backspin, then a long topspin. The head needs counterbalancing so a micro servo can hold it. | €€ | L | Version 2 |

## Better feeding

| # | Improvement | Why | Cost | Effort | When |
|---|---|---|---|---|---|
| 13 | **Hopper agitator**: a flexible PETG whisker on the rocker that pokes into the funnel throat each cycle | A 42 mm throat under a heap of 40 mm balls can bridge: balls arch over the opening and nothing falls. The rocker already moves once per ball, so a whisker adds stirring with no extra motor. | free | S | If the phase 3 full-hopper test jams |
| 14 | **Rotary disc feeder** instead of the escapement | A disc with ball pockets under the hopper is the usual commercial design. It tolerates bad balls and bridging better, but it is bigger and needs a geared motor. Consider it only if the escapement fails phase 3 after tuning. | €€ | L | Fallback for phase 3 |

## Power

| # | Improvement | Why | Cost | Effort | When |
|---|---|---|---|---|---|
| 15 | **2S Li-ion (2 × 18650) + 5 V buck for the servos and Pico** | About 22 Wh against about 10 Wh for 4 × NiMH, and much less sag under load. The N20s are 6 V motors, so cap the duty at about 70 % at 8.4 V. Needs a 2S BMS and a USB-C 2S charger board, and the tray needs a holder instead of the AA box. | €€ | M | If phase 5 battery life or sag disappoints |
| 16 | **USB-C power bank instead** (5 V, 3 A) | Simplest charging. Everything runs at 5 V: the N20s then give about 2500 rpm (rim 8.5 m/s), so the robot loses some top speed. | €€ | S | Alternative to #15 |

## Control and use

| # | Improvement | Why | Cost | Effort | When |
|---|---|---|---|---|---|
| 17 | **Drill programs** stored on the Pico and edited on the phone page | A list of balls (speed, spin, aim, delay) to play in order or at random. Firmware only, and logic.py stays unit-testable. Much more useful for training than sweep or random. | free | M | After phase 5 |
| 18 | **Foot switch** (a wired pedal on a 3.5 mm jack to a free GPIO) | Training alone, you need to pause without walking round the table or holding a phone. | € | S | Phase 5 |
| 19 | **Bluetooth gamepad or BLE remote** | The Pico 2 W has BLE. A cheap BLE clicker could do pause and next drill. | € | M | Version 2 |
| 20 | **Remember settings** (last speed, spin, rate, pattern in a small JSON file in flash) | After power-up the robot carries on where you stopped, which matters most when the phone sliders override the knobs. | free | S | Phase 5 |

## Mechanics and build

| # | Improvement | Why | Cost | Effort | When |
|---|---|---|---|---|---|
| 21 | **Table-edge clamp on the tray** | The bench plate has clamp holes but the tray only has rubber feet. A clamp tab that hooks over the table end stops the robot walking at full speed with random swing (phase 4 stability test). | free (printed) | S | If phase 4 shows walking |
| 22 | **Heat-set inserts** for the cheek feet and motor clamps | The M4 cheek screws self-tap into PETG. If you reassemble often (moving between rigs, changing wheels), brass inserts keep the threads crisp. | € | S | Phase 4 |
| 23 | **Wheel-gap cam** instead of slotted holes for the top motor | Setting the squeeze by sliding the clamp is fiddly. An eccentric cam with detents gives a repeatable 0–3 mm squeeze. | free (printed) | M | If phase 1 grip tuning is tedious |
| 24 | **Ball-return net** behind the far end, sloping back toward the robot | The biggest real-world annoyance with any ball robot is collecting balls. | €€ | M | After phase 5 |
| 25 | **Custom PCB** in place of the perfboard (Pico footprint, DRV8833, screw terminals, servo headers, INA219, polarity protection) | After phase 5 the circuit is proven. A small 2-layer board costs a few złoty each, replaces most of the hand wiring and fits the same standoffs (66 × 46 mm pattern). | €€ | M | After phase 5 |

## Things the POC phases should watch for

The CAD checks prove the parts fit and clear each other. These are the questions only the bench can answer, with the improvement to try if the answer is bad:

- **Exit speed lower than the simulation** (it assumes 80 % of the mean rim speed): check grip first (`ball_squeeze`), then #9, then #10.
- **Pico resets when the motors start:** lower `RAMP_PER_S`, add a second 470 µF at the driver, then #15.
- **Speed drifts during a session:** #3, then #8.
- **Hopper jams with a full basket:** #13, then #14.
- **The robot walks on the table:** #21.
- **Feeding is unreliable at a high elevation:** the head has a lead-in for the falling ball, verified by clash checks at −5°, 12.5° and 30°. If balls still catch, reduce `pitch_max` rather than forcing it.
