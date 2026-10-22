/* ===================================================================
   Evoque — حركة الرئيسية. بيانات حقيقية فقط (data.json). بدون مكتبات خارجية.
   كل الحركة transform/opacity، وتتعطل مع prefers-reduced-motion.
   =================================================================== */
(function(){
  "use strict";
  var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function(s, r){ return (r||document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  var clamp = function(v,a,b){ return Math.min(b, Math.max(a, v)); };
  var lang = function(){ return document.documentElement.lang === "en" ? "en" : "ar"; };

  /* ---------- نصوص الأقسام الجديدة ---------- */
  var T = {
    ar:{
      shop:"تسوّق العطور", wa:"كلّمنا واتساب", scroll:"اكتشف",
      railEy:"من التشكيلة", railT:"عطور تستاهل تشمّها", railP:"انطباعات عطرية مستوحاة من أشهر العطور. لكل عطر نوتاته وثباته وفوحانه مكتوبة بوضوح.",
      c1t:"انطباعات عطرية", c1p:"عطور مستوحاة من أشهر العطور العالمية. هي مو أصلية، وإيفوك غير تابعة لأي ماركة — وهذا مكتوب لك بوضوح.",
      c2t:"كل شي مكتوب لك", c2p:"النوتات والأكوردات والثبات والفوحان لكل عطر، قبل لا تطلب. تختار وإنت عارف وش تاخذ.",
      c3t:"ضمان إيفوك", c3p:"ما ناسبك العطر؟ ترجعه خلال يومين من الاستلام وتسترد المبلغ اللي دفعته فيه. التوصيل مجاني والدفع عند الاستلام.",
      rvEy:"من عملائنا", rvT:"قالوا عن إيفوك", rvCount:"من {n} تقييم لعملاء موثّقين", rvBadge:"عميل موثّق", rvInsp:"مستوحى من", rvPrev:"التقييم السابق", rvNext:"التقييم التالي", rvProof:"{n} تقييم موثّق", rvList:"تقييمات العملاء",
      c3a:"الشروط كاملة",
      s1:"عطر متوفر الآن", s2:"تقييم من عملاء موثّقين", s3:"سعر العطر 50مل", s4:"يوم لإرجاع العطر لو ما ناسبك",
      wT:"ضمان إيفوك", w1n:"٢", w1:"يومين من الاستلام لإرجاع العطر", w2n:"٨٥٪", w2:"أو أكثر لازم يبقى في العطر", w3n:"٣", w3:"أيام عمل ونرجع لك المبلغ بعد الفحص", wMore:"الشروط والاسترجاع كاملة",
      ann:"توصيل مجاني لكل الطلبات · خصم ١٥٪ عند شراء ٣ عطور أو أكثر", oT:"عروض إيفوك", o1t:"توصيل مجاني", o1s:"لكل الطلبات في الإمارات وعُمان", o2t:"خصم ١٥٪", o2s:"عند شراء ٣ عطور أو أكثر", o3t:"ضمان إيفوك", o3s:"ما ناسبك العطر؟ رجّعه خلال يومين من الاستلام",
      shopEy:"المتجر", shopT:"اختر عطرك", shopP:"ابحث بالاسم أو البراند، أو تصفّح حسب الفئة.",
      cur:"د.إ", curNote:"في عُمان "
    },
    en:{
      shop:"Shop fragrances", wa:"Chat on WhatsApp", scroll:"Discover",
      railEy:"The collection", railT:"Scents worth smelling", railP:"Fragrance impressions inspired by famous perfumes. Every scent lists its notes, longevity and projection clearly.",
      c1t:"Fragrance impressions", c1p:"Inspired by famous fragrances. They are not originals, and Evoque is not affiliated with any brand — we state it clearly.",
      c2t:"Everything written down", c2p:"Notes, accords, longevity and projection for every scent, before you order. You choose knowing what you get.",
      c3t:"Evoque Guarantee", c3p:"Doesn't suit you? Return it within 2 days of receiving it and get back what you paid for it. Free delivery, cash on delivery.",
      rvEy:"From our customers", rvT:"What they say about Evoque", rvCount:"from {n} verified customer reviews", rvBadge:"Verified customer", rvInsp:"Inspired by", rvPrev:"Previous review", rvNext:"Next review", rvProof:"{n} verified reviews", rvList:"Customer reviews",
      c3a:"Full terms",
      s1:"fragrances available now", s2:"verified customer reviews", s3:"per 50ml fragrance", s4:"days to return it if it doesn't suit you",
      wT:"Evoque Guarantee", w1n:"2", w1:"days from receipt to return the fragrance", w2n:"85%", w2:"or more must remain in the fragrance", w3n:"3", w3:"working days to refund you after inspection", wMore:"Full terms & returns",
      ann:"Free delivery on every order · 15% off when you buy 3 or more", oT:"Evoque offers", o1t:"Free delivery", o1s:"On every order in the UAE and Oman", o2t:"15% off", o2s:"When you buy 3 perfumes or more", o3t:"Evoque Guarantee", o3s:"Not for you? Return it within 2 days of delivery",
      shopEy:"The shop", shopT:"Choose your scent", shopP:"Search by name or brand, or browse by category.",
      cur:"AED", curNote:"in Oman "
    }
  };
  var DATA = [], STATS = {n:0,b:0,p:50,po:5};
  function applyText(){
    var t = T[lang()];
    $$("[data-t]").forEach(function(el){ var k = el.getAttribute("data-t"); if(t[k] != null) el.textContent = t[k]; });
    var l = $("#stat3Label"); if(l) l.textContent = t.s3 + " · " + (STATS.po ? (t.curNote + STATS.po + (lang()==="en"?" OMR":" ر.ع")) : "");
    var cur = $("#stat3Cur"); if(cur) cur.textContent = t.cur;
    var wa = $("#hxWa"), wh = $("#waHeaderBtn"); if(wa && wh && wh.href) wa.href = wh.href;
    renderReviews();
    var wf = $("#warrFull");
    if(wf){ try{ var w = I18N[lang()].warranty; wf.innerHTML = '<a href="terms.html">' + esc(t.wMore) + '</a>'; }catch(e){} }
  }

  /* ---------- تقييمات العملاء (حقيقية من reviews.json فقط) ---------- */
  var REVIEWS = [], rvTimer = null, rvPaused = false, rvVisible = false;
  function firstName(n){ return String(n || "").trim().split(/\s+/)[0] || ""; }
  function renderReviews(){
    var sec = $("#reviewsSec"), track = $("#rvTrack"); if(!sec || !track) return;
    var list = REVIEWS.filter(function(r){ return r && r.comment && +r.rating > 0; });
    if(list.length < 3){ sec.hidden = true; var pc = $("#hxProof"); if(pc) pc.hidden = true; return; }
    var t = T[lang()];
    var avg = list.reduce(function(a, r){ return a + (+r.rating || 0); }, 0) / list.length;
    var avgTxt = (Math.floor(avg * 10) / 10).toFixed(1); // تقريب للأسفل — ما نضخّم الرقم
    $("#rvAvg").textContent = avgTxt;
    $("#rvCount").textContent = t.rvCount.replace("{n}", list.length);
    var pr = $("#hxProof");
    if(pr){ pr.hidden = false; $("#hxProofAvg").textContent = avgTxt; $("#hxProofTxt").textContent = t.rvProof.replace("{n}", list.length); }
    var byId = {}; DATA.forEach(function(p){ byId[p.id] = p; });
    var shown = list.slice().sort(function(a, b){ return String(b.date || "").localeCompare(String(a.date || "")); }).slice(0, 24);
    track.setAttribute("aria-label", t.rvList);
    track.innerHTML = "";
    shown.forEach(function(r){
      var card = document.createElement("figure"); card.className = "rv-card"; card.setAttribute("role", "listitem");
      var st = document.createElement("div"); st.className = "rv-cstars"; var n = Math.max(0, Math.min(5, Math.round(+r.rating)));
      st.textContent = "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); st.setAttribute("aria-label", n + "/5");
      var q = document.createElement("blockquote"); q.className = "rv-q"; q.setAttribute("dir", "auto"); q.textContent = r.comment;
      var cap = document.createElement("figcaption"); cap.className = "rv-cap";
      var who = document.createElement("span"); who.className = "rv-who"; who.setAttribute("dir", "auto"); who.textContent = firstName(r.name);
      var vb = document.createElement("span"); vb.className = "rv-ver"; vb.textContent = t.rvBadge;
      cap.appendChild(who); cap.appendChild(vb);
      var p = byId[r.perfumeId];
      if(p){
        var a = document.createElement("a"); a.className = "rv-p"; a.href = "#shopStart"; a.setAttribute("data-q", p.name || "");
        var tc = function(x){ return String(x || "").toLowerCase().replace(/(^|[\s\-'’(])([a-z])/g, function(m, s1, c){ return s1 + c.toUpperCase(); }); };
        var nm = (lang() === "ar" && p.inspiredAr) ? p.inspiredAr : [tc(p.brand), tc(p.name)].filter(Boolean).join(" ");
        a.textContent = t.rvInsp + " " + nm; a.setAttribute("dir", "auto");
        a.addEventListener("click", function(e){ e.preventDefault(); goSearch(p.name || ""); });
        cap.appendChild(a);
      }
      card.appendChild(st); card.appendChild(q); card.appendChild(cap);
      track.appendChild(card);
    });
    $("#rvPrev").setAttribute("aria-label", t.rvPrev); $("#rvNext").setAttribute("aria-label", t.rvNext);
    sec.hidden = false; rvProgress();
  }
  function goSearch(q){
    var inp = $("#homeSearchInput");
    if(inp){ inp.value = q; inp.dispatchEvent(new Event("input", {bubbles:true})); }
    var t = $("#shopStart"); if(t) t.scrollIntoView({behavior: REDUCE ? "auto":"smooth", block:"start"});
  }
  function rvStep(dir){ // dir: +1 = التالي (بالاتجاه الطبيعي للقراءة)
    var tr = $("#rvTrack"); if(!tr || !tr.firstElementChild) return;
    var w = tr.firstElementChild.getBoundingClientRect().width + 16;
    var rtl = getComputedStyle(tr).direction === "rtl";
    var pos = Math.abs(tr.scrollLeft), max = tr.scrollWidth - tr.clientWidth;
    if(dir > 0 && pos >= max - 4){ tr.scrollTo({left:0, behavior: REDUCE ? "auto" : "smooth"}); return; }
    if(dir < 0 && pos <= 4){ tr.scrollTo({left:(rtl ? -1 : 1) * max, behavior: REDUCE ? "auto" : "smooth"}); return; }
    tr.scrollBy({left:(rtl ? -1 : 1) * dir * w, behavior: REDUCE ? "auto" : "smooth"});
  }
  function rvProgress(){
    var tr = $("#rvTrack"), bar = $("#rvBar"); if(!tr || !bar) return;
    var max = tr.scrollWidth - tr.clientWidth, k = max > 0 ? Math.abs(tr.scrollLeft) / max : 1;
    var vis = tr.scrollWidth > 0 ? tr.clientWidth / tr.scrollWidth : 1;
    bar.style.width = (Math.max(.16, vis) * 100) + "%";
    bar.style.transform = "translateX(" + ((getComputedStyle(tr).direction === "rtl" ? -1 : 1) * k * (1 / Math.max(.16, vis) - 1) * 100) + "%)";
  }
  function initReviewsUI(){
    var tr = $("#rvTrack"), sec = $("#reviewsSec"); if(!tr || !sec) return;
    $("#rvPrev").addEventListener("click", function(){ rvStep(-1); });
    $("#rvNext").addEventListener("click", function(){ rvStep(1); });
    tr.addEventListener("scroll", function(){ requestAnimationFrame(rvProgress); }, {passive:true});
    window.addEventListener("resize", rvProgress);
    ["pointerenter","focusin","touchstart"].forEach(function(ev){ sec.addEventListener(ev, function(){ rvPaused = true; }, {passive:true}); });
    ["pointerleave","focusout"].forEach(function(ev){ sec.addEventListener(ev, function(){ rvPaused = false; }); });
    tr.addEventListener("keydown", function(e){
      if(e.key === "ArrowLeft"){ e.preventDefault(); rvStep(getComputedStyle(tr).direction === "rtl" ? 1 : -1); }
      if(e.key === "ArrowRight"){ e.preventDefault(); rvStep(getComputedStyle(tr).direction === "rtl" ? -1 : 1); }
    });
    if("IntersectionObserver" in window){
      new IntersectionObserver(function(es){ rvVisible = es[0].isIntersecting; }, {threshold:.35}).observe(sec);
    }
    if(!REDUCE){
      rvTimer = setInterval(function(){ if(rvVisible && !rvPaused && !document.hidden) rvStep(1); }, 5200);
    }
  }

  /* ---------- القارورة (تصميم أصلي، مو قارورة ماركة) ---------- */
  function bottleSVG(){
    var mist = "";
    var pts = [[34,-40,0],[50,-70,.5],[70,-30,1],[90,-60,1.6],[44,-96,2.1],[110,-86,2.7],[64,-12,3.2],[126,-48,3.8]];
    pts.forEach(function(p){ mist += '<circle cx="206" cy="58" r="'+(5+(p[2]*2)%7)+'" style="--mx:'+p[0]+'px;--my:'+p[1]+'px;animation-delay:'+p[2]+'s"/>'; });
    return '<svg viewBox="0 0 300 440" aria-hidden="true" focusable="false">'+
    '<defs>'+
    '<linearGradient id="gGlass" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".18" stop-color="#fff" stop-opacity=".07"/><stop offset=".6" stop-color="#fff" stop-opacity=".03"/><stop offset=".88" stop-color="#fff" stop-opacity=".13"/><stop offset="1" stop-color="#fff" stop-opacity=".42"/></linearGradient>'+
    '<linearGradient id="gLiq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6F9A86"/><stop offset=".45" stop-color="#2B5244"/><stop offset="1" stop-color="#12261F"/></linearGradient>'+
    '<linearGradient id="gCap" x1="0" x2="1"><stop offset="0" stop-color="#18231F"/><stop offset=".28" stop-color="#2B5244"/><stop offset=".62" stop-color="#12261F"/><stop offset="1" stop-color="#0F1814"/></linearGradient>'+
    '<linearGradient id="gCollar" x1="0" x2="1"><stop offset="0" stop-color="#56625B"/><stop offset=".3" stop-color="#DDE6DA"/><stop offset=".58" stop-color="#B8653F"/><stop offset="1" stop-color="#56625B"/></linearGradient>'+
    '<clipPath id="bodyClip"><rect x="54" y="164" width="192" height="248" rx="27"/></clipPath>'+
    '<filter id="fBlur"><feGaussianBlur stdDeviation="6"/></filter>'+
    '</defs>'+
    '<ellipse cx="150" cy="424" rx="104" ry="10" fill="#000" opacity=".4" filter="url(#fBlur)"/>'+
    '<rect x="50" y="160" width="200" height="256" rx="30" fill="#DDE6DA" fill-opacity=".1"/>'+
    '<g clip-path="url(#bodyClip)"><path class="liq" d="M-110 220 q40 -18 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 V440 H-110 Z" fill="url(#gLiq)"/>'+
    '<rect x="66" y="176" width="13" height="212" rx="6.5" fill="#fff" opacity=".22"/><rect x="222" y="190" width="6" height="170" rx="3" fill="#fff" opacity=".14"/></g>'+
    '<rect x="88" y="256" width="124" height="104" rx="8" fill="#F5F3EE" opacity=".96"/>'+
    '<text x="150" y="308" text-anchor="middle" font-family="Aref Ruqaa,serif" font-weight="700" font-size="44" fill="#1F3D33">إيفوك</text>'+
    '<line x1="122" y1="322" x2="178" y2="322" stroke="#B8653F" stroke-width="1.2"/>'+
    '<text x="150" y="342" text-anchor="middle" font-family="Cormorant Garamond,serif" font-weight="600" font-size="12.5" letter-spacing="5" fill="#1F3D33">EVOQUE</text>'+
    '<rect x="50" y="160" width="200" height="256" rx="30" fill="url(#gGlass)" stroke="#F5F3EE" stroke-opacity=".5" stroke-width="1.5"/>'+
    '<rect x="124" y="112" width="52" height="26" fill="url(#gGlass)" stroke="#F5F3EE" stroke-opacity=".4"/>'+
    '<rect x="110" y="132" width="80" height="34" rx="7" fill="url(#gCollar)"/>'+
    '<rect x="100" y="34" width="100" height="100" rx="14" fill="url(#gCap)"/>'+
    '<rect x="100" y="34" width="100" height="10" rx="5" fill="#fff" opacity=".1"/>'+
    '<rect x="111" y="46" width="8" height="78" rx="4" fill="#fff" opacity=".17"/>'+
    '<g class="mist">'+mist+'</g>'+
    '</svg>';
  }

  /* ---------- اختيار عطور حقيقية موزعة على القائمة ---------- */
  function spread(list, k){
    var out = [], n = list.length; if(!n) return out;
    var step = n / k;
    for(var i=0;i<k;i++){ var p = list[Math.floor(i*step) % n]; if(out.indexOf(p) < 0) out.push(p); }
    return out;
  }
  var img = function(p){ return p.photo ? p.photo : "assets/cards/" + encodeURIComponent(p.id) + ".webp"; };
  var esc = function(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };

  function buildHero(inStock){
    var b = $("#hxBottle"); if(b && !b.firstChild) b.innerHTML = bottleSVG();
    var pk = spread(inStock, 7);
    var a = $("#hxCardA"), c = $("#hxCardB");
    if(a && pk[1]) a.innerHTML = '<img src="'+esc(img(pk[1]))+'" alt="" width="1080" height="1350" decoding="async">';
    if(c && pk[4]) c.innerHTML = '<img src="'+esc(img(pk[4]))+'" alt="" width="1080" height="1350" decoding="async">';
  }
  function buildStory(inStock){
    var vis = $("#storyVis"); if(!vis) return;
    var pk = spread(inStock, 9), rots = [-5, 4, -3], idx = [0, 3, 6];
    vis.innerHTML = idx.map(function(ix, i){
      var p = pk[ix] || pk[0]; if(!p) return "";
      return '<div class="sv-card'+(i===0?' on':'')+'" style="--r:'+rots[i]+'deg"><img src="'+esc(img(p))+'" alt="" loading="lazy" decoding="async"></div>';
    }).join("");
  }
  function buildRail(inStock){
    var rows = [$("#rail1"), $("#rail2")]; if(!rows[0]) return;
    var pk = spread(inStock, 28);
    function html(arr){ return arr.map(function(p){ return '<a href="#shopStart" data-q="'+esc(p.name)+'" aria-label="'+esc(p.displayName||p.name)+'"><img src="'+esc(img(p))+'" alt="" loading="lazy" decoding="async" width="1080" height="1350"></a>'; }).join(""); }
    rows[0].innerHTML = html(pk.slice(0,14)); rows[1].innerHTML = html(pk.slice(14,28));
    $$(".rail a").forEach(function(a){
      a.addEventListener("click", function(e){
        e.preventDefault();
        goSearch(a.getAttribute("data-q"));
      });
    });
  }
  function buildStats(){
    var host = $("#stat1"); if(host) host.setAttribute("data-count", STATS.n);
    var s2 = $("#stat2"); if(s2) s2.setAttribute("data-count", STATS.r || 0);
    var s3 = $("#stat3"); if(s3) s3.setAttribute("data-count", STATS.p);
    var s4 = $("#stat4"); if(s4) s4.setAttribute("data-count", 2);
    $$(".stat .n").forEach(function(el){ if(REDUCE) el.firstChild.nodeValue = el.getAttribute("data-count"); else watch(el); });
  }

  /* ---------- عدّاد الأرقام ---------- */
  function countUp(el){
    el.setAttribute("data-done", "1");
    var to = +el.getAttribute("data-count") || 0, t0 = null, dur = 1700;
    function step(ts){
      if(t0 === null) t0 = ts;
      var k = clamp((ts - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      el.firstChild.nodeValue = String(Math.round(to * e));
      if(k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- الظهور عند التمرير ---------- */
  var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting) return;
      var el = e.target; io.unobserve(el);
      if(el.hasAttribute("data-count")) countUp(el);
      else el.classList.add("in");
    });
  }, {threshold:.12, rootMargin:"0px 0px -6% 0px"}) : null;
  function watch(el){ if(!io){ el.classList.add("in"); return; } io.observe(el); }

  function watchCards(){
    var grid = $("#grid"); if(!grid) return;
    function tag(card, i){ card.style.setProperty("--d", (i % 6) * 0.07 + "s"); watch(card); }
    function sweep(){ $$(".card:not([data-w])", grid).forEach(function(c, i){ c.setAttribute("data-w","1"); tag(c, i); }); }
    sweep();
    new MutationObserver(sweep).observe(grid, {childList:true});
  }

  /* ---------- محرك التمرير ---------- */
  var heroEl, hdr, prog, markEl, bottleEl, cardA, cardB, storyEl, railSec, rail1, rail2, teaser, ticking = false;
  function onScroll(){ if(ticking) return; ticking = true; requestAnimationFrame(update); }
  function update(){
    ticking = false;
    var y = window.pageYOffset, vh = window.innerHeight;
    var doc = document.documentElement, max = doc.scrollHeight - vh;
    if(prog) prog.style.transform = "scaleX(" + (max > 0 ? clamp(y / max, 0, 1) : 0) + ")";
    if(hdr){ hdr.classList.toggle("scrolled", y > 24); doc.style.setProperty("--hh", hdr.offsetHeight + "px"); }
    if(REDUCE) return;

    if(heroEl){
      var hr = heroEl.getBoundingClientRect();
      if(hr.bottom > -50){
        var s = clamp(-hr.top, 0, vh * 1.2);
        if(markEl) markEl.style.transform = "translate3d(0," + (s * .12) + "px,0) rotate(" + (s * .04) + "deg)";
        if(bottleEl) bottleEl.style.transform = "translate3d(0," + (-s * .16) + "px,0) rotate(" + (s * .012) + "deg)";
        if(cardA) cardA.style.transform = "translate3d(0," + (-s * .3) + "px,0) rotate(" + (-8 - s * .012) + "deg)";
        if(cardB) cardB.style.transform = "translate3d(0," + (-s * .08) + "px,0) rotate(" + (7 + s * .01) + "deg)";
      }
    }
    if(storyEl){
      var sr = storyEl.getBoundingClientRect(), span = sr.height - vh + 56;
      if(sr.top < vh && sr.bottom > 0){
        var p = clamp(-sr.top / span, 0, .999), ch = Math.floor(p * 3) + 1;
        if(storyEl.getAttribute("data-ch") !== String(ch)){
          storyEl.setAttribute("data-ch", ch);
          $$(".ch", storyEl).forEach(function(c, i){ c.classList.toggle("on", i === ch - 1); });
          $$(".sv-card", storyEl).forEach(function(c, i){ c.classList.toggle("on", i === ch - 1); });
          $$(".story-dots i", storyEl).forEach(function(c, i){ c.classList.toggle("on", i === ch - 1); });
        }
      }
    }
    if(railSec && rail1 && rail2){
      var rr = railSec.getBoundingClientRect();
      if(rr.top < vh && rr.bottom > 0){
        var off = (vh - rr.top) * .38;
        var w2 = rail2.scrollWidth, vw = doc.clientWidth;
        rail1.style.transform = "translate3d(" + (-520 + off) + "px,0,0)";
        rail2.style.transform = "translate3d(" + (-(w2 - vw) + 520 - off) + "px,0,0)";
      }
    }
    if(teaser){
      var tr = teaser.getBoundingClientRect();
      if(tr.top < vh && tr.bottom > 0){
        var q = (vh - tr.top);
        teaser.style.setProperty("--tp", q.toFixed(0));
        var bg = teaser.querySelector(".teaser-bg");
        if(bg) bg.style.transform = "translate3d(0," + (q * -.12) + "px,0) rotate(" + (q * .02) + "deg)";
      }
    }
  }

  /* ---------- تشغيل ---------- */
  function init(){
    heroEl = $("#hero"); hdr = $("header.hdr"); prog = $(".scroll-progress i");
    markEl = $(".hx-mark"); bottleEl = $("#hxBottle"); cardA = $("#hxCardA"); cardB = $("#hxCardB");
    storyEl = $("#story"); railSec = $("#railSec"); rail1 = $("#rail1"); rail2 = $("#rail2"); teaser = $(".teaser");
    $$("[data-reveal]").forEach(function(el){ watch(el); });
    if(REDUCE) $$("[data-reveal]").forEach(function(el){ el.classList.add("in"); });
    var bgNode = teaser && teaser.querySelector(".teaser-bg");
    if(bgNode && REDUCE) bgNode.style.transform = "none";
    window.addEventListener("scroll", onScroll, {passive:true});
    window.addEventListener("resize", onScroll);
    new MutationObserver(applyText).observe(document.documentElement, {attributes:true, attributeFilter:["lang"]});
    watchCards(); initReviewsUI();
    var hw = $("#hxWa"); if(hw) hw.addEventListener("click", function(){ var wh = $("#waHeaderBtn"); if(wh && wh.href) hw.href = wh.href; });
    applyText(); update();

    fetch("data.json").then(function(r){ return r.json(); }).then(function(d){
      DATA = Array.isArray(d) ? d : (d.products || []);
      var inStock = DATA.filter(function(p){ return (+p.stock50 || 0) > 0; });
      if(!inStock.length) inStock = DATA;
      var brands = {}; DATA.forEach(function(p){ if(p.brand) brands[p.brand] = 1; });
      STATS.n = inStock.length; STATS.b = Object.keys(brands).length;
      STATS.p = +(DATA.find(function(p){ return +p.price50 > 0; }) || {}).price50 || 50;
      STATS.po = +(DATA.find(function(p){ return +p.price50Om > 0; }) || {}).price50Om || 0;
      buildHero(inStock); buildStory(inStock); buildRail(inStock); buildStats(); applyText();
      update();
      return fetch("reviews.json").then(function(r){ return r.ok ? r.json() : []; }).then(function(rv){
        REVIEWS = Array.isArray(rv) ? rv.filter(function(r){ return r && r.visible !== false; }) : [];
        renderReviews();
        STATS.r = REVIEWS.filter(function(r){ return r && r.comment && +r.rating > 0; }).length;
        var s2 = $("#stat2");
        if(s2){ s2.setAttribute("data-count", STATS.r); if(REDUCE || s2.hasAttribute("data-done")) s2.firstChild.nodeValue = String(STATS.r); }
        if(!STATS.r){ var st = s2 && s2.closest(".stat"); if(st) st.style.display = "none"; }
      }).catch(function(){});
    }).catch(function(){ buildHero([]); });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
