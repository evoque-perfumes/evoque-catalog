#!/usr/bin/env node
// يضيف اسم العطر الأصلي بالعربي (inspiredAr) لكل عطر في data.json من scripts/inspired-ar.json
// ما يغيّر أي عطر عنده inspiredAr مكتوب يدويًا من لوحة التحكم. الاستخدام: node scripts/apply-inspired-ar.js
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const map = JSON.parse(fs.readFileSync(path.join(__dirname, "inspired-ar.json"), "utf8"));
const file = path.join(ROOT, "data.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
let added = 0, missing = [];
data.forEach(p => {
  if (p.inspiredAr) return;
  if (map[p.id]) { p.inspiredAr = map[p.id]; added++; } else missing.push(p.id);
});
fs.writeFileSync(file, JSON.stringify(data));
console.log(JSON.stringify({ added, missing }));
