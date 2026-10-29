"""Generate explanatory vectors and an unrouted KiCad control-breakout placement draft."""
from pathlib import Path
from xml.sax.saxutils import escape
import csv
root=Path(__file__).resolve().parent.parent/'docs'
assets=root/'assets/mobile01'
assets.mkdir(exist_ok=True)
def svg(name,w,h,title,desc,body):
 (assets/name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><title>{escape(title)}</title><desc>{escape(desc)}</desc><rect width="{w}" height="{h}" rx="22" fill="#f5f7fa"/><g font-family="Arial,sans-serif" fill="#253347">{body}</g></svg>\n')
def text(x,y,s,size=17,color='#253347'):
 return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}">{escape(s)}</text>'
def box(x,y,w,h,label,sub='',color='#e2edfc'):
 return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{color}" stroke="#899bb1"/>'+text(x+15,y+29,label,18)+text(x+15,y+53,sub,13)
body='''<ellipse cx="445" cy="592" rx="310" ry="34" fill="#dfe4ec"/>
<path d="M370 395 V563 M300 568 H490 M404 562 L475 592" fill="none" stroke="#c8a579" stroke-width="24" stroke-linejoin="round"/>
<path d="M297 347 H578 V388 H297 Z" fill="#bb9567"/><path d="M345 370 H485" stroke="#927049" stroke-width="9"/>
<path d="M433 154 H662 L634 328 H461 Z" fill="#3382d6"/><ellipse cx="547" cy="154" rx="115" ry="25" fill="#b9d8fa"/><ellipse cx="547" cy="328" rx="86" ry="16" fill="#1f60a8"/>
<g fill="#fff" stroke="#a9bed6" stroke-width="2"><circle cx="493" cy="145" r="23"/><circle cx="539" cy="128" r="24"/><circle cx="589" cy="143" r="25"/><circle cx="624" cy="123" r="22"/><circle cx="561" cy="164" r="23"/></g>
<ellipse cx="547" cy="336" rx="84" ry="16" fill="#63738a"/><path d="M495 335 L554 342 L595 330" fill="none" stroke="#dfe9f5" stroke-width="6"/>
<path d="M500 350 H231" stroke="#d0d8e2" stroke-width="66"/><path d="M500 350 H231" stroke="#eef1f5" stroke-width="52"/>
<rect x="215" y="284" width="55" height="46" rx="5" fill="#6e7b8a"/><rect x="215" y="372" width="55" height="46" rx="5" fill="#6e7b8a"/>
<ellipse cx="243" cy="334" rx="37" ry="14" fill="#edaa52" stroke="#263341" stroke-width="10"/><ellipse cx="243" cy="368" rx="37" ry="14" fill="#edaa52" stroke="#263341" stroke-width="10"/>
<path d="M213 350 H96 M96 350 L109 339 M96 350 L109 361" stroke="#0071e3" stroke-width="3" fill="none"/>
<rect x="349" y="388" width="44" height="25" rx="4" fill="#27415f"/><path d="M370 388 L409 366" stroke="#6e7b8a" stroke-width="5"/>
<rect x="367" y="360" width="21" height="27" fill="#d3b578" stroke="#806c48"/><circle cx="377" cy="370" r="3" fill="#806c48"/>
<path d="M390 406 C450 480 569 418 616 521" fill="none" stroke="#65758b" stroke-width="4"/>
<path d="M586 511 L737 511 L781 553 L627 553 Z" fill="#dae5f2" stroke="#8d9db1"/><path d="M627 553 H781 V585 H627 Z" fill="#bed0e6"/><path d="M586 511 L627 553 V585 L586 543 Z" fill="#a7bed8"/>
<g fill="#253347"><ellipse cx="637" cy="527" rx="10" ry="7"/><ellipse cx="673" cy="527" rx="10" ry="7"/><ellipse cx="709" cy="527" rx="10" ry="7"/></g>
<g stroke="#8799af" stroke-width="1.5" fill="none"><path d="M674 180 H777 V150"/><path d="M616 338 H779 V304"/><path d="M215 294 H105 V245"/><path d="M350 410 H119 V462"/><path d="M688 570 V615"/></g>'''
for x,y,s in [(676,135,'01 / BUCKET HOPPER'),(643,290,'02 / ROTARY FEEDER'),(38,228,'03 / TWIN WHEELS'),(36,484,'04 / HINGE + SERVO'),(573,641,'05 / MEGA + CONTROL BOX')]:body+=text(x,y,s,15)
body+=text(35,45,'MOBILE01 / MECHANISM STUDY',15)+text(35,71,'Explanatory reconstruction • no manufacturing dimensions',13,'#65758b')
svg('mechanism.svg',900,680,'Cody’s Arduino launcher mechanism','Bucket hopper and rotary disk on a wooden frame; twin launch wheels, hinge with servo and wired Mega control box. Reconstructed from source photography, not CAD.',body)
body=text(35,40,'PROPOSED SYSTEM / MOTOR POWER STAYS OFF THE BREAKOUT',19)
body+=box(40,70,205,75,'USB → Mega logic','5 V logic source')+box(365,70,295,75,'Mega 2560 + v1 shield','No complete source sketch supplied')+box(775,70,280,75,'M1 / M2 / M3','Left wheel / right wheel / feeder')
body+='<path d="M245 105 H365 M660 105 H775" stroke="#0071e3" stroke-width="3"/>'
body+=box(40,180,270,80,'Motor supply → fuse','Disconnect → EXT_PWR; jumper OFF', '#fff0dc')+box(775,180,280,80,'Servo / independent 5 V','D9 signal; ground shared; +5 V isolated','#fff0dc')
body+='<path d="M310 220 H335 V125 H365" fill="none" stroke="#cd8133" stroke-width="3"/><path d="M650 145 V220 H775" fill="none" stroke="#0071e3" stroke-width="3"/>'
body+=text(40,290,'All grounds common. Motor/servo returns bypass the control PCB. Do not join supply positive rails.',16)
body+=text(40,329,'CONTROL BREAKOUT / NET-LABEL SCHEMATIC',18)
items=[('J1 Mega harness','1 GND · 2 +5V_LOGIC','3 A0 · 4 A1 · 5 A2 · 6 D22 · 7 D24 · 8 D26'),('J2 feed / J3 speed / J4 sweep','Each: 1 GND · 2 wiper · 3 +5V_LOGIC','Wipers → A0 / A1 / A2 respectively; external B10K pots'),('J5 ball switch','1 GND → COM · 2 D22 → NO','INPUT_PULLUP; active low; debounce in firmware'),('J6 IR receiver module','1 GND · 2 +5V_LOGIC · 3 D24','Reorder harness to match the selected HX1838 module'),('J7 passive buzzer driver module','1 GND · 2 +5V_LOGIC · 3 D26','External driver accepts 5 V logic and tone pulses')]
for i,(label,line,note) in enumerate(items):
 y=350+i*73
 body+=f'<rect x="40" y="{y}" width="1015" height="64" rx="8" fill="#e4edf8"/>'+text(55,y+25,label,16)+text(400,y+25,line,16)+text(400,y+48,note,13,'#52657e')
body+=text(40,748,'C1 100 nF ceramic and C2 10 µF / ≥10 V: between +5V_LOGIC and GND.',16)
body+=text(40,778,'Named nets define electrical connections. Connector ordering is a new design choice; verify hardware before wiring.',13,'#52657e')
svg('schematic.svg',1100,820,'Proposed Mobile01 system and control-breakout schematic','External power and motor shield connections with a complete labelled connector net map. New proposed pins, not original source wiring.',body)
nets=['GND','+5V_LOGIC','FEED_A0','SPEED_A1','SWEEP_A2','BALL_D22','IR_D24','TONE_D26']
components=[('J1','Mega harness',28,28,nets,0),('J2','Feed pot',43,29,['GND','FEED_A0','+5V_LOGIC'],1),('J3','Speed pot',62,29,['GND','SPEED_A1','+5V_LOGIC'],1),('J4','Sweep pot',81,29,['GND','SWEEP_A2','+5V_LOGIC'],1),('J5','Ball switch',43,44,['GND','BALL_D22'],1),('J6','IR module',62,44,['GND','+5V_LOGIC','IR_D24'],1),('J7','Buzzer driver',81,44,['GND','+5V_LOGIC','TONE_D26'],1),('C1','100nF',44,60,['+5V_LOGIC','GND'],1),('C2','10uF 10V',65,60,['+5V_LOGIC','GND'],1)]
board=['(kicad_pcb (version 20221018) (generator pcbnew) (general (thickness 1.6)) (paper "A4")','(layers (0 "F.Cu" signal) (31 "B.Cu" signal) (36 "B.SilkS" user "b.silkscreen") (37 "F.SilkS" user "f.silkscreen") (38 "B.Mask" user) (39 "F.Mask" user) (44 "Edge.Cuts" user))','(setup (pad_to_mask_clearance 0))','(net 0 "")']
board += [f'(net {i} "{n}")' for i,n in enumerate(nets,1)]
body=text(35,40,'CONTROL BREAKOUT / PLACEMENT ONLY',20)+text(35,66,'80 × 55 mm • 2 layers • unconnected pads shown; copper routing remains open',15,'#65758b')
body+='<rect x="90" y="100" width="720" height="495" rx="10" fill="#173f3c" stroke="#102e2c" stroke-width="3"/>'
netrows=[]
for ref,label,x,y,ns,horizontal in components:
 if ref.startswith('J'):
  lib=f'Connector_PinHeader_2.54mm:PinHeader_1x{len(ns):02d}_P2.54mm_Vertical'
 else:lib='Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm' if ref=='C1' else 'Capacitor_THT:CP_Radial_D5.0mm_P2.50mm'
 pitch=2.54 if ref.startswith('J') else 2.5
 board.append(f'(footprint "{lib}" (layer "F.Cu") (at {x} {y}) (attr through_hole) (fp_text reference "{ref}" (at 0 -2.6) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))')
 board.append(f'(fp_text value "{label}" (at 0 {len(ns)*pitch+1}) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))')
 sx=90+(x-20)*9;sy=100+(y-20)*9
 body+=text(sx-4,sy-21,f'{ref} / {label}',13,'#e2f1eb')
 for k,n in enumerate(ns):
  px=k*pitch if horizontal else 0;py=0 if horizontal else k*pitch
  shape='rect' if k==0 else 'circle'
  board.append(f'(pad "{k+1}" thru_hole {shape} (at {px} {py}) (size 1.8 1.8) (drill 1) (layers "*.Cu" "*.Mask") (net {nets.index(n)+1} "{n}"))')
  cx=sx+px*9;cy=sy+py*9
  body+=f'<circle cx="{cx}" cy="{cy}" r="7" fill="#d9b56d"/><circle cx="{cx}" cy="{cy}" r="3" fill="#102e2c"/>'
  body+=text(cx+9,cy+4,str(k+1),10,'#e2f1eb')
  netrows.append([ref,k+1,n])
 board.append(')')
for x,y in [(24,24),(96,24),(24,71),(96,71)]:
 board.append(f'(footprint "MountingHole:MountingHole_3.2mm_M3" (layer "F.Cu") (at {x} {y}) (attr exclude_from_pos_files exclude_from_bom) (pad "" np_thru_hole circle (at 0 0) (size 3.2 3.2) (drill 3.2) (layers "*.Cu" "*.Mask")))')
 body+=f'<circle cx="{90+(x-20)*9}" cy="{100+(y-20)*9}" r="14.4" fill="#f5f7fa"/>'
for x1,y1,x2,y2 in [(20,20,100,20),(100,20,100,75),(100,75,20,75),(20,75,20,20)]:
 board.append(f'(gr_line (start {x1} {y1}) (end {x2} {y2}) (stroke (width 0.05) (type default)) (layer "Edge.Cuts"))')
board.append('(gr_text "M01 CONTROL DRAFT - UNROUTED" (at 60 68) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))')
board.append(')')
(root/'downloads/mobile01-control-breakout.kicad_pcb').write_text('\n'.join(board)+'\n')
with (root/'downloads/mobile01-pcb-netlist.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['Reference','Pad','Net']);w.writerows(netrows)
body+=text(160,548,'M01 / CONTROL DRAFT',23,'#e2f1eb')+text(160,577,'No motor or servo supply on this PCB',16,'#b5d2c8')+text(90,626,'J1: wired harness, not an Arduino shield. Check all footprints before routing.',15)
svg('pcb.svg',900,650,'Mobile01 control-breakout PCB placement draft','Unrouted 80 by 55 millimetre board with J1 Mega harness, J2 through J4 pots, J5 switch, J6 IR, J7 buzzer driver, two capacitors and four 3.2 millimetre mounting holes.',body)
print('Generated three SVG diagrams, KiCad placement draft and pad-to-net CSV.')
