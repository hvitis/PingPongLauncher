#!/usr/bin/env python3
"""Generate the block schematics of the PingPongThrower electronics.

    docs/wiring.svg          the finished robot (= test phase 5)
    docs/wiring_p1..p5.svg   what is wired in each POC test phase (docs/POC.md)
    web/data/wiring.json     the same pin map for the 3D wiring view (web/wiring3d.html)

The pin numbers come from firmware/config.py, so the drawing and the firmware
cannot disagree. Run:  python3 tools/wiring_svg.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CFG = (ROOT / "firmware" / "config.py").read_text()


def gp(name):
    return int(re.search(rf"^{name}\s*=\s*(\d+)", CFG, re.M).group(1))


# Pico / Pico 2 W header: physical pin → name
LEFT = ["GP0", "GP1", "GND", "GP2", "GP3", "GP4", "GP5", "GND", "GP6", "GP7",
        "GP8", "GP9", "GND", "GP10", "GP11", "GP12", "GP13", "GND", "GP14", "GP15"]          # pins 1..20
RIGHT = ["VBUS", "VSYS", "GND", "3V3_EN", "3V3", "VREF", "GP28", "AGND", "GP27", "GP26",
         "RUN", "GP22", "GND", "GP21", "GP20", "GP19", "GP18", "GND", "GP17", "GP16"]       # pins 40..21

RED, BLK, SIG, MOT, V33 = "#d1342f", "#222", "#2a6fdb", "#8a3fc7", "#e08a00"
PX, PW, PY, STEP = 470, 150, 230, 20             # Pico box x, width, first-pin y, pin pitch
out = []


def pin_y(n):
    return PY + (n - 1) * STEP if n <= 20 else PY + (40 - n) * STEP


def pico_pin(name):
    n = (LEFT.index(name) + 1) if name in LEFT else 40 - RIGHT.index(name)
    return n


def phys(gpio):
    return pico_pin(f"GP{gpio}")


def text(x, y, s, size=12, anchor="start", color="#222", weight="normal"):
    out.append(f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" fill="{color}" font-weight="{weight}">{s}</text>')


def wire(pts, color=SIG, w=2):
    d = " ".join(f"{x},{y}" for x, y in pts)
    out.append(f'<polyline points="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linejoin="round"/>')


def dot(x, y, color):
    out.append(f'<circle cx="{x}" cy="{y}" r="3.5" fill="{color}"/>')


def box(x, y, w, h, title, sub="", fill="#f6f7f9"):
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="#555" stroke-width="1.5"/>')
    text(x + w / 2, y + 18, title, 13, "middle", weight="bold")
    if sub:
        text(x + w / 2, y + 33, sub, 11, "middle", "#666")


def gnd(x, y):
    out.append(f'<path d="M{x},{y} v8 M{x-9},{y+8} h18 M{x-6},{y+12} h12 M{x-3},{y+16} h6" stroke="{BLK}" stroke-width="2" fill="none"/>')


def cap(x, y, label, color=RED):          # vertical polarised cap, top terminal at (x, y)
    out.append(f'<path d="M{x},{y} v14 M{x-10},{y+14} h20 M{x-10},{y+20} h20 M{x},{y+20} v14" stroke="#222" stroke-width="2" fill="none"/>')
    text(x + 14, y + 13, "+", 11, color=color)
    text(x + 14, y + 26, label, 11)
    gnd(x, y + 34)


def diode_v(x, y, label):                 # pointing down, anode at (x, y), length 30
    out.append(f'<path d="M{x},{y} v7 M{x},{y+23} v7" stroke="{RED}" stroke-width="2"/>')
    out.append(f'<path d="M{x-8},{y+7} h16 l-8,12 z" fill="#222"/><path d="M{x-8},{y+20} h16" stroke="#222" stroke-width="2.5"/>')
    text(x + 13, y + 19, label, 11)


def resistor_h(x, y, label):              # 40 px long
    out.append(f'<rect x="{x}" y="{y-6}" width="40" height="12" fill="#fff" stroke="#222" stroke-width="1.6"/>')
    text(x + 20, y - 10, label, 11, "middle")


def netlabel(x, y, s, color, side="right"):
    w = 9 + 7 * len(s)
    if side == "right":
        out.append(f'<path d="M{x},{y} l8,-9 h{w} v18 h-{w} z" fill="#fff" stroke="{color}" stroke-width="1.5"/>')
        text(x + 8 + w / 2, y + 4, s, 11, "middle", color, "bold")
    else:
        out.append(f'<path d="M{x},{y} l-8,-9 h-{w} v18 h{w} z" fill="#fff" stroke="{color}" stroke-width="1.5"/>')
        text(x - 8 - w / 2, y + 4, s, 11, "middle", color, "bold")


# test phase in which each GPIO gets wired (default 1); mirrors FEATURES in firmware/logic.py
PIN_PHASE = {"PIN_FEED_SERVO": 3, "PIN_SWING_SERVO": 4, "PIN_BTN_MOTORS": 5, "PIN_BTN_SWING": 5,
             "PIN_BTN_FEED": 5, "PIN_LED_READY": 5, "PIN_POT_SPEED": 5, "PIN_POT_SPIN": 5, "PIN_POT_RATE": 5}
PANEL = 5                                                   # the finished robot
TITLES = {
    1: "POC phase 1 (head): battery, switch, Pico and the two wheel motors, the perfboard loose on the bench.",
    2: "POC phase 2 (throw rig): the phase 1 circuit, screwed down on the bench plate.",
    3: "POC phase 3 (feed): phase 2 + the SG90 feed servo.",
    4: "POC phase 4 (aim): phase 3 + the MG90S swing servo, everything moved into the base.",
    5: "PingPongThrower wiring: everything except the panel parts sits on one 50 × 70 mm perfboard.",
}


def has(phase, needed):
    return phase >= needed


def build(phase):
    out.clear()
    pins = [k for k in re.findall(r"^(PIN_\w+)\s*=", CFG, re.M) if has(phase, PIN_PHASE.get(k, 1))]
    used = {phys(gp(k)) for k in pins} | {pico_pin("VSYS"), 38} | ({pico_pin("3V3"), pico_pin("AGND")} if phase >= PANEL else set())
    box(PX, PY - 40, PW, 21 * STEP + 30, "Raspberry Pi Pico 2 WH", "RP2350 · Wi-Fi", "#e9f4ec")
    for n in range(1, 41):
        y = pin_y(n)
        name = LEFT[n - 1] if n <= 20 else RIGHT[40 - n]
        on = n in used
        col = "#222" if on else "#bbb"
        if n <= 20:
            out.append(f'<path d="M{PX-12},{y} h12" stroke="{col}" stroke-width="2"/>')
            text(PX + 6, y + 4, name, 11, color=col, weight="bold" if on else "normal")
            text(PX - 15, y - 3, str(n), 9, "end", "#999")
        else:
            out.append(f'<path d="M{PX+PW},{y} h12" stroke="{col}" stroke-width="2"/>')
            text(PX + PW - 6, y + 4, name, 11, "end", col, "bold" if on else "normal")
            text(PX + PW + 15, y - 3, str(n), 9, color="#999")

    # ------------------------------------------------------------------ power
    RAIL_Y = 70
    box(30, 30, 120, 62, "4 × AA", "4.8–6.4 V")
    text(160, 52, "+", 13, color=RED, weight="bold")
    wire([(150, 50), (190, 50)], RED, 2.5)
    box(190, 34, 86, 36, "POWER", "KCD1 rocker")
    wire([(276, 50), (300, 50), (300, RAIL_Y), (1080, RAIL_Y)], RED, 3)
    text(1080, RAIL_Y - 8, "+BAT  (switched)", 12, "end", RED, "bold")
    wire([(150, 75), (170, 75), (170, 112)], BLK, 2.5)
    gnd(170, 112)
    text(160, 88, "−", 13, color=BLK, weight="bold")

    # 470 µF across the rail, next to the driver
    dot(410, RAIL_Y, RED)
    wire([(410, RAIL_Y), (410, 100)], RED)
    cap(410, 100, "470 µF 16 V")

    # diodes to VSYS
    DX = 760
    dot(DX, RAIL_Y, RED)
    wire([(DX, RAIL_Y), (DX, 120)], RED)
    diode_v(DX, 120, "1N4001")
    wire([(DX, 150), (DX, 160)], RED)
    diode_v(DX, 160, "1N4001")
    vs = pin_y(pico_pin("VSYS"))
    wire([(DX, 190), (DX, vs), (PX + PW + 12, vs)], RED)
    text(DX + 14, vs - 6, "≈ BAT − 1.4 V", 11, color="#666")
    dot(DX, vs, RED)
    wire([(DX, vs), (DX + 70, vs), (DX + 70, vs + 4)], RED)
    cap(DX + 70, vs + 4, "100 µF")
    g = pin_y(38)
    wire([(PX + PW + 12, g), (PX + PW + 40, g), (PX + PW + 40, g + 6)], BLK)
    gnd(PX + PW + 40, g + 6)

    # ------------------------------------------------------------------ DRV8833
    DRX, DRW = 220, 130
    drv_pins = [("AIN1", gp("PIN_TOP_IN1")), ("AIN2", gp("PIN_TOP_IN2")), ("BIN1", gp("PIN_BOT_IN1")),
                ("BIN2", gp("PIN_BOT_IN2")), ("EEP / nSLEEP", gp("PIN_DRV_SLEEP")), ("ULT / nFAULT", gp("PIN_DRV_FAULT"))]
    ys = [pin_y(phys(g_)) for _, g_ in drv_pins]
    top = ys[0] - 70
    box(DRX, top, DRW, ys[-1] - top + 30, "DRV8833", "dual H-bridge", "#f1ecf8")
    for (name, g_), y in zip(drv_pins, ys):
        text(DRX + DRW - 6, y + 4, name, 11, "end")
        wire([(DRX + DRW, y), (PX - 12, y)], SIG)
        text(DRX + DRW + 8, y - 4, f"GP{g_}", 10, color=SIG)
    vmx = DRX + DRW - 20
    text(vmx, top + 52, "VM", 11, "middle")
    wire([(vmx, top), (vmx, RAIL_Y)], RED)
    dot(vmx, RAIL_Y, RED)
    text(DRX + 6, ys[-1] + 22, "GND", 11)
    wire([(DRX, ys[-1] + 18), (DRX - 18, ys[-1] + 18), (DRX - 18, ys[-1] + 26)], BLK)
    gnd(DRX - 18, ys[-1] + 26)
    MX = DRX - 100                                      # motor symbol centre x
    for k, nm in enumerate(["M1 top", "M2 bottom"]):
        y0 = ys[0] + k * 56
        for j, label in enumerate((f"{'AB'[k]}OUT1", f"{'AB'[k]}OUT2")):
            y = y0 + j * 22
            text(DRX + 6, y + 4, label, 11)
            wire([(DRX, y), (MX + 18, y)], MOT)
        cy = y0 + 11
        out.append(f'<circle cx="{MX}" cy="{cy}" r="22" fill="#fff" stroke="{MOT}" stroke-width="2"/>')
        text(MX, cy + 5, "M", 15, "middle", MOT, "bold")
        text(MX - 30, cy - 1, nm, 11, "end", weight="bold")
        text(MX - 30, cy + 12, "N20 + 100 nF", 10, "end", "#666")

    # ------------------------------------------------------------------ servos
    for k, (nm, model, key) in enumerate([("Swing servo", "MG90S", "PIN_SWING_SERVO"), ("Feed servo", "SG90", "PIN_FEED_SERVO")]):
        if not has(phase, PIN_PHASE[key]):
            continue
        g_ = gp(key)
        y = pin_y(phys(g_))
        bx, by = 60 + k * 170, 650
        box(bx, by, 150, 50, nm, model, "#fdf1e6")
        sx = bx + 115
        wire([(PX - 12, y), (sx, y), (sx, by)], SIG)
        text(PX - 30, y - 4, f"GP{g_}", 10, "end", SIG)
        wire([(bx + 22, by), (bx + 22, by - 14)], RED)
        netlabel(bx + 22, by - 14, "+BAT", RED, "left")
        wire([(bx + 52, by), (bx + 52, by - 8)], BLK)
        out.append(f'<path d="M{bx+44},{by-8} h16 M{bx+47},{by-12} h10 M{bx+50},{by-16} h4" stroke="{BLK}" stroke-width="2"/>')
    if phase >= PIN_PHASE["PIN_FEED_SERVO"]:
        text(60, 724, "Servo red wires go to +BAT, brown to GND, orange to the GP pin. They run at battery voltage.", 11, color="#666")

    # ------------------------------------------------------------------ buttons, LED
    RX = PX + PW + 12
    if phase < PANEL:
        text(RX + 40, 400, "Buttons, knobs and the READY LED", 12, color="#999", weight="bold")
        text(RX + 40, 416, f"come in phase {PANEL}. Until then the phone page", 11, color="#999")
        text(RX + 40, 430, "is the remote and the Pico's on-board LED", 11, color="#999")
        text(RX + 40, 444, "shows READY.", 11, color="#999")
    if phase >= PANEL:
        BUS = 900                                           # ground bus for buttons and LED
        btn = [("MOTORS", "PIN_BTN_MOTORS"), ("SWING", "PIN_BTN_SWING"), ("FEED", "PIN_BTN_FEED")]
        for nm, key in btn:
            g_ = gp(key)
            y = pin_y(phys(g_))
            wire([(RX, y), (840, y)], SIG)
            text(RX + 16, y - 4, f"GP{g_}", 10, color=SIG)
            text(832, y - 4, nm, 10, "end", weight="bold")
            out.append(f'<path d="M840,{y} l18,-9" stroke="#222" stroke-width="2"/><circle cx="840" cy="{y}" r="2.5" fill="#222"/><circle cx="862" cy="{y}" r="2.5" fill="#222"/>')
            wire([(862, y), (BUS, y)], BLK)
        g_ = gp("PIN_LED_READY")
        ly_ = pin_y(phys(g_))
        wire([(RX, ly_), (790, ly_)], SIG)
        text(RX + 16, ly_ - 4, f"GP{g_}", 10, color=SIG)
        resistor_h(790, ly_, "220 Ω")
        wire([(830, ly_), (856, ly_)], "#222")
        out.append(f'<path d="M856,{ly_-9} v18 l16,-9 z" fill="#3c3"/><path d="M872,{ly_-9} v18" stroke="#222" stroke-width="2"/>')
        text(864, ly_ - 14, "READY", 10, "middle", weight="bold")
        wire([(872, ly_), (BUS, ly_)], BLK)
        bot = max(pin_y(phys(gp(k))) for _, k in btn)
        wire([(BUS, ly_), (BUS, bot + 10)], BLK)
        gnd(BUS, bot + 10)
        text(BUS + 14, bot - 40, "buttons to GND,", 11, color="#666")
        text(BUS + 14, bot - 26, "internal pull-ups", 11, color="#666")

        # ------------------------------------------------------------------ pots
        v3y, agy = pin_y(pico_pin("3V3")), pin_y(pico_pin("AGND"))
        AG_Y = 470
        wire([(RX, v3y), (1060, v3y)], V33)
        text(1060, v3y - 6, "3V3 (pin 36)", 11, "end", V33, "bold")
        wire([(RX, agy), (690, agy), (690, AG_Y), (1060, AG_Y)], BLK)
        text(1060, AG_Y + 16, "AGND (pin 33)", 11, "end", BLK, "bold")
        # nearest pot = highest pin, so a wiper line only ever crosses another pot's lead, never its body
        for i, (nm, key) in enumerate([("RATE", "PIN_POT_RATE"), ("SPIN", "PIN_POT_SPIN"), ("SPEED", "PIN_POT_SPEED")]):
            g_ = gp(key)
            y = pin_y(phys(g_))
            px = 800 + i * 95
            t, b_ = y - 30, y + 6
            out.append(f'<rect x="{px-8}" y="{t}" width="16" height="{b_-t}" fill="#fff" stroke="#222" stroke-width="1.6"/>')
            wire([(px, v3y), (px, t)], V33)
            dot(px, v3y, V33)
            wire([(px, b_), (px, AG_Y)], BLK)
            dot(px, AG_Y, BLK)
            wire([(RX, y), (px - 14, y)], SIG)
            out.append(f'<path d="M{px-15},{y-5} l7,5 l-7,5 z" fill="{SIG}"/>')
            text(px + 14, t + 12, nm, 10, weight="bold")
            text(px + 14, t + 25, "10 kΩ", 10, color="#666")
            text(RX + 16, y - 4, f"GP{g_}", 10, color=SIG)

    # ------------------------------------------------------------------ legend
    lx, ly = 760, 650
    legend = [(RED, "battery +BAT (4.8–6.4 V)"), (BLK, "ground"), (V33, "3.3 V from the Pico"), (SIG, "logic signal"), (MOT, "motor outputs")]
    for i, (c, s) in enumerate(l_ for l_ in legend if phase >= PANEL or l_[0] != V33):
        wire([(lx, ly + i * 16), (lx + 26, ly + i * 16)], c, 3)
        text(lx + 34, ly + i * 16 + 4, s, 11)
    text(30, 22, TITLES[phase] + " Every ⏚ is the same common ground.", 12, color="#444")

    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 740" font-family="ui-sans-serif, system-ui, Helvetica, Arial, sans-serif">'
            f'<rect width="1100" height="740" fill="#fff"/>' + "\n".join(out) + "</svg>\n")


(ROOT / "docs").mkdir(exist_ok=True)
pin_map = {
    "_about": "generated by tools/wiring_svg.py from firmware/config.py: the Pico header and which GPIO drives what",
    "pico_left": LEFT, "pico_right": RIGHT,
    "gpio": {k: gp(k) for k in re.findall(r"^(PIN_\w+)\s*=", CFG, re.M)},
    "pin_phase": PIN_PHASE,
}
dst = ROOT / "web" / "data" / "wiring.json"
dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(json.dumps(pin_map, indent=1) + "\n")
print(f"wrote {dst.relative_to(ROOT)}")
for name, phase in [("wiring.svg", PANEL), *((f"wiring_p{n}.svg", n) for n in range(1, PANEL + 1))]:
    dst = ROOT / "docs" / name
    dst.write_text(build(phase))
    print(f"wrote {dst.relative_to(ROOT)}")
