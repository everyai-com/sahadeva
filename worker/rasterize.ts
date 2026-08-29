import { Resvg, initWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";

let ready: Promise<void> | undefined;

export async function rasterizeSvg(svg: string, width: number) {
  ready ??= initWasm(resvgWasm);
  await ready;
  const renderer = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "#f7f3e8",
  });
  const rendered = renderer.render();
  const png = rendered.asPng();
  rendered.free();
  renderer.free();
  return png;
}
