import {SHOTS} from './ShotIntentController.js';
import {KineticChain} from './KineticChain.js';
import {v,batBasis,sub,mul,length} from '../physics.js';
export const BAT_GRIP_OFFSET=.50;
export class BatPoseAndSwingController {
 constructor(){this.backlift='medium';this.shot='free';this.phase='stance';this.chain=new KineticChain();}
 reset(){this.chain.reset();}
 compute(input,dt){const shot=SHOTS[this.shot]||SHOTS.free,mirror=input.hand==='left'?-1:1,k=this.chain.step(input,shot,dt),lift={low:.4,medium:.8,high:1.15}[this.backlift]??.8;
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
