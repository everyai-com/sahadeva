import { describe, expect, it } from "vitest";
import {
  lalKitabPublicationGate,
  lalKitabRuleCandidateSchema,
} from "./lalKitabRule";

describe("Lal Kitab atomic rule contract", () => {
  it("keeps an extracted planet-house claim unpublished", () => {
    const candidate = lalKitabRuleCandidateSchema.parse({
      id: "lk-jupiter-1-draft-1",
      version: 1,
      tradition: "lal-kitab-gosvami-1952",
      sourceLocator: "book-gosvami-lal-kitab:L7748-L7862",
      sourceScanVerification: "not-checked",
      claimType: "observation",
      conditions: [{ kind: "planet-in-house", planet: "Jupiter", house: 1 }],
      normalizedClaim: "Extraction placeholder awaiting scan verification.",
      originalWordingStoredInternally: false,
      harmClass: "general-cultural",
      disclosureMode: "ordinary-cultural",
      cautionRequired: false,
      uncertaintyRequired: true,
      practicalSupportRequired: false,
      automaticOutputAllowed: false,
      reviewStatus: "extraction-draft",
      reviewerIds: [],
      contradictionIds: [],
      notes: [],
    });
    expect(lalKitabPublicationGate(candidate).publishable).toBe(false);
  });

  it("permits reviewed high-impact material only through controlled disclosure", () => {
    const candidate = lalKitabRuleCandidateSchema.parse({
      id: "lk-sensitive-source-context",
      version: 1,
      tradition: "lal-kitab-gosvami-1952",
      sourceLocator: "book-gosvami-lal-kitab:L7149-L7469",
      sourceScanVerification: "adjudicated",
      claimType: "observation",
      conditions: [{ kind: "planet-in-house", planet: "Saturn", house: 8 }],
      normalizedClaim: "Reviewed historical claim presented with uncertainty.",
      originalWordingStoredInternally: true,
      harmClass: "high-impact-restricted",
      disclosureMode: "source-context-only",
      cautionRequired: true,
      uncertaintyRequired: true,
      practicalSupportRequired: true,
      automaticOutputAllowed: false,
      reviewStatus: "publishable",
      reviewerIds: ["reviewer-a", "reviewer-b"],
      contradictionIds: [],
      notes: [],
    });
    const gate = lalKitabPublicationGate(candidate);
    expect(gate.publishableForControlledDisclosure).toBe(true);
    expect(gate.publishable).toBe(false);
  });
});
