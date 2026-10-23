/**
 * Evoque — إيميل يومي بالطلبات المعلّقة (أكتوبر 2026)
 * ============================================================================
 * ملف إضافي داخل نفس مشروع "Evoque Order Intake" (جنب Code.gs). ما يغيّر شي في استقبال
 * الطلبات، ويشتغل بنفس مفتاح INTAKE_GITHUB_TOKEN اللي يقرأ المستودع الخاص.
 *
 * كل يوم الساعة 9 الصبح (بتوقيت الإمارات) يقرأ:
 *   - pending-orders.json  (طلبات الموقع اللي ما وافقت عليها لين الحين)
 *   - orders.json          (الطلبات المعتمدة وحالاتها)
 * ويرسل لك إيميل فيه كل طلب يحتاج متابعة وكم يوم صار له.
 *
 * التركيب (مرة وحدة):
 *   1. في المحرر: Files ← ➕ ← Script ← سمّه DailyReport ← الصق هذا الملف كامل ← 💾 Save.
 *   2. من القائمة فوق اختر الدالة setupDailyReport ← Run ← وافق على الصلاحيات (إرسال إيميل).
 *      تنضاف جدولة يومية + يوصلك إيميل تجربة فورًا.
 *   ما تحتاج Deploy جديد — الجدولة تشتغل بدون النشر.
 *
 * اختياري (Script Properties):
 *   REPORT_EMAILS = إيميلات إضافية مفصولة بفاصلة (الافتراضي: إيميلك أنت صاحب السكربت).
 *   REPORT_HOUR   = ساعة الإرسال 0–23 (الافتراضي 9). بعد التغيير شغّل setupDailyReport مرة ثانية.
 * لإيقافه: شغّل الدالة stopDailyReport.
 * ============================================================================
 */

var DR = {
  TZ: "Asia/Dubai",
  ADMIN_URL: "https://evoqueperfumes.com/admin-upload.html",
  DISPATCH_LATE_DAYS: 3,      // طلع للتوصيل وما تأكد التسليم بعد هالكثر يوم ← تنبيه أحمر
  CONFIRMED_LATE_DAYS: 2,     // مؤكد وما طلع بعد هالكثر يوم ← تنبيه أحمر
  STALE_CARD_HOURS: 1         // دفع بطاقة ما اكتمل من أكثر من ساعة ← غالبًا العميل ترك الدفع
};

// ---------- التركيب والإيقاف ----------
function setupDailyReport() {
  stopDailyReport();
  var raw = PropertiesService.getScriptProperties().getProperty("REPORT_HOUR");
  var hour = raw === null || String(raw).trim() === "" ? 9 : Math.floor(Number(raw));
  if (!(hour >= 0 && hour <= 23)) hour = 9;
  ScriptApp.newTrigger("sendDailyReport").timeBased().everyDays(1).atHour(hour).inTimezone(DR.TZ).create();
  sendDailyReport();
  Logger.log("تم ✅ — الإيميل اليومي بيوصلك كل يوم الساعة " + hour + " بتوقيت الإمارات. وصلك الحين إيميل تجربة.");
}

function stopDailyReport() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sendDailyReport") ScriptApp.deleteTrigger(t);
  });
}

// ---------- قراءة الملفات من المستودع الخاص ----------
function drReadJson_(path) {
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty("INTAKE_GITHUB_TOKEN"), owner = p.getProperty("GITHUB_OWNER"),
      repo = p.getProperty("PRIVATE_REPO"), branch = p.getProperty("GITHUB_BRANCH") || "main";
  if (!token || !owner || !repo) throw new Error("Script properties ناقصة (INTAKE_GITHUB_TOKEN / GITHUB_OWNER / PRIVATE_REPO)");
  var res = UrlFetchApp.fetch(
    "https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + path + "?ref=" + encodeURIComponent(branch),
    { headers: { "Authorization": "Bearer " + token, "Accept": "application/vnd.github.raw+json", "User-Agent": "evoque-daily-report" },
      muteHttpExceptions: true });
  var code = res.getResponseCode();
  if (code === 404) return [];
  if (code !== 200) throw new Error("GitHub " + path + " → " + code);
  var data = JSON.parse(res.getContentText("UTF-8"));
  return Array.isArray(data) ? data : [];
}

// ---------- أدوات ----------
function drEsc_(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function drToday_() { return Utilities.formatDate(new Date(), DR.TZ, "yyyy-MM-dd"); }
function drDayNum_(ymd) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ""));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : null;
}
function drDaysSince_(ymd) {
  var a = drDayNum_(ymd), b = drDayNum_(drToday_());
  return a == null ? null : Math.max(0, Math.round(b - a));
}
function drIsoToYmd_(iso) {
  var d = new Date(iso);
  return isNaN(d.getTime()) ? "" : Utilities.formatDate(d, DR.TZ, "yyyy-MM-dd");
}
function drAgeText_(days) {
  if (days == null) return "";
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days === 2) return "من يومين";
  return "من " + days + " أيام";
}
function drFirstName_(n) { return String(n || "").trim().split(/\s+/)[0] || "—"; }
function drCur_(country) { return country === "OM" ? "ر.ع" : "درهم"; }
function drWa_(phone) {
  var d = String(phone || "").replace(/\D/g, "");
  return d ? '<a href="https://wa.me/' + d + '" style="color:#1F6B41">واتساب</a>' : "";
}
function drNormStatus_(s) {
  var legacy = { "": "new", prep: "confirmed", needs_oil: "confirmed", needsOil: "confirmed", shipped: "dispatched", received: "delivered" };
  s = s || "";
  return Object.prototype.hasOwnProperty.call(legacy, s) ? legacy[s] : s;
}

// ---------- تجميع الطلبات ----------
function drGroupOrders_(rows) {
  var groups = {}, order = [];
  rows.forEach(function (r) {
    var key = r.orderId || r.id;
    if (!groups[key]) { groups[key] = { orderId: key, rows: [] }; order.push(key); }
    groups[key].rows.push(r);
  });
  return order.map(function (k) {
    var g = groups[k], first = g.rows[0] || {};
    var qty = 0, sum = 0, discount = 0, dispatchedAt = "";
    g.rows.forEach(function (r) {
      var q = Number(r.qty) || 1;
      qty += q;
      sum += (Number(r.unitPrice) || 0) * q;
      discount += Number(r.discount) || 0;
      if (r.dispatchedAt && !dispatchedAt) dispatchedAt = r.dispatchedAt;
    });
    return {
      orderId: k, status: drNormStatus_(first.status), date: first.date || "", dispatchedAt: dispatchedAt,
      name: first.customer, phone: first.phone, country: first.country, city: first.city || first.emirateOrWilayat || "",
      qty: qty, total: Math.round((sum - discount) * 100) / 100, paid: g.rows.some(function (r) { return r.paid; }),
      card: first.paymentMethod === "card"
    };
  });
}

// ---------- بناء الإيميل وإرساله ----------
function sendDailyReport() {
  var pending = drReadJson_("pending-orders.json");
  var orders = drGroupOrders_(drReadJson_("orders.json"));
  var now = Date.now();

  // 1) طلبات الموقع بانتظار موافقتك (نستبعد البطاقة اللي ما اكتمل دفعها — لها قسم خاص)
  var toApprove = [], abandonedCard = [];
  pending.forEach(function (o) {
    if (o.status && o.status !== "pending") return;
    var pay = o.payment || null;
    var row = {
      name: o.name, phone: o.phone, country: o.country, city: o.city || o.emirateOrWilayat || "",
      qty: (o.items || []).reduce(function (a, i) { return a + (Number(i.qty) || 1); }, 0),
      total: o.total, days: drDaysSince_(drIsoToYmd_(o.receivedAt)),
      paidCard: !!(pay && pay.status === "paid")
    };
    if (pay && pay.method === "card" && pay.status !== "paid") {
      var age = (now - new Date(o.receivedAt).getTime()) / 3600000;
      if (age >= DR.STALE_CARD_HOURS) abandonedCard.push(row);
      return;
    }
    toApprove.push(row);
  });

  // 2) مؤكدة/جديدة وما طلعت — 3) طلعت وما تأكد التسليم — 4) طلبات إرجاع
  var notDispatched = [], inTransit = [], returns = [];
  orders.forEach(function (g) {
    var row = { name: g.name, phone: g.phone, country: g.country, city: g.city, qty: g.qty, total: g.total, paidCard: g.card && g.paid };
    if (g.status === "new" || g.status === "confirmed") { row.days = drDaysSince_(g.date); notDispatched.push(row); }
    else if (g.status === "dispatched") { row.days = drDaysSince_(g.dispatchedAt || g.date); inTransit.push(row); }
    else if (g.status === "return_requested") { row.days = drDaysSince_(g.date); returns.push(row); }
  });
  var byOldest = function (a, b) { return (b.days || 0) - (a.days || 0); };
  [toApprove, notDispatched, inTransit, returns, abandonedCard].forEach(function (l) { l.sort(byOldest); });

  var actionCount = toApprove.length + notDispatched.length + inTransit.length + returns.length;
  var todayAr = Utilities.formatDate(new Date(), DR.TZ, "dd/MM/yyyy");

  function rowHtml(r, lateDays) {
    var late = lateDays != null && r.days != null && r.days >= lateDays;
    var age = drAgeText_(r.days);
    return '<tr>' +
      '<td style="padding:8px 6px;border-bottom:1px solid #eee">' + drEsc_(drFirstName_(r.name)) +
        (r.paidCard ? ' <span style="background:#1F6B41;color:#fff;border-radius:6px;padding:1px 6px;font-size:12px">💳 مدفوع</span>' : '') +
        '<div style="color:#777;font-size:12px">' + drEsc_(r.city) + (r.country === "OM" ? " · عُمان" : "") + '</div></td>' +
      '<td style="padding:8px 6px;border-bottom:1px solid #eee;white-space:nowrap">' + r.qty + ' عطر<div style="color:#777;font-size:12px">' + drEsc_(r.total) + ' ' + drCur_(r.country) + '</div></td>' +
      '<td style="padding:8px 6px;border-bottom:1px solid #eee;white-space:nowrap;' + (late ? 'color:#963224;font-weight:bold' : 'color:#555') + '">' + (late ? '⚠️ ' : '') + drEsc_(age) + '</td>' +
      '<td style="padding:8px 6px;border-bottom:1px solid #eee">' + drWa_(r.phone) + '</td></tr>';
  }
  function section(title, hint, list, lateDays) {
    if (!list.length) return "";
    return '<h3 style="margin:22px 0 4px;color:#1F3B2D;font-size:17px">' + title + ' (' + list.length + ')</h3>' +
      (hint ? '<div style="color:#777;font-size:13px;margin-bottom:6px">' + hint + '</div>' : '') +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
      list.map(function (r) { return rowHtml(r, lateDays); }).join("") + '</table>';
  }

  var subject, body;
  if (!actionCount && !abandonedCard.length) {
    subject = "إيفوك ✅ ما في طلبات معلّقة — " + todayAr;
    body = '<p style="font-size:16px">صباح الخير 👋</p><p style="font-size:16px">كل الطلبات مسلّمة، وما في شي يحتاج متابعة اليوم ✅</p>';
  } else {
    subject = actionCount
      ? "إيفوك — " + actionCount + " " + (actionCount === 1 ? "طلب يحتاج" : "طلبات تحتاج") + " متابعة — " + todayAr
      : "إيفوك — دفع بطاقة ما اكتمل — " + todayAr;
    var summary = [];
    if (toApprove.length) summary.push("🆕 " + toApprove.length + " بانتظار موافقتك");
    if (notDispatched.length) summary.push("📦 " + notDispatched.length + " ما طلعت");
    if (inTransit.length) summary.push("🚚 " + inTransit.length + " في الطريق");
    if (returns.length) summary.push("↩️ " + returns.length + " إرجاع");
    body =
      '<p style="font-size:16px;margin:0 0 6px">صباح الخير 👋</p>' +
      (summary.length ? '<p style="font-size:15px;margin:0 0 4px"><b>' + summary.join(" · ") + '</b></p>' : '') +
      section("🆕 بانتظار موافقتك", "طلبات وصلت من الموقع وما وافقت عليها أو رفضتها.", toApprove, 1) +
      section("📦 مؤكدة وما طلعت للتوصيل", "وافقت عليها بس حالتها لين الحين «جديد» أو «مؤكد».", notDispatched, DR.CONFIRMED_LATE_DAYS) +
      section("🚚 طلعت وما تأكد التسليم", "إذا وصلت للعميل غيّر حالتها إلى «تم التسليم».", inTransit, DR.DISPATCH_LATE_DAYS) +
      section("↩️ طلبات إرجاع", "", returns, 1) +
      section("💳 دفع بالبطاقة ما اكتمل", "العميل فتح صفحة الدفع وما دفع. تقدر تتواصل معه أو ترفض الطلب من اللوحة.", abandonedCard, null);
  }

  var html =
    '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;color:#222;max-width:640px;margin:auto;line-height:1.6">' +
    body +
    '<p style="margin:26px 0 8px"><a href="' + DR.ADMIN_URL + '" style="background:#1F3B2D;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;display:inline-block">افتح لوحة التحكم</a></p>' +
    '<p style="color:#999;font-size:12px">⚠️ = متأخر. إيميل آلي يومي من نظام إيفوك.</p></div>';

  var to = [Session.getEffectiveUser().getEmail()];
  var extra = PropertiesService.getScriptProperties().getProperty("REPORT_EMAILS");
  if (extra) extra.split(",").forEach(function (e) { e = e.trim(); if (e && to.indexOf(e) === -1) to.push(e); });
  MailApp.sendEmail({ to: to.join(","), subject: subject, htmlBody: html, name: "Evoque — تقرير الطلبات" });
}
