// One-off: pull the <style> block out of an existing card page into assets/card.css
import { readFileSync, writeFileSync } from "node:fs";

const [, , src, out] = process.argv;
const html = readFileSync(src, "utf8");
const m = html.match(/<style>([\s\S]*?)<\/style>/);
if (!m) throw new Error("no <style> block in " + src);
const css = m[1].trim();
writeFileSync(out, css + "\n");
console.log(`css bytes=${css.length} lines=${css.split("\n").length} -> ${out}`);
