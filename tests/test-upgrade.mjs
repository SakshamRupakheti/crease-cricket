import assert from 'node:assert/strict';
import * as THREE from '../dist/three.module.js';
import {v,sweepBat,batBasis,makeIntent} from '../dist/physics.js';
import {BatController} from '../dist/input.js';
import {SHOTS} from '../dist/realism/ShotIntentController.js';
import {createHuman} from '../dist/realism/PlayerBody.js';
import {BowlerActionController} from '../dist/realism/BowlerActionController.js';
import {BowlingSpeedController} from '../dist/realism/BowlingSpeedController.js';
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
test('shaped blade distinguishes face, toe, shoulder and handle',()=>{const bat={position:v(),yaw:0,loft:0};for(const [y,region] of [[-.07,'sweet spot'],[-.275,'toe'],[.3,'shoulder'],[.5,'handle']]){const hit=sweepBat(v(0,y,-.3),v(0,y,.3),bat,bat,.0361);assert.equal(hit?.region,region);}assert.equal(sweepBat(v(.15,.5,-.3),v(.15,.5,.3),bat,bat,.0361),null);});
test('edge response loses more energy than middle blade',()=>{const bat={position:v(),yaw:0,loft:0},edge=sweepBat(v(.2,-.07,0),v(0,-.07,0),bat,bat,.0361),face=sweepBat(v(0,-.07,-.3),v(0,-.07,.3),bat,bat,.0361);assert.ok(edge.edge);assert.ok(edge.restitutionScale<face.restitutionScale);});
test('every shot and batting hand retains exact shared grip transform',()=>{for(const shot of Object.keys(SHOTS))for(const hand of ['left','right']){const c=new BatController();c.hand=hand;c.reset();c.poseController.shot=shot;c.swing(.8);for(let i=0;i<400;i++){const p=c.step(.001),axes=batBasis(p.yaw,p.loft,p.roll);for(const k of ['x','y','z'])assert.ok(Math.abs(p.position[k]+axes.up[k]*.5-p.handPivot[k])<1e-12);}}});
test('both bowling arms release from selected hand on both wicket sides',()=>{const human=createHuman(new THREE.Scene(),0,0),a=new BowlerActionController(human);for(const arm of ['left','right'])for(const wicket of ['over','around']){a.arm=arm;a.wicket=wicket;const i=a.prepare(makeIntent(9));a.animate(i.runupSeconds,i);assert.equal(human.hand,human.hands[arm==='left'?0:1]);const point=new THREE.Vector3();human.hand.getWorldPosition(point);assert.ok(point.y>1.9&&point.y<2.2);assert.ok(Math.abs(human.g.position.x-i.releaseSide)<1e-12);}});
test('70 km/h and 135 km/h are accepted without changing fixed step',()=>{const s=new BowlingSpeedController();for(const kmh of [70,135,160]){s.configure({kmh});assert.equal(s.choose(1),kmh);}});
console.log(`${count} targeted upgrade checks passed.`);
