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
 * ============================================================================
 * إضافة 17 سبتمبر 2026 — تسجيل دخول بكلمة مرور بسيطة بدال لصق مفتاح GitHub
 * ============================================================================
 * لوحة التحكم admin-upload.html صارت تقدر "تسجّل دخول" بكلمة مرور قصيرة تختارها
 * انت، بدل ما تحتاج تلصق مفتاح GitHub الطويل (والصعب حفظه) بكل جهاز/متصفح جديد.
 * آلية الشغل: المتصفح يرسل كلمة المرور لهذا السكربت (عبر doGet تحت)، والسكربت
 * يتحقق منها، ولو صحيحة يرجّع نفس GITHUB_TOKEN المخزّن أعلاه — ونفس التوكن هذا
 * يُستخدم بعدها بالضبط زي ما كان (يبقى بالمتصفح، يتكلم مباشرة مع GitHub).
 * يعني: كلمة المرور صارت "مفتاحك اليومي المحفوظ بذاكرتك"، والتوكن الحقيقي الطويل
 * صار مخزّن بمكان واحد آمن (Script Properties هنا) وما تحتاج تشوفه أو تكتبه بنفسك
 * أبدًا بعد اليوم.
 *
 * خطوة لازم تسويها بنفسك (مرة وحدة): من ⚙️ Project Settings → Script Properties
 * ضيف خاصية خامسة:
 *
 *      ADMIN_PASSWORD = <كلمة مرور قوية تختارها انت بنفسك — اكتبها هنا مباشرة،
 *                         ما ترسلها لأي أحد ولا حتى لـClaude>
 *
 * هذا الرابط مفتوح لأي شخص بالإنترنت (نفس طبيعة روابط Apps Script Web App كلها)،
 * يعني كلمة المرور هي خط الدفاع الوحيد قبل ما يوصل أحد لمفتاح GitHub الكامل.
 * لازم تكون قوية فعليًا: ننصح بأربع كلمات عشوائية غير مترابطة + أرقام/رموز
 * (مثال على الشكل بس، لا تستخدمه حرفيًا: "قهوة7-نافذة@صحراء-42"). تجنب تاريخ
 * ميلاد أو اسم أو كلمة قصيرة متوقعة. فيه كمان قفل تلقائي 24 ساعة بعد 5 محاولات
 * خاطئة متتالية (شوف handleAdminLogin_ تحت) كحماية إضافية، لكنها لا تعوّض عن
 * كلمة مرور قوية من الأساس.
 *
 * بعدها لازم تسوي Deploy جديد (Manage deployments → ✏️ تعديل → New version) عشان
 * هذا الكود المضاف ينعكس على الرابط الحي (نفس رابط ORDER_QUEUE_ENDPOINT الموجود
 * أصلًا بملف assets/catalog.js — ما يتغيّر، نفس الرابط بالضبط).
 *
 * لو حسّيت كلمة المرور انكشفت بأي وقت، غيّرها من نفس مكان ADMIN_PASSWORD فورًا —
 * التوكن الحقيقي ما يحتاج تغيير وقتها.
 * ============================================================================
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

// ============================================================================
// تسجيل دخول لوحة التحكم بكلمة مرور — إضافة 17 سبتمبر 2026 (شوف الشرح بالأعلى)
// ============================================================================
// doGet منفصل تمامًا عن doPost أعلاه (الخاص باستقبال الطلبات) — هذا فقط يرد على
// طلبات "تسجيل الدخول" الجاية من admin-upload.html، ولا يلمس pending-orders.json
// أو أي ملف ثاني إطلاقًا.
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || "";
    if (action === "adminLogin") return handleAdminLogin_(e);
    return jsonOut_({ error: "unknown action" });
  } catch (err) {
    return jsonOut_({ error: String(err) });
  }
}

// حماية إضافية من محاولات التخمين المتكررة (brute force) — 17 سبتمبر 2026:
// بعد 5 محاولات خاطئة متتالية، نقفل تسجيل الدخول 24 ساعة كاملة (مهما كانت كلمة
// المرور المرسلة صحيحة أو لا خلال هالفترة). العدّاد ووقت القفل محفوظين بـScript
// Properties نفسها (يبقون حتى لو تسكربت انعاد تشغيله). لو احتجت تدخل بسرعة أثناء
// فترة قفل، تقدر دايمًا تستخدم خيار "إدخال المفتاح مباشرة" باللوحة (يحتاج نفس
// مفتاح GitHub القديم اللي عندك، مستقل تمامًا عن هذا القفل).
var LOGIN_MAX_FAILS = 5;
var LOGIN_LOCKOUT_MS = 24 * 60 * 60 * 1000; // 24 ساعة

function handleAdminLogin_(e) {
  var p = PropertiesService.getScriptProperties();

  var lockedUntilStr = p.getProperty("LOGIN_LOCKED_UNTIL");
  if (lockedUntilStr) {
    var lockedUntil = new Date(lockedUntilStr).getTime();
    if (Date.now() < lockedUntil) {
      var remainingMin = Math.ceil((lockedUntil - Date.now()) / 60000);
      return jsonOut_({ error: "تسجيل الدخول مقفول مؤقتًا بسبب محاولات خاطئة متكررة — حاول بعد حوالي " + remainingMin + " دقيقة، أو استخدم خيار المفتاح المباشر." });
    }
    // انتهت مدة القفل — نمسحها ونكمل عادي
    p.deleteProperty("LOGIN_LOCKED_UNTIL");
    p.deleteProperty("LOGIN_FAIL_COUNT");
  }

  var expected = p.getProperty("ADMIN_PASSWORD");
  if (!expected) {
    return jsonOut_({ error: "ADMIN_PASSWORD غير معرّف بعد بـ Script Properties — ضيفه أول (شوف الشرح بالأعلى)." });
  }
  var given = (e.parameter && e.parameter.password) || "";
  if (given !== expected) {
    // تأخير بسيط يبطّئ أي محاولة تخمين متكررة (حماية إضافية فوق القفل)
    Utilities.sleep(800);
    var fails = (parseInt(p.getProperty("LOGIN_FAIL_COUNT"), 10) || 0) + 1;
    if (fails >= LOGIN_MAX_FAILS) {
      p.setProperty("LOGIN_LOCKED_UNTIL", new Date(Date.now() + LOGIN_LOCKOUT_MS).toISOString());
      p.deleteProperty("LOGIN_FAIL_COUNT");
      return jsonOut_({ error: "كلمة المرور غلط. تم قفل تسجيل الدخول 24 ساعة بسبب محاولات خاطئة متكررة." });
    }
    p.setProperty("LOGIN_FAIL_COUNT", String(fails));
    return jsonOut_({ error: "كلمة المرور غلط (محاولة " + fails + " من " + LOGIN_MAX_FAILS + " قبل القفل المؤقت)" });
  }

  // كلمة مرور صحيحة — نصفّر أي محاولات فاشلة سابقة
  p.deleteProperty("LOGIN_FAIL_COUNT");
  p.deleteProperty("LOGIN_LOCKED_UNTIL");

  var token = p.getProperty("GITHUB_TOKEN");
  if (!token) {
    return jsonOut_({ error: "GITHUB_TOKEN غير معرّف بـ Script Properties" });
  }
  return jsonOut_({ token: token });
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
