// يملأ أرقام رسوم التوصيل بالصفحات الثابتة (الشروط…) من shipping-rates.json — المصدر الوحيد للأرقام.
// أي عنصر عليه data-rate="AE.standard" (أو AE.western / OM.door / OM.nool) يُعبّأ تلقائيًا.
(function(){
  var cur = { AE: "درهم", OM: "ريال عُماني" };
  fetch("shipping-rates.json").then(function(r){ return r.json(); }).then(function(d){
    document.querySelectorAll("[data-rate]").forEach(function(el){
      var p = el.getAttribute("data-rate").split(".");
      var v = d[p[0]] && d[p[0]][p[1]];
      if(typeof v === "number") el.textContent = v + " " + cur[p[0]];
    });
    // نسبة الخصم وأقل عدد (من لوحة التحكم)
    var ar = function(n){ return String(n).replace(/\d/g, function(x){ return "٠١٢٣٤٥٦٧٨٩"[x]; }); };
    if(d.offers) document.querySelectorAll("[data-offer]").forEach(function(el){
      var v = d.offers[el.getAttribute("data-offer")]; if(typeof v === "number") el.textContent = ar(v);
    });
    if(d.offers && !(Number(d.offers.discountPct) > 0)) document.querySelectorAll("[data-offer-para]").forEach(function(el){ el.style.display = "none"; });
  }).catch(function(){});
})();
