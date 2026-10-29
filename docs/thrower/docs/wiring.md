# Wiring

![Wiring diagram](wiring.svg)

`wiring.svg` is generated from `firmware/config.py` by `tools/wiring_svg.py`, so the drawing always matches the firmware pin map. Change a pin in `config.py` and `make serve` or `make web` redraws it. The same script draws what is wired in each POC test phase: [phase 1](wiring_p1.svg) (power, Pico, driver, motors, all loose on the bench), [phase 2](wiring_p2.svg) (the same circuit on the bench plate), [phase 3](wiring_p3.svg) (+ feed servo), [phase 4](wiring_p4.svg) (+ swing servo) and [phase 5](wiring_p5.svg) (+ buttons, knobs, LED: the same as this one). See [POC.md](POC.md).

For phases 1 and 2 there is also a 3D view, [the Wiring view](../../index.html?launcher=thrower#thrower-workbench) (open it through `make serve`). It shows the battery box, switch, perfboard, Pico, DRV8833, capacitors, diodes and motors as real-looking parts, with every connection drawn as a coloured cable between the exact pins, in six steps. Its Pico pin numbers come from `firmware/config.py` through `web/data/wiring.json`.

## Netlist

| From | To | Wire | Notes |
|---|---|---|---|
| Battery holder **+** (red) | POWER rocker, terminal 1 | 0.35 mm² red | The holder's own switch can stay ON. |
| POWER rocker, terminal 2 | perfboard screw terminal **BAT+** | 0.35 mm² red | This is the switched **+BAT** rail. |
| Battery holder **−** (black) | perfboard screw terminal **BAT−** | 0.35 mm² black | Common ground. |
| +BAT | DRV8833 **VM** | on board | 470 µF 16 V across VM–GND, right at the module. |
| +BAT | 1N4001 → 1N4001 → Pico **VSYS** (pin 39) | on board | Stripes (cathodes) toward VSYS. 100 µF from VSYS to GND. |
| GND | Pico **GND** (pin 38), DRV8833 **GND** | on board | |
| Pico **GP2** (pin 4) | DRV8833 **AIN1** | on board | Top motor. |
| Pico **GP3** (pin 5) | DRV8833 **AIN2** | on board | |
| Pico **GP4** (pin 6) | DRV8833 **BIN1** | on board | Bottom motor. |
| Pico **GP5** (pin 7) | DRV8833 **BIN2** | on board | |
| Pico **GP6** (pin 9) | DRV8833 **EEP** (nSLEEP) | on board | High = driver on. Some clones label it STBY or SLP. |
| Pico **GP7** (pin 10) | DRV8833 **ULT** (nFAULT) | on board | Open-drain, Pico pull-up. Leave it unconnected if your module lacks the pin. |
| DRV8833 **AOUT1 / AOUT2** | screw terminal → top N20 | 6-core cable, 2 cores | 100 nF ceramic soldered across the motor tabs. |
| DRV8833 **BOUT1 / BOUT2** | screw terminal → bottom N20 | 6-core cable, 2 cores | 100 nF ceramic across the motor tabs. |
| Pico **GP14** (pin 19) | swing servo (MG90S) orange | 3-pin header | Red → +BAT, brown → GND. |
| Pico **GP15** (pin 20) | feed servo (SG90) orange | 6-core cable, 1 core | Red → +BAT, brown → GND (the other 2 cores of the turret cable). |
| Pico **GP16** (pin 21) | MOTORS button → GND | panel lead | Internal pull-up, no resistor. |
| Pico **GP17** (pin 22) | SWING button → GND | panel lead | |
| Pico **GP18** (pin 24) | FEED button → GND | panel lead | |
| Pico **GP19** (pin 25) | 220 Ω → READY LED anode, cathode → GND | panel lead | Flat side of the LED = cathode. |
| Pico **3V3(OUT)** (pin 36) | outer leg of all three pots | panel lead | Not VSYS, not +BAT: the ADC must stay ≤ 3.3 V. |
| Pico **AGND** (pin 33) | other outer leg of all three pots | panel lead | |
| Pico **GP26** (pin 31) | SPEED pot wiper (middle leg) | panel lead | Swap the outer legs if the knob turns the wrong way. |
| Pico **GP27** (pin 32) | SPIN pot wiper | panel lead | |
| Pico **GP28** (pin 34) | RATE pot wiper | panel lead | |

## The turret cable

The head and the feed servo turn with the turret, and everything else stays in the base. A 6-core flexible cable runs from the perfboard up through the arc slot in the lid. Its cores are: top motor ×2, bottom motor ×2, feed-servo signal ×1, and feed-servo +BAT ×1. The feed-servo ground can share the bottom motor's return only if you accept some servo jitter. It's better to use a 7th core or a separate thin wire. Leave a loose loop under the lid so the turret can swing ±35° without pulling it, and tie it down with a cable tie on each side of the slot. If you'd like the head to come off, put a JST-XH plug in each motor pair.

## Why these parts

- **Two diodes in front of VSYS.** The Pico 2 W is rated at 5.5 V maximum on VSYS. Four fresh alkalines read 6.4 V, and two silicon diodes drop about 1.4 V. With NiMH cells (4.8–5.4 V) the Pico still gets about 3.5–4 V, and its buck-boost regulator handles that.
- **470 µF at the driver.** Two motors starting at once pull a few amps for a moment. Without the capacitor, the AA rail dips and can reset the Pico. The firmware also ramps the duty at 0.8 /s for the same reason.
- **Servos on +BAT, not on 3.3 V.** SG90 and MG90S are 4.8–6 V parts. Their signal input accepts 3.3 V logic.
- **Pots on 3V3/AGND.** That keeps the analog readings quiet and inside the ADC range.

## First power-up checklist

1. Before inserting the Pico and driver, apply power and measure: VSYS socket pin ≤ 5.2 V, VM = battery voltage.
2. Insert the Pico, flash the firmware (see README), and leave the motors disconnected. The READY LED should be off and the servos should centre.
3. Connect the motors. Press MOTORS: both wheels must push the ball **forward** at the pinch (the top wheel turns forward at its bottom, the bottom wheel forward at its top). If one turns the wrong way, flip `TOP_REVERSED` or `BOT_REVERSED` in `firmware/config.py`.
4. SWING: with the head straight ahead, adjust `SWING_CENTER` until the aim is centred, then check that ±`SWING_LIMIT` doesn't hit anything.
5. FEED: with the tube empty, check that the rocker rests with the lower finger in and the upper finger out. If not, move `FEED_CENTER` a few degrees or re-seat the horn one spline.
