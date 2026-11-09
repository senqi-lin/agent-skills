// Temporary: structural balance check of a rendered card (no deps).
import { readFileSync } from "node:fs";

const file = process.argv[2];
const html = readFileSync(file, "utf8");
const body = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");

const VOID = new Set(["br", "hr", "img", "meta", "link", "input", "source"]);
const stack = [];
const errors = [];
const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g;
let m;
while ((m = re.exec(body))) {
  const [raw, close, name, attrs] = m;
  const tag = name.toLowerCase();
  if (VOID.has(tag) || attrs.trim().endsWith("/")) continue;
  const line = body.slice(0, m.index).split("\n").length;
  if (close) {
    const top = stack.pop();
    if (top?.tag !== tag) errors.push(`line ${line}: </${tag}> closes <${top?.tag ?? "nothing"}> (opened line ${top?.line ?? "?"})`);
  } else {
    stack.push({ tag, line });
  }
}
for (const s of stack) errors.push(`unclosed <${s.tag}> opened at line ${s.line}`);

const count = (re) => (body.match(re) || []).length;
console.log(`file            ${file}`);
console.log(`elements        ${count(/<[a-zA-Z]/g)}`);
console.log(`lanes rows      ${count(/<div class="row">/g)}`);
console.log(`code lines      ${count(/<div class="cl/g)}`);
console.log(`marked lines    ${count(/<div class="cl m-/g)}`);
console.log(`compare rows    ${count(/<tr class="diff">/g)}`);
console.log(`src-warn blocks ${count(/class="src-warn"/g)}`);
console.log(`sections        ${count(/<section>/g)}`);
console.log(errors.length ? `\nBALANCE ERRORS (${errors.length}):\n` + errors.slice(0, 12).join("\n") : "\nbalance ok");
