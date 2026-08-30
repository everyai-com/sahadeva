import {describe,expect,it} from "vitest";
import {enforceDisplayRights,passageDraftSchema} from "./reviewAuthoring";
describe("review authoring safety",()=>{it("keeps restricted books internal",()=>expect(enforceDisplayRights("restricted","short-excerpt","small")).toMatch(/internal-only/));it("validates page order",()=>expect(passageDraftSchema.safeParse({id:"p",sourceId:"s",locator:"x",originalText:"x",pageStart:9,pageEnd:8}).success).toBe(false));it("permits licensed short excerpts within limit",()=>expect(enforceDisplayRights("licensed","short-excerpt","x")).toBeNull());});
