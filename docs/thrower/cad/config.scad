// ============================================================================
// PingPongThrower — shared parameters, derived geometry and design contracts.
// Included by thrower.scad. Every dimension a builder may want to change lives
// here; everything below "DERIVED" is computed from it and guarded by asserts.
//
// World frame (assembly, yaw = 0, pitch = 0):
//   X = to the right when standing behind the robot, Y = launch direction,
//   Z = up, origin on the table under the yaw (swing) axis.
// Head frame (the tilting launcher head): same axes, origin on the pitch pivot.
//   2-D profile points in the head frame are written [y, z].
// ============================================================================

// === PRINTER / MATERIAL ===================================================
// Printer: Bambu Lab A1 / P1S / P1P / X1C, 256 x 256 x 256 mm, 0.4 mm nozzle
nozzle_diameter = 0.4;
layer_height    = 0.2;
build_x = 256; build_y = 256; build_z = 256;
bed_safe        = 220;      // X1/P1 front-left cutter exclusion: keep footprints ≤ 220
ew              = nozzle_diameter * 1.125;   // extrusion width 0.45
fudge           = 0.01;
hole_comp       = 0.30;     // measured Bambu/PETG hole shrink (skill default)
fit_free        = 0.30;     // free-running / clearance allowance
fit_bearing     = 0.15;     // 608 outer race seat
fit_press       = -0.08;    // interference
tolerance       = 0.30;     // PETG sliding fit between printed parts
ef_chamfer      = 0.4;      // elephant-foot chamfer
$fn = $preview ? 32 : 64;

// === BALL & LAUNCH CHANNEL ===============================================
ball_d        = 40;         // ITTF 40+ ball
ball_squeeze  = 2.0;        // total squeeze across the two wheels (gap = d - squeeze)
chan_clear    = 1.0;        // ball-to-wall clearance per side in the channel/tube

// === WHEELS (measure yours!) =============================================
// wheel_type picks the wheel and the stub on the printed hub. The head, pinch,
// pivot height and every clearance follow wheel_d, so rebuild everything after
// changing it (make check, make a1).
//   "tt"   : 65 × 26 mm yellow TT-motor wheel with rubber tyre (Botland 14245,
//            EAN 5903351248181): ABS rim, 5 mm bore with two flats
//   "lego" : any LEGO Technic wheel with a cross hole, 43–69 mm (lego_wheel_*)
wheel_type    = "tt";
wheel_adj     = 4;          // ± travel of the top wheel (squeeze / wear adjustment)
tt_wheel_d    = 65;         // TT wheel: tyre outer diameter
tt_wheel_w    = 26;         //           tyre width
tt_shaft_d    = 5.4;        // TT gearmotor output shaft the wheel bore is made for: round part
tt_shaft_flats= 3.7;        //                                                     across the flats
tt_stub_fit   = 0.1;        // printed stub this much under the shaft: a snug push fit
tt_stub_len   = 8;          // stub length pushed into the wheel bore (a TT shaft is ~8.5 mm)
tt_screw_d    = 2;          // optional M2 self-tap through the wheel centre into the stub
lego_wheel_d  = 56;         // LEGO wheel: 43.2 / 49.6 / 56 / 62.4 / 68.8 are common
lego_wheel_w  = 26;
lego_cross    = 4.75;       // LEGO cross-axle stub: across the arms
lego_arm      = 1.75;       //                       arm width
lego_stub_len = 16;         // stub length pushed into the wheel hub

// === N20 MICRO GEARMOTOR (6 V, 5:1, ~3000 rpm, 3 mm D-shaft) =============
n20_w         = 12.0;       // gearbox/can width  (horizontal, along Y)
n20_h         = 10.0;       // gearbox/can height (flats, along Z)
n20_gb_len    = 9.0;        // gearbox length
n20_can_len   = 15.0;       // motor can length
n20_cap_len   = 2.5;        // end cap + terminals
n20_shaft_d   = 3.0;
n20_shaft_flat= 2.5;        // D-flat: distance from flat to far side
n20_shaft_len = 10.0;

// === MICRO SERVOS (SG90 / MG90S share this envelope) =====================
sg_l          = 22.6;       // body length
sg_w          = 12.3;       // body width
sg_h          = 22.8;       // body height (bottom to tab-side top face)
sg_tab_len    = 32.4;       // across both mounting tabs
sg_tab_t      = 2.5;
sg_tab_z      = 15.9;       // tab underside above body bottom
sg_hole_pitch = 27.8;       // tab screw holes
sg_shaft_off  = 5.9;        // output axis from the near end of the body
sg_spline_top = 29.0;       // spline tip above body bottom (horn sits on it)
sg_horn_end_r = 16.5;       // double-arm horn: spline centre to the centre of an arm's round end

// === BEARINGS & FASTENERS ================================================
b608_od = 22; b608_id = 8; b608_w = 7; b608_ir_od = 12.0;
m8_af = 13; m8_nyloc_h = 8.0; m8_head_h = 5.3;
m8_bolt_len  = 40;          // yaw axle M8×40: the tip must pass fully through the nyloc's nylon ring
m3_d = 3; m3_head_d = 5.5; m3_nut_af = 5.5; m3_nut_h = 2.4;
m4_d = 4; m4_head_d = 7.0; m4_head_af = 7.0; m4_head_h = 2.8;
m5_d = 5;
pivot_bolt_len = 12;        // M5 hex bolt: through washer + cheek + pad, tip rides in the head bore
washer_t = 1.0;

// === BASE (fixed box: batteries, electronics, swing servo) ===============
base_x     = 190;
base_y     = 170;
tray_h     = 82;            // floor bottom to lid underside
lid_t      = 3.0;
floor_t    = 2.4;
wall_t     = 5 * ew;        // 2.25
corner_r   = 12;

// === TURRET / HEAD =======================================================
elbow_r     = 48;           // radius of the ball-centre path through the elbow
drop_len    = 8;            // straight drop below the pivot before the elbow
run_len_min = 14;           // shortest straight run from elbow exit to the wheel pinch (grows for big wheels)
pitch_min   = -5;           // head elevation range (deg, + = nose up)
pitch_max   = 30;
yaw_max     = 35;           // swing range (deg, each side)
head_wall_t = 14 * ew;      // 6.3 side walls of the head
floor_wall  = 6 * ew;       // 2.7 curved floor of the elbow
cheek_t     = 12 * ew;      // 5.4 yoke cheeks
cheek_pad   = 1.0;          // bearing pads on the cheek inner face
turret_r    = 66;
turret_t    = 6;
turret_hub_h= 1.5;          // hub ring that rides on the upper 608 inner race
head_floor_clear = 3;       // lowest head point above the turret plate

// === FEED TUBE, ESCAPEMENT, HOPPER =======================================
tube_wall    = 5 * ew;      // 2.25
tube_gap     = 19;          // tube bottom above the pivot (head entry swings below it)
tube_len     = 100;
esc_intr     = 8.0;         // how far a finger enters the bore when "in"
esc_alpha    = 18;          // rocker swing each side (deg); firmware FEED_ALPHA must match
esc_pitch    = 30;          // lower→upper finger spacing. tools/escapement.py (run by `make check`)
                            // proves: upper finger clears ball 1, meets ball 2 low on its flank and
                            // lifts it (no wedge), one ball per cycle, no double feed on the return
esc_axis_y   = -31.5;       // rocker axis behind the tube
esc_finger_h = 5;           // finger height (Z)
esc_lever_t  = 5;           // rocker thickness (X)
hopper_top_r = 72;          // inner radius at the top of the funnel
hopper_slope = 50;          // funnel wall angle from horizontal (≥ 45 → no supports)
hopper_collar_h = 14;

// ============================================================================
// DERIVED
// ============================================================================
ball_r   = ball_d / 2;
is_lego  = wheel_type == "lego";
wheel_d  = is_lego ? lego_wheel_d : tt_wheel_d;
wheel_w  = is_lego ? lego_wheel_w : tt_wheel_w;
stub_len = is_lego ? lego_stub_len : tt_stub_len;
tt_stub_d     = tt_shaft_d - tt_stub_fit;
tt_stub_flats = tt_shaft_flats - tt_stub_fit;
chan_hw  = ball_r + chan_clear;                 // half-width of the ball channel (21)
gap      = ball_d - ball_squeeze;               // wheel-to-wheel gap at the pinch
head_out = chan_hw + head_wall_t;               // outer face of the head side wall
cheek_in = head_out + cheek_pad + 0.5;          // cheek inner face
cheek_out= cheek_in + cheek_t;

// --- head-frame ball path (2-D [y, z]) ---
elbow_c  = [elbow_r, -drop_len];                // centre of the elbow arc
// The top wheel's rear edge must stay 5 mm in front of the fixed feed tube at max
// pitch. Solve the pinch's Y for that, so any wheel_d in 43–69 mm stays valid.
top_wheel_rel_z = -(drop_len + elbow_r) + gap / 2 + wheel_d / 2;
run_len  = max(run_len_min, ceil((chan_hw + tube_wall + 5 + wheel_d / 2 + top_wheel_rel_z * sin(pitch_max))
                                 / cos(pitch_max) - elbow_r));
pinch    = [elbow_r + run_len, -(drop_len + elbow_r)];
floor_r  = elbow_r + ball_r + 0.5;              // floor surface radius about elbow_c
wheel_bot_c = [pinch[0], pinch[1] - gap / 2 - wheel_d / 2];
wheel_top_c = [pinch[0], pinch[1] + gap / 2 + wheel_d / 2];
funnel_ir   = chan_hw + 1;                      // entry funnel bore radius
funnel_top  = 6;                                // funnel rim above pivot

// --- motor & hub along X (motors on the +X side) ---
hub_d        = 10;
hub_web      = 1.0;
wheel_face_x = wheel_w / 2;
// gearbox face X: wheel face + 0.5 gap + web + 0.5 tip clearance + shaft
gb_face_x    = wheel_face_x + 0.5 + hub_web + 0.5 + n20_shaft_len;
hub_len      = gb_face_x - 0.5 - (wheel_face_x + 0.5);   // collar (the wheel stub is extra)
hub_bore_len = hub_len - hub_web;               // D-bore: shaft tip stops 0.5 short of the web
gb_pocket    = head_out - gb_face_x;            // gearbox nose recessed into the wall
clamp_len    = 16;
clamp_wall   = 6 * ew;
clamp_flange = 4;
clamp_ear    = 9;                               // ear length beyond the block on each Y side
clamp_screw_dy = (n20_w + 2 * tolerance) / 2 + clamp_wall + clamp_ear / 2;

// --- head outline features (2-D [y, z]) ---
rear_block   = [[-38, -45], [-23.5, 3]];        // [min, max] tie block behind the funnel
lock_pt      = [-31, -34];                      // M4 lock screw (rides in the cheek arc slot)
tie_rear     = [-31, -8];
top_bar      = [[pinch[0] - 10, wheel_top_c[1] + wheel_d / 2 + wheel_adj + 2],
                [pinch[0] + 10, wheel_top_c[1] + wheel_d / 2 + wheel_adj + 7]];
front_x      = pinch[0] + wheel_d / 2 + 2;      // front tie bars start here (Y)
front_bot    = [[front_x, wheel_bot_c[1] - 7], [front_x + 7, wheel_bot_c[1] + 7]];
front_top    = [[front_x, wheel_top_c[1] - 7], [front_x + 7, wheel_top_c[1] + 7]];
lock_r       = norm(lock_pt);
lock_ang     = atan2(lock_pt[1], lock_pt[0]);   // in the YZ plane, from +Y

// --- vertical stack (world Z) ---
lid_top      = tray_h + lid_t;                  // 85
seat_depth   = b608_w + 0.2;
ledge_w      = 1.5;
web_hole_d   = 12;
cone_h       = (b608_od / 2 - ledge_w) - web_hole_d / 2;   // 45° cone from ledge to web hole
web_t        = 3;
boss_drop    = seat_depth + cone_h + web_t + seat_depth - lid_t;  // boss below the lid
boss_bot_z   = lid_top - (seat_depth + cone_h + web_t + seat_depth);
ub_bot_z     = lid_top - seat_depth;            // upper bearing bottom face
lb_top_z     = boss_bot_z + seat_depth;         // lower bearing top face
spacer_len   = ub_bot_z - lb_top_z;            // = the race gap: the nut clamps through the inner races,
                                                // never through the balls into the printed ledges
shim_t       = 2.0;
nut_top_z    = boss_bot_z - shim_t;
nut_bot_z    = nut_top_z - m8_nyloc_h;
coupler_top_z= nut_top_z - 0.5;
coupler_sock = m8_nyloc_h - 0.5 + 1;          // socket floor 1 mm below the nut: slides, never bottoms
coupler_relief = 3.5;
coupler_plate= 2;
horn_recess  = 2.2;
coupler_bot_z= coupler_top_z - coupler_sock - coupler_relief - coupler_plate - horn_recess;
spline_top_z = coupler_bot_z - 0.5;
servo_bot_z  = spline_top_z - sg_spline_top;
tower_top_z  = servo_bot_z + sg_tab_z;          // swing servo tabs rest here

turret_bot_z = lid_top + turret_hub_h;
turret_top_z = turret_bot_z + turret_t;

// head extremes over the pitch range decide the pivot height
function rot_yz(p, a) = [p[0] * cos(a) - p[1] * sin(a), p[0] * sin(a) + p[1] * cos(a)];
head_low_pts = [ for (a = [pitch_min, 0, pitch_max])
    let (c = rot_yz(wheel_bot_c, a)) c[1] - wheel_d / 2 - 4 ];
head_low     = min(head_low_pts);
pivot_z      = turret_top_z + head_floor_clear - head_low;
tube_bot_z   = pivot_z + tube_gap;
tube_top_z   = tube_bot_z + tube_len;
tube_ir      = chan_hw;
tube_or      = tube_ir + tube_wall;
ear_h        = 44;

// --- escapement geometry (world Y/Z, tube on the Z axis) ---
esc_tip_in_y   = -tube_ir + esc_intr;                         // finger tip when "in"
esc_arm        = esc_pitch / 2;
esc_tip_dy     = ((esc_tip_in_y - esc_axis_y) - esc_arm * sin(esc_alpha)) / cos(esc_alpha);
esc_tip_out_y  = esc_axis_y + esc_tip_dy * cos(esc_alpha) - esc_arm * sin(esc_alpha);
esc_axis_z     = tube_bot_z + 16 + esc_arm;                   // lower finger 16 mm above tube bottom
esc_servo_top_x= -4;                                          // servo output face (shaft along +X)
// ball 1 at rest: sits against the far wall on the lower finger's round tip
esc_tip_c_rest = rot_yz([esc_tip_dy - esc_finger_h / 2, -esc_arm], esc_alpha) + [esc_axis_y, esc_axis_z];
esc_ball1_z    = esc_tip_c_rest[1] + sqrt(pow(ball_r + esc_finger_h / 2, 2) - pow(chan_clear - esc_tip_c_rest[0], 2));

// --- hopper ---
hopper_h     = (hopper_top_r - tube_ir) * tan(hopper_slope);

// ============================================================================
// CONTRACTS — the gate fails if any of these break
// ============================================================================
assert(wheel_type == "tt" || wheel_type == "lego", "wheel_type must be \"tt\" or \"lego\"");
assert(wheel_d >= 43 && wheel_d <= 69, "wheel_d outside the 43–69 mm the head layout is checked for");
assert(wheel_w <= 2 * chan_hw - 4, "wheel too wide for the 42 mm channel");
assert(gap < ball_d && gap > ball_d - 5, "squeeze must be 0..5 mm");
assert(gb_pocket >= 1.5 && gb_pocket < head_wall_t - 2, "gearbox pocket depth out of range");
assert(abs(hub_bore_len - n20_shaft_len) < 1e-6, "hub bore must take the whole shaft");
assert(rot_yz(wheel_top_c, pitch_max)[0] - wheel_d / 2 > tube_or + 4,
       "top wheel swings into the feed tube at max pitch");
assert(esc_tip_out_y < -tube_ir - 1.0, "escapement finger does not clear the bore when out");
assert(esc_tip_in_y > -tube_ir + 6, "escapement finger does not block the ball when in");
assert(2 * esc_arm * sin(esc_alpha) > esc_intr + 1, "rocker stroke too small");
assert(hopper_slope >= 45, "hopper wall would need supports");
pivot_engage = pivot_bolt_len - washer_t - cheek_t - cheek_pad - (cheek_in - cheek_pad - head_out);
assert(pivot_engage >= 4 && pivot_engage <= head_wall_t - 1,
       "M5 pivot bolt: needs ≥ 4 mm in the head bore and must stop 1 mm short of the ball channel");
assert(2 * (hopper_top_r + wall_t) <= bed_safe, "hopper too wide for the bed");
assert(boss_bot_z - shim_t - m8_nyloc_h > coupler_bot_z, "stack order broken");
assert(tower_top_z > floor_t + 10, "swing servo tower too short — tray too low");
assert(servo_bot_z > floor_t + 2, "swing servo hits the floor");
assert(tube_top_z - pivot_z < 200, "turret too tall");

// Exit speed estimate (shown by the build): N20 3000 rpm no-load at 6 V
n20_rpm = 3000;
rim_speed = PI * wheel_d / 1000 * n20_rpm / 60;      // m/s
echo(str("DESIGN pivot_z=", pivot_z, " launch_z=", pivot_z + pinch[1],
         " rim_speed_mps=", rim_speed, " tube_top_z=", tube_top_z,
         " hopper_top_z=", tube_top_z + hopper_h + hopper_collar_h - 15));
