#!/usr/bin/env python3
"""Kinematic check of the two-finger escapement (2-D, in the rocker's YZ plane).

The rocker turns about a horizontal axis behind the tube; each finger is a
round-ended bar (height = finger_h) from the axis to its tip. Balls sit in a
vertical bore and may drift `tube_ir - ball_r` sideways. The script swings the
rocker from rest (+alpha: lower finger in) to release (-alpha) and back, and
measures what the CAD cannot show statically:

  gap_ball1   closest approach of the entering upper finger to ball 1 while
              ball 1 is still held (must stay clear: touching it would press
              ball 1 onto the lower finger and stall the servo)
  contact     where the upper finger first meets ball 2, as the angle of the
              contact normal from vertical. The finger then lifts ball 2 (and
              the stack) off ball 1; it wedge-locks if friction μ ≥ cot(angle)
  release     rocker angle at which ball 1 falls free
  ball2_drop  how far ball 2 falls before the upper finger is under it
              (servo at SERVO_DEG_S)
  return_ok   on the way back, the lower finger is in before the upper one
              lets ball 2 go (otherwise two balls feed)

    python3 tools/escapement.py            # reads web/data/assembly.json
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

SERVO_DEG_S = 400.0          # SG90 under light load (no-load ≈ 600 °/s)
LIMITS = {"gap_ball1": 2.0, "contact": 60.0, "release_margin": 3.0, "ball2_drop": 0.5}


def simulate(ball_r, tube_ir, alpha, axis_y, arm, tip_dy, fh, steps=600):
    clear = tube_ir - ball_r
    R = ball_r + fh / 2

    def seg(sign, ang):                  # finger centre line, rotated about the rocker axis (axis z = 0)
        r = math.radians(ang)
        return [(y * math.cos(r) - z * math.sin(r) + axis_y, y * math.sin(r) + z * math.cos(r))
                for y, z in ((0.0, sign * arm), (tip_dy - fh / 2, sign * arm))]

    def samples(s, n=120):
        (ay, az), (by, bz) = s
        return [(ay + (by - ay) * i / n, az + (bz - az) * i / n) for i in range(n + 1)]

    def rest(s, y=clear):                # lowest centre z of a ball at y coming from above, or None if it passes
        zs = [pz + math.sqrt(R * R - (y - py) ** 2) for py, pz in samples(s) if abs(y - py) < R]
        return max(zs) if zs else None

    def gap(s, c):                       # clearance between finger s and a ball centred at c
        return min(math.hypot(c[0] - py, c[1] - pz) for py, pz in samples(s)) - R

    out = {"gap_ball1": 1e9, "contact": None, "release": None, "ball2_drop": None, "return_ok": None}
    z1 = None
    for i in range(steps + 1):           # rest → release
        ang = alpha - 2 * alpha * i / steps
        lo, up = seg(-1, ang), seg(+1, ang)
        z = rest(lo)
        if z is None:
            out["release"] = ang
            break
        z1 = z
        out["gap_ball1"] = min(out["gap_ball1"], min(gap(up, (y, z1)) for y in (-clear, clear)))
        c2 = (clear, z1 + 2 * ball_r)
        if out["contact"] is None and gap(up, c2) < 0:
            py, pz = min(samples(up), key=lambda p: math.hypot(c2[0] - p[0], c2[1] - p[1]))
            out["contact"] = math.degrees(math.atan2(abs(c2[0] - py), c2[1] - pz))
    if out["release"] is None:
        return out
    z2 = z1 + 2 * ball_r                 # ball 2 starts falling; the rocker keeps turning
    for j in range(2000):
        ang = out["release"] - j * 0.02
        t = (out["release"] - ang) / SERVO_DEG_S
        zb = z2 - 0.5 * 9810 * t * t
        zr = rest(seg(+1, ang))
        if zr is not None and zr >= zb - 0.05:
            out["ball2_drop"] = z2 - zb
            break
        if ang < -alpha:
            break
    zs = rest(seg(+1, -alpha))            # ball 2 resting on the upper finger
    for i in range(steps + 1):           # release → rest
        ang = -alpha + 2 * alpha * i / steps
        if zs is None or rest(seg(+1, ang)) is None:
            out["return_ok"] = rest(seg(-1, ang)) is not None
            break
    return out


def check(d: dict) -> tuple[bool, str]:
    ball_r = d["ball_d"] / 2
    arm = (d["finger_z"][1] - d["finger_z"][0]) / 2
    r = simulate(ball_r, d["tube_ir"], d["esc_alpha"], d["rocker_axis"][1], arm, d["esc_tip_dy"], d["finger_h"])
    problems = []
    if r["gap_ball1"] < LIMITS["gap_ball1"]:
        problems.append(f"upper finger comes within {r['gap_ball1']:.1f} mm of ball 1")
    if r["contact"] is not None and r["contact"] > LIMITS["contact"]:
        problems.append(f"upper finger meets ball 2 at {r['contact']:.0f}° from vertical (wedges)")
    if r["release"] is None:
        problems.append("ball 1 is never released")
    elif abs(r["release"]) > d["esc_alpha"] - LIMITS["release_margin"]:
        problems.append(f"ball 1 released at {r['release']:+.1f}°, too close to the end of travel")
    if r["ball2_drop"] is None or r["ball2_drop"] > LIMITS["ball2_drop"]:
        problems.append("upper finger does not catch ball 2")
    if not r["return_ok"]:
        problems.append("on the return the lower finger is not in before ball 2 is let go (double feed)")
    jam_mu = 1 / math.tan(math.radians(r["contact"])) if r["contact"] else float("inf")
    summary = (f"gap to ball 1 {r['gap_ball1']:.1f} mm, ball 2 lifted at {r['contact'] or 0:.0f}° "
               f"(wedges only if μ > {jam_mu:.2f}), release at {r['release'] or 0:+.1f}°, "
               f"ball 2 drops {r['ball2_drop'] if r['ball2_drop'] is None else round(r['ball2_drop'], 2)} mm, "
               f"return {'ok' if r['return_ok'] else 'DOUBLE FEED'}")
    return not problems, summary + ("" if not problems else "\n      " + "\n      ".join(problems))


if __name__ == "__main__":
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "web/data/assembly.json"
    ok, msg = check(json.loads(src.read_text())["dims"])
    print(("PASS  " if ok else "FAIL  ") + "escapement  " + msg)
    sys.exit(0 if ok else 1)
