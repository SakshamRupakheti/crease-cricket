import {clamp,v} from '../physics.js';
import {SHOT_MOTIONS} from './ShotMotionLibrary.js';
export const DEFAULT_BATTING_INTENT=Object.freeze({desiredShotFamily:'VerticalFrontFoot',desiredDirection:0,effort:.6,frontBackBias:0,lateralBias:0,loftBias:0,wristBias:0,batFaceBias:0,gripStrengthTop:1,gripStrengthBottom:1,releaseTopHand:false,releaseBottomHand:false,abort:false});
export function createBattingIntent(overrides={}){return {...DEFAULT_BATTING_INTENT,footworkIntent:v(),handPathBias:v(),...overrides};}
export function resolveIntentPrior(intent,fallback='straight'){
 const families={VerticalFrontFoot:'straight',VerticalBackFoot:'punch',CrossBat:'pull',WristRedirection:'flick',Sweep:'sweep',Lofted:'loft','Leave/Evasion':'defence'};
 if(intent.preset==='free'||SHOT_MOTIONS[intent.preset])return intent.preset;
 return families[intent.desiredShotFamily]||Object.keys(SHOT_MOTIONS).find(id=>SHOT_MOTIONS[id].family===intent.desiredShotFamily)||fallback;
}
export function intentFromControls(control){const preset=control.poseController.shot;return createBattingIntent({preset,desiredShotFamily:SHOT_MOTIONS[preset]?.family||'Free',desiredDirection:control.face,effort:control.stroke?.power??.6,footworkIntent:{...control.foot},handPathBias:{...control.target},batFaceBias:control.face,loftBias:control.loft,abort:control.leave,...control.intentOverrides,preset:control.intentOverrides.desiredShotFamily&&!control.intentOverrides.preset?undefined:(control.intentOverrides.preset||preset)});}
export function sanitizeIntent(intent){const i=createBattingIntent(intent);for(const key of ['gripStrengthTop','gripStrengthBottom','effort'])i[key]=clamp(Number(i[key])||0,0,1);for(const key of ['batFaceBias','loftBias','wristBias','lateralBias','frontBackBias'])i[key]=clamp(Number(i[key])||0,-1,1);return i;}
