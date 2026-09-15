import {sampleMotion,blendMotion,canBlend,gripOrientation,SHOT_MOTIONS} from './ShotMotionLibrary.js';
import {v,batBasis,clamp,length,sub,mul,add,batWorldPoint} from '../physics.js';
const mix=(a,b,t)=>add(a,mul(sub(b,a),t)),smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
// Authoring profiles drive a human pose. The rigid bat is reconstructed from
// its two grip constraints; there is no target-direction ball velocity override.
export class HumanShotController {
 constructor(chain){this.chain=chain;this.reset();}
 reset(){this.previous=null;this.phase=0;this.active=false;this.clock=0;this.impactLoss=0;this.impactTwist=0;this.blend=null;this.observation=null;this.latched=null;this.finished=true;this.lastStroke=null;this.smoothAdapt=null;this.wristAngle=0;this.wristSpeed=0;this.abortAmount=0;}
 observe(ball,velocity){this.observation=ball&&velocity?{ball:{...ball},velocity:{...velocity}}:null;}
 impact(contact){const region=contact.region||'',loss=region==='toe'?.17:region.includes('edge')?.10:region==='sweet spot'?.015:.06;this.impactLoss=Math.min(.22,this.impactLoss+loss);this.impactTwist=clamp((contact.twistImpulse||0)*.035,-.06,.06);this.chain.impact(contact.twistImpulse||0);}
 adaptation(input,profile){const o=this.observation;let line=input.target.x-.15,height=(input.target.y-.72)*.20,depth=0,arrival=null;if(o&&o.velocity.z>2&&o.ball.z<1){const seconds=clamp((.05-o.ball.z)/o.velocity.z,0,.8);line+=clamp(o.ball.x+o.velocity.x*seconds,-.8,.8)*.35;const seenHeight=o.ball.y+o.velocity.y*Math.min(seconds,.12);height+=clamp(seenHeight-.7,-.5,.6)*.1;arrival=seconds;depth=clamp((seconds-profile.duration*profile.contactPhase)*.18,-.045,.045);}return {line:clamp(line,-.23,.23),height:clamp(height,-.11,.11),depth,arrival};}
 compute(input,dt,id,backlift='medium',backliftStyle='lateral'){
 const profile=SHOT_MOTIONS[id]||SHOT_MOTIONS.straight,mirror=input.hand==='left'?-1:1;this.clock+=dt;
 if(input.stroke&&input.stroke!==this.lastStroke){this.lastStroke=input.stroke;this.phase=this.preparationPhase||0;this.active=true;this.finished=false;this.latched={...(this.smoothAdapt||this.adaptation(input,profile))};this.impactLoss=0;}
 this.impactLoss*=Math.exp(-dt*8);this.impactTwist*=Math.exp(-dt*10);
 const duration=profile.duration*(1.12-(input.stroke?.power??.6)*.22);
 if(this.active){this.phase=Math.min(1,this.phase+dt/duration*(1-this.impactLoss)*(input.intent?.continuous?(input.intent.released?1.16:.90):1));if(this.phase>=1){this.active=false;this.finished=true;input.stroke=null;}}
 this.preparationPhase=!this.active&&input.intent?.continuous&&!input.intent.released?Math.min(.12,input.intent.preparation*.12):0;const t=this.active?this.phase:this.preparationPhase;let m=sampleMotion(profile.id,t);if(this.blend&&canBlend(profile.id,this.blend.id))m=blendMotion(m,sampleMotion(this.blend.id,t),clamp(this.blend.amount,0,1));
 if(input.intent?.continuous){const gi=input.intent,residual=gi.directionResidual||0,weight=Math.sin(Math.PI*t);for(const hand of [m.top,m.bottom]){hand.x+=-residual*.11*weight;hand.y+=gi.loftIntent*.16*weight;hand.z+=Math.abs(gi.curvature)*.04*weight;}m.head.x+=-residual*.025*weight;m.frontFoot.x+=-residual*.08*weight;m.leadShoulder.x+=-residual*.04*weight;m.thorax+=-residual*.15*weight;m.wrist+=gi.wristIntent*.14*weight;const step=gi.footworkIntent?.recommended;if(step&&!gi.footworkIntent.manualOverride){m.frontFoot.x+=step.x*.25*weight;m.frontFoot.z+=step.z*.25*weight;}}
 const wanted=this.adaptation(input,profile);if(!this.smoothAdapt)this.smoothAdapt={...wanted};for(const key of ['line','height','depth'])this.smoothAdapt[key]+=(wanted[key]-this.smoothAdapt[key])*(1-Math.exp(-dt*15));this.smoothAdapt.arrival=wanted.arrival;const adapt=this.active?this.latched:this.smoothAdapt,commit=smooth(t/.38)*(1-smooth((t-.84)/.16));
 // Both hands shift together. Reach adapts by centimetres, never to arbitrary ball height.
 const shift=v(mirror*adapt.line,adapt.height,adapt.depth*commit),top=add(m.top,shift),bottom=add(m.bottom,shift);
 top.x*=mirror;bottom.x*=mirror; // authored right-handed anatomical paths
 let face=v(m.orientation.x*mirror,m.orientation.y,m.orientation.z*mirror),wrist=m.wrist*mirror;this.wristSpeed+=(160*(wrist-this.wristAngle)-25*this.wristSpeed)*dt;this.wristAngle+=this.wristSpeed*dt;wrist=this.wristAngle;
 const liftWeight=Math.sin(Math.PI*clamp(t/profile.backlift.end,0,1));
 const liftDelta=({low:.22,medium:0,high:-.18}[backlift]||0)*liftWeight;
 // Rotate the hand separation about its midpoint, preserving the grip. The
 // downswing has its own knots; it does not traverse the backlift backwards.
 const mid=mix(bottom,top,.035/.095),basis=batBasis(face.x,face.y+liftDelta,face.z+(backliftStyle==='straight'?.27*liftWeight*mirror:0));
 if(liftDelta||backliftStyle==='straight'){Object.assign(top,add(mid,mul(basis.up,.06)));Object.assign(bottom,add(mid,mul(basis.up,-.035)));face.y+=liftDelta;}
 const handPivot=mix(bottom,top,.035/.095);let orientation=gripOrientation(top,bottom,face,wrist+this.impactTwist);
 orientation.yaw+=input.face*.55;orientation.twist+=(input.wristBias||0)*.4;handPivot.z+=input.manualDepth||0;orientation.loft+=input.loft*.25;
 const bodyHead=v(m.head.x*mirror+adapt.line*.42*commit,m.head.y,m.head.z),bodyPosition=v(bodyHead.x*.62,bodyHead.y*.72-(profile.family==='VerticalBatFrontFootFamily'||profile.family==='LoftedFamily'?.10*commit:0),bodyHead.z*1.12),shoulders=[v(-mirror*.20,1.37, .46),v(mirror*.20,1.37,.46)];
 const shoulderOffsets=[m.leadShoulder,m.trailShoulder];for(let i=0;i<2;i++){shoulders[i]=add(add(shoulders[i],bodyPosition),v(shoulderOffsets[i].x*mirror,shoulderOffsets[i].y,shoulderOffsets[i].z));}
 // Restrict the shared grip, not the arm lengths. Reserve room for both hand offsets.
 for(let pass=0;pass<6;pass++)for(const s of shoulders){const delta=sub(handPivot,s),d=length(delta);if(d>.64)Object.assign(handPivot,add(s,mul(delta,.64/d)));}
 const headWorld=add(v(0,1.7,.415),bodyHead),near=sub(handPivot,headWorld);if(length(near)<.27)Object.assign(handPivot,add(headWorld,mul(near,.27/Math.max(.001,length(near)))));
 const abortTarget=input.leave?(commit>.8?.18:1):0;this.abortAmount+=(abortTarget-this.abortAmount)*(1-Math.exp(-dt*(commit>.8?3:12)));handPivot.x+=(mirror*.34-handPivot.x)*this.abortAmount;handPivot.y+=(1.1-handPivot.y)*this.abortAmount;orientation.loft+=(-1.3-orientation.loft)*this.abortAmount;
 handPivot.x+=input.foot.x;handPivot.z+=input.foot.z;
 const planted=this.chain.footPlants.update(input.foot,mirror,dt);const axes=batBasis(orientation.yaw,orientation.loft,orientation.roll,orientation.twist),position=sub(handPivot,mul(axes.up,.5)),frontFoot=add(v((m.frontFoot.x+.18)*mirror+adapt.line*.42*commit,m.frontFoot.y,m.frontFoot.z-.34),planted.frontFoot),backFoot=add(v((m.backFoot.x-.18)*mirror,m.backFoot.y,m.backFoot.z-.76),planted.backFoot);
 const k={pelvisAngle:m.pelvis*mirror+(input.bodyYaw||0)*.6,thoraxAngle:m.thorax*mirror+(input.bodyYaw||0),shoulderAngle:(m.leadShoulder.z-m.trailShoulder.z)*-3,leadElbowAngle:m.leadElbow,trailElbowAngle:m.trailElbow,wristCockAngle:wrist,weightDistribution:m.weight,legDrive:commit,frontFoot,backFoot,frontPlanted:frontFoot.y<.003,backPlanted:backFoot.y<.003,frontFootPlantTime:frontFoot.y<.003?Math.max(0,t-.34)*duration:0,backFootForce:75*9.81*(1-m.weight),xFactor:(m.thorax-m.pelvis)*mirror,storedElasticEnergy:.5*18*(m.thorax-m.pelvis)**2,momentOfInertia:.20+1.18*.45**2,balance:clamp(1-Math.abs(adapt.line)*.5,.65,1),centerOfMass:add(v(bodyPosition.x,.95+bodyPosition.y,.55+bodyPosition.z),input.foot),commitment:commit,abortAmount:this.abortAmount,age:t*duration,active:this.active,twist:orientation.twist};
 const pose={position,...orientation,handPivot,shot:id,crouch:-bodyHead.y,leave:input.leave,foot:{...input.foot},phase:!this.active?'stance':t<.18?'trigger':t<.34?'backlift':t<profile.contactPhase?'downswing':t<.80?'follow-through':'recover',motion:{shoulders:(mirror===1?shoulders:[shoulders[1],shoulders[0]]).map(p=>add(p,input.foot)),phase:t,profile:profile.id,head:bodyHead,bodyPosition,pelvisPitch:m.pitch,leadShoulder:v(m.leadShoulder.x*mirror,m.leadShoulder.y,m.leadShoulder.z),trailShoulder:v(m.trailShoulder.x*mirror,m.trailShoulder.y,m.trailShoulder.z),leadElbow:m.leadElbow,trailElbow:m.trailElbow,kneel:profile.kneel,contactPhase:profile.contactPhase,timing:adapt.arrival===null?'manual':adapt.arrival<duration*profile.contactPhase-.06?'late':adapt.arrival>duration*profile.contactPhase+.08?'early':'on time'},kinematics:k};
 const actualTop=add(handPivot,mul(axes.up,.06)),actualBottom=add(handPivot,mul(axes.up,-.035));k.commandedLeadElbow=m.leadElbow;k.commandedTrailElbow=m.trailElbow;for(const [key,point,shoulder] of [['leadElbowAngle',actualTop,shoulders[0]],['trailElbowAngle',actualBottom,shoulders[1]]]){const d=length(sub(point,add(shoulder,input.foot)));k[key]=Math.acos(clamp((.37**2+.39**2-d*d)/(2*.37*.39),-1,1));}
 const toe=batWorldPoint(v(0,-.28,0),pose),sweet=batWorldPoint(v(0,-.07,0),pose),prev=this.previous;
 for(const [angle,speed] of [['pelvisAngle','pelvisAngularVelocity'],['thoraxAngle','thoraxAngularVelocity'],['shoulderAngle','shoulderAngularVelocity'],['leadElbowAngle','leadElbowAngularVelocity'],['trailElbowAngle','trailElbowAngularVelocity'],['wristCockAngle','wristAngularVelocity']])k[speed]=prev?(k[angle]-prev.kinematics[angle])/dt:0;
 k.batHeadVelocity=prev?mul(sub(sweet,prev.sweet),1/dt):v();k.handVelocity=prev?mul(sub(handPivot,prev.handPivot),1/dt):v();k.batHeadSpeed=length(k.batHeadVelocity);k.effectiveRadius=length(sub(sweet,shoulders[0]));k.wristReleaseProgress=clamp((t-profile.contactPhase)/.2,0,1);k.footSpeed=prev?length(sub(frontFoot,prev.kinematics.frontFoot))/dt:0;
 pose.trails={topHand:add(handPivot,mul(axes.up,.06)),bottomHand:add(handPivot,mul(axes.up,-.035)),toe,sweetSpot:sweet,head:add(headWorld,input.foot),frontFoot,backFoot};
 this.previous={...pose,sweet};return pose;
 }
}
