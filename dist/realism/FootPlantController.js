import {v,clamp} from '../physics.js';
export class FootPlantController {
 reset(){this.feet=null;this.step=null;this.next=0;}
 constructor(){this.reset();}
 update(foot,mirror,dt){const targets=[v(foot.x-mirror*.18,0,foot.z+.34),v(foot.x+mirror*.18,0,foot.z+.76)];if(!this.feet)this.feet=targets.map(p=>({...p}));if(!this.step){const i=this.next,d=Math.hypot(targets[i].x-this.feet[i].x,targets[i].z-this.feet[i].z);if(d>.06){this.step={index:i,age:0,from:{...this.feet[i]},to:targets[i]};this.next=1-i;}}
 if(this.step){const s=this.step;s.age+=dt;const t=clamp(s.age/.18,0,1),ease=t*t*(3-2*t),p=this.feet[s.index];p.x=s.from.x+(s.to.x-s.from.x)*ease;p.z=s.from.z+(s.to.z-s.from.z)*ease;p.y=Math.sin(t*Math.PI)*.045;if(t>=1){p.y=0;this.step=null;}}
 return {frontFoot:{...this.feet[0]},backFoot:{...this.feet[1]},frontPlanted:this.feet[0].y<.003,backPlanted:this.feet[1].y<.003};}
}
