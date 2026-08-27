/**
 * ============================================================================
 * Evoque Perfume — Order Queue Backend (Google Apps Script Web App)
 * ============================================================================
 * الغرض:
 * كل مرة عميل يسوي طلب بالموقع (evoqueperfumes.com) — سواء عبر نموذج الطلب
 * الكامل أو زر "إتمام الطلب عبر واتساب" السريع — المتصفح يرسل نسخة من بيانات
 * الطلب لهذا السكربت (فورم مخفي + iframe مخفي، نفس تقنية الطلبات/التقييمات/
 * المفضلة، بدون قيود CORS). السكربت يضيف الطلب كسطر جديد بحالة "pending" داخل
 * ملف pending-orders.json بجذر الريبو على GitHub مباشرة، عبر GitHub Contents API.
 * بعدها يظهر الطلب فورًا بتبويب "🧾 الطلبات الجديدة" الجديد بلوحة التحكم
 * admin-upload.html، وصاحب المتجر يعتمده أو يرفضه بضغطة زر — بدون ما يدخل أي
 * بيانة يدويًا بنفسه.
 *
 * ليه سكربت منفصل تمامًا عن نظام الطلبات القديم (ORDER_ENDPOINT بالشيت +
 * الإيميلات)؟
 * نفس مبدأ الفصل الكامل المتبع بالمشروع من البداية: ما نلمس أبدًا سكربت حي
 * حساس بدون رؤية كوده الكامل. هذا السكربت يشتغل **بالتوازي** مع القديم —
 * القديم يضل شغال بالضبط زي ما كان (يرسل نفس الإيميلات، يسجل بنفس الشيت)،
 * وهذا الجديد بس يضيف نسخة من نفس بيانات الطلب بملف JSON عشان تظهر بلوحة
 * التحكم للاعتماد. أي عطل هنا ما يأثر إطلاقًا على وصول الإيميلات القديمة.
 *
 * ============================================================================
 * خطوات النشر (تسويها أنت بنفسك — Claude ما يتعامل مع توكن GitHub الخاص فيك أبدًا)
 * ============================================================================
 * 1. روح https://script.google.com → مشروع جديد (New project).
 * 2. سمّ المشروع مثلاً "Evoque Order Queue Backend" (اختياري، للتنظيم بس).
 * 3. امسح كل الكود الافتراضي بملف Code.gs، والصق فيه محتوى هذا الملف كامل.
 * 4. من القائمة الجانبية ⚙️ (Project Settings) → مرّر لتحت لـ"Script Properties"
 *    → Add script property، وضيف بالضبط هالأربع خصائص (نفس القيم المستخدمة
 *    بسكربت المفضلة تمامًا، تقدر تنسخها من هناك):
 *
 *      GITHUB_TOKEN   = <نفس التوكن المستخدم بسكربت المفضلة/لوحة التحكم>
 *      GITHUB_OWNER   = evoque-perfumes
 *      GITHUB_REPO    = evoque-catalog
 *      GITHUB_BRANCH  = main
 *
 * 5. من الأعلى: Deploy → New deployment.
 *      - اضغط ⚙️ جنب "Select type" واختر "Web app".
 *      - Description: أي وصف تحبه (مثلاً "order queue v1").
 *      - Execute as: Me (حسابك).
 *      - Who has access: Anyone.
 *    اضغط Deploy، ووافق على الصلاحيات لو طلب منك (طبيعي، أول مرة بس).
 * 6. بعد النشر راح يطلع لك رابط "Web app URL" — انسخه وابعثه لنا (Claude) عشان
 *    نحطه مكان القيمة المؤقتة ORDER_QUEUE_ENDPOINT بملف assets/catalog.js
 *    ونرفع الملف المحدث على الموقع مباشرة.
 * 7. لو احتجت تعدّل الكود بالمستقبل: بعد أي تعديل، لازم تسوي Deploy جديد
 *    (Manage deployments → ✏️ تعديل → New version) عشان التعديل ينعكس فعليًا
 *    على الرابط الحي.
 * ============================================================================
 */

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || "";
    var eq = raw.indexOf("=");
    var jsonStr = eq >= 0 ? raw.slice(eq + 1) : raw;
    var data = JSON.parse(jsonStr);

    // فخ سبام بسيط (honeypot) — نفس فكرة فورم التقييمات/المفضلة بالضبط.
    if (data.hp) return respond_("ignored");

    var items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) return respond_("missing items");

    var order = {
      orderId: "pend-" + new Date().getTime() + "-" + Math.floor(Math.random() * 10000),
      receivedAt: new Date().toISOString(),
      status: "pending",
      source: data.source === "quick-whatsapp" ? "quick-whatsapp" : "form",
      lang: String(data.lang || ""),
      name: String(data.name || ""),
      phone: String(data.phone || ""),
      email: String(data.email || ""),
      country: String(data.country || ""),
      emirateOrWilayat: String(data.emirateOrWilayat || ""),
      deliveryMethod: String(data.deliveryMethod || ""),
      address: String(data.address || ""),
      notes: String(data.notes || ""),
      currency: String(data.currency || ""),
      paymentMethod: String(data.paymentMethod || ""),
      subtotal: Number(data.subtotal) || 0,
      shippingFee: Number(data.shippingFee) || 0,
      shippingFree: !!data.shippingFree,
      tabbyFee: Number(data.tabbyFee) || 0,
      total: Number(data.total) || 0,
      offers: String(data.offers || ""),
      items: items.map(function (it) {
        return {
          perfumeId: String(it.perfumeId || ""),
          brand: String(it.brand || ""),
          name: String(it.name || ""),
          size: Number(it.size) || 0,
          qty: Number(it.qty) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          lineTotal: Number(it.lineTotal) || 0
        };
      })
    };

    addPendingOrderWithRetry_(order);
    return respond_("ok");
  } catch (err) {
    return respond_("error: " + err);
  }
}

function respond_(msg) {
  // ملاحظة: المتصفح ما يقرأ هذا الرد أصلًا (الإرسال عبر iframe مخفي) — موجود
  // بس للتشخيص لو فتحت السجل (Executions) بمحرر Apps Script.
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
    "User-Agent": "evoque-order-queue-script"
  };
}

function getPendingOrdersWithSha_() {
  var cfg = props_();
  var url = "https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + "/contents/pending-orders.json?ref=" + cfg.branch;
  var res = UrlFetchApp.fetch(url, { headers: ghHeaders_(cfg.token), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    throw new Error("GET pending-orders.json failed: " + res.getResponseCode() + " " + res.getContentText());
  }
  var json = JSON.parse(res.getContentText());
  var content = Utilities.newBlob(Utilities.base64Decode(json.content.replace(/\n/g, ""))).getDataAsString();
  var arr;
  try { arr = JSON.parse(content); } catch (e2) { arr = []; }
  if (!Array.isArray(arr)) arr = [];
  return { arr: arr, sha: json.sha };
}

function putPendingOrders_(arr, sha, commitMsg) {
  var cfg = props_();
  var url = "https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + "/contents/pending-orders.json";
  var body = {
    message: commitMsg,
    content: Utilities.base64Encode(JSON.stringify(arr, null, 2), Utilities.Charset.UTF_8),
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

// نفس أسلوب إعادة المحاولة عند تعارض 409 (لو وصل أكثر من طلب بنفس اللحظة
// بالضبط) المستخدم بسكربت المفضلة ولوحة التحكم.
function addPendingOrderWithRetry_(order, attempt) {
  attempt = attempt || 1;
  var current = getPendingOrdersWithSha_();
  var arr = current.arr;
  arr.push(order);
  var code = putPendingOrders_(arr, current.sha, "New pending order: " + order.orderId);
  if (code === 409 && attempt < 3) {
    Utilities.sleep(400);
    return addPendingOrderWithRetry_(order, attempt + 1);
  }
  if (code < 200 || code >= 300) {
    throw new Error("PUT pending-orders.json failed: " + code);
  }
}
