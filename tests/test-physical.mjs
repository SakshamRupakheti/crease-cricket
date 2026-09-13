import assert from 'node:assert/strict';
import {PhysicalBat} from '../dist/realism/PhysicalBat.js';
import {createBattingIntent} from '../dist/realism/BattingIntent.js';
import {v} from '../dist/physics.js';
const pose={position:v(0,.8,0),yaw:0,loft:0,roll:0,handPivot:v(0,1.3,0)},both=createBattingIntent();let count=0;const test=(n,f)=>{f();count++;console.log('PASS '+n);};
test('two grips hold a weighted bat without parenting',()=>{const bat=new PhysicalBat();let p;for(let i=0;i<1000;i++)p=bat.step(pose,both,.001);assert.ok(Math.abs(p.position.y-.8)<.02);assert.ok(p.physicalBat.gripForces.top>0);});
test('one hand supports bat; releasing both preserves velocity then falls',()=>{const bat=new PhysicalBat();for(let i=0;i<500;i++)bat.step(pose,both,.001);const one=createBattingIntent({releaseBottomHand:true});let p;for(let i=0;i<500;i++)p=bat.step(pose,one,.001);assert.ok(p.position.y>.5);const release=createBattingIntent({releaseBottomHand:true,releaseTopHand:true}),start=p.physicalBat.centerOfMass.y;for(let i=0;i<200;i++)p=bat.step(pose,release,.001);assert.ok(p.physicalBat.centerOfMass.y<start-.12);assert.equal(p.physicalBat.gripForces.top,0);});
test('moving release throws through momentum and settles above ground',()=>{const bat=new PhysicalBat();for(let i=0;i<300;i++)bat.step({...pose,position:v(i*.001,.8,0)},both,.001);const before=bat.velocity.x;assert.ok(before>.5);const release=createBattingIntent({releaseTopHand:true,releaseBottomHand:true});bat.step(pose,release,.001);assert.ok(Math.abs(bat.velocity.x-before)<.01);for(let i=0;i<5000;i++)bat.step(pose,release,.001);assert.ok(Number.isFinite(bat.position.y));assert.ok(bat.position.y>-.01);assert.ok(bat.contacts>0);});
console.log(count+' physical bat checks passed');
