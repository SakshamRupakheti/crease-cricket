import {clamp,v,length} from '../physics.js';
// Perception estimate from current observed state only. No seed or future frames.
export function ballContext(observation,foot=v()){
 if(!observation)return {known:false,line:0,length:null,speed:0,predictedBounce:null,predictedContactHeight:.7,lateralOffset:0,timeToContact:null,hasBounced:false,reachability:1};
 const {ball:p,velocity:u}=observation,t=clamp((foot.z+.05-p.z)/Math.max(.1,u.z),0,1.4),g=9.81,r=.0361,bounceTime=(u.y+Math.sqrt(u.y*u.y+2*g*Math.max(0,p.y-r)))/g;
 const bounce=bounceTime<t?{x:p.x+u.x*bounceTime,y:r,z:p.z+u.z*bounceTime}:null,after=t-bounceTime,height=bounce?r+Math.abs(u.y-g*bounceTime)*.64*after-.5*g*after*after:p.y+u.y*t-.5*g*t*t,line=p.x+u.x*t-foot.x;
 return {known:true,line,length:bounce?Math.abs(bounce.z-foot.z):null,speed:length(u),predictedBounce:bounce,predictedContactHeight:clamp(height,r,2.5),lateralOffset:line,timeToContact:t,hasBounced:observation.hasBounced??u.y>0,reachability:clamp(1-Math.max(0,Math.abs(line)-.35)/.9,.05,1)};
}
