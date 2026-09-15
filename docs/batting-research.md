# CREASE: batting mechanics and first-person visibility

Research and implementation, 15 September 2026.

## What informed this update

Power hitting depends on coordinated body rotation, elbow motion and wrist release. Impact location and actual bat speed matter; simply pointing a shot animation at a destination is not a physical model. The researchers also describe differences between players and delivery methods, so these findings do not establish one universal swing. [McErlain-Naylor, Peploe, Felton and King: Cricket Power Hitting Biomechanics](https://www.stuartmcnaylor.com/publication/cricket_BASES/McErlain-Naylor_et_al_2022.pdf).

Cricket gaze is active: batters observe release, anticipate bounce and follow the ball after the bounce. This supports retaining visible bowling action and using observed ball positions rather than secret delivery labels. [Land and McLeod: From eye movements to actions](https://www.nature.com/articles/nn1200_1340).

An experiment including two elite batters found closer head–ball coupling and predictive gaze strategies than in its club group. The small elite sample warrants caution. In this game, a stable horizon and smooth observed-ball tracking are practical interpretations, not a reproduction of measured human eye movements. [Mann, Spratford and Abernethy: The Head Tracks and Gaze Predicts](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0058289).

Coaching descriptions of the pull put the strike in front of the body, with an extended cross-bat arc. Crossing toward the leg side is legitimate; pointing the blade backward into the torso at contact was the game's error. [South Canterbury Cricket: Skills and Drills — Batting](https://www.southcanterburycricket.co.nz/coaching/Coaching%20a%20Cricket%20Team%20-%20Skills%20and%20Drills%20Batting.pdf).

## Problems found in the game

- At the authored pull contact knot, the toe was roughly 0.48 m behind the hands. Cut and sweep had the same backwards-pointing geometry.
- The wrist motor damped absolute rotation, resisting desired swing speed as well as unwanted motion. This left the physical blade lagging the hands.
- Interpolating orientation angles and grip offsets independently could introduce sudden rotations and distort the grip between knots.
- Studio forced a downward eye angle of about 47 degrees, with diagnostic lines drawn through the body in every viewport. Main play also darkened the lower screen heavily, hiding the blade.

## Changes

Cross-bat contact and follow-through now extend into the field before wrapping toward the intended side. Drives extend through their own straight, off-side or on-side corridor. Quaternion interpolation preserves handle orientation and reconstructs the 95 mm separation between hand targets. The independent rigid bat still receives spring forces and wrist torque; it is not teleported to contact and does not prescribe outgoing ball velocity.

The eye view is wider and framed below the bowler so the lower field and raised guard can remain visible. The helmet overlay defaults off. Torso, shoulders and proximal forearms are excluded from the first-person rendering; complete arms remain in external views. The visible distal forearms and bat keep the same world-space pose. This is a deliberate display compromise for a flat screen, not a claim about human anatomy.

Studio has a pitch-and-bat eye view and an optional contact close look. Diagnostics appear in external views only, and default off. Soft shadows and closer external framing improve depth. Main play reduces nonessential overlays during delivery and the dark edge treatment is substantially lighter.

After real bat contact, a 75 ms trail shows only positions the outgoing ball has already travelled. Replay can show the recorded path. Gaze can follow higher outgoing lofts. No advance spin, swing or landing hints were added. Mouse, touchpad and mirrored gesture directions remain intact.

## Validation and limits

Automated checks cover contact clearance in both stances, drive extension direction, bounded physical blade speed, camera layers, outgoing-only trail history, high-ball tracking, existing controls, collision, replay and match flow. Browser inspection compared the original blocked studio view with the corrected follow-through and main batting view.

The motion is still authored procedural animation, not captured professional batting. These changes do not establish elite biomechanical accuracy or a photorealistic character system. Those require coach-reviewed motion capture, production character assets, and measured device performance. The research-informed geometry and visibility fixes are useful now without claiming those remaining milestones are complete.
All 79 automated checks passed. The final rendering-only forearm fade was followed by module syntax and body/camera checks.
