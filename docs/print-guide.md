# Print guide

The English 3MF preserves the original geometry, plate assignments, orientations, profile, and painted support data. It changes part display names and removes the original computer path in model metadata.

## Saved source profile

| Setting | Saved value | Meaning |
|---|---|---|
| Printer profile | Bambu Lab A1 mini | Source profile; change it to your printer. |
| Build area | 180 × 180 mm | Source plate profile, not maximum assembly size. |
| Nozzle / layers | 0.4 / 0.20 mm | Saved source settings. |
| Walls / infill | 4 / 25% | Saved source settings. |
| Top / bottom | 5 / 3 layers | Saved source settings. |
| Support | Manual tree | Support enabled. Inspect painted regions before slicing. |
| Assigned filament | PETG, slot 1 | All 28 objects use slot 1. Other saved slots are PLA. |

All 28 objects use extruder/filament slot 1, configured as PETG. The project also contains saved PLA slots. Use the material and temperatures appropriate to your actual filament. Source settings are not a validated profile for another printer.

## Before printing

1. Open [launcher-english.3mf](downloads/launcher-english.3mf).
2. Select your printer, nozzle, bed, and material profiles.
3. Keep the geometry at 100% scale in millimeter units.
4. Inspect each part orientation and the available build volume.
5. Inspect support painting, thin walls, bridges, and first layers.
6. Review the full layer preview before exporting printer-specific G-code.
7. Print the bevel gears separately with a finer layer height.
8. Inspect the completed parts for cracks, blocked holes, and fit.

The source recommends a lower bevel-gear layer height but gives no value. First print a small fit-critical part to check your printer and material. Never scale a functional part to fit the bed; that changes shaft, bearing, and fastener fits.

## Plate inventory

| Plate | Objects | Parts |
|---|---|---|
| 1 | 1 | Hopper |
| 2 | 1 | Base enclosure |
| 3 | 1 | Base lid |
| 4 | 7 | Launch wheel A, Launch wheel B, Motor mount 1A, Motor mount 1B, Motor mount 2A, Motor mount 2B, Outlet tube - revision pending |
| 5 | 5 | Rear cover, Feed motor mount, Rear support, Tilt linkage A, Tilt linkage B |
| 6 | 1 | Main body half A |
| 7 | 1 | Main body half B |
| 8 | 8 | Wheel flange A, Wheel flange B, Bevel gear, Bevel pinion, Captive nut knob A, Captive nut knob B, Printed knob A, Printed knob B |
| 9 | 1 | Feed screw |
| 10 | 2 | Launch support A, Launch support B |

The STL pack contains one file per source object, organized by plate. Each STL uses the original build orientation and millimeter coordinates, then moves its minimum XYZ to zero. STL does not retain support painting, plate layout, or slicer settings. The 3MF is the preferred starting point.

## Mesh inspection

The 28 exported objects contain 1,422,006 triangles. The edge-incidence checks find zero boundary edges, zero non-manifold edges, and zero degenerate triangles. These checks use the shared source vertex indices before binary STL export.

These checks do not establish wall thickness, correct winding everywhere, self-intersection absence, strength, wheel balance, dimensional accuracy, or physical fit. No printer G-code, material total, or print time is claimed. The [machine-readable report](data/print-inventory.json) includes object dimensions and limitations.

## After printing

1. Remove supports without damaging bearing seats or thin walls.
2. Remove burrs and loose filament from the ball path.
3. Measure the shaft bores, insert pockets, and bearing seats.
4. Install inserts only in confirmed insert pockets.
5. Keep inserts square and stop at the required depth.
6. Dry-fit every joint before tightening its fasteners.
7. Measure a tight bevel-gear bore and correct its fit.

The original note suggests a lighter for a tight pinion. This guide uses measured fit correction because the source supplies no controlled heating procedure.
