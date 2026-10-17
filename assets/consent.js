// شريط الموافقة على ملفات التتبع — Meta Pixel ما يُحمَّل إلا بعد ضغط "أوافق".
(function(){
  var KEY = "evoque_consent", PIXEL_ID = "1801502767941852";
  function read(){ try{ return localStorage.getItem(KEY); }catch(e){ return null; } }
  function write(v){ try{ localStorage.setItem(KEY, v); }catch(e){} }
  function lang(){
    try{ var l = localStorage.getItem("evoque_lang_choice"); if(l === "en" || l === "ar") return l; }catch(e){}
    return (document.documentElement.getAttribute("lang") === "en") ? "en" : "ar";
  }
  var T = {
    ar: { msg: "نستخدم ملفات تتبع (Meta Pixel) لقياس أداء إعلاناتنا، وما نفعّلها إلا بموافقتك.", yes: "أوافق", no: "أرفض", more: "سياسة الخصوصية", reset: "إعدادات التتبع" },
    en: { msg: "We use tracking cookies (Meta Pixel) to measure our ads, only if you agree.", yes: "Accept", no: "Decline", more: "Privacy policy", reset: "Tracking settings" }
  };
  function loadPixel(){
    if(window.fbq) return;
    !function(f,b,e,v,n,t,s){ if(f.fbq) return; n = f.fbq = function(){ n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if(!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", PIXEL_ID);
    window.fbq("track", "PageView");
  }
  function removeBar(){ var b = document.getElementById("consentBar"); if(b && b.parentNode) b.parentNode.removeChild(b); }
  function showBar(){
    removeBar();
    var t = T[lang()], bar = document.createElement("div");
    bar.id = "consentBar"; bar.className = "consent-bar"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", t.more);
    var p = document.createElement("p"); p.textContent = t.msg + " ";
    var a = document.createElement("a"); a.href = "privacy.html"; a.textContent = t.more; p.appendChild(a);
    var yes = document.createElement("button"); yes.type = "button"; yes.className = "consent-yes"; yes.textContent = t.yes;
    var no = document.createElement("button"); no.type = "button"; no.className = "consent-no"; no.textContent = t.no;
    yes.addEventListener("click", function(){ write("accepted"); loadPixel(); removeBar(); });
    no.addEventListener("click", function(){ write("declined"); removeBar(); });
    var row = document.createElement("div"); row.className = "consent-actions"; row.appendChild(yes); row.appendChild(no);
    bar.appendChild(p); bar.appendChild(row);
    document.body.insertBefore(bar, document.body.firstChild);
  }
  window.EvoqueConsent = { reopen: showBar };
  function init(){
    var c = read();
    if(c === "accepted") loadPixel();
    else if(c !== "declined") showBar();
    var link = document.getElementById("consentReset");
    if(link) link.addEventListener("click", function(e){ e.preventDefault(); showBar(); window.scrollTo(0, 0); });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
