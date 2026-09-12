import {FieldingController} from './realism/FieldingController.js';
import {bladeMesh,contactRegion,REGION_RESTITUTION} from './realism/BatGeometry.js';
// SI units. +Y up; +Z from bowler toward striker; +X striker's right.
// Coefficients are explicit calibration priors, not fitted cricket measurements.
export const STEP = 0.001;
export const MODEL_VERSION = 'crease-physics-5.0.0';
export const RULES = Object.freeze({id:'crease_instrumented_nets_v1',effectiveDate:'2026-09-10',validBallsPerOver:6,boundaryRadius:64,boundaryCenterZ:-9.06,stumpZ:1.0,stumpHeight:.711,stumpWidth:.2286,pitchLength:20.12,pitchWidth:3.05});
export const PROFILES = Object.freeze({hard:{id:'hard_dry_prior_v1',restitution:.64,friction:.32},soft:{id:'soft_prior_v1',restitution:.48,friction:.48}});
export const DEFAULTS = Object.freeze({mass:.1595,radius:.0361,gravity:9.81,density:1.2,drag:.47,spinLift:.18,seamForce:.08,spinDecay:.035,batRestitution:.52,batEffectiveMass:2.5,batFriction:.22,sweetSpotHeightFromToe:.21,sweetSpotWidth:.045,sweetSpotFalloff:.16,batTwistInertia:.035,wind:{x:0,y:0,z:0}});
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
export function batBasis(yaw=0,loft=0,roll=0,twist=0){const normal=unit(v(Math.sin(yaw)*Math.cos(loft),Math.sin(loft),-Math.cos(yaw)*Math.cos(loft)));const right=unit(v(Math.cos(yaw),0,Math.sin(yaw)));const up=cross(right,normal);const r=add(mul(right,Math.cos(roll)),mul(up,Math.sin(roll))),u=add(mul(up,Math.cos(roll)),mul(right,-Math.sin(roll)));return {right:add(mul(r,Math.cos(twist)),mul(normal,-Math.sin(twist))),up:u,normal:add(mul(normal,Math.cos(twist)),mul(r,Math.sin(twist)))};}
export function batWorldPoint(p,b){const a=batBasis(b.yaw,b.loft,b.roll,b.twist);return add(b.position,add(add(mul(a.right,p.x),mul(a.up,p.y)),mul(a.normal,-p.z)));}
export function batPointVelocity(p,previous,current,dt=STEP){return mul(sub(batWorldPoint(p,current),batWorldPoint(p,previous)),1/dt);}
export function contactEfficiency(p,c=DEFAULTS){const center=-.28+c.sweetSpotHeightFromToe,offsetX=p.x,offsetY=p.y-center,r2=(offsetX/Math.max(.005,c.sweetSpotWidth))**2+(offsetY/Math.max(.01,c.sweetSpotFalloff))**2;return {efficiency:.58+.42*Math.exp(-r2),horizontalOffset:offsetX,verticalOffset:offsetY};}
function local(p,b){const q=sub(p,b.position),axes=batBasis(b.yaw,b.loft,b.roll,b.twist);return v(dot(q,axes.right),dot(q,axes.up),-dot(q,axes.normal));}
// Conservative advancement of a swept sphere against the actual blade triangles.
const mesh=bladeMesh(),triangles=[];
for(let i=0;i<mesh.indices.length;i+=3)triangles.push(mesh.indices.slice(i,i+3).map(k=>v(...mesh.positions.slice(k*3,k*3+3))));
// Closest point on triangle (Voronoi regions), including edges and vertices.
function closest(p,a,b,c){const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return a;const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return b;const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0)return add(a,mul(ab,d1/(d1-d3)));const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return c;const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0)return add(a,mul(ac,d2/(d2-d6)));const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0)return add(b,mul(sub(c,b),(d4-d3)/((d4-d3)+(d5-d6))));return add(a,add(mul(ab,vb/(va+vb+vc)),mul(ac,vc/(va+vb+vc))));}
export function sweepBat(from,to,previousBat,bat,radius){const a=local(from,previousBat),b=local(to,bat),d=sub(b,a),travel=length(d);if(Math.min(a.x,b.x)>.055+radius||Math.max(a.x,b.x)<-.055-radius||Math.min(a.y,b.y)>.663+radius||Math.max(a.y,b.y)<-.28-radius||Math.min(a.z,b.z)>.062+radius||Math.max(a.z,b.z)<-.019-radius)return null;
 let t=0;for(let step=0;step<48&&t<=1;step++){const p=add(a,mul(d,t));let distance=Infinity,point=null;for(const tri of triangles){const q=closest(p,...tri),dist=length(sub(p,q));if(dist<distance){distance=dist;point=q;}}
 // Handle: finite capsule along the oval grip, conservative 18 mm radius.
 const hp=v(0,clamp(p.y,.335,.645),0),hd=length(sub(p,hp)),hq=add(hp,mul(unit(sub(p,hp)),.018));if(hd-.018<distance){distance=hd-.018;point=hq;}
 if(distance<=radius+1e-6){const n=unit(sub(p,point)),axes=batBasis(bat.yaw,bat.loft,bat.roll,bat.twist),region=contactRegion(point,n);return {fraction:t,normal:add(add(mul(axes.right,n.x),mul(axes.up,n.y)),mul(axes.normal,-n.z)),local:point,region,edge:region.includes('edge'),restitutionScale:REGION_RESTITUTION[region]};}if(travel<1e-12)return null;t+=(distance-radius)/travel;}
 return null;
}
export class Ledger {
  constructor(rules=RULES){this.rules=copy(rules);this.deliveries=0;this.legalBalls=0;this.contacts=0;this.wickets=0;this.runs=0;this.boundaryRuns=0;this.events=[];this.committed=new Set();}
  commit(id,events){if(this.committed.has(id))return false;this.committed.add(id);const has=t=>events.some(e=>e.type===t);const illegal=has('NoBallDetected')||has('WideDetected');this.deliveries++;if(!illegal)this.legalBalls++;if(has('BatContact'))this.contacts++;if(has('WicketBroken')&&!has('NoBallDetected'))this.wickets++;const boundary=events.find(e=>e.type==='BoundaryCrossed');this.boundaryRuns+=boundary?.runs||0;this.runs+=(boundary?.runs||0)+(illegal?1:0);this.events.push(Object.freeze({type:'ScoreCommitted',deliveryId:id,legalBallIndex:this.legalBalls,contacts:this.contacts,wickets:this.wickets,runs:this.runs}));return true;}
}
export class BallSimulation {
  constructor(release,{seed=1,physics={},pitch=PROFILES.hard,rules=RULES,fielding=false}={}){
    this.fielding=fielding?new FieldingController():null;this.lastRunRequest=0;this.config={...DEFAULTS,...physics};if(this.config.mass<.1559||this.config.mass>.163)throw new RangeError('Ball mass is outside the configured men\'s-ball preset');if(this.config.radius<.03565||this.config.radius>.03645)throw new RangeError('Ball radius outside preset');
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
      if(hit){const axes=batBasis(bat.yaw,bat.loft,bat.roll,bat.twist),batVelocity=batPointVelocity(hit.local,prev,bat),relative=sub(this.velocity,batVelocity),closing=dot(relative,hit.normal);
        if(closing<-.05){const quality=contactEfficiency(hit.local,c),restitution=c.batRestitution*hit.restitutionScale*quality.efficiency,normalDelta=-(1+restitution)*closing/(1+c.mass/c.batEffectiveMass),contactArm=mul(hit.normal,-c.radius),surfaceVelocity=add(relative,cross(this.spin,contactArm)),tangent=sub(surfaceVelocity,mul(hit.normal,dot(surfaceVelocity,hit.normal))),tangentDelta=mul(unit(tangent),-Math.min(c.batFriction*normalDelta,length(tangent)/(3.5+c.mass/c.batEffectiveMass))),delta=add(mul(hit.normal,normalDelta),tangentDelta);
        this.velocity=add(this.velocity,delta);this.spin=add(this.spin,mul(cross(contactArm,tangentDelta),2.5/(c.radius*c.radius)));this.position=add(add(before,mul(sub(this.position,before),hit.fraction)),mul(hit.normal,.002));const impulse=mul(delta,c.mass),lever=sub(batWorldPoint(hit.local,bat),bat.handPivot||batWorldPoint(v(0,.5,0),bat)),twistImpulse=clamp(dot(cross(lever,mul(impulse,-1)),axes.up)/c.batTwistInertia,-1.8,1.8);
        this.contact={position:copy(this.position),batLocalM:hit.local,relativeSpeedMps:length(relative),batSpeedMps:length(batVelocity),batPointVelocity:batVelocity,faceNormal:hit.normal,impulseNs:impulse,outgoingSpin:copy(this.spin),twistImpulse,...quality,edge:hit.edge,region:hit.region,restitutionScale:hit.restitutionScale,timeS:this.time,kinematics:bat.kinematics||null};this.event('BatContact',this.contact);}

      }
    }
    if(bat)this.lastBat=copy(bat);
    // Detect the swept ball crossing the wicket plane; no timing-based wickets.
    if(!this.fielding?.returning&&before.z<this.rules.stumpZ&&this.position.z>=this.rules.stumpZ){const f=(this.rules.stumpZ-before.z)/(this.position.z-before.z),p=add(before,mul(sub(this.position,before),f));if(Math.abs(p.x)<=this.rules.stumpWidth/2+c.radius&&p.y<=this.rules.stumpHeight+c.radius){this.event('WicketBroken',{position:p,velocity:this.velocity});this.end('BOWLED');}else if(!this.contact){if(Math.abs(p.x)>1.05)this.event('WideDetected');if(!this.fielding)this.end('MISSED');}}
    const radius=Math.hypot(this.position.x,this.position.z-this.rules.boundaryCenterZ);
    if(this.contact&&!this.fielding?.returning&&this.fielding?.possession==null&&radius>=this.rules.boundaryRadius){this.event('BoundaryCrossed',{position:this.position,runs:this.postHitBounces?4:6});this.end(this.postHitBounces?'FOUR':'SIX');}
    if(!this.dead&&this.contact&&(!this.fielding?((speed<.5&&this.position.y<.05)||this.time>10||this.position.z>7):this.time>22))this.end('IN PLAY');
    if(this.fielding&&!this.dead){if((bat?.runRequest||0)>this.lastRunRequest){this.fielding.requestRun();this.lastRunRequest=bat.runRequest;}if(this.tick%10===0)this.fielding.step(this,.01);}
    if(!this.dead&&!this.contact&&this.time>3)this.end('MISSED');
    if(this.tick%10===0||this.dead)this.record(bat);
  }
  record(bat){this.frames.push({tick:this.tick,timeS:this.time,position:copy(this.position),velocity:copy(this.velocity),seamNormal:copy(this.seamNormal),bat:bat?copy(bat):null,fielding:this.fielding?.snapshot()||null,forces:copy(this.forces)});}
  end(result){if(this.dead)return;this.dead=true;this.result=result;this.event('BallDead',{result});}
  export(){return {modelVersion:MODEL_VERSION,fixedStepSeconds:STEP,rulesetId:this.rules.id,effectiveDate:this.rules.effectiveDate,seed:this.seed,fieldingEnabled:!!this.fielding,release:this.release,physics:this.config,pitch:this.pitch,rules:this.rules,events:this.events,inputs:this.inputs,frames:this.frames,result:this.result,calibrationStatus:'Uncalibrated priors; no measurement accuracy claim.'};}
}
// A replay's authoritative inputs are bat poses at fixed ticks, not render frames.
export function replayInputs(tape){if(tape.modelVersion!==MODEL_VERSION)throw new Error('Unsupported simulation version');const sim=new BallSimulation(tape.release,{seed:tape.seed,physics:tape.physics,pitch:tape.pitch,rules:tape.rules,fielding:tape.fieldingEnabled});for(const e of tape.events.filter(e=>e.tick===0&&e.type==='BowlerAction'))sim.events.push(Object.freeze(copy(e)));let i=0,pose=null;const end=tape.events.find(e=>e.type==='BallDead')?.tick??tape.frames.at(-1).tick;while(sim.tick<end&&!sim.dead){if(tape.inputs[i]?.tick===sim.tick+1){pose=tape.inputs[i++].bat;}sim.step(pose);}return sim;}
