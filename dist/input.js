import {BatPoseAndSwingController} from './realism/BatPoseAndSwingController.js';
import {clamp,v,batBasis} from './physics.js';
export class BatController {
  constructor(){this.poseController=new BatPoseAndSwingController();this.context='ready';this.mode='mouse';this.sensitivity=1;this.invert=false;this.hand='right';this.target=v(.15,.72,.03);this.position={...this.target};this.face=0;this.loft=0;this.foot=v();this.stroke=null;this.clock=0;this.leave=false;this.lastPointer=null;this.wheelBurst=null;this.pointers=new Map();this.active=true;this.onActivity=()=>{};this.keys=new Set();this.lastStroke=-1;}
  reset(){this.target=v(this.hand==='left'?-.15:.15,.72,.03);this.position={...this.target};this.stroke=null;this.leave=false;this.lastPointer=null;this.wheelBurst=null;this.pointers.clear();this.keys.clear();this.clock=0;this.lastStroke=-1;this.foot=v();}
  swing(strength=.55){if(!this.active||this.clock-this.lastStroke<.28)return;this.lastStroke=this.clock;this.stroke={age:0,power:clamp(strength,.15,1)};this.leave=false;this.onActivity('STROKE');}
  move(dx,dy,elapsed,source='mouse'){
    if(!this.active)return;const scale=this.sensitivity*(source==='trackpad'?.003:.004);this.target.x=clamp(this.target.x+dx*scale,-.95,.95);this.target.y=clamp(this.target.y-dy*scale,.28,1.42);this.leave=false;
    const speed=-dy/Math.max(.008,elapsed);if(dy<-3&&speed>100)this.swing(speed/1200);
    if(dy>4){this.target.z=.12;this.onActivity('BACKLIFT');}else this.target.z=.03;
  }
  wheel(e,now){if(this.mode!=='trackpad'||!this.active||e.ctrlKey||e.metaKey)return false;e.preventDefault?.();const factor=e.deltaMode===1?16:e.deltaMode===2?400:1,s=this.invert?-1:1,dx=e.deltaX*factor*s,dy=e.deltaY*factor*s;let b=this.wheelBurst;const fresh=!b||now-b.last>180;
    if(fresh)b=this.wheelBurst={last:now,dy:0,dx:0,triggered:false,peak:0};const elapsed=Math.max(8,now-b.last);b.last=now;b.dy+=dy;b.dx+=dx;const magnitude=Math.hypot(dx,dy);b.peak=Math.max(b.peak,magnitude);
    // One stroke per wheel burst. Momentum tails cannot trigger another swing.
    this.target.x=clamp(this.target.x+dx*.003*this.sensitivity,-.95,.95);this.target.y=clamp(this.target.y-dy*.002*this.sensitivity,.28,1.42);
    if(!b.triggered&&b.dy<-12){this.swing(clamp(-b.dy/100+magnitude/35,.2,1));b.triggered=true;}this.onActivity('TWO-FINGER GESTURE');return true;
  }
  step(dt){this.clock+=dt;const speed=.75*dt;if(this.keys.has('KeyA'))this.foot.x-=speed;if(this.keys.has('KeyD'))this.foot.x+=speed;if(this.keys.has('KeyW'))this.foot.z-=speed;if(this.keys.has('KeyS'))this.foot.z+=speed;this.foot.x=clamp(this.foot.x,-.4,.4);this.foot.z=clamp(this.foot.z,-.38,.22);if(this.keys.has('KeyQ'))this.face-=dt;if(this.keys.has('KeyE'))this.face+=dt;this.face=clamp(this.face,-.7,.7);this.loft=(this.keys.has('ShiftLeft')||this.keys.has('ShiftRight'))?.42:0;return this.poseController.compute(this,dt);
  }
  attach(canvas,{isBlocked=()=>false,onPause=()=>{},onLeave=()=>{}}={}){
    const pos=e=>({x:e.clientX,y:e.clientY,time:e.timeStamp});
    canvas.addEventListener('pointerdown',e=>{if(isBlocked())return;if(e.pointerType!=='mouse'){this.pointers.set(e.pointerId,pos(e));canvas.setPointerCapture(e.pointerId);}this.lastPointer=pos(e);});
    canvas.addEventListener('pointermove',e=>{if(isBlocked())return;const now=pos(e);if(e.pointerType==='mouse'){if(this.mode==='mouse'&&this.lastPointer)this.move(now.x-this.lastPointer.x,now.y-this.lastPointer.y,(now.time-this.lastPointer.time)/1000);this.lastPointer=now;}else if(this.pointers.has(e.pointerId)){const prev=this.pointers.get(e.pointerId);this.move(now.x-prev.x,now.y-prev.y,(now.time-prev.time)/1000,'touch');this.pointers.set(e.pointerId,now);}});
    for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,e=>this.pointers.delete(e.pointerId));canvas.addEventListener('pointerleave',()=>this.lastPointer=null);
    canvas.addEventListener('wheel',e=>{if(!isBlocked())this.wheel(e,e.timeStamp);},{passive:false});
    document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName||''))return;if(e.code==='KeyP'&&!e.repeat){onPause();return;}if(isBlocked()||(e.target?.tagName==='BUTTON'&&['Space','Enter'].includes(e.code)))return;this.keys.add(e.code);if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.code==='Space'){this.leave=true;this.stroke=null;onLeave();}if(e.code==='Enter')this.swing(.65);});document.addEventListener('keyup',e=>this.keys.delete(e.code));
  }
}
