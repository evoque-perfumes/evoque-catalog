// build-catalog-json.js
// يبني ملف data.json بجذر الريبو من شيت "Evoque - Public Catalog (Website Source)".
// نفس منطق القراءة والتحويل الموجود بدالة loadPerfumesFromSheet() داخل index.html —
// أي تعديل مستقبلي على أعمدة الشيت أو طريقة القراءة بـ index.html لازم ينعكس هنا كمان.
//
// يشتغل عبر GitHub Action (.github/workflows/update-catalog.yml) كل 20 دقيقة، بدون أي
// مفاتيح API — يقرأ نفس رابط CSV العام (gviz/tq) اللي يقرأه المتصفح مباشرة.

const fs = require("fs");
const path = require("path");

const SHEET_ID = "1UT6Ej7xH0Fsnm91sDwsZQR-dFiIRSEHP3Vzy8TNiXC0"; // Evoque - Public Catalog (Website Source)
const SHEET_TAB = "Sheet1";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TAB)}`;
const OUTPUT_PATH = path.join(__dirname, "..", "data.json");

function driveDirectImageUrl(link) {
  if (!link) return "";
  const m = link.match(/[-\w]{25,}/);
  return m ? `https://drive.google.com/thumbnail?id=${m[0]}&sz=w1000` : link;
}

/* ===== الصور المستضافة محليًا (22 أغسطس 2026) =====
   بدل الاعتماد الدائم على Google Drive (بطيء وغير موثوق تحت الضغط)، نبني أول شي
   اسم ملف متوقع لكل عطر (براند + اسم، بأحرف صغيرة وشرطات) ونتأكد هل فيه صورة
   مرفوعة فعليًا بمجلد assets/perfumes/ بهذا الاسم. لو موجودة نستخدمها (مسار محلي —
   أسرع بكثير ويستفيد من نفس الكاش اللي يستخدمه باقي الموقع). لو مو موجودة بعد،
   نرجع تلقائيًا لرابط Google Drive القديم — نفس عطر ما ينكسر عرضه لحد ما تُرفع صورته.
   نفس منطق التوليد هذا لازم يتطابق تمامًا مع أي قائمة أسماء ملفات نعطيها لصاحب
   الموقع — لا تغيّره هنا بدون ما تحدّث القائمة المعطاة له. */
const PERFUMES_IMG_DIR = path.join(__dirname, "..", "assets", "perfumes");
const IMG_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function slugify(brand, name) {
  let s = `${brand} ${name}`.trim().toLowerCase();
  s = s.normalize("NFKD").replace(/[̀-ͯ]/g, ""); // فصل الحروف عن علامات التشكيل الملحقة بيها (é -> e)
  s = s.replace(/[^a-z0-9؀-ۿ]+/g, "-");
  s = s.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s;
}

function localImagePath(brand, name) {
  if (!fs.existsSync(PERFUMES_IMG_DIR)) return null;
  const slug = slugify(brand, name);
  for (const ext of IMG_EXTENSIONS) {
    if (fs.existsSync(path.join(PERFUMES_IMG_DIR, slug + ext))) {
      return `assets/perfumes/${slug}${ext}`;
    }
  }
  return null;
}

function resolveImage(brand, name, driveLink) {
  return localImagePath(brand, name) || driveDirectImageUrl(driveLink);
}

// محلّل CSV بسيط يدعم الحقول المحاطة بعلامات اقتباس (فيها فواصل) — مطابق لنفس الدالة بـ index.html
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && next === '\n') i++;
        row.push(field); field = "";
        if (row.some(v => v !== "")) rows.push(row);
        row = [];
      } else { field += c; }
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function seasonsFromText(text) {
  const t = (text || "").toLowerCase();
  const out = [];
  if (t.includes("all")) out.push("all");
  if (t.includes("summer")) out.push("summer");
  if (t.includes("winter")) out.push("winter");
  if (t.includes("spring")) out.push("spring");
  if (t.includes("autumn") || t.includes("fall")) out.push("autumn");
  return out;
}

function daynightFromText(text) {
  const t = (text || "").toLowerCase();
  const out = [];
  if (t.includes("day")) out.push("day");
  if (t.includes("night")) out.push("night");
  return out;
}

function genderKeyFromText(text) {
  const t = (text || "").toLowerCase().trim();
  if (!t) return "";
  if (t.includes("unisex") || t.includes("both")) return "unisex";
  if (t.includes("women") || t.includes("woman") || t.includes("female") || t === "her") return "women";
  if (t.includes("men") || t.includes("man") || t.includes("male") || t === "him") return "men";
  return "";
}

async function main() {
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error("HTTP " + res.status + " عند قراءة الشيت");
  const text = await res.text();
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error("الشيت رجع فاضي");

  const headers = rows[0].map(h => h.trim());
  const idx = name => headers.indexOf(name);

  const perfumes = rows.slice(1)
    .filter(r => r[idx("Brand")] && r[idx("Name")])
    .map((r, i) => ({
      id: "row-" + i,
      brand: r[idx("Brand")] || "",
      name: r[idx("Name")] || "",
      image: resolveImage(r[idx("Brand")] || "", r[idx("Name")] || "", r[idx("Image Link (Google Drive)")]),
      seasons: seasonsFromText(r[idx("Seasons")]),
      daynight: daynightFromText(r[idx("Day/Night")]),
      gender: genderKeyFromText(r[idx("Gender")]),
      price50: parseFloat(r[idx("50ML Price UAE (AED)")]) || null,
      price10: parseFloat(r[idx("10ML Price UAE (AED)")]) || null,
      price50Om: idx("50ML Price Oman (OMR)") === -1 ? null : (parseFloat(r[idx("50ML Price Oman (OMR)")]) || null),
      price10Om: idx("10ML Price Oman (OMR)") === -1 ? null : (parseFloat(r[idx("10ML Price Oman (OMR)")]) || null),
      price50Before: idx("50ML Price UAE (AED) - Before Discount") === -1 ? null : (parseFloat(r[idx("50ML Price UAE (AED) - Before Discount")]) || null),
      price10Before: idx("10ML Price UAE (AED) - Before Discount") === -1 ? null : (parseFloat(r[idx("10ML Price UAE (AED) - Before Discount")]) || null),
      price50OmBefore: idx("50ML Price Oman (OMR) - Before Discount") === -1 ? null : (parseFloat(r[idx("50ML Price Oman (OMR) - Before Discount")]) || null),
      price10OmBefore: idx("10ML Price Oman (OMR) - Before Discount") === -1 ? null : (parseFloat(r[idx("10ML Price Oman (OMR) - Before Discount")]) || null),
      stock50: idx("50ML In Stock") === -1 ? true : (r[idx("50ML In Stock")] || "").trim().toLowerCase() !== "no",
      stock10: idx("10ML In Stock") === -1 ? true : (r[idx("10ML In Stock")] || "").trim().toLowerCase() !== "no",
      accords: r[idx("Main Accords")] || "",
      accordsAR: idx("Main Accords (AR)") === -1 ? "" : (r[idx("Main Accords (AR)")] || ""),
      notesTop: r[idx("Notes")] || "",
      notesTopAR: idx("Notes (AR)") === -1 ? "" : (r[idx("Notes (AR)")] || ""),
      notesMid: "",
      notesBase: "",
      longevity: r[idx("Longevity")] || "",
      sillage: r[idx("Sillage")] || ""
    }));

  perfumes.sort((a, b) => {
    const brandCompare = a.brand.localeCompare(b.brand, "en", { sensitivity: "base" });
    if (brandCompare !== 0) return brandCompare;
    return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(perfumes, null, 0));
  console.log(`تم بناء data.json — ${perfumes.length} عطر.`);
}

main().catch(err => {
  console.error("فشل بناء data.json:", err.message);
  process.exit(1);
});
