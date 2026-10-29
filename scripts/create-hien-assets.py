"""Generate explanatory vectors, KiCad power/servo distribution draft, and CSVs for Hien's BLE robot."""
from pathlib import Path
from xml.sax.saxutils import escape
import csv
import json

root = Path(__file__).resolve().parent.parent / 'docs'
assets = root / 'assets/hien'
assets.mkdir(parents=True, exist_ok=True)
downloads = root / 'downloads'
downloads.mkdir(parents=True, exist_ok=True)

def svg(name, w, h, title, desc, body):
    path = assets / name
    path.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
        f'<title>{escape(title)}</title>'
        f'<desc>{escape(desc)}</desc>'
        f'<rect width="{w}" height="{h}" rx="22" fill="#f5f7fa"/>'
        f'<g font-family="Arial,sans-serif" fill="#253347">{body}</g></svg>\n'
    )

def text(x, y, s, size=17, color='#253347', weight='normal'):
    w_attr = f' font-weight="{weight}"' if weight != 'normal' else ''
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}"{w_attr}>{escape(s)}</text>'

def box(x, y, w, h, label, sub='', color='#e2edfc'):
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{color}" stroke="#899bb1"/>'
        + text(x + 15, y + 29, label, 18, weight='bold')
        + text(x + 15, y + 53, sub, 13, '#52657e')
    )

# -------------------------------------------------------------
# 1. MECHANISM DIAGRAM (mechanism.svg)
# -------------------------------------------------------------
mech = []
# Base shadow & wooden box
mech.append('<ellipse cx="450" cy="625" rx="330" ry="32" fill="#dfe4ec"/>')
# Wooden box: 3D isometric representation
mech.append('<path d="M250 510 L650 510 L680 550 L280 550 Z" fill="#d2b48c" stroke="#a38258" stroke-width="2"/>') # top
mech.append('<path d="M280 550 L680 550 L680 620 L280 620 Z" fill="#bfa075" stroke="#a38258" stroke-width="2"/>') # front
mech.append('<path d="M650 510 L680 550 L680 620 L650 580 Z" fill="#aa8a60" stroke="#a38258" stroke-width="2"/>') # right side
# ATX fan grill cutouts on wooden box front
mech.append('<circle cx="580" cy="585" r="26" fill="#2b3542"/>')
mech.append('<circle cx="580" cy="585" r="21" fill="none" stroke="#68788d" stroke-width="2"/>')
mech.append('<circle cx="580" cy="585" r="13" fill="none" stroke="#68788d" stroke-width="2"/>')
# Green push button switch on top deck
mech.append('<ellipse cx="340" cy="530" rx="14" ry="7" fill="#1b4332" stroke="#2d6a4f" stroke-width="2"/>')
mech.append('<ellipse cx="340" cy="528" rx="11" ry="5" fill="#38b000"/>')

# Aluminum Lazy Susan turntable ring bearing
mech.append('<ellipse cx="465" cy="495" rx="95" ry="24" fill="#c4ccd6" stroke="#8c9aa8" stroke-width="3"/>')
mech.append('<ellipse cx="465" cy="495" rx="65" ry="16" fill="#e8edf2" stroke="#8c9aa8" stroke-width="2"/>')
# Screws on ring
for angle_offset in [-55, -20, 20, 55]:
    mech.append(f'<circle cx="{465+angle_offset}" cy="{495+int(abs(angle_offset)*0.2)}" r="3" fill="#65758b"/>')

# Vertical riser bracket (base_leg v15)
mech.append('<path d="M435 480 V370 H495 V480 Z" fill="#1e293b" stroke="#0f172a" stroke-width="3"/>')
mech.append('<rect x="425" y="440" width="80" height="20" rx="4" fill="#334155"/>')
mech.append('<text x="440" y="455" font-size="10" fill="#94a3b8">PAN SERVO</text>')

# Elevation tilt pivot & quadrant sector horn (hand_servo v64)
mech.append('<path d="M495 385 L545 360 A 45 45 0 0 1 545 425 Z" fill="#475569" stroke="#1e293b" stroke-width="2"/>')
mech.append('<circle cx="495" cy="385" r="8" fill="#0071e3"/>')

# Translucent plastic hopper bucket (cup v2)
mech.append('<path d="M370 120 L560 120 L530 270 H400 Z" fill="#e2edfa" fill-opacity="0.85" stroke="#0071e3" stroke-width="3"/>')
mech.append('<ellipse cx="465" cy="120" rx="95" ry="22" fill="#d0e2f7" stroke="#0071e3" stroke-width="3"/>')
mech.append('<ellipse cx="465" cy="270" rx="65" ry="14" fill="#cbdcf2" stroke="#89a7cb" stroke-width="2"/>')

# Orange ping pong balls inside hopper (40mm table tennis balls)
balls = [(430, 160), (475, 145), (510, 165), (445, 195), (490, 190), (465, 230), (435, 240)]
for bx, by in balls:
    mech.append(f'<circle cx="{bx}" cy="{by}" r="17" fill="#ff7a00" stroke="#d65a00" stroke-width="2"/>')
    mech.append(f'<ellipse cx="{bx-4}" cy="{by-5}" rx="5" ry="3" fill="#ffb066"/>')

# Agitator disk inside bucket bottom (pusher_with_servo v12)
mech.append('<path d="M425 260 C465 250 495 275 515 265" fill="none" stroke="#2563eb" stroke-width="6" stroke-linecap="round"/>')

# 3D-printed curved feed tube (feed_curve v105)
mech.append('<path d="M435 275 Q420 330 350 350" fill="none" stroke="#0f172a" stroke-width="56" stroke-linecap="round"/>')
mech.append('<path d="M435 275 Q420 330 350 350" fill="none" stroke="#334155" stroke-width="44" stroke-linecap="round"/>')

# Feed gate escapement servo
mech.append('<rect x="420" y="320" width="34" height="24" rx="3" fill="#0f172a"/>')
mech.append('<path d="M437 320 V300" stroke="#f59e0b" stroke-width="4"/>')

# Launch barrel (canon v54) - horizontal cylinder aimed to left
mech.append('<rect x="180" y="325" width="170" height="52" rx="6" fill="#1e293b" stroke="#0f172a" stroke-width="3"/>')
mech.append('<ellipse cx="180" cy="351" rx="12" ry="26" fill="#0a0f1d" stroke="#0f172a" stroke-width="3"/>')

# Upper launch wheel assembly: DT750 motor + BaneBots 2-7/8" orange wheel
# Top wheel
mech.append('<ellipse cx="255" cy="275" rx="36" ry="18" fill="#ff7a00" stroke="#1e293b" stroke-width="9"/>')
mech.append('<ellipse cx="255" cy="275" rx="14" ry="7" fill="#64748b"/>')
# Top DT750 brushless motor bell (outrunner)
mech.append('<rect x="238" y="225" width="34" height="32" rx="5" fill="#334155" stroke="#0f172a" stroke-width="2"/>')
mech.append('<path d="M243 235 H267 M243 245 H267" stroke="#d97706" stroke-width="2"/>') # copper windings
# Bottom wheel
mech.append('<ellipse cx="255" cy="425" rx="36" ry="18" fill="#ff7a00" stroke="#1e293b" stroke-width="9"/>')
mech.append('<ellipse cx="255" cy="425" rx="14" ry="7" fill="#64748b"/>')
# Bottom DT750 motor bell
mech.append('<rect x="238" y="445" width="34" height="32" rx="5" fill="#334155" stroke="#0f172a" stroke-width="2"/>')
mech.append('<path d="M243 455 H267 M243 465 H267" stroke="#d97706" stroke-width="2"/>') # copper windings

# Ball in barrel ready to be grabbed
mech.append('<circle cx="285" cy="351" r="17" fill="#ff7a00" stroke="#d65a00" stroke-width="2"/>')
# Ball launched out of nozzle with trajectory arrows
mech.append('<circle cx="105" cy="351" r="17" fill="#ff7a00" stroke="#d65a00" stroke-width="2"/>')
mech.append('<ellipse cx="101" cy="346" rx="5" ry="3" fill="#ffb066"/>')
mech.append('<path d="M165 351 H60 M60 351 L75 342 M60 351 L75 360" stroke="#0071e3" stroke-width="4" fill="none"/>')
mech.append('<path d="M125 320 C105 315 85 330 80 345" fill="none" stroke="#2563eb" stroke-width="3" stroke-dasharray="3 3"/>')
mech.append('<text x="45" y="325" font-size="13" fill="#0071e3" font-weight="bold">BALL VELOCITY &amp; SPIN</text>')

# Callout leader lines
leaders = [
    ('M560 180 H730', 740, 185, '01 / HOPPER &amp; AGITATOR (cup v2, pusher v12)'),
    ('M425 340 H730', 740, 345, '02 / CURVED THROAT &amp; GATE (feed_curve v105)'),
    ('M540 385 H730', 740, 395, '03 / ELEVATION TILT SERVO (hand_servo v64)'),
    ('M255 240 H130 V185 H70', 65, 175, '04 / DT750 BRUSHLESS &amp; BANEBOTS WHEELS'),
    ('M495 495 H730', 740, 500, '05 / ALUMINUM LAZY SUSAN TURNTABLE'),
    ('M680 585 H730', 740, 590, '06 / 250W ATX PSU &amp; ARDUINO MEGA BASE'),
]
for p, lx, ly, label in leaders:
    mech.append(f'<path d="{p}" stroke="#94a3b8" stroke-width="1.5" fill="none"/>')
    mech.append(text(lx, ly, label, 14, '#1e293b', weight='bold'))

# Title block
mech.append(text(35, 45, 'HIEN’S TABLE TENNIS ROBOT / MECHANISM BREAKDOWN', 18, weight='bold'))
mech.append(text(35, 70, 'Autodesk Fusion 360 ASM v145 assembly • 2 brushless flywheels • 4 servomotors • BLE control', 13, '#64748b'))

svg('mechanism.svg', 900, 680, 'Nguyen Van Hien’s table tennis robot mechanism',
    'Explanatory breakdown of hopper agitator, curved feed tube, dual DT750 brushless flywheels, pan-tilt gimbal and ATX base.',
    ''.join(mech))

# -------------------------------------------------------------
# 2. ELECTRICAL SCHEMATIC (schematic.svg)
# -------------------------------------------------------------
sch = []
sch.append(text(35, 40, 'SYSTEM WIRING &amp; ATX POWER DISTRIBUTION', 20, weight='bold'))
sch.append(text(35, 65, 'Separate high-current 12 V (ESCs) and 5 V (servos) rails from 250W ATX power supply; common ground', 14, '#64748b'))

# Subsystem blocks
sch.append(box(40, 90, 240, 110, '250W PC ATX PSU', 'Yellow +12V · Red +5V · Blk GND · Grn PS_ON', '#fef3c7'))
sch.append(box(320, 90, 270, 110, 'Arduino Mega 2560', '16 MHz ATmega2560 · 54 GPIOs · 4 UARTs', '#dbeafe'))
sch.append(box(630, 90, 210, 110, 'HM-10 BLE 4.0', 'Serial1 (D18/D19) · 3.3V logic level', '#e0e7ff'))
sch.append(box(880, 90, 180, 110, 'iPhone App', 'Ping Robot · BLE command link', '#f1f5f9'))

# High-current loads
sch.append(box(40, 230, 310, 95, 'Twin HobbyKing YEP 18A ESCs', 'Powered from ATX +12V rail · opto/signal only', '#fee2e2'))
sch.append(box(390, 230, 310, 95, '2x DT750 Brushless Motors', '750KV outrunners direct-driving BaneBots wheels', '#fee2e2'))
sch.append(box(740, 230, 320, 95, '4x MG995/MG996 Servos', 'Pan, Tilt, Agitator, Gate · powered from ATX +5V', '#fef3c7'))

# Connectors and bus labels
sch.append('<path d="M160 200 V230" stroke="#dc2626" stroke-width="4"/>') # 12V to ESC
sch.append('<path d="M350 277 H390" stroke="#dc2626" stroke-width="4"/>') # ESC to motors
sch.append('<path d="M280 145 H320" stroke="#2563eb" stroke-width="3"/>') # Mega to PSU / logic
sch.append('<path d="M590 145 H630" stroke="#4f46e5" stroke-width="3"/>') # Mega to HM10
sch.append('<path d="M840 145 H880" stroke="#0071e3" stroke-width="3" stroke-dasharray="4 4"/>') # BLE wireless

sch.append(text(40, 360, 'PROPOSED POWER &amp; SERVO DISTRIBUTION BREAKOUT (85 × 60 mm)', 17, weight='bold'))
sch.append(text(40, 385, 'Eliminates jumper wire bundle; isolates motor transients from controller logic.', 13, '#64748b'))

headers = [
    ('J1 Mega 10-pin Harness', '1 GND · 2 +5V_LOGIC · 3 D2 · 4 D3 · 5 D4 · 6 D5 · 7 D6 · 8 D7 · 9 TX1 · 10 RX1', 'Ribbon cable to Arduino Mega PWM and Serial1 pins'),
    ('J2 Top ESC / J3 Bottom ESC', 'Each: 1 GND · 2 NC (BEC cut) · 3 PWM Signal', 'D2 (Top ESC throttle/topspin) · D3 (Bottom ESC throttle/backspin)'),
    ('J4 Agitator / J5 Gate Servo', 'Each: 1 GND · 2 +5V_ATX · 3 PWM Signal', 'D4 (pusher_with_servo) · D5 (feed_base_with_servo)'),
    ('J6 Pan / J7 Tilt Servo', 'Each: 1 GND · 2 +5V_ATX · 3 PWM Signal', 'D6 (turntable sweep) · D7 (elevation quadrant horn)'),
    ('J8 HM-10 BLE Header', '1 GND · 2 +5V_LOGIC · 3 TXD (to Mega RX1) · 4 RXD (via 1k/2k divider)', 'Logic level protection: 5V TX1 divided to 3.3V HM-10 RX'),
    ('J9 ATX Power In', '1 +12V_ATX · 2 GND · 3 GND · 4 +5V_ATX (Molex 4-pin)', 'Heavy current input directly from PC ATX power supply wires')
]

for i, (label, pinout, note) in enumerate(headers):
    y = 405 + i * 62
    sch.append(f'<rect x="40" y="{y}" width="1020" height="54" rx="8" fill="#e8edf5"/>')
    sch.append(text(55, y + 23, label, 15, weight='bold'))
    sch.append(text(340, y + 23, pinout, 14, '#1e293b'))
    sch.append(text(340, y + 43, note, 12, '#64748b'))

sch.append(text(40, 785, 'Filter capacitors: C1 1000 µF / 16V on +12V_ATX · C2 470 µF / 6.3V on +5V_ATX · C3 100 nF ceramic on +5V_LOGIC', 14, '#475569'))
sch.append(text(40, 805, 'All ground returns commoned at ATX star point. ESC internal BEC +5V disconnected to avoid backfeeding rails.', 13, '#dc2626'))

svg('schematic.svg', 1100, 820, 'Proposed system schematic for Hien’s ping pong robot',
    'Wiring architecture showing ATX power split, Arduino Mega 2560 pin map, brushless ESCs, 4 servos and HM-10 BLE module.',
    ''.join(sch))

# -------------------------------------------------------------
# 3. KICAD PCB PLACEMENT DRAFT & PCB SVG
# -------------------------------------------------------------
nets = [
    'GND',
    '+12V_ATX',
    '+5V_ATX',
    '+5V_LOGIC',
    'ESC_TOP_D2',
    'ESC_BTM_D3',
    'AGIT_SERVO_D4',
    'GATE_SERVO_D5',
    'PAN_SERVO_D6',
    'TILT_SERVO_D7',
    'BLE_TX1_D18',
    'BLE_RX1_D19',
    'BLE_RX_3V3'
]

# Placement layout: board 85 x 60 mm (X: 10 to 95, Y: 10 to 70)
components = [
    # Ref, Label, X, Y, nets, is_horizontal
    ('J1', 'Mega Harness', 20, 22, ['GND', '+5V_LOGIC', 'ESC_TOP_D2', 'ESC_BTM_D3', 'AGIT_SERVO_D4', 'GATE_SERVO_D5', 'PAN_SERVO_D6', 'TILT_SERVO_D7', 'BLE_TX1_D18', 'BLE_RX1_D19'], 0),
    ('J2', 'Top ESC', 40, 22, ['GND', 'GND', 'ESC_TOP_D2'], 1),
    ('J3', 'Btm ESC', 65, 22, ['GND', 'GND', 'ESC_BTM_D3'], 1),
    ('J4', 'Agitator Servo', 40, 36, ['GND', '+5V_ATX', 'AGIT_SERVO_D4'], 1),
    ('J5', 'Gate Servo', 65, 36, ['GND', '+5V_ATX', 'GATE_SERVO_D5'], 1),
    ('J6', 'Pan Servo', 40, 50, ['GND', '+5V_ATX', 'PAN_SERVO_D6'], 1),
    ('J7', 'Tilt Servo', 65, 50, ['GND', '+5V_ATX', 'TILT_SERVO_D7'], 1),
    ('J8', 'HM-10 BLE', 40, 64, ['GND', '+5V_LOGIC', 'BLE_RX1_D19', 'BLE_RX_3V3'], 1),
    ('J9', 'ATX Power In', 85, 45, ['+12V_ATX', 'GND', 'GND', '+5V_ATX'], 0),
    ('R1', '1k Divider', 72, 64, ['BLE_TX1_D18', 'BLE_RX_3V3'], 1),
    ('R2', '2k Divider', 82, 64, ['BLE_RX_3V3', 'GND'], 1),
    ('C1', '1000uF 16V', 85, 22, ['+12V_ATX', 'GND'], 0),
    ('C2', '470uF 6.3V', 85, 32, ['+5V_ATX', 'GND'], 0),
    ('C3', '100nF', 20, 52, ['+5V_LOGIC', 'GND'], 0),
]

board = [
    '(kicad_pcb (version 20221018) (generator pcbnew) (general (thickness 1.6)) (paper "A4")',
    '(layers (0 "F.Cu" signal) (31 "B.Cu" signal) (36 "B.SilkS" user "b.silkscreen") (37 "F.SilkS" user "f.silkscreen") (38 "B.Mask" user) (39 "F.Mask" user) (44 "Edge.Cuts" user))',
    '(setup (pad_to_mask_clearance 0))',
    '(net 0 "")'
]
board += [f'(net {i} "{n}")' for i, n in enumerate(nets, 1)]

pcb_svg_body = [
    text(35, 40, 'POWER &amp; SERVO DISTRIBUTION BREAKOUT / PLACEMENT DRAFT', 19, weight='bold'),
    text(35, 65, '85 × 60 mm · 2 layers · unrouted pad coordinates; KiCad placement model', 14, '#64748b'),
    # Board outline (green PCB preview)
    '<rect x="70" y="90" width="765" height="510" rx="12" fill="#0f3b2e" stroke="#08231b" stroke-width="3"/>'
]

netrows = []
for ref, label, x, y, ns, horizontal in components:
    pitch = 2.54
    is_connector = ref.startswith('J')
    if is_connector:
        lib = f'Connector_PinHeader_2.54mm:PinHeader_1x{len(ns):02d}_P2.54mm_Vertical'
    elif ref.startswith('R'):
        lib = 'Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal'
        pitch = 10.16
    elif ref == 'C1':
        lib = 'Capacitor_THT:CP_Radial_D10.0mm_P5.00mm'
        pitch = 5.0
    elif ref == 'C2':
        lib = 'Capacitor_THT:CP_Radial_D8.0mm_P3.50mm'
        pitch = 3.5
    else:
        lib = 'Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm'
        pitch = 2.5

    board.append(f'(footprint "{lib}" (layer "F.Cu") (at {x} {y}) (attr through_hole)')
    board.append(f'  (fp_text reference "{ref}" (at 0 -2.6) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))')
    board.append(f'  (fp_text value "{label}" (at 0 {len(ns)*pitch+1}) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))')

    # SVG mapping: 85x60mm mapped to 765x510px (scale = 9 px/mm)
    sx = 70 + (x - 10) * 9
    sy = 90 + (y - 10) * 9
    pcb_svg_body.append(text(sx - 4, sy - 14, f'{ref} / {label}', 12, '#a7f3d0', weight='bold'))

    for k, n in enumerate(ns):
        px = k * pitch if horizontal else 0
        py = 0 if horizontal else k * pitch
        shape = 'rect' if k == 0 else 'circle'
        net_idx = nets.index(n) + 1
        board.append(f'  (pad "{k+1}" thru_hole {shape} (at {px:.2f} {py:.2f}) (size 1.8 1.8) (drill 1) (layers "*.Cu" "*.Mask") (net {net_idx} "{n}"))')

        cx = sx + px * 9
        cy = sy + py * 9
        pcb_svg_body.append(f'<circle cx="{cx}" cy="{cy}" r="6" fill="#fcd34d"/><circle cx="{cx}" cy="{cy}" r="2.5" fill="#064e3b"/>')
        pcb_svg_body.append(text(cx + 8, cy + 4, str(k + 1), 9, '#e2e8f0'))
        netrows.append([ref, k + 1, n])

    board.append(')')

# 4 Mounting holes M3 (at corners)
for mh_x, mh_y in [(14, 14), (91, 14), (14, 66), (91, 66)]:
    board.append(f'(footprint "MountingHole:MountingHole_3.2mm_M3" (layer "F.Cu") (at {mh_x} {mh_y}) (attr exclude_from_pos_files exclude_from_bom)')
    board.append('  (pad "" np_thru_hole circle (at 0 0) (size 3.2 3.2) (drill 3.2) (layers "*.Cu" "*.Mask")))')
    pcb_svg_body.append(f'<circle cx="{70 + (mh_x - 10)*9}" cy="{90 + (mh_y - 10)*9}" r="14.4" fill="#f5f7fa" stroke="#064e3b" stroke-width="2"/>')

# Edge cuts rectangle: 85 x 60 mm (10,10 to 95,70)
for x1, y1, x2, y2 in [(10, 10, 95, 10), (95, 10, 95, 70), (95, 70, 10, 70), (10, 70, 10, 10)]:
    board.append(f'(gr_line (start {x1} {y1}) (end {x2} {y2}) (stroke (width 0.05) (type default)) (layer "Edge.Cuts"))')

board.append('(gr_text "HIEN ROBOT POWER/SERVO BREAKOUT - UNROUTED" (at 52 14) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))')
board.append(')')

(downloads / 'hien-servo-breakout.kicad_pcb').write_text('\n'.join(board) + '\n')

with (downloads / 'hien-pcb-netlist.csv').open('w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['Reference', 'Pad', 'Net'])
    w.writerows(netrows)

pcb_svg_body.append(text(120, 560, 'HIEN ROBOT / POWER &amp; SERVO DISTRIBUTION DRAFT', 20, '#a7f3d0', weight='bold'))
pcb_svg_body.append(text(120, 585, 'Direct ATX 12V for ESCs · ATX 5V for 4 servos · J1 Mega ribbon · Level shifter for BLE', 14, '#6ee7b7'))
pcb_svg_body.append(text(70, 625, 'Placement draft only · no copper tracks or zones · verify component footprints before fabrication', 13, '#64748b'))

svg('pcb.svg', 900, 650, 'Hien robot control breakout PCB placement draft',
    'Unrouted 85 by 60 millimetre board with J1 Mega harness, 2 ESC signal headers, 4 servo headers, HM-10 BLE port, ATX power in and filter capacitors.',
    ''.join(pcb_svg_body))

# -------------------------------------------------------------
# 4. EXPORT PARTS & CONNECTIONS CSV
# -------------------------------------------------------------
hien_data = json.loads((root / 'data/hien.json').read_text())

with (downloads / 'hien-parts.csv').open('w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['ID', 'Name', 'Specification', 'Qty', 'Evidence', 'Note'])
    for p in hien_data['parts']:
        w.writerow([p['id'], p['name'], p['spec'], p['quantity'], p['evidence'], p['note']])

with (downloads / 'hien-connections.csv').open('w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['Connector', 'Net', 'Target', 'Note'])
    for c in hien_data['connections']:
        w.writerow([c['connector'], c['net'], c['target'], c['note']])

print('Generated Hien assets: mechanism.svg, schematic.svg, pcb.svg, kicad_pcb, and CSVs.')
