# CREASE — instrumented nets

First-person browser cricket with continuous mouse, trackpad and touch batting.

Serve `dist/` through a local HTTP server. The ES modules do not run by opening the HTML through `file://`.

Run regression checks with `node tests/test-nets.mjs`.

Run coarse fitting with `node tools/calibrate.mjs measurements.json`. The input must contain a release contract and at least three increasing timestamped position measurements; see the script's validation and `dist/physics.js`. Synthetic test data is not evidence of real-world accuracy.

The browser implementation uses a 1 ms fixed-step solver with explicit, uncalibrated priors. It is a nets vertical slice, not a complete official cricket match or the full research specification.

Three.js r170 is vendored under its included MIT license.
