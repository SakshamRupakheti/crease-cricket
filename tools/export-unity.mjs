// Explicit one-way motion-data bridge. Never modifies the browser game.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {BatController} from '../dist/input.js';
import {SHOT_MOTIONS} from '../dist/realism/ShotMotionLibrary.js';
import {batBasis} from '../dist/physics.js';
const destination=path.resolve('unity/CREASE/Assets/Resources/crease-motions.json');
const flip=p=>({x:p.x,y:p.y,z:-p.z});
const sourceFiles=['dist/realism/ShotMotionLibrary.js','dist/realism/HumanShotController.js','dist/realism/PhysicalBat.js'];
const sourceHash=crypto.createHash('sha256');for(const f of sourceFiles)sourceHash.update(fs.readFileSync(f));
const clips=[];
for(const hand of ['right','left'])for(const id of Object.keys(SHOT_MOTIONS)){
 const c=new BatController();c.hand=hand;c.reset();c.poseController.physicalEnabled=true;c.poseController.shot=id;
 for(let i=0;i<300;i++)c.step(.001);
 const samples=[];c.swing(.7);
 for(let i=0;i<1800;i++){const p=c.step(.001);if(i%10)continue;const a=batBasis(p.yaw,p.loft,p.roll,p.twist);samples.push({time:i/1000,position:flip(p.position),up:flip(a.up),forward:flip({x:-a.normal.x,y:-a.normal.y,z:-a.normal.z}),head:flip(p.trails.head),top:flip(p.humanTarget.top),bottom:flip(p.humanTarget.bottom)});}
 clips.push({id,hand,samples});
}
const data={schemaVersion:1,sourceHash:sourceHash.digest('hex'),sampleInterval:.01,description:'Browser physical bat samples converted from -Z forward to Unity +Z forward; this is motion playback, not a physics-engine port.',clips};
fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(data));
console.log(`Exported ${clips.length} clips (${clips[0].samples.length} samples each) to ${destination}`);
