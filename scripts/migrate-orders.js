#!/usr/bin/env node
/**
 * يرتّب ملف orders.json القديم للصيغة الجديدة (يشتغل على نسخة محلية ويكتب ملف جديد — ما يعدّل الأصل):
 *   node scripts/migrate-orders.js <orders-in.json> <orders-out.json>
 *
 * - الدولة توحَّد إلى AE أو OM (كانت: AE / UAE / OM / الإمارات).
 * - الجوال يتحول لصيغة E.164 لو أمكن (phone)، والأصل يتحفظ في phoneRaw. لو ما أمكن: phoneInvalid=true.
 * - الحالات: received→delivered، prep→confirmed، shipped→dispatched، "" أو غير موجودة→new.
 *   needs_oil→confirmed + needsOil:true (وسم داخلي، مو حالة للعميل).
 * - deliveredAt يُترك null للطلبات القديمة (تاريخ التسليم الفعلي غير معروف — ما نخترعه).
 * - ما يطبع بيانات عملاء: فقط أعداد.
 */
const fs = require("fs");

const [,, inPath, outPath] = process.argv;
if (!inPath || !outPath) { console.error("usage: migrate-orders.js <in> <out>"); process.exit(1); }

const COUNTRY_LABEL = { AE: "الإمارات", OM: "عُمان" };
function normCountry(v) {
  const s = String(v || "").toLowerCase();
  if (/(^ae$|uae|emirates|الإمارات|الامارات)/.test(s)) return "AE";
  if (/(^om$|oman|عُمان|عمان)/.test(s)) return "OM";
  return "";
}
function normPhone(v, country) {
  let s = String(v || "").replace(/[\s\-().]/g, "").replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  if (!s) return "";
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!s.startsWith("+")) {
    if (country === "AE") s = "+971" + s.replace(/^0/, "");
    else if (country === "OM") s = "+968" + s.replace(/^0/, "");
  }
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : "";
}
const STATUS = { "": "new", new: "new", prep: "confirmed", needs_oil: "confirmed", needsOil: "confirmed",
  shipped: "dispatched", received: "delivered", delivered: "delivered", confirmed: "confirmed",
  dispatched: "dispatched", cancelled: "cancelled", returned: "returned", refunded: "refunded",
  return_requested: "return_requested" };

const rows = JSON.parse(fs.readFileSync(inPath, "utf8"));
const stats = { rows: rows.length, orders: new Set(), noCountry: 0, phoneOk: 0, phoneBlank: 0, phoneInvalid: 0, statusNew: 0 };
const out = rows.map(r => {
  const o = { ...r };
  const c = normCountry(r.country) || normCountry(r.countryLabel);
  if (c) { o.country = c; o.countryLabel = COUNTRY_LABEL[c]; } else { stats.noCountry++; }
  const raw = r.phoneRaw != null ? r.phoneRaw : r.phone;
  if (!String(raw || "").trim()) { o.phone = ""; stats.phoneBlank++; }
  else {
    const p = normPhone(raw, c);
    if (p) { o.phone = p; o.phoneRaw = raw; delete o.phoneInvalid; stats.phoneOk++; }
    else { o.phoneInvalid = true; stats.phoneInvalid++; }
  }
  const st = STATUS[String(r.status == null ? "" : r.status)] || "new";
  if (String(r.status) === "needs_oil" || String(r.status) === "needsOil") o.needsOil = true;
  o.status = st;
  if (st === "new") stats.statusNew++;
  if (!("deliveredAt" in o)) o.deliveredAt = null;
  stats.orders.add(r.orderId || r.id);
  return o;
});
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ...stats, orders: stats.orders.size }, null, 1));
