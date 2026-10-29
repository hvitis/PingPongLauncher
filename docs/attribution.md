# Sources and rights

The project starts from files supplied in the workspace. The source set contains a STEP assembly exported from SolidWorks 2022, a Bambu Studio 3MF project, an XLS hardware list, a DOCX with four annotated photographs, five separate photographs, a CAD screenshot, and a 15.33-second video. The root STEP duplicates the STEP in the supplied directory.

The 3MF metadata names Bambu Studio 01.08.04.51 and records December 18, 2025. The STEP header records December 19, 2025. These are source metadata, not claims about the original design or publication date.

No author, upstream project URL, or hardware/media license was supplied. Ownership of the design is not attributed to the repository maintainer. Confirm permission before public redistribution. Translation, organization, and conversion do not establish a license for the underlying hardware, photos, or video.

The repository LICENSE applies to the newly written website and tooling code only. It excludes the supplied design, derived CAD/print meshes, photographs, and video.

## Third-party software

- Three.js 0.180.0 is bundled locally under its MIT license. See [the retained license](vendor/LICENSE) and [Three.js installation documentation](https://threejs.org/manual/pages/installation.html).
- occt-import-js 0.0.23 converts the STEP for the viewer. It is a development tool, not a browser runtime dependency. Review its package and Open CASCADE notices before redistributing that tool.
- The deployment follows [GitHub’s Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Interpretation boundaries

The English BOM translates the spreadsheet. The consumables come from photo annotations. The procedure and animations reconstruct a possible assembly sequence. The engineering checks and DC topology are guide additions. They are labeled separately from the translated source.

The viewer uses 101 meshes tessellated from the STEP assembly. It applies guide colors and group offsets for illustrative animation. The print project contains 28 objects and is a different representation of the design. The two representations are not asserted to have identical revision geometry.

## Provenance after cleanup

The original Chinese-named inputs are removed at the user’s request after derivative verification. [source-manifest.json](data/source-manifest.json) retains their historical names and hashes. Useful source content remains under English filenames, with translated annotations in [translation.md](translation.md). Component reference photographs, vector illustrations, and supplier photo rights are cataloged in [component-image-sources.md](component-image-sources.md).

## Second launcher: Mobile01 Arduino project

[codyhsu’s Mobile01 post](https://www.mobile01.com/topicdetail.php?f=696&t=5867234), published 9 August 2019, is the source for the second launcher study. Its BOM and wiring photographs were inspected on 27 October 2026. Source photographs are linked rather than bundled. No redistribution license was established. Newly drawn vectors are explanatory reconstructions; the proposed pin map and PCB placement are additions by this guide. They are not the author’s manufacturing files. See [analysis and sources](mobile01-analysis.md).


## Third launcher: Nguyen Van Hien’s BLE robot

[Nguyen Van Hien’s YouTube video "Home-made Table Tennis Robot"](https://www.youtube.com/watch?v=-pSiuAdUKP4), published 1 January 2020, is the source for the third launcher study. Its video demonstration, Fusion 360 CAD animation (`ASM v145`), and iPhone app screen were inspected on 27 October 2026. Creator contact: `phuongchiphysics@gmail.com`. Source video is linked rather than bundled. No redistribution license for original video or CAD was established. Newly drawn vectors are explanatory reconstructions; the proposed ATX power & servo distribution breakout and pin map are additions by this guide. They are not the author’s manufacturing files. See [analysis and sources](hien-analysis.md).

## PingPongThrower

The third project is ported from the supplied PingPongThrower project and maintained in `docs/thrower/`, retaining its OpenSCAD-derived STL meshes, MicroPython documentation, BOM, assembly data and print kits. Its bundled Three.js and addon license is retained at [thrower/web/vendor/three/LICENSE](thrower/web/vendor/three/LICENSE). Simulation performance is an estimate, not physical build validation.
