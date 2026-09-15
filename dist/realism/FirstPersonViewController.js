import {clamp} from '../physics.js';
import {ObservedGaze} from './ObservedGaze.js';
export class FirstPersonViewController {
  constructor(camera){this.camera=camera;this.yaw=0;this.pitch=-.34;this.targetYaw=0;this.targetPitch=-.34;this.looking=false;this.dragging=false;this.last=null;this.clock=0;this.lastLook=-10;this.neckLimit=2.62;this.gaze=new ObservedGaze();this.tracking=true;}
  center(){this.targetYaw=0;this.targetPitch=-.34;this.lastLook=this.clock;}
  move(dx,dy){this.targetYaw=clamp(this.targetYaw-dx*.0035,-this.neckLimit,this.neckLimit);this.targetPitch=clamp(this.targetPitch-dy*.0035,-1.30,.48);this.lastLook=this.clock;}
  attach(canvas,{blocked=()=>false,onMode=()=>{}}={}){
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('pointerdown',e=>{if(e.button===2&&!blocked()){this.dragging=true;this.last={x:e.clientX,y:e.clientY};}});
    canvas.addEventListener('pointermove',e=>{if(blocked())return;if(this.looking||this.dragging){if(this.last)this.move(e.clientX-this.last.x,e.clientY-this.last.y);this.last={x:e.clientX,y:e.clientY};}});
    for(const name of ['pointerup','pointercancel','pointerleave'])canvas.addEventListener(name,()=>{this.dragging=false;this.last=null;});
    document.addEventListener('keydown',e=>{if(blocked()||/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName||''))return;if(e.code==='KeyL'&&!e.repeat){this.looking=!this.looking;this.last=null;onMode(this.looking);}if(e.code==='KeyC')this.center();});
  }
  update(dt,state,foot,hand,observation={}){this.clock+=dt;const gp=globalThis.navigator?.getGamepads?.()?.find(p=>p?.mapping==='standard');if(gp&&Math.hypot(gp.axes[2]||0,gp.axes[3]||0)>.18)this.move((gp.axes[2]||0)*dt*360,(gp.axes[3]||0)*dt*360);
    let yaw=this.targetYaw,pitch=this.targetPitch;if(state==='runup'){yaw=clamp(yaw,-.95,.95);pitch=clamp(pitch,-.72,.35);if(this.clock-this.lastLook>.5&&!this.looking&&!this.dragging){this.targetYaw*=Math.exp(-dt*.75);this.targetPitch+=(-.34-this.targetPitch)*(1-Math.exp(-dt*.75));}}
    const eye=this.camera.position.clone();this.camera.getWorldPosition?.(eye);const gaze=dt>0?this.gaze.observe(dt,state,observation.ball,eye,observation.contact):null;
    if(this.tracking&&gaze&&!this.looking&&!this.dragging&&this.clock-this.lastLook>1&&(['runup','flight','replay'].includes(state)||(state==='result'&&observation.contact&&this.gaze.time-this.gaze.contactAt<2))){yaw=gaze.yaw;pitch=clamp(gaze.pitch-.30,-1.3,.95);}
    const alpha=1-Math.exp(-dt*12);this.yaw+=clamp((yaw-this.yaw)*alpha,-dt*2.6,dt*2.6);this.pitch+=clamp((pitch-this.pitch)*alpha,-dt*2.8,dt*2.8);
    if(this.body){this.body.lastPitch=this.pitch;this.body.setLook(this.yaw,this.pitch);}else{this.camera.position.set((hand==='left'?-.08:.08)+foot.x,1.70+Math.sin(this.clock*2.1)*.003,.62+foot.z*.6);this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');}
  }
}
