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
  }).catch(function(){});
})();
