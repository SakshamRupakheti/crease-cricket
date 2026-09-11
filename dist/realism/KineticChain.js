import {FootPlantController} from './FootPlantController.js';
import {clamp,v} from '../physics.js';
export const KINETIC_DEFAULTS=Object.freeze({spring:18,pelvisDelay:0,thoraxDelay:.035,shoulderDelay:.065,elbowDelay:.09,wristDelay:.15,duration:.39,batMass:1.18,wristInertia:.075,maxAngularSpeed:18});
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
// Reduced-order torque-driven joints; all coefficients are uncalibrated priors.
export class KineticChain {
 constructor(config={}){this.config={...KINETIC_DEFAULTS,...config};this.reset();}
 reset(){this.footPlants=new FootPlantController();this.joints={pelvis:{a:0,w:0},thorax:{a:0,w:0},shoulder:{a:0,w:0},elbow:{a:.65,w:0},wrist:{a:0,w:0}};this.lastFoot=v();this.plantedFor=0;this.twist=0;this.twistVelocity=0;this.lastGrip=null;this.lastHead=null;this.activeAge=10;}
 impact(impulse){this.twistVelocity+=clamp(impulse,-1.8,1.8);}
 step(input,shot,dt){const c=this.config,j=this.joints,footSpeed=Math.hypot(input.foot.x-this.lastFoot.x,input.foot.z-this.lastFoot.z)/Math.max(dt,1e-6);this.lastFoot={...input.foot};this.plantedFor=footSpeed<.03?this.plantedFor+dt:0;const plant=clamp(this.plantedFor/.12,.18,1),effort=input.stroke?.power??0,mirror=input.hand==='left'?-1:1;
 if(input.stroke){input.stroke.age+=dt;this.activeAge=input.stroke.age;}else this.activeAge+=dt;
 const age=this.activeAge,active=age<c.duration+.18&&!!input.stroke,finish=smooth((age-c.duration)/.18),rotation=shot.rotationRange??(.32+Math.abs(shot.yaw)*.6),extension=shot.extension??(Math.abs(shot.roll)>.8?.42:.85),weight=active?smooth(age/.18)*(1-finish):0;
 const inertia=.20+c.batMass*(.32+.30*j.elbow.a)**2,targets={pelvis:0,thorax:0,shoulder:0,elbow:.65,wrist:0};
 if(active){targets.pelvis=mirror*rotation*(smooth((age-c.pelvisDelay)/.17)-.18)*(1-finish);targets.thorax=mirror*rotation*1.25*(smooth((age-c.thoraxDelay)/.18)-.3)*(1-finish);targets.shoulder=1.25*(shot.arc||1)*smooth((age-c.shoulderDelay)/.20)*(1-finish);targets.elbow=.65+extension*smooth((age-c.elbowDelay)/.18)*(1-finish);targets.wrist=1.35*smooth((age-(shot.wristReleaseTiming??c.wristDelay))/.13)*(1-finish);}
 const separation=j.thorax.a-j.pelvis.a,elasticTorque=clamp(-c.spring*separation,-6,6),energy=.5*c.spring*separation**2,specs={pelvis:[1.4,180,25],thorax:[1.9,210,30],shoulder:[inertia,160,17],elbow:[.22,90,8],wrist:[c.wristInertia,45,3]};
 for(const key of Object.keys(j)){const q=j[key],[I,k,damp]=specs[key],drive=active?.55+effort*.75:1;let torque=k*(targets[key]-q.a)*drive-damp*q.w;if(key==='pelvis')torque-=elasticTorque;if(key==='thorax')torque+=elasticTorque;if(key==='pelvis'||key==='thorax')torque*=.55+.45*plant;q.w=clamp(q.w+torque/I*dt,-c.maxAngularSpeed,c.maxAngularSpeed);q.a+=q.w*dt;}
 if(input.stroke&&age>c.duration+.18)input.stroke=null;
 this.twistVelocity+=(-100*this.twist-13*this.twistVelocity)*dt;this.twist=clamp(this.twist+this.twistVelocity*dt,-.075,.075);
 const plantedFeet=this.footPlants.update(input.foot,mirror,dt);const frontWeight=clamp(.5+(shot.reach>=0?1:-1)*weight*.24,.2,.8),com=v(input.foot.x+input.target.x*.06,.95-(shot.crouch||0)*.6,input.foot.z+.55-(frontWeight-.5)*.3),supportOffset=Math.abs(com.x-input.foot.x)/.25;
 return {pelvisAngle:j.pelvis.a,thoraxAngle:j.thorax.a,shoulderAngle:j.shoulder.a,leadElbowAngle:j.elbow.a,wristCockAngle:-.8+j.wrist.a,wristReleaseProgress:clamp(j.wrist.a/1.35,0,1),pelvisAngularVelocity:j.pelvis.w,thoraxAngularVelocity:j.thorax.w,shoulderAngularVelocity:j.shoulder.w,leadElbowAngularVelocity:j.elbow.w,wristAngularVelocity:j.wrist.w,xFactor:j.thorax.a-j.pelvis.a,storedElasticEnergy:energy,momentOfInertia:inertia,legDrive:plant*weight,frontFootPlantTime:this.plantedFor,backFootForce:75*9.81*(1-frontWeight),weightDistribution:frontWeight,centerOfMass:com,balance:clamp(1-supportOffset*.3-footSpeed*.08,.35,1),footSpeed,...plantedFeet,twist:this.twist,age,active};
 }
}
