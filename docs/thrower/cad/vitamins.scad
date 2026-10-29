// ============================================================================
// PingPongThrower — purchased parts ("vitamins"), simplified for the assembly
// view, the web visualisation and the clash checks. Not printed.
// ============================================================================

// N20 gearmotor. Gearbox face on x = 0, body along +X, shaft along -X.
module n20_motor() {
    // gearbox
    translate([0, -n20_w / 2, -n20_h / 2]) cube([n20_gb_len, n20_w, n20_h]);
    // motor can (round with two flats)
    translate([n20_gb_len - fudge, 0, 0]) rotate([0, 90, 0])
        intersection() {
            cylinder(d = n20_w, h = n20_can_len);
            translate([-n20_h / 2, -n20_w / 2, 0]) cube([n20_h, n20_w, n20_can_len]);
        }
    // end cap with terminals
    translate([n20_gb_len + n20_can_len - fudge, -4, -n20_h / 2 + 1]) cube([n20_cap_len, 8, n20_h - 2]);
    // D-shaft
    rotate([0, -90, 0]) linear_extrude(n20_shaft_len) d_profile(n20_shaft_d, n20_shaft_flat);
}

// Yellow 65 × 26 mm TT-motor wheel: centred on the origin, axis along X, the
// bore boss flush with the motor-side (+X) face. Visual only.
tt_tyre_t   = 6.5;          // rubber tyre thickness
tt_boss_len = 12;           // bore boss length from the +X face
module tt_wheel_tyre() {
    rotate([0, 90, 0]) rotate_extrude($fn = 72)
        translate([wheel_d / 2 - tt_tyre_t, -wheel_w / 2])
            offset(r = 2.5) offset(delta = -2.5) square([tt_tyre_t, wheel_w]);
}
module tt_wheel_rim() {
    ri = wheel_d / 2 - tt_tyre_t;
    rotate([0, 90, 0]) difference() {
        cylinder(r = ri + 0.5, h = wheel_w - 2, center = true, $fn = 64);
        cylinder(r = ri - 2, h = wheel_w, center = true, $fn = 64);
    }
    translate([wheel_w / 2 - tt_boss_len, 0, 0]) rotate([0, 90, 0]) difference() {
        cylinder(d = 11, h = tt_boss_len);
        translate([0, 0, tt_boss_len - tt_stub_len - 0.5]) linear_extrude(tt_stub_len + 1)
            intersection() { circle(d = tt_shaft_d); square([tt_shaft_d + 1, tt_shaft_flats], center = true); }
    }
    for (a = [0 : 72 : 359]) rotate([a, 0, 0])
        translate([wheel_w / 2 - tt_boss_len + 2, -1.5, 5]) cube([tt_boss_len - 4, 3, ri - 6]);
}

// LEGO wheel: centred on the origin, axis along X.
module lego_wheel_tyre() {
    rotate([0, 90, 0]) rotate_extrude($fn = 64)
        translate([wheel_d / 2 - 7, -wheel_w / 2])
            offset(r = 3) offset(delta = -3) square([7, wheel_w]);
}
module lego_wheel_rim() {
    rotate([0, 90, 0]) difference() {
        cylinder(d = wheel_d - 12, h = wheel_w - 4, center = true, $fn = 48);
        cylinder(d = wheel_d - 18, h = wheel_w, center = true, $fn = 48);
    }
    rotate([0, 90, 0]) difference() {
        cylinder(d = 10, h = wheel_w - 6, center = true);
        linear_extrude(wheel_w, center = true) lego_cross_2d();
    }
    for (a = [0 : 60 : 359]) rotate([a, 0, 0])
        translate([-(wheel_w - 8) / 2, -1.2, 4]) cube([wheel_w - 8, 2.4, wheel_d / 2 - 12]);
}

// SG90 / MG90S. Origin on the output axis at body-bottom level, shaft along +Z,
// body extends along +Y from the shaft (shaft sits sg_shaft_off from the -Y end).
module micro_servo() {
    y0 = -sg_shaft_off;
    translate([-sg_w / 2, y0, 0]) cube([sg_w, sg_l, sg_h]);
    // tabs
    translate([-sg_w / 2, y0 - (sg_tab_len - sg_l) / 2, sg_tab_z]) cube([sg_w, sg_tab_len, sg_tab_t]);
    // top bosses and spline
    translate([0, 0, sg_h - fudge]) cylinder(d = sg_w - 0.5, h = 4);
    translate([0, 0, sg_h - fudge]) cylinder(d = 4.8, h = sg_spline_top - sg_h);
}
module servo_horn_double(len = 32) {
    hull() { cylinder(d = 7, h = 2); translate([0, len / 2 - 2.5, 0]) cylinder(d = 4.5, h = 2);
             translate([0, -len / 2 + 2.5, 0]) cylinder(d = 4.5, h = 2); }
}

module bearing_608() {
    difference() {
        cylinder(d = b608_od, h = b608_w);
        translate([0, 0, -fudge]) cylinder(d = b608_id, h = b608_w + 2 * fudge);
    }
}

module m8_bolt(len) {
    cylinder(d = m8_af / cos(30), h = m8_head_h, $fn = 6);
    translate([0, 0, -len]) cylinder(d = 8, h = len + fudge);
}
module m8_nyloc() {
    difference() {
        cylinder(d = m8_af / cos(30), h = m8_nyloc_h, $fn = 6);
        translate([0, 0, -fudge]) cylinder(d = 8, h = m8_nyloc_h + 2 * fudge);
    }
}

module ping_pong_ball() sphere(d = ball_d, $fn = 32);

// --- electronics (simplified boxes) ---
aa_holder_size = [67, 62, 19];             // enclosed 4×AA holder with switch & lid
module aa_holder() cube(aa_holder_size);
module perfboard() cube([70, 50, 1.6]);
module pico2w() {
    color("seagreen") cube([51, 21, 1]);
    translate([-1.3, 6.5, 1]) color("silver") cube([5.5, 8, 2.8]);              // USB
    translate([2, 1, -8.5]) color("black") cube([47, 2.5, 8.5]);                 // header rows
    translate([2, 17.5, -8.5]) color("black") cube([47, 2.5, 8.5]);
}
module drv8833() {
    color("crimson") cube([18.5, 16.5, 1.2]);
    translate([1, 1, -8.5]) color("black") cube([16.5, 2.5, 8.5]);
    translate([1, 13, -8.5]) color("black") cube([16.5, 2.5, 8.5]);
}
module rocker_switch() {                    // KCD1 type, axis along Y (−Y = front of panel)
    translate([-10.5, -2, -7.5]) cube([21, 2, 15]);
    translate([-9.5, 0, -6.5]) cube([19, 20, 13]);
}
module push_button() {                      // 12 mm panel button, axis along Y
    rotate([-90, 0, 0]) { translate([0, 0, -4]) cylinder(d = 10, h = 4); translate([0, 0, -1]) cylinder(d = 15, h = 1);
                          cylinder(d = 11.8, h = 18); }
}
module potentiometer() {                    // 16 mm pot, M7 bushing, 6 mm shaft along −Y
    rotate([-90, 0, 0]) { translate([0, 0, -15]) cylinder(d = 6, h = 15); translate([0, 0, -7]) cylinder(d = 7, h = 7);
                          cylinder(d = 16, h = 9); translate([-7, 0, 0]) cube([14, 11, 9]); }
}
module led5() rotate([-90, 0, 0]) { translate([0, 0, -6]) cylinder(d = 5, h = 6); cylinder(d = 5.8, h = 1); }
