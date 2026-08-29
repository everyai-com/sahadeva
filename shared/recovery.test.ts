import {describe,expect,it} from "vitest";
import {unwrapRecovery,wrapRecovery,type BrowserRecovery} from "./recovery";
const fixture:BrowserRecovery={schemaVersion:"sahadeva-browser-recovery-1",apiKey:`sah_${"a".repeat(43)}`,chartKeys:{chart1:"browser-held-key"},createdAt:"2026-08-28T00:00:00.000Z"};
describe("password-wrapped recovery",()=>{
  it("round-trips API and chart keys without plaintext in the bundle",async()=>{const bundle=await wrapRecovery(fixture,"correct horse battery",100000);expect(JSON.stringify(bundle)).not.toContain(fixture.apiKey);expect(await unwrapRecovery(bundle,"correct horse battery")).toEqual(fixture);});
  it("rejects an incorrect password without modifying any external state",async()=>{const bundle=await wrapRecovery(fixture,"correct horse battery",100000);await expect(unwrapRecovery(bundle,"incorrect password")).rejects.toThrow();});
  it("rejects weak passwords and unsafe KDF metadata",async()=>{await expect(wrapRecovery(fixture,"short")).rejects.toThrow(/10/);const bundle=await wrapRecovery(fixture,"correct horse battery",100000);bundle.kdf.iterations=1;await expect(unwrapRecovery(bundle,"correct horse battery")).rejects.toThrow(/Unsupported/);});
});
