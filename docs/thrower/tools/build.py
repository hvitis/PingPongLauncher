#!/usr/bin/env python3
"""Build everything that is generated from cad/thrower.scad.

    python3 tools/build.py check          compile + verify every printable part and clash check
    python3 tools/build.py stl            export print-ready STLs to print/stl/
    python3 tools/build.py viz            export assembly-pose meshes + manifest for web/
    python3 tools/build.py 3mf [--printer P1S]   Bambu Studio project files to print/3mf/
    python3 tools/build.py a1             Bambu A1 projects (0.2 mm, 10 % infill) + one zip
                                          per POC test phase to print/a1/
    python3 tools/build.py all            check + stl + viz

Only needs OpenSCAD (2024+ recommended; set $OPENSCAD to override) and the
Python standard library. The 3MF step uses make-bambu-3mf.py from the
3d-print-designer skill; point $BAMBU3MF at it if it lives elsewhere.
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCAD = ROOT / "cad" / "thrower.scad"
STL_DIR = ROOT / "print" / "stl"
MF_DIR = ROOT / "print" / "3mf"
A1_DIR = ROOT / "print" / "a1"
WEB = ROOT / "web"
PHASES = ROOT / "web" / "data" / "phases.json"

# Printable parts: name -> (quantity, print notes). Single source for the BOM.
PARTS: dict[str, tuple[int, str]] = {
    "tray":         (1, "Base box. As exported (floor down). 4 walls, 15 % gyroid. Brim optional."),
    "lid":          (1, "Base lid, printed upside down (bearing boss up). 4 walls, 20 % gyroid."),
    "spacer_parts": (1, "Bearing spacer + 2 inner-race shims (3 rings, one plate). 100 % infill."),
    "coupler":      (1, "Servo-to-nut coupler. 6 walls, 60 % infill."),
    "turret":       (1, "Turret plate. 4 walls, 25 % gyroid."),
    "cheek_left":   (1, "Yoke cheek, lies on its outer face. 4 walls, 25 % gyroid."),
    "cheek_right":  (1, "Yoke cheek (mirror of the left). 4 walls, 25 % gyroid."),
    "head_left":    (1, "Launcher head half, lies on its outer wall. 4 walls, 20 % gyroid."),
    "head_right":   (1, "Launcher head half with the motor pockets. 4 walls, 20 % gyroid."),
    "motor_clamp":  (2, "N20 clamp, flange down. 6 walls, 60 % infill."),
    "wheel_hub":    (3, "N20 D-shaft to wheel hub (TT-shaft stub, or LEGO cross with wheel_type = \"lego\"), lies on its side (1 spare). 0.12 mm layers, 100 % infill."),
    "feed_tube":    (1, "Feed tube with ears and servo plate, upright. 4 walls, 20 % gyroid."),
    "rocker":       (1, "Escapement rocker, flat, horn recess up. 6 walls, 60 % infill."),
    "hopper":       (1, "Basket adapter funnel, printed upside down (collar on the bed). 3 walls, 15 %."),
    "knob_pot":     (3, "Potentiometer knob (6 mm D-shaft). 3 walls, 20 %."),
    "knob_lock":    (2, "Elevation lock knob, press an M4×20 hex bolt in. 4 walls, 40 %."),
    "poc_base":     (1, "Bench plate for POC test phases 2–3, flat. 4 walls, 15 % gyroid."),
}
CLASH = ["clash_head_lo", "clash_head_mid", "clash_head_hi",
         "clash_ball_lo", "clash_ball_mid", "clash_ball_hi",
         "clash_rocker_in", "clash_rocker_out", "clash_coupler",
         "clash_poc_lo", "clash_poc_mid", "clash_poc_hi", "clash_poc_cheeks", "clash_knobs", "clash_loose"]

# Web meshes: part -> (group, colour hex, opacity, label). Groups are the moving
# sub-assemblies the viewer animates (see web/app.js).
VIEWS: dict[str, tuple[str, str, float, str]] = {
    "view_tray":        ("base",  "#3b4252", 1.0, "Base tray (printed)"),
    "view_lid":         ("base",  "#4c566a", 1.0, "Base lid with 2×608 bearing boss (printed)"),
    "view_swing_servo": ("base",  "#2f6fde", 1.0, "Swing servo MG90S"),
    "view_bearings":    ("base",  "#c0c6cf", 1.0, "608ZZ bearings ×2"),
    "view_battery":     ("base",  "#1d1d1f", 1.0, "4×AA battery holder"),
    "view_board":       ("base",  "#1f7a3a", 1.0, "Perfboard 50×70"),
    "view_pico":        ("base",  "#2fae5f", 1.0, "Raspberry Pi Pico 2 WH"),
    "view_driver":      ("base",  "#c0392b", 1.0, "DRV8833 motor driver"),
    "view_panel":       ("base",  "#9aa0a6", 1.0, "Panel: buttons, pots, LED"),
    "view_panel_switch": ("base", "#202124", 1.0, "Power switch KCD1"),
    "view_panel_knobs": ("base",  "#202124", 1.0, "Pot knobs (printed)"),
    "view_coupler":     ("yaw",   "#f2b705", 1.0, "Servo coupler (printed)"),
    "view_bolt":        ("yaw",   "#c0c6cf", 1.0, "M8×40 bolt + nyloc"),
    "view_turret":      ("yaw",   "#3d7ea6", 1.0, "Turret plate (printed)"),
    "view_cheeks":      ("yaw",   "#356f93", 1.0, "Yoke cheeks (printed)"),
    "view_feed_tube":   ("yaw",   "#9ec5e8", 0.55, "Feed tube (printed)"),
    "view_hopper":      ("yaw",   "#bcdcf5", 0.45, "Hopper funnel / basket adapter (printed)"),
    "view_feed_servo":  ("yaw",   "#2f6fde", 1.0, "Feed servo SG90"),
    "view_rocker":      ("rocker", "#f2b705", 1.0, "Escapement rocker (printed)"),
    "view_head_left":   ("pitch", "#e4572e", 1.0, "Head, left half (printed)"),
    "view_head_right":  ("pitch", "#e4572e", 0.92, "Head, right half (printed)"),
    "view_clamps":      ("pitch", "#f2b705", 1.0, "Motor clamps (printed)"),
    "view_motors":      ("pitch", "#c0c6cf", 1.0, "N20 6 V 3000 rpm motors"),
    "view_lock_knobs":  ("pitch", "#202124", 1.0, "Elevation lock knobs (printed)"),
    "view_hub_top":     ("wheel_top", "#f5f5f5", 1.0, "Wheel hub (printed)"),
    "view_tyre_top":    ("wheel_top", "#151515", 1.0, "Wheel tyre (rubber)"),
    "view_rim_top":     ("wheel_top", "#ffd400", 1.0, "Wheel rim"),
    "view_hub_bot":     ("wheel_bot", "#f5f5f5", 1.0, "Wheel hub (printed)"),
    "view_tyre_bot":    ("wheel_bot", "#151515", 1.0, "Wheel tyre (rubber)"),
    "view_rim_bot":     ("wheel_bot", "#ffd400", 1.0, "Wheel rim"),
    "view_balls":       ("ball",  "#ff8c1a", 1.0, "Ping-pong ball"),
    # POC bench rig (test phases 2–3)
    "view_poc_base":    ("base",  "#5b6372", 1.0, "POC bench plate (printed)"),
    "view_poc_board":   ("base",  "#1f7a3a", 1.0, "Perfboard 50×70"),
    "view_poc_pico":    ("base",  "#2fae5f", 1.0, "Raspberry Pi Pico 2 WH"),
    "view_poc_driver":  ("base",  "#c0392b", 1.0, "DRV8833 motor driver"),
    "view_poc_battery": ("base",  "#1d1d1f", 1.0, "4×AA battery holder"),
    "view_poc_switch":  ("base",  "#202124", 1.0, "Power switch KCD1"),
    # POC phase 1: the head clamped on the bench, electronics loose beside it
    "view_loose_board": ("base",  "#1f7a3a", 1.0, "Perfboard 50×70 (loose)"),
    "view_loose_pico":  ("base",  "#2fae5f", 1.0, "Raspberry Pi Pico 2 WH"),
    "view_loose_driver": ("base", "#c0392b", 1.0, "DRV8833 motor driver"),
    "view_loose_battery": ("base", "#1d1d1f", 1.0, "4×AA battery holder (loose)"),
    "view_loose_switch": ("base", "#202124", 1.0, "Power switch KCD1 (loose)"),
}
# A1 projects: walls per part (infill is 10 % everywhere, as specified for the POC prints)
# (6 walls also around the self-tapped M4/M5 holes in cheeks, turret and bench plate: at 10 % infill
#  the walls are what the threads bite into)
A1_WALLS = {"motor_clamp": 6, "coupler": 6, "rocker": 6, "wheel_hub": 6, "spacer_parts": 6, "knob_lock": 5, "hopper": 3,
            "knob_pot": 3, "cheek_left": 6, "cheek_right": 6, "turret": 6, "poc_base": 6}

BAD = re.compile(r"^(ERROR|WARNING|EXPORT-WARNING)|Assertion|CGAL error|not be a valid 2-manifold|may need repair", re.M)


def openscad() -> str:
    exe = os.environ.get("OPENSCAD") or shutil.which("openscad")
    for cand in ("/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD", "/usr/bin/openscad"):
        if not exe and Path(cand).exists():
            exe = cand
    if not exe:
        sys.exit("OpenSCAD not found: install it (brew install --cask openscad@snapshot) or set $OPENSCAD")
    return exe


def render(part: str, out: Path, extra: list[str] | None = None) -> tuple[str, bool, str]:
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [openscad(), "--hardwarnings", "--export-format", "binstl", "-o", str(out),
           "-D", f'part="{part}"', *(extra or []), str(SCAD)]
    p = subprocess.run(cmd, capture_output=True, text=True)
    log = p.stderr
    empty = "top level object is empty" in log
    ok = p.returncode == 0 and not BAD.search(log)
    return log, ok, "empty" if empty else ("ok" if ok else "fail")


def stl_bbox(path: Path) -> tuple[float, float, float]:
    import struct
    data = path.read_bytes()
    n = struct.unpack_from("<I", data, 80)[0]
    lo = [1e9] * 3
    hi = [-1e9] * 3
    for i in range(n):
        off = 84 + i * 50 + 12
        for v in range(3):
            xyz = struct.unpack_from("<3f", data, off + v * 12)
            for k in range(3):
                lo[k] = min(lo[k], xyz[k])
                hi[k] = max(hi[k], xyz[k])
    return tuple(round(hi[k] - lo[k], 1) for k in range(3))


def run_parallel(fn, items, jobs):
    with cf.ThreadPoolExecutor(max_workers=jobs) as ex:
        return list(ex.map(fn, items))


# The other wheel option (config.scad wheel_type) must keep working too: every part
# whose shape follows the wheel, and every clash check, is also built with it.
ALT_WHEEL = ("lego", ["-D", 'wheel_type="lego"'])
ALT_PARTS = ["wheel_hub", "head_left", "head_right", "cheek_left", "cheek_right", "feed_tube"]


def cmd_check(jobs: int) -> bool:
    tmp = ROOT / "build" / "check"
    tag, defs = ALT_WHEEL
    names = list(PARTS) + CLASH + [f"{n}@{tag}" for n in ALT_PARTS + CLASH]

    def one(label):
        name, _, alt = label.partition("@")
        log, ok, state = render(name, tmp / f"{label}.stl", defs if alt else None)
        if name.startswith("clash_"):
            good = state == "empty"
            return label, good, "empty (no collision)" if good else "COLLISION or error"
        if not ok:
            return label, False, "\n".join(l for l in log.splitlines() if BAD.search(l))[:400]
        bb = stl_bbox(tmp / f"{label}.stl")
        fits = all(d <= 256 for d in bb)
        return label, fits, f"{bb[0]} × {bb[1]} × {bb[2]} mm" + ("" if fits else "  (exceeds 256 mm bed)")

    results = run_parallel(one, names, jobs)
    for name, good, msg in results:
        print(f"{'PASS' if good else 'FAIL'}  {name:<21} {msg}")
    sys.path.insert(0, str(ROOT / "tools"))
    import escapement                     # kinematics the static clash checks cannot see
    esc_ok, esc_msg = escapement.check(asm_json())
    print(f"{'PASS' if esc_ok else 'FAIL'}  {'escapement':<21} {esc_msg}")
    passed = all(r[1] for r in results) and esc_ok
    print("CHECK:", "PASS" if passed else "FAIL")
    return passed


def cmd_stl(jobs: int) -> None:
    STL_DIR.mkdir(parents=True, exist_ok=True)

    def one(name):
        log, ok, _ = render(name, STL_DIR / f"{name}.stl")
        return name, ok, log
    for name, ok, log in run_parallel(one, list(PARTS), jobs):
        print(f"{'ok  ' if ok else 'FAIL'} print/stl/{name}.stl")
        if not ok:
            print(log)


def asm_json() -> dict:
    (ROOT / "build").mkdir(exist_ok=True)
    p = subprocess.run([openscad(), "-o", str(ROOT / "build" / "dims.stl"), "-D", 'part="check_dims"', str(SCAD)],
                       capture_output=True, text=True)
    m = re.search(r'ECHO: "ASMJSON (\{.*\})"', p.stderr)
    if not m:
        sys.exit("could not read ASMJSON from OpenSCAD:\n" + p.stderr)
    return json.loads(m.group(1).replace('\\"', '"'))


def cmd_viz(jobs: int) -> None:
    out = WEB / "models"
    out.mkdir(parents=True, exist_ok=True)

    def one(name):
        log, ok, _ = render(name, out / f"{name[5:]}.stl", ["-D", "$fn=36"])
        return name, ok, log
    for name, ok, log in run_parallel(one, list(VIEWS), jobs):
        print(f"{'ok  ' if ok else 'FAIL'} web/models/{name[5:]}.stl")
        if not ok:
            print(log)
    manifest = {
        "dims": asm_json(),
        "meshes": [{"file": f"models/{n[5:]}.stl", "group": g, "color": c, "opacity": o, "label": l}
                   for n, (g, c, o, l) in VIEWS.items()],
        "printed": [{"part": n, "qty": q, "notes": t, "stl": f"print/stl/{n}.stl", "a1": f"print/a1/{n}.3mf",
                     "orientation": orientation(n), "a1_walls": A1_WALLS.get(n, 4)} for n, (q, t) in PARTS.items()],
    }
    (WEB / "data").mkdir(exist_ok=True)
    (WEB / "data" / "assembly.json").write_text(json.dumps(manifest, indent=1))
    print("ok   web/data/assembly.json, web/data/bom.json, web/data/phases.json")


def python_with_expat() -> str:
    """The 3MF tool parses XML. Some Homebrew Pythons ship a pyexpat that cannot load,
    so fall back to another interpreter that can ($BAMBU_PY overrides)."""
    for py in [os.environ.get("BAMBU_PY"), sys.executable, "/usr/bin/python3", shutil.which("python3")]:
        if py and subprocess.run([py, "-c", "import xml.parsers.expat"], capture_output=True).returncode == 0:
            return py
    sys.exit("No Python with a working xml.parsers.expat found; set $BAMBU_PY.")


def cmd_3mf(printer: str) -> None:
    tool = Path(os.environ.get("BAMBU3MF", Path.home() / ".claude/skills/3d-print-designer/make-bambu-3mf.py"))
    if not tool.exists():
        sys.exit(f"make-bambu-3mf.py not found at {tool}; set $BAMBU3MF. The STLs in print/stl/ work in any slicer.")
    MF_DIR.mkdir(parents=True, exist_ok=True)
    py = python_with_expat()
    petg = "Bambu PETG Basic @BBL A1" if printer.upper().startswith("A1") else "Bambu PETG Basic @BBL X1C"
    walls = {"motor_clamp": 6, "coupler": 6, "rocker": 6, "wheel_hub": 6, "hopper": 3, "knob_pot": 3}
    infill = {"tray": 15, "hopper": 15, "poc_base": 15, "turret": 25, "cheek_left": 25, "cheek_right": 25, "motor_clamp": 60,
              "coupler": 60, "rocker": 60, "wheel_hub": 100, "spacer_parts": 100, "knob_lock": 40}
    for name in PARTS:
        layer = "0.12" if name == "wheel_hub" else "0.2"
        cmd = [py, str(tool), "--mesh", str(STL_DIR / f"{name}.stl"), "--printer", printer, "--filament", petg,
               "--layer-height", layer, "--walls", str(walls.get(name, 4)), "--infill", str(infill.get(name, 20)),
               "--infill-pattern", "gyroid", "--supports", "off", "--scatter", "off",
               "--out", str(MF_DIR / f"{name}.3mf")]
        p = subprocess.run(cmd, capture_output=True, text=True)
        tail = [l for l in (p.stdout + p.stderr).splitlines() if l.strip().startswith("verify")]
        print(f"{'ok  ' if p.returncode == 0 else 'FAIL'} print/3mf/{name}.3mf  {tail[-1] if tail else p.stderr[-300:]}")


def orientation(part: str) -> str:
    """The print-orientation sentence of a part's notes (the rest are P1S slicer settings)."""
    return PARTS[part][1].split(". ")[0].rstrip(".") + "."


def phase_parts() -> dict[str, int]:
    """Copies to print per part, summed over the POC phases (same as PARTS for a full build)."""
    out: dict[str, int] = {}
    for ph in json.loads(PHASES.read_text())["phases"]:
        for part, qty in ph["print"]:
            out[part] = out.get(part, 0) + qty
    return out


def cmd_a1(jobs: int) -> None:
    """One Bambu Studio project per part for the A1 (0.4 nozzle, 0.2 mm, 10 % infill), with all
    copies of that part on the plate, then a zip per POC phase with that phase's projects."""
    import zipfile
    tool = Path(os.environ.get("BAMBU3MF", Path.home() / ".claude/skills/3d-print-designer/make-bambu-3mf.py"))
    if not tool.exists():
        sys.exit(f"make-bambu-3mf.py not found at {tool}; set $BAMBU3MF. The STLs in print/stl/ work in any slicer.")
    spec = json.loads(PHASES.read_text())
    a1, phases = spec["a1"], spec["phases"]
    counts = phase_parts()
    missing = sorted(set(counts) - set(PARTS))
    if missing:
        sys.exit(f"web/data/phases.json prints unknown parts: {missing}")
    if sorted(counts) != sorted(PARTS) or any(counts[n] != PARTS[n][0] for n in PARTS):
        sys.exit("web/data/phases.json must print every part in PARTS exactly as often as PARTS says")
    stale = [n for n in counts if not (STL_DIR / f"{n}.stl").exists()
             or (STL_DIR / f"{n}.stl").stat().st_mtime < max(p.stat().st_mtime for p in SCAD.parent.glob("*.scad"))]
    if stale:
        print("re-exporting", ", ".join(stale))
        for name, (log, ok, _) in zip(stale, run_parallel(lambda n: render(n, STL_DIR / f"{n}.stl"), stale, jobs)):
            if not ok:
                sys.exit(f"could not export {name}:\n{log}")
    A1_DIR.mkdir(parents=True, exist_ok=True)
    tmp = ROOT / "build" / "a1"
    tmp.mkdir(parents=True, exist_ok=True)
    py = python_with_expat()

    def mesh_for(name: str) -> Path:
        n = counts[name]
        if n == 1:
            return STL_DIR / f"{name}.stl"
        bb = stl_bbox(STL_DIR / f"{name}.stl")       # lay the copies out side by side along the shorter axis
        along_x = bb[0] <= bb[1]
        step = (bb[0] if along_x else bb[1]) + 6
        src = (STL_DIR / f"{name}.stl").resolve()
        wrap = tmp / f"{name}_x{n}.scad"
        wrap.write_text("".join(f'translate([{i * step if along_x else 0}, {0 if along_x else i * step}, 0]) import("{src}");\n'
                                for i in range(n)))
        out = tmp / f"{name}_x{n}.stl"
        subprocess.run([openscad(), "--export-format", "binstl", "-o", str(out), str(wrap)], capture_output=True, check=True)
        return out

    def one(name: str):
        cmd = [py, str(tool), "--mesh", str(mesh_for(name)), "--printer", "A1", "--filament", a1["filament"],
               "--layer-height", str(a1["layer"]), "--walls", str(A1_WALLS.get(name, 4)), "--infill", str(a1["infill"]),
               "--infill-pattern", a1["pattern"], "--supports", a1["supports"], "--scatter", "off",
               "--out", str(A1_DIR / f"{name}.3mf")]
        p = subprocess.run(cmd, capture_output=True, text=True)
        tail = [l for l in (p.stdout + p.stderr).splitlines() if l.strip().startswith("verify")]
        return name, p.returncode == 0, tail[-1].strip() if tail else (p.stdout + p.stderr)[-300:]

    results = run_parallel(one, list(counts), jobs)
    for name, ok, msg in results:
        print(f"{'ok  ' if ok else 'FAIL'} print/a1/{name}.3mf  ×{counts[name]}  {msg}")
    if not all(ok for _, ok, _ in results):
        sys.exit(1)
    for ph in phases:
        z = A1_DIR / f"phase{ph['id']}.zip"
        readme = [f"PingPongThrower POC phase {ph['id']}: {ph['name']}", "",
                  f"Bambu Lab A1, {a1['nozzle']} mm nozzle, {a1['layer']} mm layers, {a1['infill']} % {a1['pattern']} infill, "
                  f"{a1['filament']}, supports {a1['supports']}. Open each .3mf in Bambu Studio; every copy is already on the plate.", ""]
        readme += [f"  {part}.3mf  ×{qty}  {orientation(part)} {A1_WALLS.get(part, 4)} walls." for part, qty in ph["print"]]
        with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
            for part, _ in ph["print"]:
                zf.write(A1_DIR / f"{part}.3mf", f"phase{ph['id']}/{part}.3mf")
            zf.writestr(f"phase{ph['id']}/README.txt", "\n".join(readme) + "\n")
        print(f"ok   print/a1/{z.name}  ({', '.join(p for p, _ in ph['print'])})")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("step", choices=["check", "stl", "viz", "3mf", "a1", "all"])
    ap.add_argument("-j", "--jobs", type=int, default=max(2, (os.cpu_count() or 4) - 2))
    ap.add_argument("--printer", default="P1S", help="Bambu printer for 3MF presets (A1, P1S, P1P, X1C, ...)")
    a = ap.parse_args()
    if a.step in ("check", "all") and not cmd_check(a.jobs):
        sys.exit(1)
    if a.step in ("stl", "all"):
        cmd_stl(a.jobs)
    if a.step in ("viz", "all"):
        cmd_viz(a.jobs)
    if a.step == "3mf":
        cmd_3mf(a.printer)
    if a.step == "a1":
        cmd_a1(a.jobs)


if __name__ == "__main__":
    main()
