import {PhysicalBat} from './PhysicalBat.js';
import {ActiveBodyController} from './BodyConstraints.js';
import {intentFromControls,sanitizeIntent,resolveIntentPrior} from './BattingIntent.js';
import {HumanShotController} from './HumanShotController.js';
import {SHOTS} from './ShotIntentController.js';
import {KineticChain} from './KineticChain.js';
import {v,batBasis,sub,mul,length} from '../physics.js';
export const BAT_GRIP_OFFSET=.50;
export class BatPoseAndSwingController {
 constructor(){this.backlift='medium';this.shot='free';this.phase='stance';this.chain=new KineticChain();this.human=new HumanShotController(this.chain);this.backliftStyle='lateral';this.physical=new PhysicalBat();this.bodyController=new ActiveBodyController();this.physicalEnabled=false;}
 reset(){this.chain.reset();this.human.reset();this.physical.reset();this.bodyController.reset();this.lastPhysical=null;}
 observe(ball,velocity){this.human.observe(ball,velocity);}
 impact(contact){this.human.impact(contact);if(this.physicalEnabled&&contact.impulseNs)this.physical.impulse(mul(contact.impulseNs,-1),contact.position);}
 compute(input,dt){const intent=sanitizeIntent(intentFromControls(input));this.intent=intent;this.shot=resolveIntentPrior(intent,this.shot);const motor=Object.create(input);motor.intent=intent;if(intent.continuous)this.human.blend=intent.motionWeights?.blend;motor.target=intent.handPathBias;motor.foot=intent.footworkIntent;motor.face=intent.batFaceBias;motor.loft=intent.loftBias;motor.leave=intent.abort;motor.bodyYaw=intent.bodyYaw||0;motor.wristBias=intent.wristBias;motor.manualDepth=intent.manualDepth||0;if(motor.stroke)motor.stroke.power=intent.effort;const target=this.computeTarget(motor,dt);input.stroke=motor.stroke;if(!this.physicalEnabled)return target;target.intent=intent;this.bodyController.step(target,dt);const p=this.physical.step(target,intent,dt),axes=batBasis(p.yaw,p.loft,p.roll,p.twist),sweet={x:p.position.x-axes.up.x*.07,y:p.position.y-axes.up.y*.07,z:p.position.z-axes.up.z*.07};p.kinematics.batHeadVelocity=this.lastPhysical?mul(sub(sweet,this.lastPhysical),1/dt):v();p.kinematics.batHeadSpeed=length(p.kinematics.batHeadVelocity);this.lastPhysical=sweet;if(p.trails){p.trails.sweetSpot=sweet;p.trails.toe={x:p.position.x-axes.up.x*.28,y:p.position.y-axes.up.y*.28,z:p.position.z-axes.up.z*.28};}return p;}
 computeTarget(input,dt){if(this.shot!=='free'){const p=this.human.compute(input,dt,this.shot,this.backlift,this.backliftStyle);this.phase=p.phase;return p;}const shot=SHOTS[this.shot]||SHOTS.free,mirror=input.hand==='left'?-1:1,k=this.chain.step(input,shot,dt),lift={low:.4,medium:.8,high:1.15}[this.backlift]??.8;
 // Joint motors control shoulder/elbow/wrist angles. Their resulting motion
 // determines the grip and blade. Input effort never sets bat velocity.
 this.phase=k.active?(k.age<.09?'backlift':k.age<.30?'downswing':'follow-through'):Math.abs(k.shoulderAngularVelocity)>.1?'recover':'stance';
 const reach=.40+.20*Math.sin(k.leadElbowAngle),shoulderYaw=k.thoraxAngle*.28,extension=reach*Math.cos(k.shoulderAngle*.35);
 const pivot=v(input.foot.x+input.target.x*.55+Math.sin(shoulderYaw)*extension,1.07+shot.height+(input.target.y-.72)*.20-Math.sin(k.shoulderAngle)*.08,input.foot.z+.38-extension-shot.reach-k.legDrive*.045);
 let yaw=input.face+shot.yaw*mirror+k.thoraxAngle*.22,loft=-lift+k.shoulderAngle*.55+(k.leadElbowAngle-.65)*.25+(k.wristCockAngle+.8)+input.loft+(shot.loft||0),roll=shot.roll*mirror;
 // Keep the common hand target inside both arm reach spheres.
 for(let pass=0;pass<3;pass++)for(const side of [-1,1]){const shoulder=v(input.foot.x+side*.2,1.37-shot.crouch,input.foot.z+.46),delta=sub(pivot,shoulder),d=length(delta);if(d>.69){const q=mul(delta,.69/d);pivot.x=shoulder.x+q.x;pivot.y=shoulder.y+q.y;pivot.z=shoulder.z+q.z;}}
 if(input.leave){pivot.x+=mirror*.12;loft=-1.25;}
 const axes=batBasis(yaw,loft,roll,k.twist),center=v(pivot.x-axes.up.x*.5,pivot.y-axes.up.y*.5,pivot.z-axes.up.z*.5),sweet=v(center.x-axes.up.x*.07,center.y-axes.up.y*.07,center.z-axes.up.z*.07);
 k.batHeadVelocity=this.chain.lastHead?mul(sub(sweet,this.chain.lastHead),1/dt):v();k.handVelocity=this.chain.lastGrip?mul(sub(pivot,this.chain.lastGrip),1/dt):v();k.batHeadSpeed=length(k.batHeadVelocity);k.effectiveRadius=length(sub(sweet,v(input.foot.x,1.37,input.foot.z+.46)));this.chain.lastHead=sweet;this.chain.lastGrip={...pivot};
 return {position:center,yaw,loft,roll,twist:k.twist,shot:this.shot,crouch:shot.crouch,leave:input.leave,handPivot:pivot,phase:this.phase,torsoTurn:k.thoraxAngle,weightShift:k.legDrive,foot:{...input.foot},kinematics:k};
 }
}
