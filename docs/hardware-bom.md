# Translated hardware list

Quantities follow the supplied spreadsheet, unless the source column identifies a guide addition or photo. They are purchase quantities, not a verified installed count.

| ID | Part | Specification | Quantity | Source | Build note |
|---|---|---|---|---|---|
| H01 | M3 heat-set inserts | M3 × 5 × 5 mm, source notation | 20 | Spreadsheet, row 2 | Confirm outside diameter and length against the printed pockets. |
| H02 | Socket head screws | M3 × 20 mm, 304 stainless steel | 10+ | Spreadsheet, row 3 | CAD also contains M3 × 18 mm screws. Measure each joint before installation. |
| H03 | Socket head screws | M3 × 10 mm, 304 stainless steel | 50 | Spreadsheet, row 4 | Do not assume that every screw position uses this length. |
| H04 | Socket head screws | M3 × 25 mm, 304 stainless steel | 2 | Spreadsheet, row 5 | Compare with the rear support in the CAD. |
| H05 | Socket head screws | M3 × 65 mm, 304 stainless steel | 10 | Spreadsheet, row 6 | Source purchase quantity, not a confirmed installed count. |
| H06 | Geared feed motor | 12 V · 77 rpm · source torque notation: 2 kg | 1 | Spreadsheet, row 7 | Torque unit is incomplete. Confirm shaft diameter, mounting, rated current, and stall current. |
| H07 | 550 launch motors | 12 V · body Ø35.8 mm · source Hmin = 52+ mm | 2 | Spreadsheet, row 8 | Confirm body length reference, shaft diameter, shaft length, speed, and current before buying. |
| H08 | Star knob screws | M5 × 12 mm | 2 | Spreadsheet, row 9 | CAD also shows an M5 × 35 mm tilt bolt, wing nut, and washer, absent from this purchase list. |
| H09 | M5 hex nuts | M5 | 2 | Spreadsheet, row 10 | Confirm the printed nut pockets. |
| H10 | M3 hex nuts | M3 | About 20 | Spreadsheet, row 11 | The source says a small quantity, approximately 20. |
| H11 | Self-tapping screws | M3 × 14 mm, source notation | About 20 | Spreadsheet, row 12 | The source suggests buying 100 if a small pack is unavailable. Confirm thread and pilot-hole fit. |
| H12 | Hookup wire | 0.5 mm², source suggestion | 5 m | Spreadsheet, row 13 | Confirm wire rating for the actual motor current and installation. |
| H13 | DC power supply | 12 V · 3 A · 36 W | 1 | Spreadsheet, row 14 | This is the source specification, not a verified system power budget. Use an enclosed, isolated supply. |
| H14 | Inline switch | Source keyword: hand-operated inline switch | 1 | Spreadsheet, row 15 | Source says to switch the live conductor. This guide uses a DC-rated switch in the +12 V lead only. |
| H15 | PWM motor controllers | Youxin type in source · one per motor | 3 | Spreadsheet, row 16 | Other brands can have different dimensions and mounting holes. Confirm voltage and motor-current ratings. |
| H16 | Bearings | 7 mm bore × 16 mm OD × 5 mm width | 4 | Spreadsheet, row 17 | Source notation: d=7, D=16, h=5. Confirm shaft and pocket fit. |
| H17 | Table tennis rubber + adhesive | Rubber strips for both launch wheels; source adhesive: 502 cyanoacrylate | To fit | Annotated image 3 | Rubber thickness and strip length are not specified. Keep both wheels balanced. |
| H18 | Ball stopper + cable ties | Short filament piece or thin shaft; source mentions 10 mm | To fit | Annotated image 3 and prototype photographs | The 10 mm reference is ambiguous. Confirm length and position against the photographs. |
| H19 | Additional CAD fasteners | M3 × 15 mm; M3 × 18 mm; M5 × 35 mm; M5 wing nut and washer | Confirm in CAD | STEP assembly component names | These appear in the CAD but are missing or different in the spreadsheet. Resolve before ordering. |
| H20 | DC connectors, insulation, and branch protection | Matching DC inlet, strain relief, insulated terminals, and selected protection | Design to confirm | Guide addition, not in source BOM | Connector polarity, fuse values, and branch current limits need confirmation before power-on. |
| H21 | Printing filament | 1.75 mm PETG in the source project; match the selected printer/material profile | Confirm from slice total | 3MF filament slot 1 | Use the slicer total for all ten plates, plus supports and trial prints. No spool count or mass is verified. |
| H22 | 40 mm table tennis balls | Consistent 40 mm balls for initial trials | At least 3 for trials | STEP ball diameter + guide trial quantity | The trial quantity is a guide suggestion, not a verified hopper capacity. |
| H23 | Guard material and mounting hardware | Guards for accessible wheels, feeder, and gears | To match guard design | Guide addition, not in source BOM | No validated guard design is supplied. Confirm material, clearance, and attachment before selecting or printing parts. |
| H24 | Stable support and non-slip pads | Rigid support matched to the launcher base and trial area | 1 installation | Guide addition, not in source BOM | Select the mounting method after inspecting the base and the chosen work surface. Mounting fasteners are not specified. |

## Tools

- FDM printer and a slicer that supports Bambu 3MF projects
- Hex keys matched to the selected screws
- Calipers, small file, and deburring tool
- Temperature-controlled insert tool or soldering iron
- Wire stripper, suitable crimp tool, and insulated terminals
- Multimeter and current-limited 12 V bench supply for commissioning

The original purchase links and historical prices remain in [the extracted source table](data/source-bom.json). They are not current recommendations.
