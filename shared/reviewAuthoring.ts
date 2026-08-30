import { z } from "zod";
import { executableRuleSchema } from "./ruleDsl";

export const passageDraftSchema=z.object({id:z.string().min(1).max(120),sourceId:z.string().min(1).max(120),locator:z.string().min(1).max(500),originalText:z.string().min(1).max(20000),transliteration:z.string().max(20000).nullable().optional(),literalTranslation:z.string().max(20000).nullable().optional(),interpretiveTranslation:z.string().max(20000).nullable().optional(),pageStart:z.number().int().positive().nullable().optional(),pageEnd:z.number().int().positive().nullable().optional(),ocrQuality:z.enum(["unknown","machine","corrected","verified"]).default("unknown"),displayRights:z.enum(["internal-only","short-excerpt","full-display"]).default("internal-only"),parserProvenance:z.record(z.string(),z.unknown()).default({})}).refine(value=>value.pageStart==null||value.pageEnd==null||value.pageEnd>=value.pageStart,{message:"pageEnd must be at or after pageStart",path:["pageEnd"]});
export const ruleDraftSchema=z.object({passageId:z.string().min(1),rule:executableRuleSchema,confidence:z.enum(["textual","practitioner_consensus","contested"])});
export const ruleExampleDraftSchema=z.object({id:z.string().min(1),ruleId:z.string().min(1),kind:z.enum(["worked-example","counterexample","boundary-example"]),chart:z.unknown(),asOfIso:z.string().datetime().nullable().optional(),expectedMatch:z.boolean(),expectedExceptionIds:z.array(z.string()).default([]),sourceLocator:z.string().max(500).nullable().optional()});
export const reviewDecisionSchema=z.object({decision:z.enum(["approve","request_changes","reject"]),notes:z.string().max(4000).optional()});
export const passageReviewSchema=reviewDecisionSchema.extend({reviewKind:z.enum(["translation","practice","rights"])});
export const contradictionDraftSchema=z.object({id:z.string().min(1),firstRuleId:z.string().min(1),secondRuleId:z.string().min(1),description:z.string().min(1).max(4000)}).refine(v=>v.firstRuleId!==v.secondRuleId,{message:"Contradiction requires two different rules"});
export const contradictionResolutionSchema=z.object({status:z.enum(["tradition_split","resolved","rejected"]),notes:z.string().min(1).max(4000)});

export function enforceDisplayRights(sourceRights:string,requested:"internal-only"|"short-excerpt"|"full-display",text:string){
  if(sourceRights==="restricted"||sourceRights==="unknown")return requested==="internal-only"?null:"Restricted or unknown-rights sources must remain internal-only.";
  if(requested==="short-excerpt"&&text.length>500)return "Short excerpts are limited to 500 characters.";
  if(requested==="full-display"&&!['public_domain','licensed'].includes(sourceRights))return "Full display requires public-domain or licensed rights.";
  return null;
}
