import {v,sub,mul,add,clamp} from '../physics.js';
export const GAZE_DEFAULTS={reactionDelay:.045,contactHold:.14,maxYawSpeed:2.6,maxPitchSpeed:2.8};
// Receives already-observed positions, never bowling intent or future frames.
export class ObservedGaze {
 constructor(){this.config={...GAZE_DEFAULTS};this.reset();}
 reset(){this.samples=[];this.time=0;this.contactAt=-10;this.hold=null;this.stage='preparation';}
 observe(dt,state,ball,eye,contact=false){this.time+=dt;if(!ball)return null;this.samples.push({t:this.time,p:{...ball}});while(this.samples.length>2&&this.samples[1].t<this.time-.1)this.samples.shift();const sample=this.samples.find(s=>s.t>=this.time-this.config.reactionDelay)||this.samples[0],last=this.samples[0],vel=sample.t>last.t?mul(sub(sample.p,last.p),1/(sample.t-last.t)):v();
 if(contact&&this.contactAt<0){this.contactAt=this.time;this.hold={...sample.p};}this.stage=state==='runup'?'release region':state==='ready'?'preparation':'early flight';let target={...sample.p};
 if(state==='flight'&&sample.p.z>-8&&vel.y<-.5){const t=(vel.y+Math.sqrt(vel.y*vel.y+2*9.81*Math.max(0,sample.p.y-.036)))/9.81;if(t>0&&t<.12){target=add(sample.p,mul(vel,t*.35));this.stage='bounce anticipation';}}
 if(state==='flight'&&vel.y>.5)this.stage='post-bounce';if(this.time-this.contactAt<this.config.contactHold){target=this.hold;this.stage='impact hold';}else if(this.contactAt>0)this.stage='outgoing ball';
 const d=sub(target,eye);return {yaw:clamp(Math.atan2(-d.x,-d.z),-2.62,2.62),pitch:clamp(Math.atan2(d.y,Math.hypot(d.x,d.z)),-1.3,.48),stage:this.stage};
 }
}
