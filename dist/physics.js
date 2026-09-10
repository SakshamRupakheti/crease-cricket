// SI units. +Y up; +Z from bowler toward striker; +X striker's right.
// Coefficients are explicit calibration priors, not fitted cricket measurements.
export const STEP = 0.001;
export const MODEL_VERSION = 'crease-physics-2.0.0';
export const RULES = Object.freeze({id:'crease_instrumented_nets_v1',effectiveDate:'2026-09-10',validBallsPerOver:6,boundaryRadius:64,boundaryCenterZ:-9.06,stumpZ:1.0,stumpHeight:.711,stumpWidth:.2286,pitchLength:20.12,pitchWidth:3.05});
export const PROFILES = Object.freeze({hard:{id:'hard_dry_prior_v1',restitution:.64,friction:.32},soft:{id:'soft_prior_v1',restitution:.48,friction:.48}});
export const DEFAULTS = Object.freeze({mass:.1595,radius:.0361,gravity:9.81,density:1.2,drag:.47,spinLift:.18,seamForce:.08,spinDecay:.035,batRestitution:.52,batEffectiveMass:2.5,wind:{x:0,y:0,z:0}});
export const v=(x=0,y=0,z=0)=>({x,y,z});
export const add=(a,b)=>v(a.x+b.x,a.y+b.y,a.z+b.z);
export const sub=(a,b)=>v(a.x-b.x,a.y-b.y,a.z-b.z);
export const mul=(a,s)=>v(a.x*s,a.y*s,a.z*s);
export const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export const length=a=>Math.hypot(a.x,a.y,a.z);
export const cross=(a,b)=>v(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
export const unit=a=>mul(a,1/(length(a)||1));
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const copy=x=>JSON.parse(JSON.stringify(x));
export function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
export function makeIntent(seed){const r=rng(seed),spin=r()<.45,sign=r()<.5?-1:1;return {seed,spin,sign,speed:spin?21+r()*4:32+r()*6,bounceZ:-7.5+r()*3.5,line:(r()-.5)*.55,armSlot:sign*(spin?.22:.07),wrist:sign*(spin?.7:.14),runupSeconds:spin?2.1:2.8,seamAngle:sign*(.10+r()*.20)};}
export function makeRelease(intent,position){
  const time=(intent.bounceZ-position.z)/intent.speed;
  return {position:copy(position),velocity:v((intent.line-position.x)/((.0-position.z)/intent.speed),(.0361-position.y+.5*9.81*time*time)/time,intent.speed),spin:intent.spin?v(intent.sign*35,0,intent.sign*125):v(22,0,intent.sign*5),seamNormal:v(Math.cos(intent.seamAngle),0,Math.sin(intent.seamAngle)),seamCoefficient:intent.spin?.018:intent.sign*.08};
}
export function batBasis(yaw=0,loft=0){const normal=unit(v(Math.sin(yaw)*Math.cos(loft),Math.sin(loft),-Math.cos(yaw)*Math.cos(loft)));const right=unit(v(Math.cos(yaw),0,Math.sin(yaw)));return {right,up:cross(right,normal),normal};}
function local(p,b){const q=sub(p,b.position),axes=batBasis(b.yaw,b.loft);return v(dot(q,axes.right),dot(q,axes.up),dot(q,axes.normal));}
// Relative swept sphere vs bat box, evaluated every millisecond. The visual bat
// uses precisely the same pose/dimensions. Edges are rounded by the ball radius.
export function sweepBat(from,to,previousBat,bat,radius){
  const a=local(from,previousBat),b=local(to,bat),d=sub(b,a),half=[.054+radius,.28+radius,.020+radius],aa=[a.x,a.y,a.z],dd=[d.x,d.y,d.z];let enter=0,exit=1,axis=-1,sign=1;
  for(let i=0;i<3;i++){if(Math.abs(dd[i])<1e-12){if(Math.abs(aa[i])>half[i])return null;continue;}let t1=(-half[i]-aa[i])/dd[i],t2=(half[i]-aa[i])/dd[i],n=-1;if(t1>t2){[t1,t2]=[t2,t1];n=1;}if(t1>enter){enter=t1;axis=i;sign=n;}exit=Math.min(exit,t2);if(enter>exit)return null;}
  if(exit<0||enter>1)return null;
  const axes=batBasis(bat.yaw,bat.loft),array=[axes.right,axes.up,axes.normal];if(axis<0){axis=2;sign=a.z>=0?1:-1;}
  return {fraction:clamp(enter,0,1),normal:mul(array[axis],sign),local:add(a,mul(d,enter)),edge:axis!==2};
}
export class Ledger {
  constructor(rules=RULES){this.rules=copy(rules);this.deliveries=0;this.legalBalls=0;this.contacts=0;this.wickets=0;this.runs=0;this.boundaryRuns=0;this.events=[];this.committed=new Set();}
  commit(id,events){if(this.committed.has(id))return false;this.committed.add(id);const has=t=>events.some(e=>e.type===t);const illegal=has('NoBallDetected')||has('WideDetected');this.deliveries++;if(!illegal)this.legalBalls++;if(has('BatContact'))this.contacts++;if(has('WicketBroken')&&!has('NoBallDetected'))this.wickets++;const boundary=events.find(e=>e.type==='BoundaryCrossed');this.boundaryRuns+=boundary?.runs||0;this.runs+=(boundary?.runs||0)+(illegal?1:0);this.events.push(Object.freeze({type:'ScoreCommitted',deliveryId:id,legalBallIndex:this.legalBalls,contacts:this.contacts,wickets:this.wickets,runs:this.runs}));return true;}
}
export class BallSimulation {
  constructor(release,{seed=1,physics={},pitch=PROFILES.hard,rules=RULES}={}){
    this.config={...DEFAULTS,...physics};if(this.config.mass<.1559||this.config.mass>.163)throw new RangeError('Ball mass is outside the configured men\'s-ball preset');if(this.config.radius<.03565||this.config.radius>.03645)throw new RangeError('Ball radius outside preset');
    this.pitch=copy(pitch);this.rules=copy(rules);this.seed=seed;this.release=copy(release);this.position=copy(release.position);this.velocity=copy(release.velocity);this.spin=copy(release.spin);this.seamNormal=unit(release.seamNormal);this.tick=0;this.events=[];this.frames=[];this.inputs=[];this.contact=null;this.bounces=0;this.postHitBounces=0;this.dead=false;this.forces={};this.lastBat=null;this.event('BallReleased',{release:copy(release)});this.record(null);
  }
  get time(){return this.tick*STEP;}
  event(type,data={}){this.events.push(Object.freeze({type,tick:this.tick,timeS:this.time,...copy(data)}));}
  step(bat=null){
    if(this.dead)return;this.tick++;const c=this.config,speed=length(this.velocity),relativeAir=sub(this.velocity,c.wind),airSpeed=length(relativeAir),area=Math.PI*c.radius*c.radius;
    const gravity=v(0,-c.gravity,0),drag=mul(relativeAir,-.5*c.density*area*c.drag*airSpeed/c.mass);
    const spinDirection=unit(cross(this.spin,relativeAir));const ratio=length(this.spin)*c.radius/Math.max(.01,airSpeed);
    const spinForce=mul(spinDirection,.5*c.density*area*c.spinLift*clamp(ratio,0,1)*speed*speed/c.mass);
    const lateral=unit(cross(v(0,1,0),this.velocity));const seamForce=mul(lateral,.5*c.density*area*(this.release.seamCoefficient??c.seamForce)*speed*speed/c.mass);
    this.forces={gravityMps2:gravity,dragMps2:drag,spinMps2:spinForce,seamMps2:seamForce};const before=copy(this.position);
    this.velocity=add(this.velocity,mul(add(add(gravity,drag),add(spinForce,seamForce)),STEP));this.position=add(this.position,mul(this.velocity,STEP));
    const seamDelta=cross(this.spin,this.seamNormal);this.seamNormal=unit(add(this.seamNormal,mul(seamDelta,STEP)));this.spin=mul(this.spin,Math.exp(-c.spinDecay*STEP));
    if(this.position.y<=c.radius&&this.velocity.y<0){
      const incoming=copy(this.velocity),onPitch=Math.abs(this.position.x)<1.525&&this.position.z>=-19.12&&this.position.z<=1;
      const e=onPitch?this.pitch.restitution:.35,mu=onPitch?this.pitch.friction:.65;
      const normalDelta=-(1+e)*incoming.y;
      const slip=v(incoming.x+c.radius*this.spin.z,0,incoming.z-c.radius*this.spin.x),slipSpeed=length(slip);
      const impulse=mul(unit(slip),-Math.min(mu*normalDelta,slipSpeed*2/7));this.velocity.x+=impulse.x;this.velocity.z+=impulse.z;this.velocity.y=-incoming.y*e;
      this.spin=add(this.spin,mul(cross(v(0,-c.radius,0),impulse),2.5/(c.radius*c.radius)));
      // Raised-seam contact depends on seam orientation, not a random side kick.
      const seamContact=Math.abs(this.seamNormal.y)<.12&&onPitch; if(seamContact)this.velocity.x+=this.seamNormal.x*this.seamNormal.z*normalDelta*.10;
      this.position.y=c.radius;if(this.contact)this.postHitBounces++;this.bounces++;
      if(Math.abs(incoming.y)>.3)this.event('BallPitched',{position:this.position,incoming,outgoing:this.velocity,seamContact});
      if(!onPitch&&Math.abs(incoming.y)<.3)this.velocity.y=0;
    }
    if(bat&&!this.contact&&!bat.leave){
      const prev=this.lastBat??bat,hit=sweepBat(before,this.position,prev,bat,c.radius);
      if(hit){const axes=batBasis(bat.yaw,bat.loft),angular=add(mul(axes.right,(bat.loft-prev.loft)/STEP),v(0,-(bat.yaw-prev.yaw)/STEP,0)),point=add(before,mul(sub(this.position,before),hit.fraction)),batVelocity=add(mul(sub(bat.position,prev.position),1/STEP),cross(angular,sub(point,bat.position))),relative=sub(this.velocity,batVelocity),closing=dot(relative,hit.normal);
        if(closing<-.05){const restitution=c.batRestitution*(hit.edge?.60:1);const impulse=-(1+restitution)*closing/(1+c.mass/c.batEffectiveMass);this.velocity=add(this.velocity,mul(hit.normal,impulse));this.position=add(add(before,mul(sub(this.position,before),hit.fraction)),mul(hit.normal,.002));this.contact={position:copy(this.position),batLocalM:hit.local,relativeSpeedMps:length(relative),batSpeedMps:length(batVelocity),edge:hit.edge,timeS:this.time};this.event('BatContact',this.contact);}
      }
    }
    if(bat)this.lastBat=copy(bat);
    // Detect the swept ball crossing the wicket plane; no timing-based wickets.
    if(before.z<this.rules.stumpZ&&this.position.z>=this.rules.stumpZ){const f=(this.rules.stumpZ-before.z)/(this.position.z-before.z),p=add(before,mul(sub(this.position,before),f));if(Math.abs(p.x)<=this.rules.stumpWidth/2+c.radius&&p.y<=this.rules.stumpHeight+c.radius){this.event('WicketBroken',{position:p});this.end('BOWLED');}else if(!this.contact){if(Math.abs(p.x)>1.05)this.event('WideDetected');this.end('MISSED');}}
    const radius=Math.hypot(this.position.x,this.position.z-this.rules.boundaryCenterZ);
    if(this.contact&&radius>=this.rules.boundaryRadius){this.event('BoundaryCrossed',{position:this.position,runs:this.postHitBounces?4:6});this.end(this.postHitBounces?'FOUR':'SIX');}
    if(!this.dead&&this.contact&&((speed<.5&&this.position.y<.05)||this.time>10||this.position.z>7))this.end('IN PLAY');
    if(!this.dead&&!this.contact&&this.time>3)this.end('MISSED');
    if(this.tick%10===0||this.dead)this.record(bat);
  }
  record(bat){this.frames.push({tick:this.tick,timeS:this.time,position:copy(this.position),velocity:copy(this.velocity),seamNormal:copy(this.seamNormal),bat:bat?copy(bat):null,forces:copy(this.forces)});}
  end(result){if(this.dead)return;this.dead=true;this.result=result;this.event('BallDead',{result});}
  export(){return {modelVersion:MODEL_VERSION,fixedStepSeconds:STEP,rulesetId:this.rules.id,effectiveDate:this.rules.effectiveDate,seed:this.seed,release:this.release,physics:this.config,pitch:this.pitch,rules:this.rules,events:this.events,inputs:this.inputs,frames:this.frames,result:this.result,calibrationStatus:'Uncalibrated priors; no measurement accuracy claim.'};}
}
// A replay's authoritative inputs are bat poses at fixed ticks, not render frames.
export function replayInputs(tape){if(tape.modelVersion!==MODEL_VERSION)throw new Error('Unsupported simulation version');const sim=new BallSimulation(tape.release,{seed:tape.seed,physics:tape.physics,pitch:tape.pitch,rules:tape.rules});for(const e of tape.events.filter(e=>e.tick===0&&e.type==='BowlerAction'))sim.events.push(Object.freeze(copy(e)));let i=0,pose=null;const end=tape.events.find(e=>e.type==='BallDead')?.tick??tape.frames.at(-1).tick;while(sim.tick<end&&!sim.dead){if(tape.inputs[i]?.tick===sim.tick+1){pose=tape.inputs[i++].bat;}sim.step(pose);}return sim;}
