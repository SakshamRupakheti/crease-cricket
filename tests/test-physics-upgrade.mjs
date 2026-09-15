import { getPitchWearProperties, sweepBatObstacles, OBSTACLES, v } from '../dist/physics.js';
import { PhysicalBat } from '../dist/realism/PhysicalBat.js';
import { calculateHandCompliance } from '../dist/realism/BodyConstraints.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

// 1. Test pitch wear properties
const freshWear = getPitchWearProperties(0, 0, 0);
assert(freshWear.wearFactor >= 0.25, 'Crease zone has baseline initial wear factor');
assert(freshWear.restitutionMult < 1.0, 'Pitch wear reduces bounce restitution');
assert(freshWear.frictionMult > 1.0, 'Pitch wear increases surface friction');

const heavyWear = getPitchWearProperties(0, 0, 200);
assert(heavyWear.wearFactor > freshWear.wearFactor, 'Accumulated wear index increases wear factor');
assert(heavyWear.restitutionMult < freshWear.restitutionMult, 'Heavy wear reduces bounce further');

// 2. Test obstacle sweeping
const stumpSweep = sweepBatObstacles(v(0, 0.4, 1.0), null);
assert(stumpSweep !== null && stumpSweep.obstacle === 'stump', 'sweepBatObstacles detects stump collision');

const padSweep = sweepBatObstacles(v(-0.20, 0.30, 0.95), null);
assert(padSweep !== null && padSweep.obstacle === 'pad_left', 'sweepBatObstacles detects left pad collision');

const clearSweep = sweepBatObstacles(v(1.5, 1.5, 5.0), null);
assert(clearSweep === null, 'sweepBatObstacles returns null when path is clear');

// 3. Test PhysicalBat obstacle response
const bat = new PhysicalBat();
const target = {
  position: v(0, 0.4, 1.0),
  yaw: 0, loft: 0, roll: 0, twist: 0,
  handPivot: v(0, 0.5, 1.0)
};
const intent = { releaseTopHand: false, releaseBottomHand: false, gripStrengthTop: 1, gripStrengthBottom: 1 };
const result = bat.step(target, intent, 0.001);
assert(result.physicalBat.obstacleContact === 'stump', 'PhysicalBat step detects stump obstacle contact');

// 4. Test Hand Compliance calculation
const zeroCompliance = calculateHandCompliance({ top: 0, bottom: 0 });
assert(zeroCompliance.topDeflection === 0 && zeroCompliance.bottomDeflection === 0, 'Zero grip force produces zero compliance deflection');

const highCompliance = calculateHandCompliance({ top: 500, bottom: 600 });
assert(highCompliance.topDeflection > 0 && highCompliance.topDeflection <= 0.04, 'High grip force produces bounded compliance deflection');
assert(highCompliance.bottomDeflection > 0 && highCompliance.bottomDeflection <= 0.04, 'Bottom grip force produces bounded compliance deflection');

console.log('PASS pitch wear properties dynamic scaling');
console.log('PASS sweepBatObstacles stump and pad collision detection');
console.log('PASS PhysicalBat obstacle impulse response');
console.log('PASS hand compliance deflection calculation');
console.log('4 physics upgrade checks passed');
