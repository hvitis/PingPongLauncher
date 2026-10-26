# Shopping checklist for the complete launcher

This list combines the translated source hardware, photo-based consumables, printing materials, and guide additions for installation and commissioning. Quantities from the spreadsheet are purchase quantities, not verified installed counts.

Before buying, resolve the motor shafts, current ratings, fastener differences, wheel rubber, guards, and support mounting. “Confirm” and “to fit” entries require a measured selection. A complete list of functions is not a verified selection of compatible products.

## Electronics

- [ ] **1 — Geared feed motor (H06)**. 12 V · 77 rpm · source torque notation: 2 kg.
  Torque unit is incomplete. Confirm shaft diameter, mounting, rated current, and stall current. Source: Spreadsheet, row 7.

- [ ] **2 — 550 launch motors (H07)**. 12 V · body Ø35.8 mm · source Hmin = 52+ mm.
  Confirm body length reference, shaft diameter, shaft length, speed, and current before buying. Source: Spreadsheet, row 8.

- [ ] **5 m — Hookup wire (H12)**. 0.5 mm², source suggestion.
  Confirm wire rating for the actual motor current and installation. Source: Spreadsheet, row 13.

- [ ] **1 — DC power supply (H13)**. 12 V · 3 A · 36 W.
  This is the source specification, not a verified system power budget. Use an enclosed, isolated supply. Source: Spreadsheet, row 14.

- [ ] **1 — Inline switch (H14)**. Source keyword: hand-operated inline switch.
  Source says to switch the live conductor. This guide uses a DC-rated switch in the +12 V lead only. Source: Spreadsheet, row 15.

- [ ] **3 — PWM motor controllers (H15)**. Youxin type in source · one per motor.
  Other brands can have different dimensions and mounting holes. Confirm voltage and motor-current ratings. Source: Spreadsheet, row 16.

- [ ] **Design to confirm — DC connectors, insulation, and branch protection (H20)**. Matching DC inlet, strain relief, insulated terminals, and selected protection.
  Connector polarity, fuse values, and branch current limits need confirmation before power-on. Source: Guide addition, not in source BOM.

## Fasteners

- [ ] **20 — M3 heat-set inserts (H01)**. M3 × 5 × 5 mm, source notation.
  Confirm outside diameter and length against the printed pockets. Source: Spreadsheet, row 2.

- [ ] **10+ — Socket head screws (H02)**. M3 × 20 mm, 304 stainless steel.
  CAD also contains M3 × 18 mm screws. Measure each joint before installation. Source: Spreadsheet, row 3.

- [ ] **50 — Socket head screws (H03)**. M3 × 10 mm, 304 stainless steel.
  Do not assume that every screw position uses this length. Source: Spreadsheet, row 4.

- [ ] **2 — Socket head screws (H04)**. M3 × 25 mm, 304 stainless steel.
  Compare with the rear support in the CAD. Source: Spreadsheet, row 5.

- [ ] **10 — Socket head screws (H05)**. M3 × 65 mm, 304 stainless steel.
  Source purchase quantity, not a confirmed installed count. Source: Spreadsheet, row 6.

- [ ] **2 — Star knob screws (H08)**. M5 × 12 mm.
  CAD also shows an M5 × 35 mm tilt bolt, wing nut, and washer, absent from this purchase list. Source: Spreadsheet, row 9.

- [ ] **2 — M5 hex nuts (H09)**. M5.
  Confirm the printed nut pockets. Source: Spreadsheet, row 10.

- [ ] **About 20 — M3 hex nuts (H10)**. M3.
  The source says a small quantity, approximately 20. Source: Spreadsheet, row 11.

- [ ] **About 20 — Self-tapping screws (H11)**. M3 × 14 mm, source notation.
  The source suggests buying 100 if a small pack is unavailable. Confirm thread and pilot-hole fit. Source: Spreadsheet, row 12.

- [ ] **Confirm in CAD — Additional CAD fasteners (H19)**. M3 × 15 mm; M3 × 18 mm; M5 × 35 mm; M5 wing nut and washer.
  These appear in the CAD but are missing or different in the spreadsheet. Resolve before ordering. Source: STEP assembly component names.

## Mechanical

- [ ] **4 — Bearings (H16)**. 7 mm bore × 16 mm OD × 5 mm width.
  Source notation: d=7, D=16, h=5. Confirm shaft and pocket fit. Source: Spreadsheet, row 17.

- [ ] **To match guard design — Guard material and mounting hardware (H23)**. Guards for accessible wheels, feeder, and gears.
  No validated guard design is supplied. Confirm material, clearance, and attachment before selecting or printing parts. Source: Guide addition, not in source BOM.

- [ ] **1 installation — Stable support and non-slip pads (H24)**. Rigid support matched to the launcher base and trial area.
  Select the mounting method after inspecting the base and the chosen work surface. Mounting fasteners are not specified. Source: Guide addition, not in source BOM.

## Consumables

- [ ] **To fit — Table tennis rubber + adhesive (H17)**. Rubber strips for both launch wheels; source adhesive: 502 cyanoacrylate.
  Rubber thickness and strip length are not specified. Keep both wheels balanced. Source: Annotated image 3.

- [ ] **To fit — Ball stopper + cable ties (H18)**. Short filament piece or thin shaft; source mentions 10 mm.
  The 10 mm reference is ambiguous. Confirm length and position against the photographs. Source: Annotated image 3 and prototype photographs.

- [ ] **Confirm from slice total — Printing filament (H21)**. 1.75 mm PETG in the source project; match the selected printer/material profile.
  Use the slicer total for all ten plates, plus supports and trial prints. No spool count or mass is verified. Source: 3MF filament slot 1.

- [ ] **At least 3 for trials — 40 mm table tennis balls (H22)**. Consistent 40 mm balls for initial trials.
  The trial quantity is a guide suggestion, not a verified hopper capacity. Source: STEP ball diameter + guide trial quantity.

## Botland sourcing and compatibility

Listings checked 2026-10-26. Links open the Polish shop. Current prices and stock remain on the linked pages.

- **Listed spec matches:** The listing matches the stated specification. Physical fit and system suitability still need confirmation.
- **Alternative · check fit:** A functional candidate with differences from the source part. Confirm dimensions, current ratings, and mounting.
- **Partial supply:** The link supplies only part of this row. Other materials or selections are still needed.
- **No verified match:** No matching Botland product was verified. Browse links are categories, not confirmed substitutes.

| ID | Botland listing or category | Match status | Fit and purchase notes |
|---|---|---|---|
| H01 | [Browse mounting parts (browse only)](https://botland.com.pl/11-elementy-montazowe) | No verified match | No current M3 × 5 × 5 mm insert was verified. The retired Botland insert set lists a different M3 outside diameter. Confirm the actual printed pocket.  |
| H02 | [M3/M4/M5/M6 screw kit · AKS-23456](https://botland.com.pl/srubki-i-nakretki/23456-zestaw-srub-i-nakretek-m3m4m5m6-1000szt-5904257801784.html) | Alternative · check fit | The shared kit lists 25 M3 × 20 mm screws. Socket-head geometry and 304 stainless steel are not confirmed. Compare the head clearance before substitution. One shared kit can cover H02, H03, and H09. Do not buy one kit for every row. |
| H03 | [Shared screw kit · AKS-23456](https://botland.com.pl/srubki-i-nakretki/23456-zestaw-srub-i-nakretek-m3m4m5m6-1000szt-5904257801784.html) | Alternative · check fit | The shared kit lists 50 M3 × 10 mm screws. Socket-head geometry and 304 stainless steel are not confirmed. Included in the same kit linked in H02. |
| H04 | [Browse fasteners (browse only)](https://botland.com.pl/120-srubki-i-nakretki) | No verified match | No M3 × 25 mm socket-head product was verified. The linked shared kit does not list M3 × 25 mm screws.  |
| H05 | [Browse fasteners (browse only)](https://botland.com.pl/120-srubki-i-nakretki) | No verified match | No M3 × 65 mm socket-head product was verified. Source this length separately after confirming the CAD joint.  |
| H06 | [Browse geared motors (browse only)](https://botland.com.pl/328-silniki-dc-standard-z-przekladnia) | No verified match | No 12 V / 77 rpm motor with a verified matching body, shaft, and mounting pattern was found. A similar rpm alone does not establish fit.  |
| H07 | [Browse motors (browse only)](https://botland.com.pl/5-silniki) | No verified match | No matching 12 V 550 motor with the source Ø35.8 mm body and confirmed shaft dimensions was verified.  |
| H08 | [Browse fasteners (browse only)](https://botland.com.pl/120-srubki-i-nakretki) | No verified match | No M5 × 12 mm star-knob screw was verified. A normal M5 screw is not a confirmed substitute for this adjustment handle.  |
| H09 | [Shared kit with M5 nuts · AKS-23456](https://botland.com.pl/srubki-i-nakretki/23456-zestaw-srub-i-nakretek-m3m4m5m6-1000szt-5904257801784.html) | Listed spec matches | The shared kit lists 40 M5 nuts. Confirm the nut shape and width against the printed pocket. Use the same kit as H02/H03; only two M5 nuts are specified by the source. |
| H10 | [M3 nuts · 10-pack · NSZ-00806](https://botland.com.pl/srubki-i-nakretki/806-nakretki-m3-10szt-5904422300982.html) | Listed spec matches | Metal M3 nuts, ten per pack. Confirm fit in the printed nut pockets. Two 10-packs cover about 20 nuts. Skip these packs if using the shared kit, which already lists 100 M3 nuts. |
| H11 | [Browse fasteners (browse only)](https://botland.com.pl/120-srubki-i-nakretki) | No verified match | No M3 × 14 mm self-tapping product was verified. M3 × 14 mm machine screws in a kit do not replace self-tapping screws.  |
| H12 | [LgY 1 × 0.5 mm² black wire · KAB-06689](https://botland.com.pl/przewody-lgy/6689-przewod-instalacyjny-lgy-1x05-h05v-k-czarny-rolka-100m-5907702813332.html) | Listed spec matches | Stranded copper wire with a 0.5 mm² cross-section. Confirm its rating for the measured branch current. Sold as a 100 m roll; the source calls for 5 m. A smaller length from another supplier can avoid surplus. |
| H13 | [12 V / 5 A adapter · PIN-13231](https://botland.com.pl/zasilanie-pine64/13231-zasilacz-12v-5a-dc-55x21mm-do-pine64-rockpro64-850796007291.html) | Alternative · check fit | Enclosed 12 V / 5 A adapter with a 5.5 × 2.1 mm plug. This differs from the source 3 A supply. Confirm polarity, connector fit, and the complete measured current budget. One adapter is a candidate only after the real load and protection are selected. |
| H14 | [ASW-14D switch · UCC-08389](https://botland.com.pl/przelaczniki-dzwigienkowe/8389-przelacznik-dzwigniowy-on-off-asw-14d-12v20a-podswietlany-zielony-5904422311650.html) | Alternative · check fit | The ASW-14D listing specifies 12 V / 20 A. It is a panel toggle, not the source inline switch. Confirm DC motor-load suitability, wiring, and the required mounting hole. One switch; requires a suitable panel or separate switch enclosure. |
| H15 | [Cytron MD10-POT · CTN-13450](https://botland.com.pl/sterowniki-silnikow-moduly/13450-cytron-md10-pot-sterownik-silnikow-dc-30v10a-przelacznik-potencjometr-5904422377274.html) | Alternative · check fit | Cytron MD10-POT: 7–30 V, 10 A continuous, manual potentiometer. Its 81.28 × 48.26 mm board differs from the source mounts; the base layout needs redesign. Confirm motor currents. No reverse-polarity protection. Three controllers, one per motor, only if the redesigned mounting and electrical ratings are confirmed. |
| H16 | [Browse mechanical parts (browse only)](https://botland.com.pl/11-elementy-montazowe) | No verified match | No bearing with the exact 7 mm bore × 16 mm OD × 5 mm width was verified. Do not replace it with a similar bearing size.  |
| H17 | No verified listing | No verified match | No complete wheel-rubber and compatible adhesive combination was verified. Source table tennis rubber and select adhesive for the actual rubber and PETG.  |
| H18 | [PETG stopper material · same spool as H21](https://botland.com.pl/filamenty-petg/23711-filament-devil-design-petg-175mm-1kg-graphite-5902280033240.html) | Partial supply | A short piece of filament can provide the source stopper material. The filament does not cover the cable ties. Confirm the ambiguous stopper length and source ties separately. Use an offcut from H21; do not buy a separate spool for this row. |
| H19 | [Browse fasteners (browse only)](https://botland.com.pl/120-srubki-i-nakretki) | No verified match | No complete set covering the extra M3 × 15/18 mm and M5 × 35 mm fasteners, wing nut, and washer was verified.  |
| H20 | [5.5 × 2.1 mm panel socket · KAB-13693](https://botland.com.pl/wtyki-dc/13693-gniazdo-dc-5521mm-do-obudowy-10szt-5904422342029.html) | Partial supply | The 5.5 × 2.1 mm panel socket matches the nominal plug size of H13’s candidate adapter. Confirm its current rating and panel fit. Insulation, strain relief, and selected branch protection remain separate. The socket is sold in a 10-pack; the installation needs one inlet. Other electrical items are not included. |
| H21 | [Devil Design PETG · DEV-23711](https://botland.com.pl/filamenty-petg/23711-filament-devil-design-petg-175mm-1kg-graphite-5902280033240.html) | Listed spec matches | Devil Design PETG, 1.75 mm, 1 kg, Graphite. This matches the saved material type and diameter. Use a profile for the actual filament; printed fit remains unverified. Confirm spool quantity from all ten sliced plates, supports, and trial prints. The same spool can supply H18 and guard material. |
| H22 | No verified listing | No verified match | No matching 40 mm table tennis ball listing was verified at Botland. Use a sports supplier.  |
| H23 | [PETG material · same spool as H21](https://botland.com.pl/filamenty-petg/23711-filament-devil-design-petg-175mm-1kg-graphite-5902280033240.html) | Partial supply | PETG is available as a candidate guard-printing material. No guard geometry, thickness, attachment, or clearance is validated by this link. Share H21 material if the verified guard design uses PETG; mounting hardware remains to be selected. |
| H24 | [Browse mounting parts (browse only)](https://botland.com.pl/11-elementy-montazowe) | No verified match | A rigid support, mounting fasteners, and non-slip pads need selection for the actual work surface. No complete matching installation was verified.  |

The AKS-23456 kit is shared across H02, H03, and H09. It already lists M3 nuts, so H10 packs can be omitted if using that kit. H18 and H23 can share H21 material when the confirmed design permits it. Do not buy the same kit or spool once per row.

## Tools to borrow or buy

- [ ] FDM printer and a slicer that supports Bambu 3MF projects
- [ ] Hex keys matched to the selected screws
- [ ] Calipers, small file, and deburring tool
- [ ] Temperature-controlled insert tool or soldering iron
- [ ] Wire stripper, suitable crimp tool, and insulated terminals
- [ ] Multimeter and current-limited 12 V bench supply for commissioning

Eye protection and a clear trial area with a suitable catch net are also needed for commissioning. Select adhesives compatible with the actual rubber and printed material.

## Before checkout

- [ ] Resolve CAD versus spreadsheet fasteners: M3 × 15/18/20 mm and M5 tilt hardware.
- [ ] Confirm both 550 motor shaft dimensions, speeds, running currents, and stall currents.
- [ ] Confirm the geared motor shaft and the incomplete 2 kg torque notation.
- [ ] Confirm controller terminal labels, current ratings, mounting, and branch protection.
- [ ] Measure the complete current budget before relying on the source 12 V / 3 A supply.
- [ ] Confirm insert pockets, bearing fits, support mounting, and each fastener location.
- [ ] Resolve the outlet revision and measure the stopper, rubber thickness, and final wheel gap.
- [ ] Complete guards, slice inspection, and a physical build review before routine use.

The website saves gathered-item checkboxes locally on your device. No shop account or purchase is connected. Use the CSV download for a spreadsheet or a printed buying list.
