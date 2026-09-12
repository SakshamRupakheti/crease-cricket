import * as THREE from '../three.module.js';
export const BALL_FINISHES={red:'#b51e2e',white:'#f4eee2',pink:'#dc5074'};
// Bails are visual rigid bodies; the authoritative wicket event comes from ball physics.
export class EquipmentAssetPipeline {
 constructor(scene,ball){this.ball=ball;this.bails=[];const wood=new THREE.MeshStandardMaterial({color:'#e8dcb7',roughness:.62});for(const z of [1,-19.12])for(const side of [-1,1]){const g=new THREE.Group();g.position.set(side*.055,.724,z);for(const [r,l,x] of [[.012,.069,0],[.007,.025,-.046],[.007,.025,.046]]){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,10),wood);o.rotation.z=Math.PI/2;o.position.x=x;o.castShadow=true;g.add(o);}scene.add(g);this.bails.push({g,side,z});}}
 setBall(name){this.ball.material.color.set(BALL_FINISHES[name]||BALL_FINISHES.red);}
 update(time,event){for(const {g,side,z} of this.bails){const t=z===1&&event?Math.max(0,time-event.timeS):0;g.position.set(side*.055+side*Math.min(t,.6)*.6,Math.max(.02,.724+t*1.8-4.905*t*t),z+Math.min(t,1.2)*2);g.rotation.set(t*8,0,t*side*11);if(!t){g.position.y=.724;g.position.z=z;}}}
}
