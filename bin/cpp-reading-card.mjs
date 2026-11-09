#!/usr/bin/env node
/**
 * cpp-reading-card — 把一张「函数阅读卡」JSON 渲染成单文件 HTML。
 *
 *   node bin/cpp-reading-card.mjs card.json [-o out.html] [--css assets/card.css]
 *                                           [--src-root <源码根目录>] [--stdout]
 *
 * 零依赖，只在构建期读一次源码（code 段落按行号切片），产出的 HTML 自带样式，
 * 双击即可打开，不联网、不引外部资源。
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve, basename, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CSS = resolve(HERE, "..", "assets", "card.css");
const VERSION = "0.1.0";
const KINDS = ["invariant", "lanes", "table", "compare", "gates", "code", "checklist"];

/* ------------------------------------------------------------------ helpers */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 一个单元格可以是字符串（HTML 片段）或 { html, cls }。 */
function td(cell) {
  if (cell && typeof cell === "object") return `<td${cell.cls ? ` class="${cell.cls}"` : ""}>${cell.html}</td>`;
  return `<td>${cell ?? ""}</td>`;
}

function readCss(p) {
  if (!existsSync(p)) throw new Error(`样式文件不存在：${p}\n（用 --css 指定，或确认 assets/card.css 还在）`);
  return readFileSync(p, "utf8");
}

/* ----------------------------------------------------------------- sections */

function renderInvariant(s) {
  const rows = (s.rows || [])
    .map((r) => {
      const slots = (r.cells || [])
        .map((c) => {
          if (typeof c !== "object") return `<div class="slot">${c}</div>`;
          const cls = ["slot", c.hi && "hi", c.empty && "null"].filter(Boolean).join(" ");
          const text = c.text ?? (c.empty ? "·" : "");
          return `<div class="${cls}">${text}</div>`;
        })
        .join("");
      return `      <div class="inv-row">
        <div class="inv-label">${r.label}</div>
        <div class="slots">${slots}</div>
      </div>`;
    })
    .join("\n");
  const note = s.note ? `\n      <p class="inv-note">${s.note}</p>` : "";
  return `    <div class="inv">\n${rows}${note}\n    </div>`;
}

function renderLanes(s) {
  const heads = s.heads || ["读（隐式输入）", "调用链", "写（隐式输出）"];
  const steps = (s.steps || []).map((st, i) => {
    const cls = ["card", st.kind === "gate" && "gate", st.kind === "opt" && "opt"].filter(Boolean).join(" ");
    const tag = st.tag ? `\n          <span class="tag${st.tagKind === "ret" ? " ret" : ""}">${st.tag}</span>` : "";
    const body = st.body ? `\n          <p>${st.body}</p>` : "";
    const arrow = i === s.steps.length - 1 ? "" : `\n        <div class="arrow">▼</div>`;
    return `    <div class="row">
      <div class="cell read side">${st.read ?? ""}</div>
      <div class="cell">
        <div class="${cls}">
          <div class="num">${st.n ?? i + 1}</div>
          <div class="call">${st.call}</div>${body}${tag}
        </div>${arrow}
      </div>
      <div class="cell write side">${st.write ?? ""}</div>
    </div>`;
  });
  const head = `    <div class="lanes-head"><span>${heads[0]}</span><span>${heads[1]}</span><span>${heads[2]}</span></div>`;
  return [head, ...steps].join("\n\n");
}

function renderTable(s) {
  const cols = (s.cols || [])
    .map((c) => `<th${c.width ? ` style="width:${c.width}"` : ""}>${c.label}</th>`)
    .join("");
  const rows = (s.rows || [])
    .map((r) => `\n        <tr>${r.map(td).join("")}</tr>`)
    .join("");
  const note = s.note ? `\n    <p class="sub" style="margin-top:12px">${s.note}</p>` : "";
  return `    <table>
      <thead>
        <tr>${cols}</tr>
      </thead>
      <tbody>${rows}
      </tbody>
    </table>${note}`;
}

function renderCompare(s) {
  const head = `<tr><th style="width:18%">${s.aspectLabel || "对照点"}</th><th class="a">${s.a}</th><th class="b">${s.b}</th></tr>`;
  const rows = (s.rows || [])
    .map((r) => `\n        <tr${r.diff ? ' class="diff"' : ""}><td>${r.aspect}</td>${td(r.a)}${td(r.b)}</tr>`)
    .join("");
  const note = s.note ? `\n    <p class="sub" style="margin-top:12px">${s.note}</p>` : "";
  return `    <table class="cmp">
      <thead>${head}</thead>
      <tbody>${rows}
      </tbody>
    </table>${note}`;
}

function renderGates(s) {
  const items = (s.items || [])
    .map((g) => {
      const tone = g.tone === "ok" ? "ok" : "warn";
      return `      <div class="card ${tone}">
        <div class="big">${g.value}</div>
        <div class="cap"><b>${g.label}</b>${g.desc ? `<br>${g.desc}` : ""}</div>
      </div>`;
    })
    .join("\n");
  const note = s.note ? `\n    <p class="sub" style="margin-top:14px">${s.note}</p>` : "";
  return `    <div class="gates">\n${items}\n    </div>${note}`;
}

function renderCode(s, ctx) {
  const file = s.file || ctx.meta.sourceFile;
  if (!file) return `    <div class="src"><div class="src-warn">这段没有指定源码文件，无法切片。</div></div>`;

  const abs = resolve(ctx.srcRoot, file);
  const label = relative(ctx.srcRoot, abs).split(sep).join("/");
  let lines;
  try {
    lines = readFileSync(abs, "utf8").split(/\r?\n/);
  } catch (e) {
    return `    <div class="src"><div class="src-head"><span class="path">${label}</span><span>行 ${s.start}–${s.end}</span></div>
      <div class="src-warn">读取源码失败：${esc(e.message)}<br>用 <code>--src-root</code> 指向源码根目录，或修改卡片里的 <code>file</code> / <code>meta.srcRoot</code>。</div></div>`;
  }

  const start = s.start ?? 1;
  const end = s.end ?? lines.length;
  if (start < 1 || end > lines.length || start > end)
    throw new Error(`code 段落行号越界：${label} 共 ${lines.length} 行，请求 ${start}–${end}`);

  const marks = s.marks || {};
  const notes = s.notes || {};
  const out = [];
  let blank = false;
  for (let n = start; n <= end; n++) {
    const text = lines[n - 1];
    if (!text.trim()) {
      if (blank) continue;
      blank = true;
      out.push(`      <div class="cl"><span class="ln"></span><span class="cd"></span></div>`);
      continue;
    }
    blank = false;
    const m = marks[String(n)] || "";
    const cd = esc(text).replace(/\t/g, "    ");
    out.push(
      `      <div class="cl${m ? " m-" + m : ""}"><span class="ln">${n}</span><span class="cd">${cd}</span></div>`
    );
    if (notes[String(n)]) out.push(`      <div class="cl-note${m ? " " + m : ""}">${notes[String(n)]}</div>`);
  }

  const legend = `<span class="lg"><i class="r"></i>读</span>
        <span class="lg"><i class="w"></i>写</span>
        <span class="lg"><i class="g"></i>门 / return</span>
        <span class="lg"><i class="o"></i>下钻调用</span>`;
  return `    <div class="src">
      <div class="src-head">
        <span class="path">${label}</span>
        <span>行 ${start}–${end}</span>
        ${legend}
      </div>
      <div class="srclines">
${out.join("\n")}
      </div>
    </div>`;
}

function renderChecklist(s) {
  const items = (s.items || []).map((q) => `      <li>${q}</li>`).join("\n");
  return `    <ol class="q">\n${items}\n    </ol>`;
}

const RENDERERS = {
  invariant: renderInvariant,
  lanes: renderLanes,
  table: renderTable,
  compare: renderCompare,
  gates: renderGates,
  code: renderCode,
  checklist: renderChecklist,
};

/* --------------------------------------------------------------------- page */

function renderCard(card, ctx) {
  const meta = card.meta || {};
  const h1 = meta.returnType
    ? `<span class="tok">${meta.returnType}</span> ${meta.signature ?? ""}`
    : meta.signature ?? "";

  const badges = (meta.badges || [])
    .map((b) => `<span class="badge${b.kind ? " " + b.kind : ""}">${b.text}</span>`)
    .join("\n      ");
  const related = (meta.related || [])
    .map((r) => `<a class="badge a" href="${r.href}">${r.label}</a>`)
    .join("\n      ");

  const sections = (card.sections || [])
    .map((sec, i) => {
      const fn = RENDERERS[sec.kind];
      if (!fn)
        throw new Error(
          `第 ${i + 1} 个 section 的 kind 是 "${sec.kind}"，不认识。可用：${KINDS.join(", ")}`
        );
      const sub = sec.sub ? `\n    <p class="sub">${sec.sub}</p>` : "";
      return `  <section>
    <h2><span class="n">${String(i + 1).padStart(2, "0")}</span>${sec.title || ""}</h2>${sub}

${fn(sec, ctx)}
  </section>`;
    })
    .join("\n\n");

  const css = ctx.css;
  const footer = meta.footer || "";

  return `<!DOCTYPE html>
<html lang="${meta.lang || "zh-CN"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.pageTitle || meta.signature || "reading card")}</title>
<meta name="generator" content="cpp-reading-card ${VERSION}">
<style>
${css}
</style>
</head>
<body>
<div class="wrap">

  <header>
    <div class="eyebrow">${meta.eyebrow ?? ""}</div>
    <h1>${h1}</h1>
    <p class="lede">${meta.summary ?? ""}</p>
    <div class="badges">
      ${badges}${related ? "\n      " + related : ""}
    </div>
  </header>

${sections}

  <footer>
    ${footer}
  </footer>
</div>
</body>
</html>
`;
}

/* ---------------------------------------------------------------------- cli */

function usage() {
  console.log(`cpp-reading-card ${VERSION} — 把函数阅读卡 JSON 渲染成单文件 HTML

用法：
  node bin/cpp-reading-card.mjs <card.json> [选项]

选项：
  -o, --out <file>      输出路径（默认与输入同名 .html）
      --css <file>      自定义样式（默认 assets/card.css）
      --src-root <dir>  源码根目录，供 code 段落按行号切片
      --stdout          输出到标准输出，不写文件
  -h, --help            显示帮助
  -v, --version         显示版本

section kind：${KINDS.join(" · ")}`);
}

function main() {
  const argv = process.argv.slice(2);
  let input = null, out = null, cssPath = DEFAULT_CSS, srcRoot = null, toStdout = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o" || a === "--out") out = argv[++i];
    else if (a === "--css") cssPath = argv[++i];
    else if (a === "--src-root") srcRoot = argv[++i];
    else if (a === "--stdout") toStdout = true;
    else if (a === "-h" || a === "--help") return usage();
    else if (a === "-v" || a === "--version") return console.log(VERSION);
    else if (a.startsWith("-")) throw new Error(`未知选项：${a}（-h 看用法）`);
    else input = a;
  }

  if (!input) {
    usage();
    process.exitCode = 1;
    return;
  }

  const cardPath = resolve(input);
  let card;
  try {
    card = JSON.parse(readFileSync(cardPath, "utf8"));
  } catch (e) {
    throw new Error(`读不了卡片 ${input}：${e.message}`);
  }

  const meta = card.meta || {};
  const root = srcRoot
    ? resolve(srcRoot)
    : meta.srcRoot
      ? resolve(dirname(cardPath), meta.srcRoot)
      : dirname(cardPath);
  const ctx = { meta, srcRoot: root, css: readCss(cssPath) };

  const html = renderCard(card, ctx);

  if (toStdout) {
    process.stdout.write(html);
    return;
  }
  const finalDest = out ? resolve(out) : cardPath.replace(/\.json$/i, "") + ".html";
  writeFileSync(finalDest, html, "utf8");
  const n = (card.sections || []).length;
  console.log(`✓ ${relative(process.cwd(), finalDest) || finalDest}  (${n} sections, ${(html.length / 1024).toFixed(1)} KB)`);
}

try {
  main();
} catch (e) {
  console.error("✗ " + e.message);
  process.exitCode = 1;
}
