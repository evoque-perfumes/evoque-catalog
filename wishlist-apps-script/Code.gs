/**
 * ============================================================================
 * Evoque Perfume — Wishlist Backend (Google Apps Script Web App)
 * ============================================================================
 * الغرض:
 * كل مرة عميل يضغط ❤️ على عطر بالموقع (evoqueperfumes.com)، المتصفح يرسل
 * طلب POST لهذا السكربت (فورم مخفي + iframe مخفي — نفس تقنية نموذج الطلبات
 * والتقييمات، بدون قيود CORS). السكربت يحدّث عداد الطلب على هذا العطر داخل
 * ملف wishlist.json بجذر الريبو على GitHub مباشرة، عبر GitHub Contents API.
 * بعدها تقدر تشوف كل العطور المطلوبة (وأعدادها) من تبويب "❤️ المفضلة"
 * الجديد بلوحة التحكم admin-upload.html.
 *
 * ليه سكربت منفصل تمامًا عن الطلبات (ORDER_ENDPOINT) والتقييمات (REVIEWS_ENDPOINT)؟
 * نفس مبدأ الفصل الكامل المتبع بالمشروع من البداية: كل نظام له Apps Script
 * خاص فيه، حتى ما يصير أي تعديل أعمى على سكربت حي حساس بدون رؤية كوده الكامل.
 * يعني أي عطل هنا (بالمفضلة) ما يأثر إطلاقًا على استقبال الطلبات أو التقييمات.
 *
 * ============================================================================
 * خطوات النشر (تسويها أنت بنفسك — Claude ما يتعامل مع توكن GitHub الخاص فيك أبدًا)
 * ============================================================================
 * 1. روح https://script.google.com → مشروع جديد (New project).
 * 2. سمّ المشروع مثلاً "Evoque Wishlist Backend" (اختياري، للتنظيم بس).
 * 3. امسح كل الكود الافتراضي بملف Code.gs، والصق فيه محتوى هذا الملف كامل.
 * 4. من القائمة الجانبية ⚙️ (Project Settings) → مرّر لتحت لـ"Script Properties"
 *    → Add script property، وضيف بالضبط هالأربع خصائص:
 *
 *      GITHUB_TOKEN   = <Personal Access Token عندك، صلاحية "repo" أو
 *                        "Contents: Read & write" على الأقل — تقدر تستخدم
 *                        نفس التوكن اللي تدخله بلوحة التحكم admin-upload.html>
 *      GITHUB_OWNER   = evoque-perfumes
 *      GITHUB_REPO    = evoque-catalog
 *      GITHUB_BRANCH  = main
 *
 * 5. من الأعلى: Deploy → New deployment.
 *      - اضغط ⚙️ جنب "Select type" واختر "Web app".
 *      - Description: أي وصف تحبه (مثلاً "wishlist v1").
 *      - Execute as: Me (حسابك).
 *      - Who has access: Anyone.
 *    اضغط Deploy. أول مرة راح يطلب منك توافق على الصلاحيات (Authorize access)
 *    — طبيعي ومتوقع، لأنه بيتواصل مع GitHub API نيابة عنك. وافق بحسابك.
 * 6. بعد النشر راح يطلع لك رابط "Web app URL" (يبدأ بـ
 *    https://script.google.com/macros/s/....../exec) — انسخه وابعثه لنا
 *    (Claude) عشان نحطه مكان القيمة المؤقتة WISHLIST_ENDPOINT بملف
 *    assets/catalog.js ونرفع الملف المحدث على الموقع مباشرة.
 * 7. لو احتجت تعدّل الكود بالمستقبل: بعد أي تعديل، لازم تسوي Deploy جديد
 *    (Manage deployments → ✏️ تعديل → New version) عشان التعديل ينعكس فعليًا
 *    على الرابط الحي — نفس التنبيه المذكور بسكربت التقييمات.
 * ============================================================================
 */

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || "";
    var eq = raw.indexOf("=");
    var jsonStr = eq >= 0 ? raw.slice(eq + 1) : raw;
    var data = JSON.parse(jsonStr);

    // فخ سبام بسيط (honeypot) — نفس فكرة فورم التقييمات بالضبط. حقل "hp" المفروض
    // يوصل فاضي دايمًا من عميل حقيقي (مخفي بصريًا بالفورم). لو انعبى، غالبًا بوت.
    if (data.hp) return respond_("ignored");

    var perfumeId = String(data.perfumeId || "").trim();
    if (!perfumeId) return respond_("missing perfumeId");
    var action = data.action === "remove" ? "remove" : "add";

    updateWishlistWithRetry_(perfumeId, action, String(data.brand || ""), String(data.name || ""));
    return respond_("ok");
  } catch (err) {
    return respond_("error: " + err);
  }
}

function respond_(msg) {
  // ملاحظة: المتصفح ما يقرأ هذا الرد أصلًا (الإرسال عبر iframe مخفي، ما نقدر
  // نقرأ محتواه عبر النطاقات المختلفة) — موجود بس للتشخيص لو فتحت السجل (Executions).
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}

function props_() {
  var p = PropertiesService.getScriptProperties();
  return {
    token: p.getProperty("GITHUB_TOKEN"),
    owner: p.getProperty("GITHUB_OWNER"),
    repo: p.getProperty("GITHUB_REPO"),
    branch: p.getProperty("GITHUB_BRANCH") || "main"
  };
}

function ghHeaders_(token) {
  return {
    "Authorization": "token " + token,
    "Accept": "application/vnd.github+json",
    "User-Agent": "evoque-wishlist-script"
  };
}

function getWishlistWithSha_() {
  var cfg = props_();
  var url = "https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + "/contents/wishlist.json?ref=" + cfg.branch;
  var res = UrlFetchApp.fetch(url, { headers: ghHeaders_(cfg.token), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    throw new Error("GET wishlist.json failed: " + res.getResponseCode() + " " + res.getContentText());
  }
  var json = JSON.parse(res.getContentText());
  var content = Utilities.newBlob(Utilities.base64Decode(json.content.replace(/\n/g, ""))).getDataAsString();
  var obj;
  try { obj = JSON.parse(content); } catch (e2) { obj = {}; }
  return { obj: obj, sha: json.sha };
}

function putWishlistJson_(obj, sha, commitMsg) {
  var cfg = props_();
  var url = "https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + "/contents/wishlist.json";
  var body = {
    message: commitMsg,
    content: Utilities.base64Encode(JSON.stringify(obj, null, 2), Utilities.Charset.UTF_8),
    branch: cfg.branch,
    sha: sha
  };
  var res = UrlFetchApp.fetch(url, {
    method: "put",
    headers: ghHeaders_(cfg.token),
    contentType: "application/json",
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  return res.getResponseCode();
}

// نفس أسلوب إعادة المحاولة عند تعارض 409 (لو وصلت ضغطتين قلب بنفس اللحظة
// بالضبط) المستخدم بلوحة التحكم لتحديث reviews.json و bank-info.json.
function updateWishlistWithRetry_(perfumeId, action, brand, name, attempt) {
  attempt = attempt || 1;
  var current = getWishlistWithSha_();
  var obj = current.obj;
  var entry = obj[perfumeId] || { count: 0 };
  entry.brand = brand || entry.brand || "";
  entry.name = name || entry.name || "";
  entry.count = Math.max(0, (entry.count || 0) + (action === "remove" ? -1 : 1));
  entry.lastAt = new Date().toISOString();
  obj[perfumeId] = entry;

  var msg = (action === "remove" ? "Wishlist -1: " : "Wishlist +1: ") + perfumeId;
  var code = putWishlistJson_(obj, current.sha, msg);
  if (code === 409 && attempt < 3) {
    Utilities.sleep(400);
    return updateWishlistWithRetry_(perfumeId, action, brand, name, attempt + 1);
  }
  if (code < 200 || code >= 300) {
    throw new Error("PUT wishlist.json failed: " + code);
  }
}
