import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const oldCss =
  "    iframe { width: min(760px, 92vw); min-height: 48vh; border: 0; border-radius: 12px; }";
const newCss = `    .culture-video { width: min(760px, 92vw); margin: 0 auto 24px; }
    .culture-video__frame { position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; background: #111; }
    .culture-video__frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }`;
const extraAttrs =
  ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"';

let count = 0;
for (const file of fs.readdirSync(root)) {
  if (!file.startsWith("annex-") || !file.endsWith(".html")) continue;
  const fp = path.join(root, file);
  let html = fs.readFileSync(fp, "utf8");
  if (!html.includes("<iframe")) continue;
  html = html.replace(oldCss, newCss);
  html = html.replace(
    /<section><iframe([^>]*)><\/iframe><\/section>/g,
    (_match, attrs) => {
      let a = attrs;
      if (!a.includes("allow=")) {
        a += extraAttrs;
      }
      return `<section class="culture-video"><div class="culture-video__frame"><iframe${a}></iframe></div></section>`;
    },
  );
  fs.writeFileSync(fp, html, "utf8");
  count += 1;
}
console.log(`Patched ${count} annex file(s)`);
