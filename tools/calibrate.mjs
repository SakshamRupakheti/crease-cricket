// Fit only against supplied measurements. No synthetic accuracy claims.
// node tools/calibrate.mjs measurements.json
import fs from 'node:fs';
import {BallSimulation,PROFILES} from '../dist/physics.js';
const path=process.argv[2];if(!path){console.error('Supply a JSON file containing {release, samples:[{timeS,position:{x,y,z}}]}');process.exit(1);}
const data=JSON.parse(fs.readFileSync(path,'utf8'));
if(!data.release||!Array.isArray(data.samples)||data.samples.length<3)throw new Error('A release and at least three measured samples are required.');
for(let i=0;i<data.samples.length;i++){const s=data.samples[i];if(!Number.isFinite(s.timeS)||s.timeS<0||s.timeS>3||['x','y','z'].some(k=>!Number.isFinite(s.position?.[k]))||(i&&s.timeS<=data.samples[i-1].timeS))throw new Error('Samples must have finite positions and increasing times in [0,3] seconds.');}
let best=null;const start=performance.now();
for(const drag of [.40,.45,.50,.55,.60])for(const restitution of [.45,.50,.55,.60,.65,.70])for(const friction of [.25,.35,.45,.55,.65]){
 const sim=new BallSimulation(data.release,{pitch:{...PROFILES.hard,restitution,friction},physics:{drag}});let squared=0;
 for(const sample of data.samples){while(sim.time+.0005<sample.timeS&&!sim.dead)sim.step();if(sim.time+.001<sample.timeS){squared=Infinity;break;}squared+=['x','y','z'].reduce((sum,k)=>sum+(sim.position[k]-sample.position[k])**2,0);}
 const rmsM=Math.sqrt(squared/data.samples.length);if(!best||rmsM<best.rmsM)best={drag,restitution,friction,rmsM};
}
console.log(JSON.stringify({sampleCount:data.samples.length,best,elapsedMs:performance.now()-start,note:'Coarse grid fit on supplied samples; validate on held-out measured deliveries. No claim of universal coefficients.'},null,2));
