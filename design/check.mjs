#!/usr/bin/env node
// Bộ kiểm tĩnh cho bản demo design/ — không dependency ngoài Node lõi.
// Dùng: node design/check.mjs --stage=1|2|3

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DESIGN = __dirname;

const args = process.argv.slice(2);
const stageArg = args.find((a) => a.startsWith("--stage="));
const stage = stageArg ? Number(stageArg.split("=")[1]) : 3;

const errors = [];

const STAGE1_FILES = [
  "design/assets/tokens.css",
  "design/assets/app.css",
  "design/assets/app.js",
  "design/assets/data.js",
  "design/styleguide.html",
  "design/dang-nhap.html",
  "design/doi-mat-khau.html",
  "design/khong-du-quyen.html",
  "design/README.md",
  "design/check.mjs",
];

const STAGE2_FILES = [
  "design/nhap-kho.html",
  "design/nhap-kho-chi-tiet.html",
  "design/dat-hang.html",
  "design/dat-hang-chi-tiet.html",
  "design/xuat-kho.html",
  "design/xuat-kho-chi-tiet.html",
  "design/tra-hang.html",
  "design/tra-hang-chi-tiet.html",
  "design/in-phieu.html",
];

const STAGE3_FILES = [
  "design/index.html",
  "design/danh-muc.html",
  "design/danh-muc-chi-tiet.html",
  "design/doi-tac.html",
  "design/doi-tac-chi-tiet.html",
  "design/ton-kho.html",
  "design/the-kho.html",
  "design/kiem-ke.html",
  "design/chuyen-kho.html",
  "design/bao-cao.html",
  "design/cai-dat.html",
];

let expected = STAGE1_FILES.slice();
if (stage >= 2) expected = expected.concat(STAGE2_FILES);
if (stage >= 3) expected = expected.concat(STAGE3_FILES);

// (1) File kỳ vọng tồn tại
for (const rel of expected) {
  if (!existsSync(path.join(ROOT, rel))) {
    errors.push(`Thiếu file: ${rel}`);
  }
}

function walk(dir, exts) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full, exts));
    } else if (exts.some((e) => entry.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

const allDesignFiles = existsSync(DESIGN) ? walk(DESIGN, [".html", ".css", ".js"]) : [];
const htmlFiles = allDesignFiles.filter((f) => f.endsWith(".html"));

// (2) Cấm URL ngoài / module / fetch / XHR / @import url(
const BANNED_PATTERNS = [
  { re: /https?:\/\//g, name: "URL ngoài (http/https)" },
  { re: /type\s*=\s*["']module["']/g, name: 'type="module"' },
  { re: /\bfetch\s*\(/g, name: "fetch(" },
  { re: /XMLHttpRequest/g, name: "XMLHttpRequest" },
  { re: /@import\s+url\(/g, name: "@import url(" },
];

for (const file of allDesignFiles) {
  const rel = path.relative(ROOT, file);
  // README.md được phép nhắc tới http:// trong văn bản giải thích.
  if (rel.endsWith("README.md")) continue;
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    // Bỏ qua namespace SVG chuẩn — không phải URL mạng thật.
    if (line.includes('xmlns="http://www.w3.org/2000/svg"')) return;
    for (const pat of BANNED_PATTERNS) {
      pat.re.lastIndex = 0;
      if (pat.re.test(line)) {
        errors.push(`${rel}:${i + 1} — chứa mẫu bị cấm: ${pat.name}`);
      }
    }
  });
}

// (3) Mọi .html phải nạp đủ asset + meta cơ bản
for (const file of htmlFiles) {
  const rel = path.relative(ROOT, file);
  const content = readFileSync(file, "utf8");
  const required = [
    ["assets/tokens.css", /assets\/tokens\.css/],
    ["assets/app.css", /assets\/app\.css/],
    ["assets/data.js", /assets\/data\.js/],
    ["assets/app.js", /assets\/app\.js/],
    ['<meta name="viewport"', /<meta name="viewport"/],
    ['lang="vi"', /lang="vi"/],
    ["data-page", /data-page=/],
  ];
  for (const [label, re] of required) {
    if (!re.test(content)) errors.push(`${rel} — thiếu ${label}`);
  }
}

// (4) stage=3: link nội bộ không gãy (kể cả chuỗi "xxx.html" trong app.js)
if (stage >= 3) {
  const existingHtml = new Set(htmlFiles.map((f) => path.basename(f)));
  const hrefRe = /href\s*=\s*["']([^"'#?]+\.html)(?:[?#][^"']*)?["']/g;
  for (const file of htmlFiles) {
    const rel = path.relative(ROOT, file);
    const content = readFileSync(file, "utf8");
    let m;
    while ((m = hrefRe.exec(content))) {
      const target = m[1];
      if (target.startsWith("http")) continue;
      if (!existingHtml.has(target)) {
        errors.push(`${rel} — link nội bộ gãy: ${target}`);
      }
    }
  }
  const appJsPath = path.join(DESIGN, "assets", "app.js");
  if (existsSync(appJsPath)) {
    const content = readFileSync(appJsPath, "utf8");
    const strRe = /["'`]([a-zA-Z0-9_-]+\.html)["'`]/g;
    let m;
    while ((m = strRe.exec(content))) {
      if (!existingHtml.has(m[1])) {
        errors.push(`design/assets/app.js — link nội bộ gãy: ${m[1]}`);
      }
    }
  }
}

// (5) node --check cho app.js và data.js
for (const rel of ["design/assets/app.js", "design/assets/data.js"]) {
  const full = path.join(ROOT, rel);
  if (!existsSync(full)) continue;
  try {
    execFileSync(process.execPath, ["--check", full], { stdio: "pipe" });
  } catch (e) {
    errors.push(`${rel} — lỗi cú pháp JS: ${e.message}`);
  }
}

// (6) git status chỉ có thay đổi trong design/ và .planning/
try {
  const out = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
  const bad = out
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .filter((l) => {
      const p = l.slice(3).trim();
      return !(p.startsWith("design/") || p.startsWith(".planning/"));
    });
  if (bad.length > 0) {
    errors.push("git status có thay đổi ngoài design/ và .planning/:\n  " + bad.join("\n  "));
  }
} catch (e) {
  errors.push("Không chạy được git status: " + e.message);
}

if (errors.length > 0) {
  console.error(`check.mjs (stage=${stage}) THẤT BẠI — ${errors.length} lỗi:\n`);
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
} else {
  console.log(`check.mjs (stage=${stage}) OK — không có lỗi.`);
  process.exit(0);
}
