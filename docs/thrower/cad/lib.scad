// ============================================================================
// PingPongThrower — small geometry helpers (print-aware). Included after
// config.scad, so fudge / hole_comp / tolerance are in scope.
// ============================================================================

// Clearance bore for a nominal diameter (Rule 8: nominal + compensation + fit)
function bore(d, fit = fit_free) = d + hole_comp + fit;

// Teardrop: horizontal hole whose top rises to a 45° point (prints without
// support). axis = "x" or "y" is the hole direction; the point faces +Z.
module teardrop_hole(d, h, axis = "y") {
    r = d / 2;
    rotate([0, 0, axis == "x" ? 90 : 0]) rotate([90, 0, 0])
        linear_extrude(height = h, center = true)
            union() { circle(r = r); rotate(45) square(r); }
}

// Teardrop truncated just above the circle: a short flat bridge instead of a
// tall point — used for panel holes that a nut or bezel covers.
module teardrop_flat(d, h, axis = "y", over = 0.6) {
    r = d / 2;
    rotate([0, 0, axis == "x" ? 90 : 0]) rotate([90, 0, 0])
        linear_extrude(height = h, center = true)
            intersection() {
                union() { circle(r = r); rotate(45) square(r); }
                translate([-r - 1, -r - 1]) square([2 * r + 2, 2 * r + 1 + over]);
            }
}

module rounded_square(size, r) {
    r2 = min(r, min(size[0], size[1]) / 2 - fudge);
    translate([r2, r2]) offset(r = r2) square([size[0] - 2 * r2, size[1] - 2 * r2]);
}

// Rounded block standing on Z=0 with an elephant-foot chamfer on the bottom edge
module rounded_block(size, r, ef = ef_chamfer) {
    hull() {
        translate([0, 0, ef]) linear_extrude(size[2] - ef) rounded_square([size[0], size[1]], r);
        translate([ef, ef, 0]) linear_extrude(ef) rounded_square([size[0] - 2 * ef, size[1] - 2 * ef], r);
    }
}

// D-shaft profile (diameter d, flat at distance `flat` from the far side), flat facing +Y
module d_profile(d, flat) {
    intersection() {
        circle(d = d);
        translate([-d, -d / 2]) square([2 * d, flat]);
    }
}

// LEGO Technic cross-axle profile
module lego_cross_2d(across = lego_cross, arm = lego_arm) {
    square([across, arm], center = true);
    square([arm, across], center = true);
}

// Annular arc slot in 2-D, centred on the origin, angles in degrees from +X
module arc_slot_2d(r, w, a0, a1, step = 2) {
    pts_out = [ for (a = [a0 : step : a1]) (r + w / 2) * [cos(a), sin(a)] ];
    pts_in  = [ for (a = [a1 : -step : a0]) (r - w / 2) * [cos(a), sin(a)] ];
    union() {
        polygon(concat(pts_out, [(r + w / 2) * [cos(a1), sin(a1)]], pts_in, [(r - w / 2) * [cos(a0), sin(a0)]]));
        translate(r * [cos(a0), sin(a0)]) circle(d = w);
        translate(r * [cos(a1), sin(a1)]) circle(d = w);
    }
}

// Hex nut pocket ($fn=6 sizes across corners → divide across-flats by cos 30)
module nut_pocket(af, h) cylinder(d = (af + hole_comp + 0.1) / cos(30), h = h, $fn = 6);

// Self-tap pilot running up +Z from z=0 (pattern-fasteners: d − 0.4·P)
module self_tap(d, pitch, depth) {
    translate([0, 0, -fudge]) cylinder(d = d - 0.4 * pitch, h = depth + 2 * fudge);
}

// Map a head-frame [y, z] point to 3-D at a given X
function yz(p, x = 0) = [x, p[0], p[1]];

// Place children in the head frame at pitch angle `a` (deg, + = nose up)
module at_head(a = 0) translate([0, 0, pivot_z]) rotate([a, 0, 0]) children();

// Extrude a 2-D shape drawn in the YZ plane ([y, z]) along +X from x0 to x1
module yz_extrude(x0, x1) {
    translate([x0, 0, 0]) rotate([90, 0, 90]) linear_extrude(x1 - x0) children();
}

// 2-D teardrop, tip toward +Y
module teardrop_2d(d) union() { circle(d = d); rotate(45) square(d / 2); }

// Elephant-foot compensation for a part already lying on the bed (Z = 0): the
// first ceil(c / layer) layers are inset in layer-height steps, i.e. a 45° chamfer
// as printed, on the outline and around every hole that reaches the bed.
module ef_foot(c = ef_chamfer, layer = layer_height) {
    n = ceil(c / layer - 1e-6);
    difference() {
        children();
        for (i = [0 : n - 1]) translate([0, 0, i * layer - fudge]) linear_extrude(layer + 2 * fudge)
            difference() {
                offset(delta = 1) projection(cut = true) translate([0, 0, -(i + 0.5) * layer]) children();
                offset(delta = -(c - i * layer)) projection(cut = true) translate([0, 0, -(i + 0.5) * layer]) children();
            }
    }
}
