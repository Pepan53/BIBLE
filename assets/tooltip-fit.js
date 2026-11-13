/* Nápovědy „?“ (.help-icon .tooltip) se vždy vejdou na obrazovku.
   Když se nápověda zobrazí, spočítá se její poloha vůči oknu: posune se doleva/doprava,
   aby nepřetekla přes okraj, na úzké obrazovce se zúží a když se nevejde dolů, ukáže se nad ikonou.
   Šipka dál míří na ikonu „?“. Stačí stránku načíst s tímto skriptem – nic dalšího se nenastavuje. */
(function(){
  const M = 8;   // minimální odstup od okraje obrazovky
  const st = document.createElement("style");
  st.textContent =
    ".help-icon .tooltip.tip-fit{position:fixed!important;transform:none!important;right:auto!important;bottom:auto!important;margin:0!important;box-sizing:border-box;z-index:2000!important}" +
    ".help-icon .tooltip.tip-fit::after{left:var(--tip-ax,50%)!important;right:auto!important;transform:translateX(-50%)!important}" +
    ".help-icon .tooltip.tip-fit.tip-up::after{bottom:auto!important;top:100%!important;border-bottom-color:transparent!important;border-top-color:var(--tooltip-bg,#2c2317)!important}";
  document.head.appendChild(st);

  function fit(icon){
    const tip = icon && icon.querySelector(".tooltip");
    if(!tip) return;
    if(getComputedStyle(tip).display === "none"){ tip.classList.remove("tip-fit", "tip-up"); tip.style.width = ""; return; }
    tip.classList.add("tip-fit"); tip.classList.remove("tip-up");
    tip.style.width = ""; tip.style.left = "0px"; tip.style.top = "0px";
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    let w = tip.offsetWidth;
    if(w > vw - 2 * M){ w = vw - 2 * M; tip.style.width = w + "px"; }
    const r = icon.getBoundingClientRect(), cx = r.left + r.width / 2;
    const left = Math.min(Math.max(cx - w / 2, M), vw - M - w);
    const h = tip.offsetHeight;
    let top = r.bottom + 10;
    if(top + h > vh - M && r.top - 10 - h >= M){ top = r.top - 10 - h; tip.classList.add("tip-up"); }
    tip.style.left = left + "px"; tip.style.top = top + "px";
    tip.style.setProperty("--tip-ax", Math.min(Math.max(cx - left, 14), w - 14) + "px");
  }
  const later = icon => requestAnimationFrame(() => fit(icon));
  const fromEvent = e => { const i = e.target && e.target.closest && e.target.closest(".help-icon"); if(i) later(i); };
  document.addEventListener("mouseover", fromEvent);
  document.addEventListener("focusin", fromEvent);
  document.addEventListener("click", () => requestAnimationFrame(fitAll), true);
  // ikony, které nápovědu otevírají přidáním třídy „tooltip-open“
  new MutationObserver(ms => ms.forEach(m => { if(m.target.classList && m.target.classList.contains("help-icon")) later(m.target); }))
    .observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["class"] });
  function fitAll(){ document.querySelectorAll(".help-icon .tooltip.tip-fit, .help-icon.tooltip-open").forEach(el => fit(el.closest(".help-icon"))); }
  window.addEventListener("scroll", fitAll, { passive: true });
  window.addEventListener("resize", fitAll);
})();
