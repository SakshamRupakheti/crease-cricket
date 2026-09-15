import {v,clamp} from '../physics.js';
// Conservative controller ranges in radians; tunable, not individual medical limits.
export const JOINT_LIMITS={pelvisYaw:[-1.05,1.05],thoraxYaw:[-1.35,1.35],shoulderElevation:[-.8,2.7],shoulderYaw:[-1.5,1.5],elbow:[.15,2.9],forearm:[-1.4,1.4],wristFlex:[-.9,.9],wristDeviation:[-.45,.45],hip:[-1.4,1.3],knee:[.05,2.4],ankle:[-.55,.7]};
export class ActiveBodyController {
 constructor(){this.state=null;this.velocity={};}
 reset(){this.state=null;this.velocity={};}
 step(p,dt){const k=p.kinematics,front=k.frontFoot,back=k.backFoot;if(!front||!back)return p;const com=k.centerOfMass||v(p.foot.x,.95,p.foot.z+.55),dx=back.x-front.x,dz=back.z-front.z,den=dx*dx+dz*dz||1,t=clamp(((com.x-front.x)*dx+(com.z-front.z)*dz)/den,0,1),nearest=v(front.x+t*dx,0,front.z+t*dz),supportDistance=Math.hypot(com.x-nearest.x,com.z-nearest.z),margin=.14-supportDistance;
 p.balance={centerOfMass:{...com},baseOfSupport:[{...front},{...back}],leftFootSupport:k.frontPlanted?1:0,rightFootSupport:k.backPlanted?1:0,weightBias:k.weightDistribution,margin,unstable:margin<-.08};
 if(p.motion){if(!this.state)this.state={head:{...p.motion.head},bodyPosition:{...p.motion.bodyPosition},pelvis:k.pelvisAngle,thorax:k.thoraxAngle};const spring=(key,target,stiffness=210,damping=29)=>{let value=this.state[key];if(typeof target==='number'){let velocity=this.velocity[key]||0;velocity+=(stiffness*(target-value)-damping*velocity)*dt;this.velocity[key]=velocity;return this.state[key]=value+velocity*dt;}const vel=this.velocity[key]||v();for(const axis of ['x','y','z']){vel[axis]+=(stiffness*(target[axis]-value[axis])-damping*vel[axis])*dt;value[axis]+=vel[axis]*dt;}this.velocity[key]=vel;return {...value};};
 p.motion.head=spring('head',p.motion.head,280,34);p.motion.bodyPosition=spring('bodyPosition',p.motion.bodyPosition);k.pelvisAngle=spring('pelvis',clamp(k.pelvisAngle,...JOINT_LIMITS.pelvisYaw));k.thoraxAngle=spring('thorax',clamp(k.thoraxAngle,...JOINT_LIMITS.thoraxYaw));if(margin<-.08){p.motion.bodyPosition.x+=clamp(nearest.x-com.x,-.04,.04);p.motion.bodyPosition.z+=clamp(nearest.z-com.z,-.04,.04);}p.motion.leadElbow=clamp(p.motion.leadElbow,...JOINT_LIMITS.elbow);p.motion.trailElbow=clamp(p.motion.trailElbow,...JOINT_LIMITS.elbow);}
 k.balance=clamp((margin+.16)/.30,0,1);return p;}
}
export function calculateHandCompliance(gripForces={top:0,bottom:0}, maxThreshold=400){
  const topDeflection = Math.min(0.04, ((gripForces.top||0)/maxThreshold)*0.04);
  const bottomDeflection = Math.min(0.04, ((gripForces.bottom||0)/maxThreshold)*0.04);
  return { topDeflection, bottomDeflection, totalCompliance: (topDeflection + bottomDeflection)/2 };
}
