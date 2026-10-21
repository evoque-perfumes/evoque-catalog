#!/usr/bin/env node
/*
 * يبني بطاقة مكونات واحدة لكل عطر: assets/cards/<id>.webp  (1080x1350)
 * المصدر: data.json فقط — ما نخترع أي معلومة. إذا العطر ما عنده مكونات/ثبات… البطاقة تعرض اللي موجود بس.
 *
 * التشغيل:   cd scripts && npm install && node build-note-cards.js [--id=<perfume-id>] [--force]
 *  - بدون --force يتجاوز البطاقات اللي بياناتها ما تغيّرت (بصمة hash داخل assets/cards/.manifest.json).
 *  - قابل لإعادة التشغيل بأي وقت.
 */
const fs = require("fs"), path = require("path"), crypto = require("crypto");
let chromium; try { ({ chromium } = require("playwright")); } catch (e) { ({ chromium } = require("/opt/npm-tools/node_modules/playwright")); }
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "assets", "cards");
const MANIFEST = path.join(OUT, ".manifest.json");
const args = process.argv.slice(2);
const ONLY = (args.find(a => a.startsWith("--id=")) || "").slice(5);
const FORCE = args.includes("--force");

// ---- قاموس الترجمة نفسه المستخدم بالموقع (من assets/catalog.js) ----
const src = fs.readFileSync(path.join(ROOT, "assets", "catalog.js"), "utf8");
const a = src.indexOf("const TERM_AR = {");
const b = src.indexOf("function applyTermDict");
const bEnd = src.indexOf("\n}\n", b) + 3;
const tr = new Function(src.slice(a, bEnd) + "\nreturn applyTermDict;")();
const arText = (t) => (t ? tr(t).replace(/\s*;\s*/g, "؛ ").replace(/\s*,\s*/g, "، ") : "");

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const font = (f) => "data:font/woff2;base64," + fs.readFileSync(path.join(__dirname, "fonts", f)).toString("base64");
const logoSvg = fs.readFileSync(path.join(ROOT, "assets", "brand", "evoque-logo-horizontal-transparent.svg"), "utf8");
const logoUri = "data:image/svg+xml;base64," + Buffer.from(logoSvg).toString("base64");

const SILLAGE_AR = { strong: "قوي", moderate: "متوسط", light: "خفيف", enormous: "هائل", "very strong": "قوي جدًا" };
function longevityParts(p){
  const m = String(p.longevity || "").match(/(\d+)/);
  return m ? { en: m[1] + " hours", ar: m[1] + " ساعات" } : null;
}
function sillageParts(p){
  const s = String(p.sillage || "").trim(); if (!s) return null;
  return { en: s, ar: SILLAGE_AR[s.toLowerCase()] || arText(s) };
}

function html(p){
  const title = p.displayName || p.name;
  const inspired = p.inspiredBy || [p.brand, p.name].filter(Boolean).join(" ");
  // مكونات: نعرض الهرم (أعلى/قلب/قاعدة) فقط لو البيانات موجودة، وإلا قائمة وحدة "المكونات"
  const tiers = [];
  const add = (en, ar, labEn, labAr) => { if (en) tiers.push({ en, ar: ar || arText(en), labEn, labAr }); };
  if (p.notesMid || p.notesBase) {
    add(p.notesTop, p.notesTopAR, "Top", "القمة"); add(p.notesMid, p.notesMidAR, "Heart", "القلب"); add(p.notesBase, p.notesBaseAR, "Base", "القاعدة");
  } else add(p.notesTop, p.notesTopAR, "Notes", "المكونات");
  const notesHtml = tiers.map(t => `<div class="blk"><div class="lab"><span class="ar">${esc(t.labAr)}</span><span class="en">${esc(t.labEn)}</span></div>
      <div class="val ar">${esc(t.ar)}</div><div class="val en">${esc(t.en)}</div></div>`).join("");
  const accords = p.accords ? `<div class="blk"><div class="lab"><span class="ar">الأكوردات</span><span class="en">Accords</span></div>
      <div class="val ar">${esc(p.accordsAR || arText(p.accords))}</div><div class="val en">${esc(p.accords)}</div></div>` : "";
  const lg = longevityParts(p), sl = sillageParts(p);
  const stat = (lab, labEn, v) => v ? `<div class="stat"><div class="lab"><span class="ar">${lab}</span><span class="en">${labEn}</span></div><div class="sv ar">${esc(v.ar)}</div><div class="sv en">${esc(v.en)}</div></div>` : "";
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:T;font-weight:400;src:url("${font("ibm-plex-sans-arabic-arabic-400-normal.woff2")}")}
@font-face{font-family:T;font-weight:500;src:url("${font("ibm-plex-sans-arabic-arabic-500-normal.woff2")}")}
@font-face{font-family:T;font-weight:700;src:url("${font("ibm-plex-sans-arabic-arabic-700-normal.woff2")}")}
@font-face{font-family:M;font-weight:700;src:url("${font("el-messiri-arabic-700-normal.woff2")}")}
@font-face{font-family:C;font-weight:600;src:url("${font("cormorant-garamond-latin-600-normal.woff2")}")}
@font-face{font-family:J;font-weight:400;src:url("${font("jost-latin-400-normal.woff2")}")}
@font-face{font-family:J;font-weight:500;src:url("${font("jost-latin-500-normal.woff2")}")}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1350px;background:#F5F3EE;color:#18231F;font-family:T,J,sans-serif;position:relative;overflow:hidden}
.wrap{position:absolute;inset:0;padding:96px 110px 80px;display:flex;flex-direction:column;align-items:center}
.logo{width:380px;height:auto;display:block}
.rule{width:120px;height:2px;background:#B8653F;margin:44px 0 52px}
h1{font-family:${/[؀-ۿ]/.test(title) ? "M" : "C"},T,sans-serif;font-weight:${/[؀-ۿ]/.test(title) ? 700 : 600};font-size:${title.length > 22 ? 66 : 82}px;line-height:1.15;text-align:center;color:#1F3D33;max-width:860px}
.insp{margin-top:20px;font-size:27px;color:#56625B;text-align:center;font-weight:400}
.insp span{font-family:J,T,sans-serif}
.body{margin-top:62px;width:100%;display:flex;flex-direction:column;gap:34px}
.blk{text-align:center}
.lab{display:flex;justify-content:center;gap:16px;font-size:23px;color:#56625B;letter-spacing:.5px;margin-bottom:10px}
.lab .en{font-family:J,sans-serif;text-transform:uppercase;letter-spacing:3px;font-size:19px;align-self:center}
.val{font-size:31px;line-height:1.5;font-weight:500}
.val.en{font-family:J,sans-serif;font-size:25px;color:#56625B;font-weight:400;direction:ltr;margin-top:2px}
.stats{margin-top:auto;width:100%;display:flex;justify-content:center;gap:120px;padding-top:30px;border-top:1px solid #CBD8C6}
.stat{text-align:center}.sv{font-size:34px;font-weight:700;color:#1F3D33}.sv.en{font-family:J,sans-serif;font-size:23px;color:#56625B;font-weight:400;direction:ltr}
.foot{margin-top:34px;font-size:19px;color:#56625B;text-align:center;line-height:1.6;max-width:820px}
</style></head><body><div class="wrap">
<img class="logo" src="${logoUri}" alt="">
<div class="rule"></div>
<h1>${esc(title)}</h1>
<div class="insp">مستوحى من <span dir="ltr">${esc(inspired)}</span></div>
<div class="body">${notesHtml}${accords}</div>
<div class="stats">${stat("الثبات", "Longevity", lg)}${stat("الفوحان", "Sillage", sl)}</div>
<div class="foot">انطباع عطري مستوحى — ليس العطر الأصلي، وإيفوك غير تابعة لأي علامة تجارية</div>
</div></body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
  const list = (Array.isArray(data) ? data : data.perfumes || []).filter(p => !ONLY || p.id === ONLY);
  let manifest = {}; try { manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8")); } catch (e) {}
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  let made = 0, skipped = 0;
  for (const p of list) {
    const h = html(p);
    const hash = crypto.createHash("sha1").update(h).digest("hex");
    const file = path.join(OUT, p.id + ".webp");
    if (!FORCE && manifest[p.id] === hash && fs.existsSync(file)) { skipped++; continue; }
    await page.setContent(h, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot({ type: "png" });
    await sharp(png).webp({ quality: 82, effort: 5 }).toFile(file);
    manifest[p.id] = hash; made++;
  }
  // نظّف بطاقات عطور انحذفت من data.json
  const ids = new Set((Array.isArray(data) ? data : data.perfumes || []).map(p => p.id));
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".webp") && !ids.has(f.slice(0, -5)) && !ONLY) { fs.unlinkSync(path.join(OUT, f)); delete manifest[f.slice(0, -5)]; }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  await browser.close();
  console.log(`cards: ${made} built, ${skipped} unchanged, total ${list.length}`);
})();
