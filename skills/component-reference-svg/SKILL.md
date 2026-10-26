---
name: component-reference-svg
description: Create small SVG illustrations of physical components from inspected product photographs, with matching photo thumbnails and source records for parts lists or build guides. Use for BOM imagery and component identification, not dimensioned engineering drawings or CAD conversion.
---

# Component illustrations from photo references

Create recognizable, editable SVG artwork from the visible structure of real component photographs. Keep purchasing compatibility separate from appearance.

## Reference and scope

- Prefer the product page already used by the parts list. Choose its main component photograph, not a recommendation carousel, brand logo, specification drawing, or social sharing card.
- Open the reference image before drawing. Record two or three observed features that make the part recognizable: head/socket shape, vent pattern, connector opening, board silhouette, or flange/hole arrangement.
- A different variant can establish appearance when labeled as a reference. Do not silently transfer its dimensions, motor speed, current, pinout, material grade, or compatibility to the BOM.
- For grouped rows, describe which item the photo depicts. A connector photo does not represent the entire protection circuit; a filament spool is not a finished guard.
- Keep the original source page, image URL, source credit, retrieval date, original-image checksum, and local-image checksum. Record any stated license. A public product image does not establish redistribution rights.

## Draw the SVG

Use native vector geometry. Do not embed the photograph in an SVG or replace it with an image-generation result.

For a compact BOM image, start with a `160 120` viewBox. Use a neutral background and a consistent three-quarter or clear front view. Capture the silhouette first, then the few details that survive at approximately 72 pixels wide. Preserve meaningful material differences such as brass, steel, black insulation, or a circuit board.

Use a limited palette, restrained gradients, and rounded joins. Avoid copied logos, product lettering, photorealistic tracing noise, simulated manufacturing marks, and decorative details that were not observed. Omit hidden features. Thread lines describe the type; they do not define a thread pitch. Drawings are not to scale unless dimensions were independently verified and that mode was explicitly requested.

Each standalone SVG needs a descriptive `<title>` and `<desc>`. Keep its drawing local and self-contained: no scripts, event handlers, embedded raster images, external fonts, remote references, or `foreignObject` elements. Prefix internal IDs with the component ID when reusing SVGs inline.

## Deliver and check

Keep photo and SVG assets local. Use lazy loading and fixed image dimensions in the table. Preserve the existing BOM wording and supplier match classifications. An enlarged view can show both versions and the source link; Escape, a close control, and focus restoration must work.

Inspect the finished SVGs together at their real thumbnail size. Check that an insert, hex nut, socket screw, and pointed self-tapping screw remain visibly different. Compare each result against its recorded photo, rather than only checking that it is valid XML.

For this repository, the manifest is `docs/data/component-visuals.json`. It contains `assets` keyed by photo ID and `components` keyed by BOM ID. Asset records include `photo`, `sourcePage`, `sourceImage`, `credit`, `checkedOn`, `sourceSha256`, `photoSha256`, and `rights`. Component records include `asset`, `svg`, `scope`, `observations`, and a plain-language `note` describing limitations.

Run the bundled validator against the actual output:

```sh
python3 skills/component-reference-svg/scripts/validate_assets.py --manifest docs/data/component-visuals.json --root docs
```

Then run the project's build checks. Report unresolved image sources or unverified physical matches without substituting an unrelated image as a confirmed part.
