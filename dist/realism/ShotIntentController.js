// These profiles change the bat's path, never the ball or score.
export const SHOTS={
 free:{label:'Free stroke',yaw:0,roll:0,height:0,reach:0,crouch:0},
 defence:{label:'Forward defence',yaw:0,roll:0,height:-.08,reach:.10,crouch:.03,arc:.62},
 backdefence:{label:'Back-foot defence',yaw:0,roll:0,height:.08,reach:-.05,crouch:0,arc:.65},
 straight:{label:'Straight drive',yaw:0,roll:0,height:0,reach:.1,crouch:.02},
 cover:{label:'Cover drive',yaw:-.40,roll:-.28,height:-.03,reach:.12,crouch:.04},
 offdrive:{label:'Off drive',yaw:-.22,roll:-.12,height:0,reach:.10,crouch:.02},
 glance:{label:'Leg glance',yaw:.72,roll:.4,height:-.03,reach:-.02,crouch:0,arc:.75},
 ondrive:{label:'On drive',yaw:.32,roll:.23,height:0,reach:.10,crouch:.02},
 flick:{label:'Flick / glance',yaw:.60,roll:.48,height:-.05,reach:.02,crouch:.02},
 cut:{label:'Square cut',yaw:-.6,roll:-1.2,height:.15,reach:0,crouch:.03},
 latecut:{label:'Late cut',yaw:-.75,roll:-1.05,height:.12,reach:-.12,crouch:0,arc:.8},
 punch:{label:'Back-foot punch',yaw:-.15,roll:-.18,height:.08,reach:-.06,crouch:0,arc:.9},
 pull:{label:'Pull',yaw:.6,roll:1.25,height:.18,reach:.02,crouch:.02},
 hook:{label:'Hook',yaw:.75,roll:1.4,height:.35,reach:-.06,crouch:0},
 sweep:{label:'Sweep',yaw:.6,roll:1.32,height:-.38,reach:.1,crouch:.30},
 reverse:{label:'Reverse sweep',yaw:-.6,roll:-1.32,height:-.38,reach:.1,crouch:.30},
 slog:{label:'Slog sweep',yaw:.45,roll:1.05,height:-.26,reach:.14,crouch:.24,arc:1.2},
 loft:{label:'Lofted drive',yaw:0,roll:0,height:.02,reach:.12,crouch:.02,loft:.42},
 ramp:{label:'Ramp',yaw:0,roll:.25,height:.10,reach:-.06,crouch:.12,loft:.9,arc:.55},
 uppercut:{label:'Uppercut',yaw:-.65,roll:-1.2,height:.3,reach:-.04,crouch:0,loft:.5}
};
