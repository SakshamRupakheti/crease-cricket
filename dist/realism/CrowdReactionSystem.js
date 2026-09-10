export class CrowdReactionSystem {
 constructor(){this.time=0;this.intensity=.06;this.pending=[];this.peak=.06;this.until=0;this.support=1;}
 trigger(event){const reactions={contact:[.24,.08,1.2],four:[.72,.28,3],six:[1,.35,5],wicket:[.92,.22,4],miss:[.16,.12,1],replay:[.28,.2,2]};const [power,delay,duration]=reactions[event]??[.08,0,1];this.pending.push({at:this.time+delay,power,duration});}
 update(dt,state){this.time+=dt;for(const r of this.pending.filter(r=>r.at<=this.time)){this.peak=r.power;this.until=this.time+r.duration;}this.pending=this.pending.filter(r=>r.at>this.time);const target=this.time<this.until?this.peak*this.support:state==='runup'?.018:.055;this.intensity+=(target-this.intensity)*(1-Math.exp(-dt*3));return this.intensity;}
}
