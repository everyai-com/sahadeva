export type BlindThemePrediction={caseId:string;rankedThemes:Array<{themeId:string;score:number}>};
export type SealedThemeOutcome={caseId:string;observedThemeIds:string[]};

export const LIFE_THEME_VALIDATION_PROTOCOL={
  version:"sahadeva-life-theme-blind-validation-1",
  design:"Predictions are frozen before a separate outcome file is unsealed.",
  minimumCases:30,
  minimumPositiveObservationsPerTheme:10,
  primaryMetrics:["top3Recall","top3Precision","meanReciprocalRank"],
  calibrationMetric:"Brier score may be reported only after scores are converted to probabilities on a separate training cohort.",
  antiLeakage:["Do not author or tune rules from the held-out cases","Do not expose outcomes to the prediction run","Do not infer criminal conduct, arrest, imprisonment, court outcomes, diagnosis, death, or lifespan"],
} as const;

export function evaluateBlindLifeThemePredictions(predictions:BlindThemePrediction[],outcomes:SealedThemeOutcome[]){
  const outcomeById=new Map(outcomes.map((item)=>[item.caseId,new Set(item.observedThemeIds)]));
  const rows=predictions.filter((item)=>outcomeById.has(item.caseId)).map((item)=>{
    const observed=outcomeById.get(item.caseId)!,top3=item.rankedThemes.slice(0,3),hits=top3.filter((theme)=>observed.has(theme.themeId));
    const firstHit=item.rankedThemes.findIndex((theme)=>observed.has(theme.themeId));
    return{caseId:item.caseId,observedCount:observed.size,top3Hits:hits.length,top3Precision:top3.length?hits.length/top3.length:0,top3Recall:observed.size?hits.length/observed.size:0,reciprocalRank:firstHit<0?0:1/(firstHit+1)};
  });
  const mean=(key:"top3Precision"|"top3Recall"|"reciprocalRank")=>rows.length?rows.reduce((sum,row)=>sum+row[key],0)/rows.length:0;
  const themeCounts=new Map<string,number>();for(const outcome of outcomes)for(const theme of new Set(outcome.observedThemeIds))themeCounts.set(theme,(themeCounts.get(theme)||0)+1);
  const underpoweredThemes=[...themeCounts].filter(([,count])=>count<LIFE_THEME_VALIDATION_PROTOCOL.minimumPositiveObservationsPerTheme).map(([themeId,count])=>({themeId,count}));
  const sufficient=rows.length>=LIFE_THEME_VALIDATION_PROTOCOL.minimumCases&&underpoweredThemes.length===0;
  return{schemaVersion:"sahadeva-life-theme-validation-result-1",status:sufficient?"blind-ranking-validation-complete":"insufficient-sample",calibratedProbabilities:false,matchedCases:rows.length,requiredCases:LIFE_THEME_VALIDATION_PROTOCOL.minimumCases,metrics:{top3Precision:Number(mean("top3Precision").toFixed(4)),top3Recall:Number(mean("top3Recall").toFixed(4)),meanReciprocalRank:Number(mean("reciprocalRank").toFixed(4))},underpoweredThemes,rows,notice:sufficient?"Ranking validation passed its sample-size gate; probability calibration remains a separate prospective study.":"These results are diagnostic only and must not change public confidence labels."};
}
