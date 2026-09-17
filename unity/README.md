# CREASE Unity setup

Editor: Unity 6000.6.1f1, Windows x64.

Project: `C:\Users\saksh\Documents\Codex\2026-09-10\can-you\unity\CREASE`

## Open it

1. The editor currently has a **Unity Editor Software Terms** window open. Review it yourself and accept only if you agree. In Unity Hub, resolve any remaining sign-in or license prompt under Settings → Licenses. Use the license appropriate to your account and eligibility; setup did not accept license terms or activate one for you.
2. Double-click `Open-CREASE.cmd` in this folder, or use Hub → Projects → Add project from disk and select `CREASE`.
3. Allow the first import. The setup script creates `Assets/Scenes/CreaseNets.unity` if missing. You can also use **CREASE → Create or open migration preview**.
4. Press Unity's Play button. The pitch, eye camera, bat, gloves and practice ball are created at runtime.

The automated launch could not finish: its log reports a refused licensing IPC connection to `LicenseClient-saksh`, and the visible editor process is waiting at Software Terms. This does not establish that your account lacks a license. Diagnostic logs are in `../outputs/unity/` relative to this folder.

## What is connected

`tools/export-unity.mjs` reads the existing browser batting controller and physical bat simulation. It exports all 19 named shots for both batting hands: 38 clips, each with 180 samples at 100 Hz. Positions, handle orientation, head position and hand targets are converted from browser -Z-forward to Unity +Z-forward.

Run `Refresh-browser-motions.cmd` after changing browser motion code. This is an explicit, one-way data import. Unity detects the updated JSON asset. It is not automatic code synchronization, and Unity edits do not update the browser.

The browser's `dist/` files and deployed game were not changed by this setup.

## Native preview controls

- Previous/Next shot and Play motion buttons inspect all imported motions.
- Enter plays the selected motion; Space releases a practice ball.
- Mouse movement selects a simple directional shot once movement pauses: left pull, right cut, up drive. Left-handed clips mirror directions.
- Two-finger scroll can be selected in the preview. Horizontal scroll availability depends on the Windows touchpad driver. Hardware behavior has not been verified.

The native input classifier is a setup aid. Browser gesture curvature, live body commitment, context scoring and calibration have **not** been ported. The lightweight harness uses Unity's existing legacy input module; migrate to Input System actions for the production mobile version.

## Validation and scope

- The installed editor executable reports `6000.6.1f1_7efac9f6c10e`.
- Runtime and editor setup C# compile successfully against that installation's Unity assemblies using its bundled compiler.
- Exported motion data passed structural, finite-value and orthogonality checks.
- Editor asset import, scene generation and Play mode remain **unverified** because licensing initialization blocked startup. No standalone or mobile build has been validated.

The preview uses built-in rendering and placeholder geometry. Its moving bat is kinematic and its practice ball uses PhysX. This is not a port of the browser's independent grip-spring bat, seam/swing model, match rules, scoring, crowd, bowler animation or graphics. Next production steps are native input/physics parity, a validated render pipeline and assets, then Android device builds. The existing editor has Windows and WebGL support directories; Android support was not installed by this task.
