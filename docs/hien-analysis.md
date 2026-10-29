# Nguyen Van Hien’s BLE table tennis robot: analysis and proposed power/servo distribution

Source: [Nguyen Van Hien, YouTube, 1 January 2020](https://www.youtube.com/watch?v=-pSiuAdUKP4). Inspected 27 October 2026, including the full video demonstration (172 s), Autodesk Fusion 360 exploded CAD animation (`ASM v145`), component breakdown captions, iPhone BLE app interface, and practice shot accuracy tests. Creator contact: `phuongchiphysics@gmail.com`.

The third website tab is available at `?launcher=hien`. Vector diagrams and mechanism models are explanatory reconstructions. The power and servo breakout PCB and pin map are proposed additions by this guide; they are not the author's commercial manufacturing files.

## Source evidence and locators

| Evidence | Locator | What it establishes | Evidence class |
| --- | --- | --- | --- |
| DT750 Outrunner motors | Description; [01:01](https://www.youtube.com/watch?v=-pSiuAdUKP4&t=61s) | Twin hexTronik DT750 750KV brushless outrunner motors directly drive the upper and lower launch wheels. | Documented |
| BaneBots orange rubber wheels | Description; [01:02](https://www.youtube.com/watch?v=-pSiuAdUKP4&t=62s) | RobotShop RB-Ban-91: 2-7/8" BaneBots wheels with 40A middle-soft shore durometer orange elastomer tires. | Documented |
| Hex wheel hubs | Description; [01:04](https://www.youtube.com/watch?v=-pSiuAdUKP4&t=64s) | RobotShop Moyeu Hex 4mm: connects 4 mm motor shafts to 1/2" hex wheel hubs. | Documented |
| 4 Servomotors | Description; [01:06](https://www.youtube.com/watch?v=-pSiuAdUKP4&t=66s) | TowerPro MG995 / MG996 metal-gear high-torque standard servos: 2 for ball feeding and 2 for horizontal and vertical direction. | Documented |
| 250W PC ATX power supply | Description; [01:14](https://www.youtube.com/watch?v=-pSiuAdUKP4&t=74s) | Repurposed desktop computer ATX power supply housed inside the wooden base box, providing separate heavy 12 V and 5 V rails. | Documented |
| Arduino Mega 2560 Card | Description; [01:19](https://www.youtube.com/watch?v=-pSiuAdUKP4&t=79s) | ATmega2560 board with hardware UARTs and multiple 16-bit hardware timer PWM channels for jitter-free multi-servo control. | Documented |
| HM-10 BLE 4.0 module | Description; [01:24](https://www.youtube.com/watch?v=-pSiuAdUKP4&t=84s) | Bluetooth Low Energy 4.0 transceiver module interfacing with the creator's iPhone. | Documented |
| iPhone "Ping Robot" app | Video; [01:25–01:30](https://www.youtube.com/watch?v=-pSiuAdUKP4&t=85s) | Custom iOS app with Disconnect/Connect, Speed Down/Up, Hit Softer/Harder, Left/Swing/Right, Top Spin/Back Spin, Attack/Service, and real-time terminal log. | Documented |
| Turntable bearing | Description; [00:20](https://www.youtube.com/watch?v=-pSiuAdUKP4&t=20s) | Aluminum Lazy Susan ring bearing (Amazon B07F3VHGKX) supporting the vertical gimbal load on top of the wooden box. | Documented |
| Fusion 360 Assembly | CAD; [00:46–00:59](https://www.youtube.com/watch?v=-pSiuAdUKP4&t=46s) | `ASM v145` browser tree establishing components: `feed_curve v105`, `motor_mount_tab_ext v58`, `canon v54`, `hand_servo v64`, `base_leg v15`, `wheel_banebots v2`, `hub_hex v3`, `motor_mount_ini_with_bearing`, `DT750 v5`, `feed_base_with_servo v52`, `pusher_with_servo v12`, `box v5`, `cup v2`, `base_mounted v9`. | Documented |
| Service & Attack test modes | Video; [01:36–02:45](https://www.youtube.com/watch?v=-pSiuAdUKP4&t=96s) | Service mode tilts downward, bouncing on the near side of the table first. Attack mode shoots directly over the net at high velocity, hitting paddles on both corners. | Documented |
| Speed controllers | Description | HobbyKing YEP 18A (2~4S) SBEC Brushless Speed Controllers drive the 3-phase outrunners. | Documented |
| Wheel gap & compression | Mechanism observation | Ping pong balls are 40 mm; wheels are spaced ~36–38 mm apart to compress the 40A rubber tire by 2–4 mm without crushing the celluloid ball. | Inferred |
| Split power wiring | Electrical observation | Brushless ESCs draw up to 15 A peak from ATX 12 V; the 4 servos draw up to 6–8 A combined stall from ATX 5 V; logic is isolated. | Inferred |
| CAD file availability | Channel & comments | The author demonstrated the Fusion 360 model but did not release downloadable STL or STEP files. | Unknown |
| Arduino firmware sketch | Channel & comments | The full source sketch was not released publicly; serial command strings and mode transitions are observed from the app screen. | Unknown |

## Mechanism and ball path

The machine operates through five coordinated stages:

1. **Storage & Agitation:** A translucent cylindrical bucket (`cup v2`) holds balls. A bottom rotating spiral blade (`pusher_with_servo v12`), driven by the first feed servo, stirs the balls above the intake funnel to prevent bridging or jamming.
2. **Escapement Metering:** A ball drops into the feed throat base, where a second servo (`feed_base_with_servo v52`) acts as an escapement gate, releasing exactly one ball per cycle into the curved feed guide.
3. **Gravity Drop:** The ball rolls down the 3D-printed curved elbow (`feed_curve v105`) into the horizontal launch barrel (`canon v54`).
4. **Brushless Flywheel Acceleration:** Two counter-rotating BaneBots 2-7/8" rubber wheels with 40A elastomer tires grip the ball. High-inertia DT750 outrunners transfer rotational kinetic energy into translation and spin.
5. **Pan-Tilt Vectoring:** The pan servo sweeps the entire gimbal on the aluminum turntable bearing (`base_mounted v9`), while the tilt servo (`hand_servo v64`) acts on an arc quadrant horn to adjust elevation between downward Service (-12°) and direct Attack (+5°).

### Spin dynamics

For counter-rotating wheels with radius $r$ and angular velocities $\omega_{\text{top}}$ and $\omega_{\text{bottom}}$:

$$\text{Launch velocity: } v \approx \frac{r (\omega_{\text{top}} + \omega_{\text{bottom}})}{2} \cdot (1 - s)$$

$$\text{Ball spin: } \omega_{\text{ball}} \approx \frac{r (\omega_{\text{top}} - \omega_{\text{bottom}})}{2 \cdot r_{\text{ball}}}$$

where $s$ is the contact slip factor and $r_{\text{ball}} \approx 20\text{ mm}$. When $\omega_{\text{top}} > \omega_{\text{bottom}}$, forward topspin is imparted, creating downward Magnus force that curves the trajectory into the table. When $\omega_{\text{bottom}} > \omega_{\text{top}}$, backspin causes the ball to float. Equal speeds produce a "flat" drive.

## Electrical architecture and power budget

A 250W PC ATX supply provides dedicated high-current rails that keep noisy inductive motor loads from browning out the microcontroller:

```
[250W PC ATX PSU]
  ├── +12V Rail (Yellow, ~15A) ──> [C1 1000µF] ──> 2x HobbyKing YEP 18A ESCs ──> 2x DT750 Motors
  ├── +5V Rail (Red, ~20A)    ──> [C2 470µF]  ──> 4x MG995/MG996 Servos (Pan/Tilt/Agitator/Gate)
  ├── GND (Black)              ──> Common Star Ground
  └── PS_ON (Green)            ──> [Front Panel Switch] ──> GND (Power On)

[Arduino Mega 2560]
  ├── Powered via USB or clean regulated 5V
  ├── D2 PWM  ──> Top ESC signal
  ├── D3 PWM  ──> Bottom ESC signal
  ├── D4 PWM  ──> Feeder Agitator servo
  ├── D5 PWM  ──> Feeder Gate servo
  ├── D6 PWM  ──> Pan / Yaw servo
  ├── D7 PWM  ──> Tilt / Elevation servo
  ├── TX1 D18 ──> [1kΩ / 2kΩ Divider] ──> HM-10 BLE RXD (3.3V)
  └── RX1 D19 <── HM-10 BLE TXD (3.3V)
```

### Safety and current limits

- **Servo Stall:** A single MG995/MG996 servo can draw 1.2–2.0 A at stall. Four servos in rapid motion can demand 5–8 A peak transients. Powering them from an Arduino 5V regulator will immediately cause thermal shutdown or reset. They must be wired directly to the ATX 5 V high-current rail.
- **ESC BEC Isolation:** The YEP 18A ESCs include internal 5.5V SBECs. To prevent circulating currents and backfeeding the ATX rail, the red positive wire on both ESC servo connectors must be disconnected/insulated; only Signal and Ground connect to the board.
- **BLE Logic Protection:** The HM-10 BLE module operates on 3.3V logic. Connecting the Arduino Mega 5V TX1 line directly to HM-10 RX will degrade or destroy the CC2541 chip over time. An onboard 1 kΩ / 2 kΩ resistor voltage divider safely steps the 5V pulse down to 3.3V.

## Proposed control & distribution breakout

To replace a fragile rat’s nest of breadboard jumpers and wire taps, this guide proposes an 85 × 60 mm 2-layer distribution PCB:

- [85 × 60 mm KiCad placement draft](downloads/hien-servo-breakout.kicad_pcb): through-hole connectors, decoupling capacitors, four M3 mounting holes, and defined pad nets.
- [Placement drawing](assets/hien/pcb.svg): visual layout generated from the same coordinates as the board.
- [Pad-to-net CSV](downloads/hien-pcb-netlist.csv): pad assignments for every component.
- [Connection map CSV](downloads/hien-connections.csv): endpoint connections across the machine.
- [Parts list CSV](downloads/hien-parts.csv): all 21 parts with evidence ratings.

**Status: Placement draft / unrouted.** This board is an engineering concept, not a certified fabrication release. Trace widths for 12V (≥2.5 mm for high current) and copper planes must be routed in KiCad, and DRC verified before ordering copper.

## Prototype bring-up sequence

1. **Bench PSU Verification:** Connect the ATX power supply to a dummy load. Verify 12.0 V on yellow wires and 5.0 V on red wires with PS_ON grounded.
2. **Servo Centering:** Connect the 4 servos without horns or linkages. Sweep travel limits in software to avoid mechanical stall against 3D-printed endstops.
3. **BLE Link:** Pair the HM-10 with iPhone or serial terminal at 9600 baud. Verify command reception before enabling motor power.
4. **Brushless Calibration:** Calibrate the YEP 18A ESC throttle range (1000–2000 µs) with propellers/wheels removed. Confirm counter-rotation direction at low RPM.
5. **Feed & Launch Test:** Load 3 balls into the hopper. Test single-ball escapement gate triggering before running high-speed continuous practice modes.
