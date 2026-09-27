/* ============================================================
   Tlačítka 🏠 Domů, 📅 Denní text a 🌙 Vzhled:
   – nahoře stránky sedí v záhlaví vedle nadpisu (v rámci sloupce stránky),
   – při posunu dolů zůstanou vidět: buď se přesunou do lepicí lišty
     s hledáním (když ji stránka má), nebo se přichytí nahoře
     u okrajů sloupce stránky (ne u okrajů obrazovky).
   Stačí vložit <script src="assets/nav-dock.js"></script> na konec stránky.
   ============================================================ */
(function(){
  const home=document.getElementById("homeBtn"),
        daily=document.getElementById("dailyTextBtn"),
        theme=document.getElementById("themeToggle");
  const header=document.querySelector(".wrap > header") || document.querySelector("header");
  const wrap=header && header.closest(".wrap");
  if(!header || !wrap || !(home||daily||theme)) return;

  const css=document.createElement("style");
  css.textContent=`
  .nav-slot{position:absolute;top:8px;display:flex;gap:8px;z-index:5000}
  .nav-slot.nav-l{left:0} .nav-slot.nav-r{right:0}
  .nav-slot.float{position:fixed;top:12px}
  .nav-slot > .home-btn,.nav-slot > .theme-toggle-btn,.nav-slot > .daily-text-btn,
  .nav-inrow.home-btn,.nav-inrow.theme-toggle-btn,.nav-inrow.daily-text-btn{
    position:static !important;flex:0 0 auto;width:36px !important;height:36px !important;font-size:1em !important;margin:0}
  header.nav-docked{position:relative}
  header.nav-docked h1{padding-left:88px;padding-right:88px}
  header.nav-docked.nav-hasleft h1{padding-left:88px}
  @media (min-width:900px){ header.nav-docked h1,header.nav-docked.nav-hasleft h1{padding-left:100px;padding-right:100px} }
  @media (max-width:480px){
    .nav-slot{top:4px;gap:6px}
    .nav-slot.float{top:8px}
    .nav-slot > .home-btn,.nav-slot > .theme-toggle-btn,.nav-slot > .daily-text-btn,
    .nav-inrow.home-btn,.nav-inrow.theme-toggle-btn,.nav-inrow.daily-text-btn{width:34px !important;height:34px !important}
    header.nav-docked h1{padding-left:80px;padding-right:80px}
    header.nav-docked.nav-hasleft h1{padding-left:80px}
  }`;
  document.head.appendChild(css);

  const L=document.createElement("div"); L.className="nav-slot nav-l";
  const R=document.createElement("div"); R.className="nav-slot nav-r";
  header.classList.add("nav-docked");
  if(home) header.classList.add("nav-hasleft");
  header.prepend(L, R);

  // lepicí lišta s hledáním (např. Ježíšův rodokmen)
  const controls=document.querySelector(".controls");
  const stickyRow=controls && getComputedStyle(controls).position==="sticky"
    ? controls.querySelector(".row, .tools") : null;
  const search=stickyRow && stickyRow.querySelector("input[type=search], .search");

  function toHeader(){
    if(home) L.append(home);
    [daily,theme].forEach(b=>{ if(b) R.append(b); });
    [home,daily,theme].forEach(b=>b&&b.classList.remove("nav-inrow")); if(stickyRow) stickyRow.classList.remove("nav-has");
  }
  function toRow(){
    if(home){ stickyRow.insertBefore(home, search || stickyRow.firstChild); }
    const after=search ? search.nextSibling : null;
    [daily,theme].forEach(b=>{ if(b) stickyRow.insertBefore(b, after); });
    [home,daily,theme].forEach(b=>b&&b.classList.add("nav-inrow")); stickyRow.classList.add("nav-has");
  }

  let mode=null;
  function update(){
    const s=parseFloat(getComputedStyle(wrap).paddingLeft)||0;
    const wr=wrap.getBoundingClientRect();
    const hTop=header.getBoundingClientRect().top;
    const floatTop=window.innerWidth<=480?8:12, slotTop=window.innerWidth<=480?4:8;
    let m;
    if(stickyRow){
      const stuck=controls.getBoundingClientRect().top<=1 && window.scrollY>0;
      m = stuck ? "row" : "header";
    } else {
      m = (hTop+slotTop < floatTop) ? "float" : "header";
    }
    if(m!==mode){
      if(m==="row") toRow(); else { if(mode==="row"||mode===null) toHeader(); }
      L.classList.toggle("float", m==="float"); R.classList.toggle("float", m==="float");
      mode=m;
    }
    // v záhlaví: tlačítka svisle na střed prvního řádku nadpisu
    const h1=header.querySelector("h1");
    if(h1 && m!=="float"){
      const cs=getComputedStyle(h1), fs=parseFloat(cs.fontSize)||24;
      const lh=parseFloat(cs.lineHeight)||fs*1.2, bh=(L.firstElementChild||R.firstElementChild||{offsetHeight:36}).offsetHeight||36;
      const t=Math.max(0, h1.offsetTop + parseFloat(cs.paddingTop||0) + (lh-bh)/2);
      L.style.top=R.style.top=t+"px";
    } else if(m==="float"){ L.style.top=R.style.top=""; }
    if(m==="float"){
      L.style.left=(wr.left+s)+"px";
      R.style.right=(document.documentElement.clientWidth-wr.right+(parseFloat(getComputedStyle(wrap).paddingRight)||0))+"px";
    } else { L.style.left=""; R.style.right=""; }
  }
  let raf=0;
  const req=()=>{ if(!raf) raf=requestAnimationFrame(()=>{ raf=0; update(); }); };
  window.addEventListener("scroll", req, {passive:true});
  window.addEventListener("resize", req);
  update();
})();
