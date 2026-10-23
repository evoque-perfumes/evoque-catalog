/**
 * ============================================================================
 * Evoque Perfumes — دخول لوحة التحكم بحساب Google (المشروع "ب": خاص)
 * ============================================================================
 * هذا السكربت هو الوحيد اللي يقدر يسلّم مفتاح لوحة التحكم لصفحة الإدارة.
 *
 * 23 أكتوبر 2026 — صار يقبل أكثر من إيميل (قائمة مسموحة). إعدادات النشر:
 *
 *      Execute as:        User accessing the web app   ← عشان جوجل تعطينا إيميل الداخل الحقيقي
 *      Who has access:    Anyone with Google account   ← جوجل تطلب تسجيل دخول دايمًا
 *
 * أي حساب يقدر يفتح الرابط، بس الكود ما يسلّم المفتاح إلا لإيميل موجود بالقائمة
 * (OWNER_EMAIL + ALLOWED_EMAILS). غيرهم يشوف "غير مصرّح" وبس.
 *
 * ============================================================================
 * الإعدادات (Project Settings ← Script Properties)
 * ============================================================================
 *      ADMIN_GITHUB_TOKEN = مفتاح GitHub (fine-grained) "evoque-admin"،
 *                           Repository access: evoque-catalog و evoque-private،
 *                           Permissions ← Contents: Read and write، Expiration: 90 يوم.
 *      OWNER_EMAIL        = إيميل صاحب المتجر (يوصله تنبيه انتهاء المفتاح)
 *      ALLOWED_EMAILS     = إيميلات إضافية مسموح لها، مفصولة بفاصلة. مثال:
 *                           jasim.aj@gmail.com, second@gmail.com
 *      TOKEN_EXPIRES_ON   = تاريخ انتهاء المفتاح بصيغة 2027-01-15 (للتنبيه بالإيميل)
 *      ADMIN_PAGE_URL     = https://evoqueperfumes.com/admin-upload.html
 *
 * تنبيه: كل إيميل بالقائمة ياخذ نفس الصلاحية الكاملة. لشيل أحد: امسح إيميله من
 * ALLOWED_EMAILS، ولو تشك إنه أخذ المفتاح سوّ مفتاح جديد وبدّله.
 *
 * (اختياري) شغّل الدالة installExpiryReminder مرة وحدة من المحرر وانت داخل بحساب
 * OWNER_EMAIL: تنبيه يومي يرسل لك إيميل قبل 7 و3 و1 أيام من انتهاء المفتاح.
 * ============================================================================
 */

function allowedEmails_(props) {
  var list = [props.getProperty("OWNER_EMAIL") || ""].concat(String(props.getProperty("ALLOWED_EMAILS") || "").split(/[,\s;]+/));
  return list.map(function (e) { return String(e).trim().toLowerCase(); }).filter(function (e) { return e && e.indexOf("@") > 0; });
}

function doGet() {
  var props = PropertiesService.getScriptProperties();
  var allowed = allowedEmails_(props);
  var active = "";
  try { active = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase(); } catch (e) {}

  if (!allowed.length || !active || allowed.indexOf(active) === -1) {
    return page_("<h2>غير مصرّح</h2><p>هذا الرابط لأصحاب المتجر فقط." +
      (active ? "" : "<br>إذا انت صاحب المتجر: افتح الرابط من متصفح داخل فيه بحساب جوجل واحد بس (أو نافذة تصفح خفي).") + "</p>");
  }

  var token = props.getProperty("ADMIN_GITHUB_TOKEN");
  var target = props.getProperty("ADMIN_PAGE_URL") || "https://evoqueperfumes.com/admin-upload.html";
  if (!token) return page_("<h2>المفتاح غير مضبوط</h2><p>أضف ADMIN_GITHUB_TOKEN في Script Properties.</p>");
  if (target.indexOf("https://") !== 0) return page_("<h2>إعداد خاطئ</h2><p>ADMIN_PAGE_URL لازم يبدأ بـ https://</p>");

  var href = target + "#gh=" + encodeURIComponent(token);
  // الرابط ينفتح بنفس النافذة (target=_top) بضغطة المستخدم — جوجل تمنع التحويل التلقائي من داخل السكربت
  return page_(
    '<h2>تم التحقق من حسابك ✅</h2>' +
    '<p><a id="go" target="_top" rel="noopener" style="display:inline-block;padding:14px 22px;background:#1F3D33;color:#F5F3EE;border-radius:10px;text-decoration:none;font-weight:700" href="' +
    escAttr_(href) + '">فتح لوحة التحكم</a></p>' +
    '<p style="color:#56625B;font-size:13px">لا تشارك هذا الرابط ولا تلقطه بصورة — فيه مفتاح الدخول.</p>'
  );
}

function page_(bodyHtml) {
  var html = '<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:Tahoma,Arial,sans-serif;background:#F5F3EE;color:#18231F;padding:28px;line-height:1.8}</style>' +
    '</head><body>' + bodyHtml + '</body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle("Evoque Admin")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function escAttr_(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------- تنبيه قبل انتهاء المفتاح (اختياري) ----------
function installExpiryReminder() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "checkTokenExpiry_") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("checkTokenExpiry_").timeBased().everyDays(1).atHour(9).create();
}

function checkTokenExpiry_() {
  var props = PropertiesService.getScriptProperties();
  var exp = props.getProperty("TOKEN_EXPIRES_ON");
  var owner = props.getProperty("OWNER_EMAIL");
  if (!exp || !owner) return;
  var days = Math.ceil((new Date(exp + "T23:59:59Z").getTime() - Date.now()) / 86400000);
  if (days === 7 || days === 3 || days === 1) {
    MailApp.sendEmail(owner, "Evoque: مفتاح لوحة التحكم ينتهي بعد " + days + " يوم",
      "مفتاح GitHub الخاص بلوحة التحكم ينتهي بتاريخ " + exp + ".\n" +
      "سوّ مفتاح جديد (نفس الخطوات) وحطه في ADMIN_GITHUB_TOKEN داخل مشروع Evoque Admin Auth، وحدّث TOKEN_EXPIRES_ON.");
  }
}
