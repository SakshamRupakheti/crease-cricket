import {SHOTS} from './ShotIntentController.js';
import {v,clamp,batBasis} from '../physics.js';
export const BAT_GRIP_OFFSET=.50;
const smooth=t=>t*t*(3-2*t);
export class BatPoseAndSwingController {
  constructor(){this.backlift='medium';this.shot='free';this.phase='stance';this.recovery=0;this.lastPitch=-.8;}
  compute(input,dt){
    const shot=SHOTS[this.shot]||SHOTS.free,mirror=input.hand==='left'?-1:1;const lift={low:.40,medium:.80,high:1.15}[this.backlift]??.80;let pitch=-lift,drive=0;
    if(input.stroke){this.recovery=0;input.stroke.age+=dt;const a=input.stroke.age/(.48-input.stroke.power*.12);if(a<1){pitch=-lift+(lift+1.55)*(shot.arc||1)*smooth(a);drive=Math.sin(Math.PI*a)*(.18+input.stroke.power*.13);this.phase=a<.22?'backlift':a<.67?'downswing':'follow-through';}else {input.stroke=null;this.recovery=.32;this.phase='recover';}}
    else this.phase='stance';
    if(this.recovery>0){this.recovery=Math.max(0,this.recovery-dt);pitch=-lift+(this.lastPitch+lift)*Math.exp(-dt*14);this.phase='recover';}this.lastPitch=pitch;
    // Input sets the hand/shoulder target. Blade position derives from rotation
    // around the shared grip; it is never translated independently of the hands.
    const weight=input.stroke?Math.sin(Math.min(1,input.stroke.age/.4)*Math.PI):0;
    const pivot=v(input.target.x*.72+input.foot.x,1.04+(input.target.y-.72)*.15+Math.sin(input.clock*2.1)*.003,-.08+input.foot.z-drive);
    pivot.y+=shot.height;pivot.z-=shot.reach;
    if(input.leave){pivot.x+=input.hand==='left'?-.42:.42;pitch=-1.25;}
    // Idle tap is a whole hand-and-bat motion; physics uses the same pose.
    if(input.context==='ready'&&input.clock%8>6.8){const a=(input.clock%8-6.8)/1.2;pitch=-lift*(1-Math.sin(a*Math.PI));pivot.y-=.25*Math.sin(a*Math.PI);this.phase='tap';}
    const yaw=input.face+shot.yaw*mirror,loft=pitch+input.loft+(shot.loft||0),roll=shot.roll*mirror,axes=batBasis(yaw,loft,roll),center=v(pivot.x-axes.up.x*BAT_GRIP_OFFSET,pivot.y-axes.up.y*BAT_GRIP_OFFSET,pivot.z-axes.up.z*BAT_GRIP_OFFSET);
    return {position:center,yaw,loft,roll,shot:this.shot,crouch:shot.crouch,leave:input.leave,handPivot:pivot,phase:this.phase,torsoTurn:input.target.x*.20,weightShift:weight,foot:{...input.foot}};
  }
}
