// === DESCRIPTION ===
// PingPongThrower: a battery-powered table-tennis ball thrower. Two N20
// gearmotors spin two wheels (one above, one below the ball): 65 mm yellow
// TT-motor wheels by default, or LEGO Technic wheels (wheel_type). A micro
// servo in the base swings the whole turret left/right (yaw). A second micro
// servo works a two-finger escapement that releases one ball at a time from a
// vertical feed tube under a hopper. The launcher head tilts on a pivot (manual
// elevation, locked by a thumb knob in an arc slot).
//
// Physical context: sits on the table behind the end line. Base 190×170×85 mm
// holds a 4×AA pack (outside, left wall), a perfboard with a Raspberry Pi
// Pico 2 WH + DRV8833 driver, and the swing servo coaxial with an M8 bolt that
// turns in two 608 bearings. Loads: ~1 kg turret on the bearings, ~10 N
// transient radial load on each wheel while a ball is squeezed, servo torque.
//
// Design decisions:
//   - Head printed as two halves split on the ball's centre plane, each lying
//     on its outer side wall: every ball-guiding surface is a vertical wall in
//     print, all pivot/hub/screw holes are vertical, no supports.
//   - Ball path: vertical drop → 90° elbow (gravity rolls the ball against the
//     curved floor) → straight run → pinch between the wheels. The drop entry
//     sits exactly on the pitch pivot, so tilting the head never misaligns it
//     with the fixed feed tube above.
//   - Top/bottom wheel layout: speed difference gives topspin or backspin.
//   - Wheels are cantilevered on the motor shafts through a printed hub. Its
//     stub copies the TT gearmotor shaft (round, two flats) for the yellow 65 mm
//     wheel, or is a LEGO cross for any Technic wheel with a cross hole.
//   - Swing servo carries no weight: the turret turns on 2×608 bearings; the
//     servo drives the bolt's nyloc nut through a sliding hex socket.
//   - POC test phases (docs/POC.md, web/data/phases.json): in phase 1 only the
//     head is printed; it is clamped upright on the bench (loose_z = its bottom)
//     with the electronics loose beside it. In phases 2–3 the cheeks bolt to a
//     flat bench plate (poc_base) whose top is at turret_top_z, with the
//     electronics beside them, so the head and tube keep their final pose and
//     clearances. clash_poc_* prove the head clears plate and electronics.
//
// Terminology → code:
//   "ball squeeze / wheel gap"  → ball_squeeze, wheel_adj, gap
//   "wheel / LEGO wheel"        → wheel_type, tt_*, lego_* → wheel_d, wheel_w (config.scad)
//   "elevation / tilt"          → pitch_min, pitch_max, lock_pt, cheek arc slot
//   "swing range"               → yaw_max
//   "feed tube / escapement"    → tube_*, esc_*, feed_tube(), rocker()
//   "hopper / basket adapter"   → hopper_top_r, hopper_slope, hopper()
//   "base box"                  → base_x, base_y, tray_h, tray(), lid()
//   "motor clamps"              → clamp_*, motor_clamp()
//   "bench plate / POC base"    → poc_*, poc_base(), assembly_poc(phase)
//   "loose head rig (phase 1)"  → loose_z, loose_*(), head_shell
//
// Common modifications:
//   LEGO wheels instead         → wheel_type = "lego", lego_wheel_d/_w; rebuild all
//   Loose / tight TT wheel      → tt_stub_fit (0.1 = snug; larger = looser)
//   More/less ball grip         → ball_squeeze (1.5–3 mm); fine-tune with the slot
//   Taller/shorter hopper feed  → tube_len (escapement stays at the bottom)
//   Bigger basket adapter       → hopper_top_r (≤ 107 for the bed)
//   Different panel parts       → hole sizes in tray() rear-panel section
//   Bench plate layout          → poc_board, poc_batt, poc_sw_w (asserts keep
//                                 them clear of each other and on the plate)
//
// Overall dimensions: ~210 × 220 × 430 mm assembled (base 190 mm + the AA holder
//   on the left wall; largest print: tray 190 × 170 × 82 mm, fits Bambu A1/P1/X1
//   256³ inside the 220 mm safe zone).
// Coordinate system: see config.scad (X right, Y launch direction, Z up).
// NOTE: printable parts are modelled in assembly pose and moved into print
//   orientation by their *_print transforms in the selector below.
// Final review: 2026-10-28, claude-fable-5-1 (fixed: M8×40 axle through the
//   nyloc, coupler socket clear of the nut, M4×10 foot screws, spacer = race gap)

// === PRINT SETTINGS ===
// Material: PETG for every part (hubs, clamps, rocker flex/impact; tray/head
//   could be PLA). Nozzle 240 °C, bed 75 °C, fan 30–40 %.
// Layer Height: 0.2 mm (hubs and rocker 0.12 mm optional for crisper fits)
// Walls/Perimeters: 4 (1.8 mm); hubs, clamps, coupler, rocker, spacers: 6 walls
// Infill: two kits (tools/build.py):
//   print/3mf (make 3mf, P1S default): 20 % gyroid, hubs/spacers 100 %,
//     clamps/coupler/rocker 60 %, cheeks/turret 25 %
//   print/a1 (make a1, POC kit): 10 % gyroid everywhere, 0.2 mm layers; 6 walls
//     on the parts above plus cheeks, turret and poc_base, whose self-tapped
//     M4/M5 holes then bite into ~2.7 mm of solid perimeter
// Supports: None required (designed support-free: overhangs ≤ 45°, horizontal
//   holes are teardrops, ceilings are short bridges)
// Orientation: as exported by the part selector (Z = 0 is the bed).
// Notes: dry PETG before printing; self-tap holes: pre-form with a plain screw.
//   poc_base prints flat, 190 × 220 mm.

include <config.scad>
include <lib.scad>
include <vitamins.scad>

part = "all"; // "all", "assembly", "assembly_poc1", "assembly_poc2", "assembly_poc3", "tray", "lid", "spacer_parts", "coupler", "turret", "cheek_left", "cheek_right", "head_left", "head_right", "motor_clamp", "wheel_hub", "feed_tube", "rocker", "hopper", "knob_pot", "knob_lock", "poc_base", "clash_head_lo", "clash_head_mid", "clash_head_hi", "clash_ball_lo", "clash_ball_mid", "clash_ball_hi", "clash_rocker_in", "clash_rocker_out", "clash_coupler", "clash_poc_lo", "clash_poc_mid", "clash_poc_hi", "clash_poc_cheeks", "clash_knobs", "clash_loose", "check_dims", "view_tray", "view_lid", "view_turret", "view_cheeks", "view_head_left", "view_head_right", "view_clamps", "view_hub_top", "view_hub_bot", "view_tyre_top", "view_tyre_bot", "view_rim_top", "view_rim_bot", "view_motors", "view_feed_tube", "view_rocker", "view_hopper", "view_panel_knobs", "view_lock_knobs", "view_swing_servo", "view_feed_servo", "view_bearings", "view_coupler", "view_bolt", "view_battery", "view_board", "view_pico", "view_driver", "view_panel", "view_panel_switch", "view_balls", "view_poc_base", "view_poc_board", "view_poc_pico", "view_poc_driver", "view_poc_battery", "view_poc_switch", "view_loose_board", "view_loose_pico", "view_loose_driver", "view_loose_battery", "view_loose_switch"

yaw_pose   = 0;
pitch_pose = 0;
rock_pose  = esc_alpha;   // rest: lower finger in

// ============================================================================
// BASE TRAY
// ============================================================================
lid_screw_pts = [ for (sx = [-1, 1], sy = [-1, 1]) [sx * (base_x / 2 - 7), sy * (base_y / 2 - 7)] ];
board_pos     = [18, -15];                       // perfboard corner (X, Y)
board_size    = [70, 50];
board_holes   = [ for (dx = [2, 68], dy = [2, 48]) board_pos + [dx, dy] ];
standoff_h    = 7;
board_z       = floor_t + standoff_h;
pico_pos      = [36, -2, board_z + 1.6 + 8.5];   // PCB corner, USB end toward +X
usb_y         = pico_pos[1] + 10.5;
usb_z         = pico_pos[2] + 2.4;
panel_y       = -base_y / 2;                     // rear panel outer face
row_hi        = 56;                              // pots + power switch
row_lo        = 28;                              // buttons + LED
ctl_x         = [-62, -27, 8];                   // three columns
switch_x      = 58;
led_x         = 58;
pot_hole      = 7.0;
button_hole   = 12.0;
switch_cut    = [19.2, 13.2];
labels_hi     = ["SPEED", "SPIN", "RATE"];
labels_lo     = ["MOTORS", "SWING", "FEED"];
batt_wall_x   = -base_x / 2;

module panel_label(t, x, z) {
    translate([x, panel_y + 0.6, z]) rotate([90, 0, 0])
        linear_extrude(2) text(t, size = 4.2, font = "Liberation Sans:style=Bold",
                               halign = "center", valign = "center", $fn = 12);
}

module servo_tower() {
    ty0 = -sg_shaft_off - (sg_tab_len - sg_l) / 2 - 1.5;
    ty1 = sg_l - sg_shaft_off + (sg_tab_len - sg_l) / 2 + 1.5;
    tw  = sg_w + 2 * (tolerance + 6 * ew);
    translate([-tw / 2, ty0, floor_t - fudge]) cube([tw, ty1 - ty0, tower_top_z - floor_t + fudge]);
}
module servo_tower_cut() {
    // body pocket (open top), cable slot at the far end, tab screw pilots
    translate([-sg_w / 2 - tolerance, -sg_shaft_off - tolerance, floor_t + 1])
        cube([sg_w + 2 * tolerance, sg_l + 2 * tolerance, tower_top_z]);
    translate([-4, sg_l - sg_shaft_off - 1, floor_t + 1]) cube([8, 10, 9]);
    yc = sg_l / 2 - sg_shaft_off;
    for (s = [-1, 1]) translate([0, yc + s * sg_hole_pitch / 2, tower_top_z - 10]) self_tap(2, 0.4, 10 + 1);
}

module tray() {
    difference() {
        union() {
            difference() {
                translate([-base_x / 2, -base_y / 2, 0]) rounded_block([base_x, base_y, tray_h], corner_r);
                translate([-base_x / 2 + wall_t, -base_y / 2 + wall_t, floor_t])
                    linear_extrude(tray_h) rounded_square([base_x - 2 * wall_t, base_y - 2 * wall_t], corner_r - wall_t);
            }
            for (p = lid_screw_pts) translate([p[0], p[1], floor_t - fudge]) cylinder(d = 10, h = tray_h - floor_t + fudge);
            servo_tower();
            for (p = board_holes) translate([p[0], p[1], floor_t - fudge]) cylinder(d = 6.5, h = standoff_h + fudge);
        }
        for (p = lid_screw_pts) translate([p[0], p[1], tray_h - 12]) self_tap(3, 0.5, 12);
        servo_tower_cut();
        for (p = board_holes) translate([p[0], p[1], floor_t + 1]) self_tap(3, 0.5, standoff_h);
        // --- rear control panel (Y = -85) ---
        for (i = [0 : 2]) {
            translate([ctl_x[i], panel_y + wall_t / 2, row_hi]) teardrop_flat(bore(pot_hole), wall_t + 2, "y");
            translate([ctl_x[i], panel_y + wall_t / 2, row_lo]) teardrop_flat(bore(button_hole), wall_t + 2, "y");
            panel_label(labels_hi[i], ctl_x[i], row_hi - 14);
            panel_label(labels_lo[i], ctl_x[i], row_lo - 14);
        }
        translate([switch_x - switch_cut[0] / 2 - hole_comp / 2, panel_y - 1, row_hi - switch_cut[1] / 2 - hole_comp / 2])
            cube([switch_cut[0] + hole_comp, wall_t + 2, switch_cut[1] + hole_comp]);
        panel_label("POWER", switch_x, row_hi - 14);
        translate([led_x, panel_y + wall_t / 2, row_lo]) teardrop_flat(bore(5), wall_t + 2, "y");
        panel_label("READY", led_x, row_lo - 14);
        // --- left wall: 4×AA holder screws + wire hole ---
        for (y = [-15, 15]) translate([batt_wall_x + wall_t / 2, y, 41]) teardrop_hole(bore(3), wall_t + 2, "x");
        translate([batt_wall_x + wall_t / 2, -42, 66]) teardrop_hole(bore(6), wall_t + 2, "x");
        // --- right wall: USB-C access to the Pico ---
        translate([base_x / 2 - wall_t - 1, usb_y - 6.5, usb_z - 4.5]) cube([wall_t + 2, 13, 9]);
    }
}

// ============================================================================
// BASE LID with the yaw bearing boss (printed upside down)
// ============================================================================
boss_od = b608_od + 2 * 8 * ew;

module lid() {
    seat_d = bore(b608_od, fit_bearing);                     // 22 + 0.30 + 0.15
    difference() {
        union() {
            translate([-base_x / 2, -base_y / 2, tray_h]) linear_extrude(lid_t) rounded_square([base_x, base_y], corner_r);
            // locating lip just inside the tray walls
            translate([0, 0, tray_h - 4]) difference() {
                linear_extrude(4 + fudge) offset(delta = -(wall_t + 0.3)) translate([-base_x / 2, -base_y / 2]) rounded_square([base_x, base_y], corner_r);
                translate([0, 0, -1]) linear_extrude(6) offset(delta = -(wall_t + 0.3 + 1.8)) translate([-base_x / 2, -base_y / 2]) rounded_square([base_x, base_y], corner_r);
                for (p = lid_screw_pts) translate([p[0], p[1], -1]) cylinder(d = 16, h = 7);
            }
            // bearing boss + ribs hanging into the tray
            translate([0, 0, boss_bot_z]) cylinder(d = boss_od, h = tray_h - boss_bot_z + fudge);
            for (a = [0, 90, 180]) rotate([0, 0, a]) translate([0, -1.35, 0])
                hull() {
                    translate([0, 0, boss_bot_z + 4]) cube([boss_od / 2, 2.7, tray_h - boss_bot_z - 4]);
                    translate([44, 0, tray_h - 1]) cube([1, 2.7, 1 + fudge]);
                }
        }
        // upper bearing seat, 45° ledge/cone, web, lower seat
        translate([0, 0, ub_bot_z]) cylinder(d = seat_d, h = lid_top - ub_bot_z + 1);
        translate([0, 0, ub_bot_z - cone_h]) cylinder(d1 = web_hole_d, d2 = b608_od - 2 * ledge_w, h = cone_h + fudge);
        translate([0, 0, boss_bot_z - 1]) cylinder(d = web_hole_d, h = ub_bot_z - boss_bot_z + 1);
        translate([0, 0, boss_bot_z - 1]) cylinder(d = seat_d, h = lb_top_z - boss_bot_z + 1);
        // countersunk lid screws
        for (p = lid_screw_pts) translate([p[0], p[1], tray_h - 1]) {
            cylinder(d = bore(3), h = lid_t + 2);
            translate([0, 0, 1 + lid_t - 1.8]) cylinder(d1 = bore(3), d2 = 6.6, h = 1.8 + fudge);
        }
        // cable arc for the turret wiring (behind the axis)
        translate([0, 0, tray_h - 5]) linear_extrude(lid_t + 6) arc_slot_2d(34, 14, 225, 315);
    }
}

// Inner-race spacer between the bearings + two inner-race shims (one plate)
module race_spacers() {
    module ring(h) difference() { cylinder(d = b608_ir_od - 0.5, h = h); translate([0, 0, -1]) cylinder(d = bore(8), h = h + 2); }
    ring(spacer_len);
    translate([16, 0, 0]) ring(shim_t);          // under the lower bearing (above the nut)
    translate([32, 0, 0]) ring(turret_hub_h);    // between turret and upper bearing
}

// Servo → nyloc coupler (slides axially on the nut, carries only torque)
module coupler() {
    translate([0, 0, coupler_bot_z]) difference() {
        cylinder(d = 24, h = coupler_top_z - coupler_bot_z);
        // hex socket for the M8 nyloc (sliding fit)
        translate([0, 0, coupler_top_z - coupler_bot_z - coupler_sock])
            cylinder(d = (m8_af + hole_comp + 0.15) / cos(30), h = coupler_sock + 1, $fn = 6);
        // relief for the bolt tail
        translate([0, 0, horn_recess + coupler_plate]) cylinder(d = 10, h = coupler_relief + fudge);
        // double-arm horn recess + hub + screwdriver hole
        translate([0, 0, -fudge]) linear_extrude(horn_recess + fudge) {
            hull() { circle(d = 8.5); translate([0, 17]) circle(d = 6); translate([0, -17]) circle(d = 6); }
        }
        translate([0, 0, -1]) cylinder(d = 5, h = coupler_top_z);
        for (s = [-1, 1]) hull() for (r = [8, 15]) translate([0, s * r, -1]) cylinder(d = 1.6, h = horn_recess + coupler_plate + 2);
    }
}

// ============================================================================
// TURRET PLATE + CHEEKS (the yoke)
// ============================================================================
foot_y      = [-45, 25];
foot_t      = 5;
foot_screw_len = 10;                             // M4×10 self-tapping, cheek foot → turret / bench plate
foot_holes  = [ for (y = [-35, 15]) [21.4, y] ];
turret_boss = 6;
m8_tip_z    = turret_top_z + turret_boss - m8_head_h - m8_bolt_len;
assert(m8_tip_z <= nut_bot_z - 0.5 && m8_tip_z >= nut_bot_z - 2, "M8 axle must stand 0.5–2 mm proud of the nyloc");
assert(m8_tip_z > coupler_top_z - coupler_sock - coupler_relief + 0.5, "M8 axle tip reaches the coupler relief floor");
assert(foot_screw_len - foot_t <= turret_t - 1, "cheek-foot screw longer than its blind pilot (1 mm skin)");

module turret() {
    difference() {
        union() {
            translate([0, 0, turret_bot_z]) hull() {
                translate([0, 0, ef_chamfer]) cylinder(r = turret_r, h = turret_t - ef_chamfer);
                cylinder(r = turret_r - ef_chamfer, h = ef_chamfer);
            }
            translate([0, 0, turret_top_z - fudge]) cylinder(d = 28, h = turret_boss + fudge);
        }
        translate([0, 0, turret_bot_z - 1]) cylinder(d = bore(8), h = turret_t + turret_boss + 2);
        translate([0, 0, turret_top_z + turret_boss - m8_head_h - 0.2])
            cylinder(d = (m8_af + hole_comp + 0.1) / cos(30), h = m8_head_h + 1, $fn = 6);
        for (s = [-1, 1], p = foot_holes) translate([s * p[0], p[1], turret_bot_z + 1]) self_tap(4, 0.7, turret_t);
        translate([0, -34, turret_bot_z - 1]) cylinder(d = 14, h = turret_t + 2);
    }
}

// ============================================================================
// POC BENCH PLATE (test phases 2–3). The cheeks bolt on here instead of on the
// turret, with the electronics out in the open beside them. Its top face sits
// at turret_top_z, so the cheeks, head and tube keep their tested assembly pose
// and every clearance (head_floor_clear, clash checks) carries over unchanged.
// ============================================================================
poc_t        = turret_t;                         // same M4×10 cheek screws as the turret
poc_top_z    = turret_top_z;
poc_bot_z    = poc_top_z - poc_t;
poc_x        = [-95, 95];
poc_y        = [-130, 90];                       // 190 × 220: fits every target bed
poc_rim_h    = 6;                                // stiffening rim along the edges
poc_board    = [-88, -122];                      // perfboard corner (same 66 × 46 hole pattern)
poc_batt     = [20, -122];                       // AA holder corner, lying flat
poc_batt_in  = [aa_holder_size[0] + 1, aa_holder_size[1] + 1];   // corral inside
poc_corral_h = 10;
poc_sw_w     = 30;                               // switch wall in the rear rim, between board and battery
poc_sw_h     = switch_cut[1] + 14;
poc_holes    = [ for (x = [-85, 85], y = [-45, 80]) [x, y] ];   // bench clamp / rubber-foot holes

assert(poc_board[0] + 70 + 2 <= -poc_sw_w / 2, "POC perfboard runs into the switch gussets");
assert(poc_batt[0] - wall_t >= poc_sw_w / 2 + 2, "POC battery corral runs into the switch gussets");
assert(poc_batt[0] + poc_batt_in[0] + wall_t <= poc_x[1] - fudge, "POC battery corral off the plate");
assert(max(poc_x[1] - poc_x[0], poc_y[1] - poc_y[0]) <= bed_safe, "POC plate larger than the safe bed area");
assert(foot_screw_len - foot_t <= poc_t - 1, "cheek-foot screw longer than the bench plate's blind pilot");
module poc_base() {
    bh = [ for (dx = [2, 68], dy = [2, 48]) poc_board + [dx, dy] ];
    difference() {
        union() {
            translate([0, 0, poc_bot_z]) linear_extrude(poc_t)
                translate([poc_x[0], poc_y[0]]) rounded_square([poc_x[1] - poc_x[0], poc_y[1] - poc_y[0]], 6);
            // rim on the sides and rear, constant wall_t (open front: nothing near the wheels;
            // the side rims stop square before the front corner radius)
            translate([0, 0, poc_top_z - fudge]) linear_extrude(poc_rim_h + fudge) intersection() {
                difference() {
                    translate([poc_x[0], poc_y[0]]) rounded_square([poc_x[1] - poc_x[0], poc_y[1] - poc_y[0]], 6);
                    offset(delta = -wall_t) translate([poc_x[0], poc_y[0]]) rounded_square([poc_x[1] - poc_x[0], poc_y[1] - poc_y[0]], 6);
                }
                translate([poc_x[0] - 1, poc_y[0] - 1]) square([poc_x[1] - poc_x[0] + 2, poc_y[1] - 6 - poc_y[0] + 1]);
            }
            // perfboard standoffs
            for (p = bh) translate([p[0], p[1], poc_top_z - fudge]) cylinder(d = 6.5, h = standoff_h + fudge);
            // battery corral (open toward the board side for the leads)
            translate([0, 0, poc_top_z - fudge]) linear_extrude(poc_corral_h + fudge) difference() {
                translate(poc_batt - [wall_t, wall_t]) square(poc_batt_in + [2 * wall_t, 2 * wall_t]);
                translate(poc_batt) square(poc_batt_in);
                translate([poc_batt[0] - wall_t - 1, poc_batt[1] + 15]) square([wall_t + 2, 25]);
            }
            // power-switch wall in the rear rim, braced by two 45° gussets
            translate([-poc_sw_w / 2, poc_y[0], poc_top_z - fudge]) cube([poc_sw_w, wall_t, poc_sw_h + fudge]);
            for (x = [-poc_sw_w / 2, poc_sw_w / 2 - wall_t]) translate([x, poc_y[0] + wall_t - fudge, poc_top_z - fudge])
                rotate([90, 0, 90]) linear_extrude(wall_t) polygon([[0, 0], [poc_sw_h - 4, 0], [0, poc_sw_h - 4]]);
        }
        // KCD1 cut-out (19 × 13), centred in the switch wall
        translate([-switch_cut[0] / 2 - hole_comp / 2, poc_y[0] - 1, poc_top_z + 7])
            cube([switch_cut[0] + hole_comp, wall_t + 2, switch_cut[1] + hole_comp]);
        // cheek foot screws (as on the turret)
        for (s = [-1, 1], p = foot_holes) translate([s * p[0], p[1], poc_bot_z + 1]) self_tap(4, 0.7, poc_t);
        for (p = bh) translate([p[0], p[1], poc_top_z + 1]) self_tap(3, 0.5, standoff_h);
        for (p = poc_holes) translate([p[0], p[1], poc_bot_z - 1]) cylinder(d = bore(4), h = poc_t + 2);
    }
}

// Electronics on the bench plate (viewer + fit check)
poc_board_at = [poc_board[0], poc_board[1], poc_top_z + standoff_h];
poc_batt_at  = [poc_batt[0] + 0.5, poc_batt[1] + 0.5, poc_top_z];
module board_pico(at)   translate(at + [18 + 51, 13 + 21, 1.6 + 8.5]) rotate([0, 0, 180]) pico2w();
module board_driver(at) translate(at + [2, 30, 1.6 + 8.5]) drv8833();
module board_set(at) {                           // perfboard + Pico + driver, board corner at `at`
    color("darkgreen") translate(at) perfboard();
    board_pico(at); board_driver(at);
}
module poc_battery() translate(poc_batt_at) aa_holder();
module poc_switch() translate([0, poc_y[0], poc_top_z + 7 + switch_cut[1] / 2]) rocker_switch();
module poc_static() { poc_base(); board_set(poc_board_at); poc_battery(); poc_switch(); }

// Swept footprint of both motor clamps over the pitch range (world [Y, Z])
module motor_sweep_2d(margin = 3) {
    steps = [ for (a = [pitch_min : 5 : pitch_max]) a ];
    for (c = [wheel_bot_c, wheel_top_c]) {
        adj = (c == wheel_top_c) ? wheel_adj : 0;
        for (i = [0 : len(steps) - 2]) hull() for (a = [steps[i], steps[i + 1]])
            translate([0, pivot_z]) rotate(a) translate(c)
                square([2 * (clamp_screw_dy + clamp_ear / 2 + margin), 2 * (8 + adj + margin)], center = true);
    }
}

lock_angles = [lock_ang + pitch_min, lock_ang + pitch_max];
ear_y       = [-18, 22];
ear_screws  = [ for (y = [-10, 14], dz = [8, 36]) [y, tube_bot_z + dz] ];

module cheek_2d() {
    difference() {
        hull() {
            translate([foot_y[0], turret_top_z]) square([foot_y[1] - foot_y[0], 14]);
            translate([0, pivot_z]) circle(r = 13);
            for (a = [lock_angles[0] - 4, lock_angles[1] + 4])
                translate([0, pivot_z] + lock_r * [cos(a), sin(a)]) circle(r = 20);
            translate([ear_y[0], tube_bot_z]) square([ear_y[1] - ear_y[0], ear_h]);
        }
        motor_sweep_2d();
    }
}

// Right cheek in assembly pose (X from cheek_in to cheek_out); left = mirror
module cheek_right() {
    difference() {
        union() {
            yz_extrude(cheek_in, cheek_out) cheek_2d();
            // bearing pads on the inner face: pivot ring + lock arc band
            yz_extrude(cheek_in - cheek_pad, cheek_in + fudge) {
                translate([0, pivot_z]) difference() { circle(r = 11); circle(r = 4); }
                translate([0, pivot_z]) arc_slot_2d(lock_r, 12, lock_angles[0], lock_angles[1]);
            }
            // foot flange pointing inward (under the head) + gussets
            translate([14, foot_y[0], turret_top_z]) cube([cheek_in - 14 + fudge, foot_y[1] - foot_y[0], foot_t]);
            for (y = [-14, 0]) translate([cheek_in + fudge, y, turret_top_z + foot_t - fudge])
                rotate([90, 0, 0]) linear_extrude(2.7, center = true)
                    polygon([[0, 0], [-12, 0], [0, 12]]);
        }
        yz_extrude(cheek_in - cheek_pad - 1, cheek_out + 1) {
            translate([0, pivot_z]) arc_slot_2d(lock_r, bore(4), lock_angles[0], lock_angles[1]);
            translate([0, pivot_z]) circle(d = m5_d - 0.4 * 0.8);
            for (p = ear_screws) translate(p) circle(d = bore(3));
        }
        // foot screws (vertical in use → horizontal in print: teardrop, tip toward −X = print +Z)
        for (p = foot_holes) translate([p[0], p[1], turret_top_z - 1])
            linear_extrude(foot_t + 2) rotate(90) teardrop_2d(bore(4));
        // pitch scale: ticks every 5° on the outer face (0°, 15°, 30° long)
        for (a = [pitch_min : 5 : pitch_max]) {
            long = (a % 15 == 0);
            ang  = lock_ang + a;
            translate([cheek_out - 0.6, 0, pivot_z]) rotate([ang, 0, 0])
                translate([0, lock_r + 14, -0.6]) cube([1, long ? 7 : 4, 1.2]);
        }
    }
}
module cheek_left() mirror([1, 0, 0]) cheek_right();

// ============================================================================
// LAUNCHER HEAD (two halves, head frame: origin on the pitch pivot)
// ============================================================================
tie_pts = [tie_rear, (top_bar[0] + top_bar[1]) / 2, (front_bot[0] + front_bot[1]) / 2,
           (front_top[0] + front_top[1]) / 2];

head_shell = 5;                                  // head wall beyond the wheel circles
loose_z    = pivot_z + wheel_bot_c[1] - wheel_d / 2 - head_shell;  // head bottom at 0°: the bench, POC phase 1
module head_outline_2d() {
    hull() {
        circle(r = 13);
        translate(rear_block[0]) square(rear_block[1] - rear_block[0]);
        translate([-funnel_ir - floor_wall, -drop_len - 2]) square([2 * (funnel_ir + floor_wall), drop_len + 2 + funnel_top]);
        for (a = [180 : 10 : 270]) translate(elbow_c + (floor_r + floor_wall + 1) * [cos(a), sin(a)]) circle(r = 1);
        translate(wheel_bot_c) circle(r = wheel_d / 2 + head_shell);
        for (s = [-1, 1]) translate(wheel_top_c + [0, s * wheel_adj]) circle(r = wheel_d / 2 + head_shell);
        for (b = [top_bar, front_bot, front_top]) translate(b[0]) square(b[1] - b[0]);
    }
}

module floor_band_2d() {
    intersection() {
        translate(elbow_c) difference() { circle(r = floor_r + floor_wall, $fn = 128); circle(r = floor_r, $fn = 128); }
        translate(elbow_c - [200, 200]) square([200, 200 + fudge]);
    }
    translate([elbow_c[0] - fudge, elbow_c[1] - floor_r - floor_wall]) square([run_len + wheel_d / 2, floor_wall]);
}

path_pts = concat([[0, funnel_top + 30], [0, -drop_len]],
                  [ for (a = [190 : 10 : 270]) elbow_c + elbow_r * [cos(a), sin(a)] ],
                  [[pinch[0] + 80, pinch[1]]]);

module ball_sweep() {
    for (i = [0 : len(path_pts) - 2]) hull() for (p = [path_pts[i], path_pts[i + 1]])
        translate(yz(p)) sphere(r = ball_r + 0.25, $fn = 32);
}

module wheel_clear() {
    module cyl(c, r, x0, x1) translate([x0, c[0], c[1]]) rotate([0, 90, 0]) cylinder(r = r, h = x1 - x0);
    cyl(wheel_bot_c, wheel_d / 2 + 2, -wheel_w / 2 - 1.5, wheel_w / 2 + 1.5);
    hull() for (s = [-1, 1]) cyl(wheel_top_c + [0, s * wheel_adj], wheel_d / 2 + 2, -wheel_w / 2 - 1.5, wheel_w / 2 + 1.5);
}

// Fixed feed tube + ears + escapement plate, swept into the head frame over the
// pitch range: the head is notched by this so it never swings into them.
module tube_sweep_head_2d(margin = 2) {
    steps = [ for (a = [pitch_min : 5 : pitch_max]) a ];
    for (i = [0 : len(steps) - 2]) hull() for (a = [steps[i], steps[i + 1]])
        rotate(-a) translate([-45, tube_gap - margin]) square([45 + tube_or + margin, 200]);
}

// Ball lead-in. The ball leaves the fixed tube falling straight down (yaw frame)
// whatever the elevation, so sweep that fall, from inside the tube to the head
// entry on the pivot, into the head frame over the whole pitch range: no ledge is
// ever left under the tube exit, and at any angle the walls funnel the ball into
// the drop. (clash_ball_* proves it.)
module ball_lead_in() {
    steps = concat([ for (a = [pitch_min : 5 : pitch_max - 0.01]) a ], [pitch_max]);
    r = chan_hw - 0.25;
    for (i = [0 : len(steps) - 2]) hull() {
        for (a = [steps[i], steps[i + 1]], h = [tube_gap, tube_gap + 20])
            rotate([-a, 0, 0]) translate([0, 0, h]) sphere(r = r, $fn = 32);
        sphere(r = r, $fn = 32);
    }
}

module funnel_block() {
    difference() {
        translate([0, -funnel_ir - floor_wall, -drop_len - 2])
            cube([chan_hw + fudge, 2 * (funnel_ir + floor_wall), drop_len + 2 + funnel_top]);
        translate([0, 0, -drop_len - 3]) cylinder(r = funnel_ir, h = drop_len + funnel_top + 4, $fn = 96);
        translate([0, 0, funnel_top - 3]) cylinder(r1 = funnel_ir, r2 = funnel_ir + 3 + fudge, h = 3 + fudge, $fn = 96);
    }
}

// One half of the head on the +X side. motor = true adds the motor features.
module head_half(motor) {
    difference() {
        union() {
            yz_extrude(chan_hw, head_out) head_outline_2d();
            yz_extrude(0, chan_hw + fudge) {
                floor_band_2d();
                for (b = [rear_block, top_bar, front_bot, front_top]) translate(b[0]) square(b[1] - b[0]);
            }
            funnel_block();
        }
        ball_sweep();
        ball_lead_in();
        wheel_clear();
        yz_extrude(-1, head_out + 1) tube_sweep_head_2d();
        // pitch pivot: plain bearing for the tip of the M5 bolt screwed through the cheek
        translate(yz([0, 0], chan_hw - 1)) rotate([0, 90, 0]) cylinder(d = bore(m5_d, fit_bearing), h = head_wall_t + 2);
        // lock screw pilot (M4, rides in the cheek arc slot)
        translate(yz(lock_pt, head_out - 14)) rotate([0, 90, 0]) self_tap(4, 0.7, 14);
        // tie bolts: right half clearance + counterbore, left half self-tap pilot
        for (p = tie_pts) translate(yz(p)) rotate([0, 90, 0])
            if (motor) {
                translate([0, 0, -1]) cylinder(d = bore(3), h = head_out + 2);
                translate([0, 0, head_out - 3.2]) cylinder(d = 6.4, h = 4);
            } else {
                translate([0, 0, -fudge]) cylinder(d = 3 - 0.4 * 0.5, h = head_out - 1.2);
            }
        if (motor) for (c = [wheel_bot_c, wheel_top_c]) {
            adj = (c == wheel_top_c) ? wheel_adj : 0;
            // gearbox nose pocket (keys the motor; a slot for the top wheel)
            translate([gb_face_x, c[0] - n20_w / 2 - tolerance, c[1] - n20_h / 2 - tolerance - adj])
                cube([head_out - gb_face_x + 1, n20_w + 2 * tolerance, n20_h + 2 * tolerance + 2 * adj]);
            // hub clearance through the wall
            hull() for (s = [-1, 1]) translate(yz(c + [0, s * adj], wheel_face_x)) rotate([0, 90, 0])
                cylinder(d = hub_d + 1.5, h = gb_face_x - wheel_face_x + fudge);
            // clamp screws (slots for the top wheel) + captive nut channels on the inner face
            for (sy = [-1, 1]) {
                hull() for (s = [-1, 1]) translate(yz(c + [sy * clamp_screw_dy, s * adj], chan_hw - 1))
                    rotate([0, 90, 0]) cylinder(d = bore(3), h = head_wall_t + 2);
                hull() for (s = [-1, 1]) translate(yz(c + [sy * clamp_screw_dy, s * adj], chan_hw - fudge))
                    rotate([0, 90, 0]) nut_pocket(m3_nut_af, m3_nut_h + 0.4);
            }
        }
    }
}
module head_right() head_half(true);
module head_left()  mirror([1, 0, 0]) head_half(false);

// N20 clamp in assembly pose at a wheel centre (head frame)
clamp_tunnel = [n20_w + 2 * tolerance, n20_h + 2 * tolerance];
clamp_block  = clamp_tunnel + 2 * [clamp_wall, clamp_wall];

module motor_clamp_local() {   // flange face on x = 0, block along +X
    difference() {
        union() {
            translate([0, -clamp_block[0] / 2, -clamp_block[1] / 2]) cube([clamp_len, clamp_block[0], clamp_block[1]]);
            translate([0, -clamp_screw_dy - clamp_ear / 2, -clamp_block[1] / 2])
                cube([clamp_flange, 2 * clamp_screw_dy + clamp_ear, clamp_block[1]]);
        }
        translate([-1, -clamp_tunnel[0] / 2, -clamp_tunnel[1] / 2]) cube([clamp_len + 2, clamp_tunnel[0], clamp_tunnel[1]]);
        for (s = [-1, 1]) translate([-1, s * clamp_screw_dy, 0]) rotate([0, 90, 0]) cylinder(d = bore(3), h = clamp_flange + 2);
        // retaining screw pressing on the motor can (M3, from +Z)
        translate([clamp_len - 4.5, 0, clamp_tunnel[1] / 2 - 1]) linear_extrude(clamp_wall + 2) rotate(-90) teardrop_2d(3 - 0.4 * 0.5);
    }
}
module motor_clamp_at(c) translate(yz(c, head_out)) motor_clamp_local();

// Wheel hub: D-bore collar + a stub that fits the wheel's bore (wheel_type): the
// TT shaft shape (round with two flats) or a LEGO cross. Local frame: axis along +X,
// collar x ∈ [0, hub_len] (motor side at +X), stub toward −X, D-flat facing +Z.
// It prints on its side (Z up): the TT flats are vertical walls, the cross is
// turned 45°, and the stub's lowest edge is cut 0.2 mm to stand on a land.
module stub_2d() {                              // 2-D x → local Z, 2-D y → local Y
    if (is_lego) rotate(45) lego_cross_2d();
    else intersection() { circle(d = tt_stub_d); square([tt_stub_d + 1, tt_stub_flats], center = true); }
}
hub_flat_z = is_lego ? -((lego_cross / 2) + (lego_arm / 2)) * sin(45)   // lowest corner of the 45° cross
                     : -tt_stub_d / 2;                                  // bottom of the TT stub's round
hub_cut_z  = hub_flat_z + 0.2;                                          // print flat
stub_land  = is_lego ? 2 * (hub_cut_z - hub_flat_z) : 2 * sqrt(pow(tt_stub_d / 2, 2) - pow(hub_cut_z, 2));
assert(stub_land >= 0.4, "wheel stub first-layer land narrower than one line");
assert(-(n20_shaft_d + hole_comp) / 2 - hub_cut_z >= 2 * layer_height, "D-bore floor thinner than two layers");
assert(is_lego || tt_stub_flats - (tt_screw_d - 0.4 * 0.4) >= 2 * 0.8, "TT stub walls beside the screw pilot under 0.8 mm");
module wheel_hub_local() {
    difference() {
        union() {
            rotate([0, 90, 0]) cylinder(d = hub_d, h = hub_len);
            translate([fudge, 0, 0]) rotate([0, -90, 0]) linear_extrude(stub_len + fudge) stub_2d();
        }
        // TT: pilot for the optional M2 screw through the wheel centre (point up: no bridge)
        if (!is_lego) translate([-stub_len, 0, 0]) teardrop_hole(tt_screw_d - 0.4 * 0.4, 2 * (stub_len - 1), "x");
        // D-bore from the motor end (flat at +Z)
        translate([hub_len - hub_bore_len, 0, 0]) rotate([0, 90, 0])
            linear_extrude(hub_bore_len + 1) rotate(90)
                d_profile(n20_shaft_d + hole_comp, n20_shaft_flat + hole_comp / 2);
        // M3 grub screw onto the flat
        translate([hub_len - hub_bore_len / 2, 0, 0.5]) self_tap(3, 0.5, hub_d);
        // print flat
        translate([-stub_len - 1, -hub_d, hub_cut_z - 20]) cube([hub_len + stub_len + 2, 2 * hub_d, 20]);
    }
}
module wheel_hub_at(c) translate(yz(c, wheel_face_x + 0.5)) wheel_hub_local();

// ============================================================================
// FEED TUBE with ears and the escapement servo plate (yaw frame)
// ============================================================================
esc_lever_x0  = esc_servo_top_x - sg_h + sg_spline_top;     // rocker inner face
finger_z      = [esc_axis_z - esc_arm, esc_axis_z + esc_arm];
esc_plate_x   = [esc_servo_top_x - sg_h + sg_tab_z - 4.5, esc_servo_top_x - sg_h + sg_tab_z];
esc_body_z    = [esc_axis_z - (sg_l - sg_shaft_off), esc_axis_z + sg_shaft_off];
esc_tab_z     = [esc_body_z[0] - (sg_tab_len - sg_l) / 2, esc_body_z[1] + (sg_tab_len - sg_l) / 2];

module feed_tube() {
    difference() {
        union() {
            translate([0, 0, tube_bot_z]) cylinder(r = tube_or, h = tube_len, $fn = 96);
            // ears that screw to the cheeks
            for (s = [-1, 1]) translate([s > 0 ? 12 : -cheek_in, ear_y[0], tube_bot_z])
                cube([cheek_in - 12, ear_y[1] - ear_y[0], ear_h]);
            // escapement servo plate (vertical, behind the tube)
            // (it rises from the bed, so it has no overhang, and runs into the tube wall: the bore trims it)
            translate([esc_plate_x[0], esc_axis_y - sg_w / 2 - 4.5, tube_bot_z])
                cube([esc_plate_x[1] - esc_plate_x[0], -(esc_axis_y - sg_w / 2 - 4.5), esc_tab_z[1] + 3 - tube_bot_z]);
        }
        // bore + entry/exit chamfers + top outer chamfer that seats in the hopper
        translate([0, 0, tube_bot_z - 1]) cylinder(r = tube_ir, h = tube_len + 2, $fn = 96);
        translate([0, 0, tube_bot_z - fudge]) cylinder(r1 = tube_ir + 1.5, r2 = tube_ir, h = 1.5, $fn = 96);
        translate([0, 0, tube_top_z - 2]) difference() {
            cylinder(r = tube_or + 1, h = 3, $fn = 96);
            translate([0, 0, -fudge]) cylinder(r1 = tube_or, r2 = tube_or - 2, h = 2 + 2 * fudge, $fn = 96);
        }
        // ear screw pilots (from the cheeks)
        for (s = [-1, 1], p = ear_screws) translate([s * (cheek_in - 6), p[0], p[1]])
            teardrop_hole(3 - 0.4 * 0.5, 12 + 2, "x");
        // finger windows
        for (z = finger_z) translate([esc_lever_x0 - 1, -tube_or - 1, z - 6.2]) cube([esc_lever_t + 2, tube_wall + 3, 12.4]);
        // servo body cut-out + tab screw pilots
        translate([esc_plate_x[0] - 1, esc_axis_y - sg_w / 2 - tolerance, esc_body_z[0] - tolerance])
            cube([esc_plate_x[1] - esc_plate_x[0] + 2, sg_w + 2 * tolerance, sg_l + 2 * tolerance]);
        for (z = [(esc_body_z[0] + esc_body_z[1]) / 2 - sg_hole_pitch / 2, (esc_body_z[0] + esc_body_z[1]) / 2 + sg_hole_pitch / 2])
            translate([esc_plate_x[1] - 6, esc_axis_y, z]) teardrop_hole(2 - 0.4 * 0.4, 14, "x");
    }
}

// Escapement rocker (yaw frame, rotation `a` about X through the servo axis)
module rocker_2d() {
    difference() {
        union() {
            hull() {                     // bar covers the horn recess with a 2 mm rim; round ends stay inside the tube windows
                bar = max(esc_arm + esc_finger_h / 2, sg_horn_end_r + 5.5 / 2 + 2);
                translate([esc_axis_y, esc_axis_z]) circle(r = 7);
                for (s = [-1, 1]) translate([esc_axis_y, esc_axis_z + s * (bar - 3.5)]) circle(r = 3.5);
            }
            for (z = finger_z) hull() {
                translate([esc_axis_y, z - esc_finger_h / 2]) square([1, esc_finger_h]);
                translate([esc_axis_y + esc_tip_dy - esc_finger_h / 2, z]) circle(d = esc_finger_h);
            }
        }
        translate([esc_axis_y, esc_axis_z]) circle(d = 5.5);
    }
}
module rocker_local() {
    difference() {
        yz_extrude(esc_lever_x0, esc_lever_x0 + esc_lever_t) rocker_2d();
        // horn recess on the servo side + slots for the horn screws
        yz_extrude(esc_lever_x0 - 1, esc_lever_x0 + 2) translate([esc_axis_y, esc_axis_z])
            hull() { circle(d = 8.5); for (s = [-1, 1]) translate([0, s * sg_horn_end_r]) circle(d = 5.5); }
        yz_extrude(esc_lever_x0 - 1, esc_lever_x0 + esc_lever_t + 1) translate([esc_axis_y, esc_axis_z])
            for (s = [-1, 1]) hull() for (r = [8, 15]) translate([0, s * r]) circle(d = 2.2);
    }
}
module rocker_at(a) translate([0, esc_axis_y, esc_axis_z]) rotate([a, 0, 0]) translate([0, -esc_axis_y, -esc_axis_z]) rocker_local();

module feed_servo_at() {
    translate([esc_servo_top_x - sg_h, esc_axis_y, esc_axis_z]) rotate([0, 90, 0]) rotate([0, 0, -90]) micro_servo();
}

// ============================================================================
// HOPPER FUNNEL (basket adapter on top of the tube; printed upside down)
// ============================================================================
hop_wall   = 6 * ew;
hop_socket = 15;
module hopper() {
    T  = tube_top_z;
    ri = tube_or + tolerance;                // socket bore
    ro = ri + hop_wall;
    ctop = T + hopper_h;                     // top of the cone (inner)
    off = hop_wall / cos(hopper_slope);
    rc = hopper_top_r + 5 * ew;              // collar outer radius
    z_outer_at = function (r) T + (r - tube_ir) * tan(hopper_slope) - off;
    difference() {
        rotate_extrude($fn = 128) polygon([
            [tube_ir, T + 0.25],
            [hopper_top_r, ctop],
            [hopper_top_r, ctop + hopper_collar_h],
            [rc, ctop + hopper_collar_h],
            [rc, z_outer_at(rc)],
            [ro, z_outer_at(ro)],
            [ro, T - hop_socket],
            [ri, T - hop_socket],
            [ri, T - 2.3]
        ]);
        for (a = [0 : 60 : 359]) rotate([0, 0, a]) translate([hopper_top_r + 2, 0, ctop + hopper_collar_h / 2])
            mirror([0, 0, 1]) teardrop_hole(bore(4), 10, "x");
    }
}

// ============================================================================
// KNOBS
// ============================================================================
module knob_pot() {   // 16 mm pot, 6 mm D-shaft (flat 4.5), printed upright
    difference() {
        union() {
            hull() { translate([0, 0, ef_chamfer]) cylinder(d = 22, h = 13 - ef_chamfer); cylinder(d = 22 - 2 * ef_chamfer, h = ef_chamfer); }
            translate([0, 0, 13 - fudge]) cylinder(d1 = 22, d2 = 19, h = 1.5);
        }
        for (a = [0 : 20 : 359]) rotate([0, 0, a]) translate([11.4, 0, -1]) cylinder(d = 2.4, h = 20, $fn = 12);
        translate([0, 0, -fudge]) linear_extrude(10) d_profile(6 + hole_comp - 0.15, 4.5 + hole_comp / 2 - 0.1);
        translate([-0.7, 2, 13.5]) cube([1.4, 7.5, 2]);    // pointer
    }
}
module knob_lock() {  // M4 hex-head bolt pressed into the knob
    difference() {
        hull() { translate([0, 0, ef_chamfer]) cylinder(d = 26, h = 12 - ef_chamfer); cylinder(d = 26 - 2 * ef_chamfer, h = ef_chamfer); }
        for (a = [0 : 60 : 359]) rotate([0, 0, a]) translate([15.5, 0, -1]) cylinder(d = 9, h = 14);
        translate([0, 0, -fudge]) cylinder(d = (m4_head_af + hole_comp - 0.05) / cos(30), h = m4_head_h + 0.2, $fn = 6);
        translate([0, 0, -1]) cylinder(d = bore(4), h = 14);
    }
}

// ============================================================================
// ASSEMBLY
// ============================================================================
module tyre(c)  translate(yz(c)) if (is_lego) lego_wheel_tyre(); else tt_wheel_tyre();
module rim(c)   translate(yz(c)) if (is_lego) lego_wheel_rim(); else tt_wheel_rim();
module motor_at(c) translate(yz(c, gb_face_x)) n20_motor();

module head_solid(a) at_head(a) {     // everything that tilts, as solids (for clash checks)
    head_right(); head_left();
    for (c = [wheel_bot_c, wheel_top_c]) {
        motor_clamp_at(c); motor_at(c); wheel_hub_at(c);
        translate(yz(c, -wheel_w / 2)) rotate([0, 90, 0]) cylinder(d = wheel_d, h = wheel_w);
    }
}
module turret_static() {
    turret(); cheek_right(); cheek_left(); feed_tube(); rocker_at(rock_pose); feed_servo_at();
}

// POC phase 1: only the head is printed. It stands (clamped) on the bench at loose_z with
// the electronics lying loose beside it, wired but not mounted.
loose_board_at = [-190, -10, loose_z];
loose_batt_at  = [70, -60, loose_z];          // all on the table: its end is at y = -100
module loose_battery() translate(loose_batt_at) aa_holder();
module loose_switch() translate([170, -30, loose_z + 20]) rotate([-90, 0, 0]) rocker_switch();   // rocker up
module assembly_loose() {
    board_set(loose_board_at);
    color("darkorange") loose_battery();
    color("black") loose_switch();
    head_colored(0);
}
// POC phases 2–3: the head between the cheeks on the bench plate; phase 3 adds the feeder
module assembly_poc(phase = 3, pitch = pitch_pose) {
    color("dimgray") poc_base();
    board_set(poc_board_at);
    color("darkorange") poc_battery();
    color("black") poc_switch();
    color("steelblue") { cheek_right(); cheek_left(); }
    color("black") for (s = [-1, 1]) translate([s * cheek_out, 0, pivot_z]) at_lock_knob(s, pitch);
    head_colored(pitch);
    if (phase >= 3) { color("lightsteelblue", 0.8) feed_tube(); color("gold") rocker_at(rock_pose); color("orange") feed_servo_at(); color("lightskyblue", 0.6) hopper(); }
}

module assembly(yaw = yaw_pose, pitch = pitch_pose, rock = rock_pose) {
    color("dimgray") tray();
    color("gray") lid();
    color("orange") translate([0, 0, servo_bot_z]) micro_servo();
    color("silver") { translate([0, 0, ub_bot_z]) bearing_608(); translate([0, 0, boss_bot_z]) bearing_608(); }
    color("darkorange") translate(batt_xyz) cube(batt_size);
    board_vitamins();
    panel_vitamins();
    rotate([0, 0, yaw]) {
        color("gold") coupler();
        color("silver") { translate([0, 0, turret_top_z + turret_boss - m8_head_h]) m8_bolt(m8_bolt_len); translate([0, 0, nut_bot_z]) m8_nyloc(); }
        color("steelblue") turret();
        color("steelblue") { cheek_right(); cheek_left(); }
        color("lightsteelblue", 0.8) feed_tube();
        color("lightskyblue", 0.6) hopper();
        color("gold") rocker_at(rock);
        color("orange") feed_servo_at();
        color("black") for (s = [-1, 1]) translate([s * cheek_out, 0, pivot_z]) rotate([0, 0, 0])
            at_lock_knob(s, pitch);
        head_colored(pitch);
    }
}
module head_colored(pitch) at_head(pitch) {
    color("tomato") head_right();
    color("tomato") head_left();
    for (c = [wheel_bot_c, wheel_top_c]) {
        color("gold") motor_clamp_at(c);
        color("silver") motor_at(c);
        color("white") wheel_hub_at(c);
        color("black") tyre(c);
        color("yellow") rim(c);
    }
}
module at_lock_knob(s, pitch) {
    p = rot_yz(lock_pt, pitch);
    translate([0, p[0], p[1]]) rotate([0, s * 90, 0]) knob_lock();
}

batt_size = [aa_holder_size[2], aa_holder_size[0], aa_holder_size[1]];
batt_xyz  = [batt_wall_x - batt_size[0], -batt_size[1] / 2, 10];
module board_vitamins() board_set([board_pos[0], board_pos[1], board_z]);
module panel_vitamins() {
    py = panel_y + wall_t;
    for (i = [0 : 2]) {
        color("silver") translate([ctl_x[i], py, row_hi]) potentiometer();
        color("red") translate([ctl_x[i], py, row_lo]) push_button();
        color("black") translate([ctl_x[i], panel_y - 2, row_hi]) rotate([90, 0, 0]) knob_pot();
    }
    color("black") translate([switch_x, panel_y, row_hi]) rocker_switch();
    color("lime") translate([led_x, py, row_lo]) led5();
}

// ============================================================================
// PART SELECTOR (print orientation for printable parts: Z = 0 is the bed)
// ============================================================================
if (part == "all" || part == "assembly") assembly();

if (part == "tray")         tray();
if (part == "lid")          ef_foot() rotate([180, 0, 0]) translate([0, 0, -lid_top]) lid();
if (part == "spacer_parts") ef_foot() race_spacers();
if (part == "coupler")      ef_foot() translate([0, 0, -coupler_bot_z]) coupler();
if (part == "turret")       ef_foot() translate([0, 0, -turret_bot_z]) turret();
if (part == "cheek_right")
    ef_foot() multmatrix([[0, -1, 0, 0], [0, 0, 1, -turret_top_z], [-1, 0, 0, cheek_out], [0, 0, 0, 1]]) cheek_right();
if (part == "cheek_left")
    ef_foot() multmatrix([[0, 1, 0, 0], [0, 0, 1, -turret_top_z], [1, 0, 0, cheek_out], [0, 0, 0, 1]]) cheek_left();
if (part == "head_right")   ef_foot() translate([0, 0, head_out]) rotate([0, 90, 0]) head_right();
if (part == "head_left")    ef_foot() translate([0, 0, head_out]) rotate([0, -90, 0]) head_left();
if (part == "motor_clamp")  ef_foot() rotate([0, -90, 0]) motor_clamp_local();
if (part == "wheel_hub")    ef_foot() translate([0, 0, -hub_cut_z]) wheel_hub_local();
if (part == "feed_tube")    ef_foot() translate([0, 0, -tube_bot_z]) feed_tube();
if (part == "rocker")       ef_foot() rotate([0, 90, 0]) translate([-(esc_lever_x0 + esc_lever_t), -esc_axis_y, -esc_axis_z]) rocker_local();   // horn recess up
if (part == "hopper")       ef_foot() rotate([180, 0, 0]) translate([0, 0, -(tube_top_z + hopper_h + hopper_collar_h)]) hopper();
if (part == "knob_pot")     ef_foot() knob_pot();
if (part == "knob_lock")    ef_foot() knob_lock();
if (part == "poc_base")     ef_foot() translate([0, 0, -poc_bot_z]) poc_base();

// --- clash checks (must render empty) ---
if (part == "clash_head_lo")  intersection() { head_solid(pitch_min); turret_static(); }
if (part == "clash_head_mid") intersection() { head_solid((pitch_min + pitch_max) / 2); turret_static(); }
if (part == "clash_head_hi")  intersection() { head_solid(pitch_max); turret_static(); }
// the ball still inside the tube (centre at or above the exit) must never touch the head
module ball_column() hull() for (h = [0, 30]) translate([0, 0, tube_bot_z + h]) sphere(r = ball_r + 0.5, $fn = 32);
if (part == "clash_ball_lo")  intersection() { at_head(pitch_min) { head_right(); head_left(); } ball_column(); }
if (part == "clash_ball_mid") intersection() { at_head((pitch_min + pitch_max) / 2) { head_right(); head_left(); } ball_column(); }
if (part == "clash_ball_hi")  intersection() { at_head(pitch_max) { head_right(); head_left(); } ball_column(); }
if (part == "clash_rocker_in")  intersection() { rocker_at(esc_alpha);  union() { feed_tube(); feed_servo_at(); } }
if (part == "clash_rocker_out") intersection() { rocker_at(-esc_alpha); union() { feed_tube(); feed_servo_at(); } }
if (part == "clash_coupler")  intersection() {
    coupler();
    union() { lid(); tray(); translate([0, 0, servo_bot_z]) micro_servo(); translate([0, 0, nut_top_z]) cylinder(d = 30, h = 1);
              translate([0, 0, nut_bot_z]) m8_nyloc(); translate([0, 0, turret_top_z + turret_boss - m8_head_h]) m8_bolt(m8_bolt_len); }
}
// elevation lock knobs at both ends of the pitch range vs everything near them except their own cheek pads
if (part == "clash_knobs") intersection() {
    for (a = [pitch_min, pitch_max], s = [-1, 1]) translate([s * cheek_out, 0, pivot_z]) at_lock_knob(s, a);
    union() { turret(); feed_tube(); rocker_at(rock_pose); feed_servo_at(); poc_static(); }
}
// POC bench rig: the tilting head over the plate and its electronics, the cheeks beside them
if (part == "clash_poc_lo")     intersection() { head_solid(pitch_min); poc_static(); }
if (part == "clash_poc_mid")    intersection() { head_solid((pitch_min + pitch_max) / 2); poc_static(); }
if (part == "clash_poc_hi")     intersection() { head_solid(pitch_max); poc_static(); }
if (part == "clash_poc_cheeks") intersection() { union() { cheek_right(); cheek_left(); }
                                                 union() { board_set(poc_board_at); poc_battery(); poc_switch(); } }
// POC phase 1: the clamped head clears its loose electronics, and nothing on it reaches below the bench
if (part == "clash_loose") intersection() { head_solid(0);
    union() { board_set(loose_board_at); loose_battery(); loose_switch();
              translate([-500, -500, loose_z - 50 - fudge]) cube([1000, 1000, 50]); } }
if (part == "check_dims") {
    echo(str("ASM pivot_z=", pivot_z));
    cube(1);
}

// --- views for the web visualisation (assembly pose, yaw = pitch = 0) ---
if (part == "assembly_poc1")    assembly_loose();
if (part == "assembly_poc2")    assembly_poc(2);
if (part == "assembly_poc3")    assembly_poc(3);
if (part == "view_tray")        tray();
if (part == "view_lid")         lid();
if (part == "view_turret")      turret();
if (part == "view_cheeks")      { cheek_right(); cheek_left(); }
if (part == "view_head_left")   at_head(0) head_left();
if (part == "view_head_right")  at_head(0) head_right();
if (part == "view_clamps")      at_head(0) for (c = [wheel_bot_c, wheel_top_c]) motor_clamp_at(c);
if (part == "view_motors")      at_head(0) for (c = [wheel_bot_c, wheel_top_c]) motor_at(c);
if (part == "view_hub_top")     at_head(0) wheel_hub_at(wheel_top_c);
if (part == "view_hub_bot")     at_head(0) wheel_hub_at(wheel_bot_c);
if (part == "view_tyre_top")    at_head(0) tyre(wheel_top_c);
if (part == "view_tyre_bot")    at_head(0) tyre(wheel_bot_c);
if (part == "view_rim_top")     at_head(0) rim(wheel_top_c);
if (part == "view_rim_bot")     at_head(0) rim(wheel_bot_c);
if (part == "view_feed_tube")   feed_tube();
if (part == "view_rocker")      rocker_at(0);
if (part == "view_hopper")      hopper();
if (part == "view_panel_knobs") panel_knobs();
if (part == "view_lock_knobs")  for (s = [-1, 1]) translate([s * cheek_out, 0, pivot_z]) at_lock_knob(s, 0);
if (part == "view_swing_servo") translate([0, 0, servo_bot_z]) micro_servo();
if (part == "view_feed_servo")  feed_servo_at();
if (part == "view_bearings")    { translate([0, 0, ub_bot_z]) bearing_608(); translate([0, 0, boss_bot_z]) bearing_608(); }
if (part == "view_coupler")     coupler();
if (part == "view_bolt")        { translate([0, 0, turret_top_z + turret_boss - m8_head_h]) m8_bolt(m8_bolt_len); translate([0, 0, nut_bot_z]) m8_nyloc(); }
if (part == "view_battery")     translate(batt_xyz) cube(batt_size);
if (part == "view_board")       translate([board_pos[0], board_pos[1], board_z]) perfboard();
if (part == "view_pico")        board_pico([board_pos[0], board_pos[1], board_z]);
if (part == "view_driver")      board_driver([board_pos[0], board_pos[1], board_z]);
if (part == "view_panel")       panel_controls();
if (part == "view_panel_switch") panel_switch();
if (part == "view_balls")       ping_pong_ball();
if (part == "view_poc_base")    poc_base();
if (part == "view_poc_board")   translate(poc_board_at) perfboard();
if (part == "view_poc_pico")    board_pico(poc_board_at);
if (part == "view_poc_driver")  board_driver(poc_board_at);
if (part == "view_poc_battery") poc_battery();
if (part == "view_poc_switch")  poc_switch();
if (part == "view_loose_board") translate(loose_board_at) perfboard();
if (part == "view_loose_pico")  board_pico(loose_board_at);
if (part == "view_loose_driver") board_driver(loose_board_at);
if (part == "view_loose_battery") loose_battery();
if (part == "view_loose_switch") loose_switch();

module panel_knobs() for (i = [0 : 2]) translate([ctl_x[i], panel_y - 2, row_hi]) rotate([90, 0, 0]) knob_pot();
module panel_controls() {                        // buttons, pots and LED (test phase 4)
    py = panel_y + wall_t;
    for (i = [0 : 2]) { translate([ctl_x[i], py, row_hi]) potentiometer(); translate([ctl_x[i], py, row_lo]) push_button(); }
    translate([led_x, py, row_lo]) led5();
}
module panel_switch() translate([switch_x, panel_y, row_hi]) rocker_switch();

// Pivots and key points for the web viewer (parsed by tools/build.py)
echo(str("ASMJSON {",
    "\"pivot\":[0,", 0, ",", pivot_z, "],",
    "\"wheel_top\":[0,", wheel_top_c[0], ",", pivot_z + wheel_top_c[1], "],",
    "\"wheel_bot\":[0,", wheel_bot_c[0], ",", pivot_z + wheel_bot_c[1], "],",
    "\"pinch\":[0,", pinch[0], ",", pivot_z + pinch[1], "],",
    "\"elbow_c\":[0,", elbow_c[0], ",", pivot_z + elbow_c[1], "],",
    "\"elbow_r\":", elbow_r, ",",
    "\"drop_len\":", drop_len, ",",
    "\"rocker_axis\":[0,", esc_axis_y, ",", esc_axis_z, "],",
    "\"finger_z\":[", finger_z[0], ",", finger_z[1], "],",
    "\"tube_bot_z\":", tube_bot_z, ",\"tube_top_z\":", tube_top_z, ",",
    "\"tube_ir\":", tube_ir, ",\"hopper_slope\":", hopper_slope, ",\"hopper_top_r\":", hopper_top_r, ",",
    "\"esc_alpha\":", esc_alpha, ",\"esc_tip_dy\":", esc_tip_dy, ",\"ball1_z\":", esc_ball1_z, ",\"finger_h\":", esc_finger_h, ",",
    "\"base\":[", base_x, ",", base_y, ",", tray_h + lid_t, "],",
    "\"pitch_range\":[", pitch_min, ",", pitch_max, "],",
    "\"yaw_max\":", yaw_max, ",",
    "\"ball_d\":", ball_d, ",\"gap\":", gap, ",",
    "\"wheel_d\":", wheel_d, ",\"wheel_w\":", wheel_w, ",",
    "\"lid_top\":", lid_top, ",\"poc_bot_z\":", poc_bot_z, ",\"loose_z\":", loose_z, ",\"poc_size\":[", poc_x[1] - poc_x[0], ",", poc_y[1] - poc_y[0], "],",
    "\"hopper_top_z\":", tube_top_z + hopper_h + hopper_collar_h,
    "}"));
