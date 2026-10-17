/**
 * ============================================================================
 * Evoque Perfumes — دخول لوحة التحكم بحساب Google (المشروع "ب": خاص)
 * ============================================================================
 * هذا السكربت هو الوحيد اللي يقدر يسلّم مفتاح لوحة التحكم لصفحة الإدارة.
 * مهم جدًا: لازم ينشر بالإعدادات التالية بالضبط، وإلا يصير بنفس خطر السكربت القديم:
 *
 *      Execute as:        Me (حسابك)
 *      Who has access:    Only myself        ← مو Anyone ولا Anyone with Google account
 *
 * يعني جوجل نفسها تطلب تسجيل دخول، وأي حساب غير حسابك يُرفض قبل ما يشتغل كود السكربت.
 * ما فيه كلمة مرور تُخمَّن، وما فيه قفل 24 ساعة يقدر أحد يفعّله ضدك.
 *
 * طريقة الشغل: ضغطة "الدخول بحساب Google" بلوحة التحكم تفتح رابط هذا السكربت. السكربت
 * يتأكد إن البريد هو بريدك (OWNER_EMAIL)، ويعرض زر يفتح لوحة التحكم ومعه المفتاح داخل
 * الجزء بعد # من الرابط (هذا الجزء ما يُرسل لأي سيرفر). لوحة التحكم تقرأه وتمسحه من الرابط.
 *
 * ============================================================================
 * خطوات النشر
 * ============================================================================
 * 1. https://script.google.com ← New project ← سمّه "Evoque Admin Auth" (مشروع منفصل تمامًا).
 * 2. الصق محتوى هذا الملف كامل بدل الكود الافتراضي.
 * 3. ⚙️ Project Settings ← Script Properties ← أضف:
 *      ADMIN_GITHUB_TOKEN = مفتاح GitHub (fine-grained) جديد،
 *                           Repository access: Only select repositories ← evoque-catalog و evoque-private،
 *                           Permissions ← Contents: Read and write،
 *                           Expiration: 90 يوم (حط تذكير بالجوال قبلها بأسبوع).
 *      OWNER_EMAIL        = بريد حسابك على Google (نفس الحساب اللي ينشر السكربت)
 *      TOKEN_EXPIRES_ON   = تاريخ انتهاء المفتاح بصيغة 2027-01-15 (للتنبيه بالإيميل)
 *      ADMIN_PAGE_URL     = https://evoqueperfumes.com/admin-upload.html
 * 4. Deploy ← New deployment ← Web app:
 *      Execute as: Me
 *      Who has access: Only myself
 *    انسخ الرابط الناتج، وحطه بملف admin-upload.html مكان PASTE_ADMIN_AUTH_WEBAPP_URL
 *    (أو ابعثه لـClaude يسويها).
 * 5. (اختياري لكن أنصح فيه) شغّل الدالة installExpiryReminder مرة وحدة من المحرر:
 *    تضيف تنبيه يومي يرسل لك إيميل قبل 7 أيام من انتهاء المفتاح.
 * 6. جرّب: افتح لوحة التحكم ← "الدخول بحساب Google" ← اضغط "فتح لوحة التحكم".
 *    لو ما اشتغل الزر، ارجع لنا بلقطة شاشة للصفحة.
 * ============================================================================
 */

function doGet() {
  var props = PropertiesService.getScriptProperties();
  var owner = String(props.getProperty("OWNER_EMAIL") || "").toLowerCase();
  var active = "";
  try { active = String(Session.getActiveUser().getEmail() || "").toLowerCase(); } catch (e) {}

  // خط دفاع ثاني فوق "Only myself": نتأكد من البريد صراحة
  if (!owner || !active || active !== owner) {
    return page_("<h2>غير مصرّح</h2><p>هذا الرابط لصاحب المتجر فقط.</p>");
  }

  var token = props.getProperty("ADMIN_GITHUB_TOKEN");
  var target = props.getProperty("ADMIN_PAGE_URL") || "https://evoqueperfumes.com/admin-upload.html";
  if (!token) return page_("<h2>المفتاح غير مضبوط</h2><p>أضف ADMIN_GITHUB_TOKEN في Script Properties.</p>");
  if (target.indexOf("https://") !== 0) return page_("<h2>إعداد خاطئ</h2><p>ADMIN_PAGE_URL لازم يبدأ بـ https://</p>");

  var href = target + "#gh=" + encodeURIComponent(token);
  // الرابط ينفتح بنفس النافذة (target=_top) بضغطة المستخدم — جوجل تمنع التحويل التلقائي من داخل السكربت
  return page_(
    '<h2>تم التحقق من حسابك ✅</h2>' +
    '<p><a id="go" target="_top" rel="noopener" style="display:inline-block;padding:14px 22px;background:#5B1F2B;color:#F6EAE4;border-radius:10px;text-decoration:none;font-weight:700" href="' +
    escAttr_(href) + '">فتح لوحة التحكم</a></p>' +
    '<p style="color:#7A5A58;font-size:13px">لا تشارك هذا الرابط ولا تلقطه بصورة — فيه مفتاح الدخول.</p>'
  );
}

function page_(bodyHtml) {
  var html = '<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:Tahoma,Arial,sans-serif;background:#F6EAE4;color:#2A1216;padding:28px;line-height:1.8}</style>' +
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
