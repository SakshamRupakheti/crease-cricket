import {clamp,rng,length,mul} from '../physics.js';
export const SPEED_BANDS = Object.freeze([[80,100],[110,125],[130,145],[145,155],[155,165]]);
export class BowlingSpeedController {
  constructor(){this.mode='fixed';this.kmh=120;this.min=110;this.max=125;this.vary=false;this.ramp=5;}
  configure(values){const next={...this,...values};if(!['fixed','random','progressive'].includes(next.mode))throw new RangeError('Unknown speed mode');for(const key of ['kmh','min','max'])if(!Number.isFinite(next[key])||next[key]<80||next[key]>165)throw new RangeError('Speed must be 80–165 km/h');if(next.min>next.max)throw new RangeError('Minimum must not exceed maximum');Object.assign(this,next);}
  choose(seed,legalBalls=0){const random=rng(seed^0x53a9);let kmh=this.mode==='random'?this.min+random()*(this.max-this.min):this.kmh;if(this.mode==='progressive')kmh+=Math.floor(legalBalls/6)*this.ramp;if(this.vary)kmh+=(random()*2-1)*5;return clamp(kmh,80,165);}
  apply(intent,legalBalls=0){const requestedKmh=this.choose(intent.seed,legalBalls),baseRunupSeconds=intent.baseRunupSeconds??intent.runupSeconds;return {...intent,speed:requestedKmh/3.6,requestedKmh,baseRunupSeconds,runupSeconds:baseRunupSeconds*(1.05-(requestedKmh-80)/850)};}
  normalize(release,kmh){return {...release,velocity:mul(release.velocity,kmh/(3.6*length(release.velocity)))};}
}
