export const QUALITY={low:{ratio:1,shadow:512,shadows:false},medium:{ratio:1.25,shadow:1024,shadows:true},high:{ratio:1.8,shadow:2048,shadows:true},ultra:{ratio:2,shadow:2048,shadows:true}};
export class GraphicsQualityController {
 constructor(renderer,sun){this.renderer=renderer;this.sun=sun;this.frames=0;this.seconds=0;this.fps=0;}
 apply(name){const q=QUALITY[name]||QUALITY.high;this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,q.ratio));this.renderer.shadowMap.enabled=q.shadows;this.sun.shadow.mapSize.set(q.shadow,q.shadow);if(this.sun.shadow.map){this.sun.shadow.map.dispose();this.sun.shadow.map=null;}this.renderer.shadowMap.needsUpdate=true;}
 update(dt){this.frames++;this.seconds+=dt;if(this.seconds>=1){this.fps=this.frames/this.seconds;this.frames=0;this.seconds=0;}return this.fps;}
}
