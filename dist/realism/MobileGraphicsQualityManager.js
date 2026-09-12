import {GraphicsQualityController} from './GraphicsQualityController.js';
export class MobileGraphicsQualityManager extends GraphicsQualityController {
 constructor(renderer,sun,crowd,grass){super(renderer,sun);this.crowd=crowd;this.grass=grass;this.mobile=globalThis.matchMedia?.('(pointer: coarse)')?.matches||false;this.adaptive=this.mobile;this.elapsed=0;this.apply(this.mobile?'medium':'high');}
 apply(name){super.apply(name);if(this.crowd){this.crowd.densityStride={low:4,medium:3,high:2,ultra:1}[name]||2;this.crowd.nearDistance=name==='ultra'?65:35;this.crowd.midDistance=name==='ultra'?85:65;this.crowd.lastUpdate=-1;}if(this.grass)this.grass.count={low:0,medium:500,high:1400,ultra:2200}[name]??500;}
 update(dt){const fps=super.update(dt);this.elapsed+=dt;if(this.adaptive&&this.elapsed>4&&fps>0){this.elapsed=0;if(fps<48){this.crowd.densityStride=Math.min(5,(this.crowd.densityStride||2)+1);if(this.grass)this.grass.count=Math.max(0,this.grass.count-250);}}return fps;}
}
