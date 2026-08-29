import { describe, expect, it } from "vitest";
import { balancedObject, chooseTrack, collectVideos, extractAssignedJson, playlistIdFromUrl } from "../extension/background.js";

describe("YouTube data parsing", () => {
  it("extracts assigned JSON without stopping at braces inside strings", () => {
    const source = 'var ytInitialData = {"title":"a } brace","items":[1,2]}; next();';
    expect(extractAssignedJson(source, "ytInitialData")).toEqual({ title: "a } brace", items: [1, 2] });
    expect(balancedObject(source, source.indexOf("{"))).toBe('{"title":"a } brace","items":[1,2]}');
  });

  it("reads modern lockup playlist entries", () => {
    const root = { contents: [{ lockupViewModel: { contentId: "video1", contentType: "LOCKUP_CONTENT_TYPE_VIDEO", metadata: { lockupMetadataViewModel: { title: { content: "Modern title" }, metadata: { contentMetadataViewModel: { metadataRows: [{ metadataParts: [{ text: { content: "Modern channel" } }] }] } } } } } }] };
    expect(collectVideos(root)).toEqual([{ id: "video1", title: "Modern title", url: "https://www.youtube.com/watch?v=video1", channel: "Modern channel" }]);
  });

  it("prefers a requested manual track over automatic captions", () => {
    const tracks = [
      { languageCode: "en", kind: "asr" },
      { languageCode: "en-US" },
      { languageCode: "te" },
    ];
    expect(chooseTrack(tracks, ["en"], true)).toBe(tracks[1]);
    expect(chooseTrack(tracks, ["te"], false)).toBe(tracks[2]);
  });

  it("accepts watch and playlist URLs containing a list parameter", () => {
    expect(playlistIdFromUrl("https://youtube.com/watch?v=x&list=PL123")).toBe("PL123");
    expect(playlistIdFromUrl("not a url")).toBeNull();
  });
});
