import * as THREE from '../three.module.js';
export const TRAIL_COLORS={topHand:0x55d8ff,bottomHand:0xfc92d4,toe:0xffba55,sweetSpot:0xe5ff75,head:0xf6f4e9,frontFoot:0x7be59b,backFoot:0xa997ff};
export class MotionTrails {
 constructor(scene){this.group=new THREE.Group();scene.add(this.group);this.lines={};for(const [key,color] of Object.entries(TRAIL_COLORS)){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(600*3),3));geometry.setDrawRange(0,0);const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.82,depthTest:false}));line.frustumCulled=false;this.group.add(line);this.lines[key]=line;}}
 set(frames,time=Infinity){for(const [key,line] of Object.entries(this.lines)){let n=0;const attr=line.geometry.attributes.position;for(const f of frames){if(f.time>time||n>=600)break;const p=f.pose?.trails?.[key];if(p)attr.setXYZ(n++,p.x,p.y,p.z);}attr.needsUpdate=true;line.geometry.setDrawRange(0,n);}}
}
