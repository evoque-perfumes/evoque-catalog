/**
 * ============================================================================
 * Evoque Perfumes — عدّاد المفضلة ❤️ (سكربت عام، doPost فقط)
 * ============================================================================
 * كل ضغطة قلب على عطر بالموقع تزيد (أو تنقص) عدّاد هذا العطر في wishlist.json
 * داخل المستودع الخاص evoque-private (مو العام). ما يرجّع أي بيانات.
 *
 * الحماية: يتحقق إن perfumeId موجود فعلًا في data.json العام، حقل فخ (honeypot)،
 * حد أقصى لعدد الإشارات بالمجمل، وقفل LockService عشان ما تتعارض الكتابات.
 *
 * خطوات النشر:
 * 1. افتح مشروع المفضلة القديم بـ script.google.com (نفس المشروع، حتى يبقى الرابط نفسه).
 * 2. امسح كل الكود والصق هذا الملف.
 * 3. Script Properties: أضف (أو عدّل):
 *      INTAKE_GITHUB_TOKEN = نفس مفتاح سكربت الطلبات (evoque-private فقط) — أو مفتاح جديد بنفس الصلاحيات
 *      GITHUB_OWNER        = evoque-perfumes
 *      PRIVATE_REPO        = evoque-private
 *      GITHUB_BRANCH       = main
 *    وامسح GITHUB_TOKEN القديم.
 * 4. Deploy ← Manage deployments ← ✏️ ← New version (Execute as: Me، Access: Anyone).
 * ============================================================================
 */

var CFG = {
  MAX_BODY_CHARS: 2000,
  GLOBAL_LIMIT: 120,          // أقصى عدد إشارات
  GLOBAL_WINDOW_SEC: 600,     // خلال 10 دقايق
  CATALOG_URL: "https://evoqueperfumes.com/data.json",
  CATALOG_CACHE_SEC: 600
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var raw = (e && e.postData && e.postData.contents) || "";
    if (!raw || raw.length > CFG.MAX_BODY_CHARS) return ok_();
    var eq = raw.indexOf("=");
    var data = JSON.parse(eq >= 0 ? raw.slice(eq + 1) : raw);
    if (data.hp) return ok_();

    var perfumeId = String(data.perfumeId || "").trim().slice(0, 120);
    var catalog = loadCatalog_();
    // ما نقبل إلا عطر موجود بالكتالوج (يمنع تلويث الملف بمفاتيح عشوائية)
    if (!perfumeId || !catalog || !catalog[perfumeId]) return ok_();
    var action = data.action === "remove" ? "remove" : "add";

    if (!lock.tryLock(25000)) return ok_();
    var cache = CacheService.getScriptCache();
    var n = Number(cache.get("rl_global") || 0) + 1;
    cache.put("rl_global", String(n), CFG.GLOBAL_WINDOW_SEC);
    if (n > CFG.GLOBAL_LIMIT) return ok_();

    // الاسم والبراند ناخذهم من الكتالوج نفسه، مو من اللي أرسله المتصفح
    update_(perfumeId, action, catalog[perfumeId].brand, catalog[perfumeId].name);
    return ok_();
  } catch (err) {
    console.error("wishlist error: " + err);
    return ok_();
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function ok_() {
  return ContentService.createTextOutput("ok").setMimeType(ContentService.MimeType.TEXT);
}

function loadCatalog_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get("catalog_ids_v1");
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  try {
    var res = UrlFetchApp.fetch(CFG.CATALOG_URL + "?t=" + Date.now(), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    var map = {};
    JSON.parse(res.getContentText()).forEach(function (p) {
      map[p.id] = { brand: String(p.brand || "").slice(0, 80), name: String(p.name || "").slice(0, 120) };
    });
    cache.put("catalog_ids_v1", JSON.stringify(map), CFG.CATALOG_CACHE_SEC);
    return map;
  } catch (e) { return null; }
}

function props_() {
  var p = PropertiesService.getScriptProperties();
  return {
    token: p.getProperty("INTAKE_GITHUB_TOKEN"),
    owner: p.getProperty("GITHUB_OWNER"),
    repo: p.getProperty("PRIVATE_REPO"),
    branch: p.getProperty("GITHUB_BRANCH") || "main"
  };
}

function headers_(token) {
  return { "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "User-Agent": "evoque-wishlist" };
}

function update_(perfumeId, action, brand, name) {
  var cfg = props_();
  if (!cfg.token || !cfg.owner || !cfg.repo) throw new Error("script properties missing");
  var url = "https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + "/contents/wishlist.json";
  for (var attempt = 1; attempt <= 3; attempt++) {
    var res = UrlFetchApp.fetch(url + "?ref=" + cfg.branch, { headers: headers_(cfg.token), muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error("GET wishlist failed " + res.getResponseCode());
    var json = JSON.parse(res.getContentText());
    var obj;
    try { obj = JSON.parse(Utilities.newBlob(Utilities.base64Decode(json.content.replace(/\n/g, ""))).getDataAsString()); }
    catch (e) { obj = {}; }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) obj = {};

    var entry = obj[perfumeId] || { count: 0 };
    entry.brand = brand;
    entry.name = name;
    entry.count = Math.max(0, (entry.count || 0) + (action === "remove" ? -1 : 1));
    entry.lastAt = new Date().toISOString();
    obj[perfumeId] = entry;

    var put = UrlFetchApp.fetch(url, {
      method: "put",
      headers: headers_(cfg.token),
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({
        message: (action === "remove" ? "Wishlist -1: " : "Wishlist +1: ") + perfumeId,
        content: Utilities.base64Encode(JSON.stringify(obj, null, 2), Utilities.Charset.UTF_8),
        branch: cfg.branch,
        sha: json.sha
      })
    });
    var code = put.getResponseCode();
    if (code >= 200 && code < 300) return;
    if (code !== 409) throw new Error("PUT wishlist failed " + code);
    Utilities.sleep(400);
  }
  throw new Error("PUT wishlist: too many conflicts");
}
