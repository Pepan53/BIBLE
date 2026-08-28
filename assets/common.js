/* ============================================================
   Sdílená logika pro celý web (rozcestník + obě hry):
   světlý/tmavý režim, skóre s historií po dnech, připomínka
   denního textu. Vše se ukládá do localStorage stejnými klíči,
   takže je to společné napříč všemi stránkami webu.
   ============================================================ */
(function(){

  // ---------- SVĚTLÝ / TMAVÝ REŽIM ----------
  const THEME_KEY = "bibleGameTheme";

  function loadExplicitTheme(){
    try{
      const saved = localStorage.getItem(THEME_KEY);
      return (saved === "dark" || saved === "classic") ? saved : null;
    }catch(err){ return null; }
  }
  function saveExplicitTheme(theme){
    try{ localStorage.setItem(THEME_KEY, theme); }catch(err){}
  }
  function systemPrefersDark(){
    try{ return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches); }
    catch(err){ return false; }
  }

  let explicitTheme = loadExplicitTheme();
  let currentTheme = explicitTheme || (systemPrefersDark() ? "dark" : "classic");
  const themeToggleBtn = document.getElementById("themeToggle");

  const THEME_META = {
    classic: { icon: "🌙", label: "Přepnout na tmavé zobrazení" },
    dark:    { icon: "☀️", label: "Přepnout na světlé zobrazení" }
  };

  function applyTheme(theme){
    if(theme === "dark"){
      document.documentElement.setAttribute("data-theme", "dark");
    }else{
      document.documentElement.removeAttribute("data-theme");
    }
    if(themeToggleBtn){
      const meta = THEME_META[theme] || THEME_META.classic;
      themeToggleBtn.textContent = meta.icon;
      themeToggleBtn.title = meta.label;
      themeToggleBtn.setAttribute("aria-label", meta.label);
    }
  }
  applyTheme(currentTheme);

  if(themeToggleBtn){
    themeToggleBtn.addEventListener("click", ()=>{
      currentTheme = (currentTheme === "dark") ? "classic" : "dark";
      explicitTheme = currentTheme;
      saveExplicitTheme(currentTheme);
      applyTheme(currentTheme);
    });
  }

  // Dokud hráč vzhled sám nezvolil, sleduj systémové přepnutí tmavý/světlý.
  try{
    if(!explicitTheme && window.matchMedia){
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e)=>{
        if(explicitTheme) return;
        currentTheme = e.matches ? "dark" : "classic";
        applyTheme(currentTheme);
      });
    }
  }catch(err){}

  // ---------- BODOVÁNÍ + HISTORIE PO DNECH ----------
  const POINTS_WRONG = 1;
  const HISTORY_STORAGE_KEY = "bibleOrderGameHistory";

  function todayKey(){
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }
  function formatDateLabel(iso){
    const parts = iso.split("-");
    if(parts.length !== 3) return iso;
    return parts[2] + ". " + parts[1] + ". " + parts[0];
  }
  function loadHistory(){
    try{
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if(!raw) return {};
      const data = JSON.parse(raw);
      return (data && typeof data === "object") ? data : {};
    }catch(e){}
    return {};
  }
  function saveHistory(){
    try{ localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(gameHistory)); }catch(e){}
  }

  let gameHistory = loadHistory();
  const TODAY = todayKey();
  if(!gameHistory[TODAY]) gameHistory[TODAY] = { score: 0, maxPossible: 0 };

  let totalScore = gameHistory[TODAY].score;
  const globalScoreValue = document.getElementById("globalScoreValue");
  if(globalScoreValue) globalScoreValue.textContent = totalScore;

  function addPoints(delta, maxPossibleForRound){
    totalScore = Math.max(0, totalScore + delta);
    if(globalScoreValue){
      globalScoreValue.textContent = totalScore;
      globalScoreValue.classList.remove("score-pop");
      void globalScoreValue.offsetWidth;
      globalScoreValue.classList.add("score-pop");
    }
    gameHistory[TODAY].score = totalScore;
    gameHistory[TODAY].maxPossible += (maxPossibleForRound || 0);
    saveHistory();
  }

  // Spočítá a připíše body za jedno kolo; vrátí text k připojení do verdiktu.
  function awardPoints(correctCount, totalCount, perfectBonus, pointsPerCorrect){
    const perCorrect = pointsPerCorrect || 2;
    const wrongCount = Math.max(0, totalCount - correctCount);
    const isPerfect = correctCount === totalCount;
    let gained = correctCount * perCorrect - wrongCount * POINTS_WRONG;
    if(isPerfect) gained += (perfectBonus || 0);
    const maxPossible = totalCount * perCorrect + (perfectBonus || 0);
    addPoints(gained, maxPossible);
    return " Získáváš " + gained + " bodů z " + maxPossible + " možných.";
  }

  // ---------- HISTORIE — modální okno ----------
  const historyModal = document.getElementById("historyModal");
  const historyContent = document.getElementById("historyContent");

  function renderHistory(){
    if(!historyContent) return;
    const dates = Object.keys(gameHistory).sort().reverse();
    if(dates.length === 0){
      historyContent.innerHTML = '<p class="hint">Zatím žádná historie — zahraj si aspoň jedno kolo a vrať se sem.</p>';
      return;
    }
    const rows = dates.map(date=>{
      const entry = gameHistory[date];
      const score = entry.score || 0;
      const maxPossible = entry.maxPossible || 0;
      const missed = Math.max(0, maxPossible - score);
      const hasData = maxPossible > 0;
      const pct = hasData ? Math.round((score / maxPossible) * 100) : null;
      const pctClass = pct === null ? "" : (pct >= 70 ? "pct-good" : (pct < 40 ? "pct-bad" : ""));
      const pctText = pct === null ? "–" : pct + " %";
      const isToday = date === TODAY;
      const label = formatDateLabel(date) + (isToday ? " (dnes)" : "");
      const dailyTextMark = entry.dailyTextRead ? '<span class="pct-good">✓</span>' : "–";
      return "<tr" + (isToday ? ' class="today-row"' : "") + "><td>" + label + "</td><td>" + score + "</td><td>" + missed + "</td><td class=\"" + pctClass + "\">" + pctText + "</td><td>" + dailyTextMark + "</td></tr>";
    }).join("");
    historyContent.innerHTML =
      '<table class="history-table"><thead><tr><th>Datum</th><th>Skóre</th><th>Nezískáno</th><th>Úspěšnost</th><th>Denní text</th></tr></thead><tbody>' +
      rows + "</tbody></table>";
  }
  function openHistory(){ renderHistory(); if(historyModal) historyModal.classList.add("show"); }
  function closeHistory(){ if(historyModal) historyModal.classList.remove("show"); }

  const historyBtn = document.getElementById("historyBtn");
  const historyClose = document.getElementById("historyClose");
  if(historyBtn) historyBtn.addEventListener("click", openHistory);
  if(historyClose) historyClose.addEventListener("click", closeHistory);
  if(historyModal) historyModal.addEventListener("click", (e)=>{ if(e.target === historyModal) closeHistory(); });

  // ---------- DENNÍ TEXT — připomínka (odkaz na wol.jw.org, netisknu žádný citát) ----------
  const CZ_WEEKDAYS = ["Neděle","Pondělí","Úterý","Středa","Čtvrtek","Pátek","Sobota"];
  const CZ_MONTHS_GEN = ["ledna","února","března","dubna","května","června","července","srpna","září","října","listopadu","prosince"];
  function formatDailyTitle(d){
    return CZ_WEEKDAYS[d.getDay()] + " " + d.getDate() + ". " + CZ_MONTHS_GEN[d.getMonth()] + " " + d.getFullYear();
  }
  function dailyTextUrl(d){
    return "https://wol.jw.org/cs/wol/dt/r29/lp-b/" + d.getFullYear() + "/" + (d.getMonth()+1) + "/" + d.getDate();
  }

  const dailyTextModal = document.getElementById("dailyTextModal");
  const dailyTextTitle = document.getElementById("dailyTextTitle");
  let remindBeforeNextRound = false;
  let laterTimer = null;
  const LATER_REMIND_MS = 15 * 60 * 1000;
  const DAILY_SNOOZE_KEY = "bibleGameDailyTextSnoozeUntil";

  function loadSnoozeUntil(){
    try{
      const raw = localStorage.getItem(DAILY_SNOOZE_KEY);
      const ts = raw ? parseInt(raw, 10) : NaN;
      return isNaN(ts) ? null : ts;
    } catch(e){ return null; }
  }
  function saveSnoozeUntil(ts){ try{ localStorage.setItem(DAILY_SNOOZE_KEY, String(ts)); } catch(e){} }
  function clearSnoozeUntil(){ try{ localStorage.removeItem(DAILY_SNOOZE_KEY); } catch(e){} }
  function clearLaterTimer(){ if(laterTimer){ clearTimeout(laterTimer); laterTimer = null; } }
  function scheduleLaterReminder(delayMs){
    clearLaterTimer();
    const delay = (typeof delayMs === "number") ? delayMs : LATER_REMIND_MS;
    laterTimer = setTimeout(()=>{
      laterTimer = null;
      clearSnoozeUntil();
      if(!isDailyTextReadToday()) openDailyTextModal();
    }, delay);
  }
  function isDailyTextReadToday(){ return !!(gameHistory[TODAY] && gameHistory[TODAY].dailyTextRead); }
  function markDailyTextRead(){
    gameHistory[TODAY].dailyTextRead = true;
    saveHistory();
    remindBeforeNextRound = false;
    clearLaterTimer();
    clearSnoozeUntil();
  }
  function clearDailyTextRead(){ gameHistory[TODAY].dailyTextRead = false; saveHistory(); }

  // 365 krátkých vlastních shrnutí (jedno na den v roce) — vlastní pomůcka
  // k zapamatování hlavní myšlenky, nejde o citát ani komentář z knihy.
  const DAILY_WORDS = ["Duchovní růst", "Přátelství s Jehovou", "Cadokova odvaha", "Následky neposlušnosti", "Radost z poslušnosti", "Uzdravení zraněného srdce", "Naděje na vzkříšení", "Trpělivost s nespravedlností", "Starostlivý Ježíš", "Dluh hříchu", "Čest kázat", "Chvála manželce", "Jehovovo vedení", "Boží sláva", "Úcta k organizaci", "Důvěra ve vedení", "Osobní víra", "Trpělivé školení", "Davidova moudrost", "Náprava vztahu", "Rozhodnutí pro křest", "Boží odpuštění", "Pravá pokora", "Radost ze služby", "Příprava na manželství", "Řešení neshod", "Pevnost ve víře", "Milosrdný Otec", "Zdravý úsudek", "Trpělivá láska", "Moudré rozlišování", "Duch pokoje", "Kristova péče o nás", "Boží odpuštění", "Naděje na vzkříšení", "Duchovní priority", "Duchovní zralost", "Přátelství s Bohem", "Odvaha k neutralitě", "Naděje navzdory hříchu", "Čas na Bibli", "Respekt k svědomí", "Útěcha v úzkosti", "Boží spravedlnost", "Zázrak nasycení", "Chvála za uzdravení", "Dar výkupného", "Odvaha ke křtu", "Vstřebat Boží slovo", "Důvěra ve starší", "Oddělení ovcí a koz", "Živý Bůh", "Důvěra v organizaci", "Pokání a odpuštění", "Prostý život", "Bdělost před pádem", "Dar v podobě bratrů", "Moudrost chrání", "Víra posílená důkazy", "Boží spravedlivý úsudek", "Živí v Boží paměti", "Odvaha z dobrého vzoru", "Vedeni k pokání", "Blízký vztah s Bohem", "Boj s nespravedlností", "Chvála Jehovovi", "Satanovy pomluvy", "Boží trpělivost", "Ověřuj, co slyšíš", "Vytrvalost v pronásledování", "Věrnost až do konce", "Úcta k manželce", "Horlivost ve službě", "Trpělivé poznávání", "Trpělivost s hříšníkem", "Radost z pokání", "Odstup od politiky", "Láska skrze poslušnost", "Úplné odpuštění", "Duchovní ráj", "Modlitba o trpělivost", "Rozvážné namlouvání", "Sebezkoumání provinilce", "Boží pohled na lidi", "Opatrnost s odpadlíky", "Otupělé srdce", "Pozvání na slavnost", "Boží rodina", "Vděčnost za výkupné", "Hlubší poznání", "Víra ve výkupné", "Nová smlouva", "Boží láska", "Vyvrácení pomluvy", "Radost ze vzkříšení", "Duchovní růst", "Boží milosrdenství", "Jehovova ochrana", "Předobraz výkupného", "Uplatňování Bible", "Radost z dávání", "Chvála Jehovy", "Satanovy lži", "Spravedlivý Soudce", "Odvaha pomoct bratrům", "Živý Bůh", "Ostražitost před klamem", "Naděje na odpuštění", "Radost z věrnosti", "Moudrost v namlouvání", "Boží načasování", "Ježíšův vzor", "Vděčnost za výkupné", "Zralost staršího", "Rýžování pravdy", "Odpuštění místo hněvu", "Důvěra místo majetku", "Cesta ke zralosti", "Moudré rozhodování", "Odpuštění po pokání", "Boží nestrannost", "Věrní pomocníci", "Odpuštění minulosti", "Postupná proměna", "Klidná reakce", "Radost z pokání", "Špatné pohnutky", "Dobrý učitel", "Oslava Jehovy", "Odhodlání ke křtu", "Odmítání lží", "Držet se pravdy", "Soucit s hříšníky", "Očištění Božího jména", "Užitek ze zkoušek", "Naléhavost kázání", "Stopy Stvořitele", "Poslední slova", "Služební pomocníci", "Síla od Boha", "Moudré rozhodování", "Smazané hříchy", "Péče o děti", "Duchovní ráj", "Výběr partnera", "Ohleduplnost k zamilovaným", "Věrnost v zármutku", "Boj s pokušením", "Varovné pokárání", "Vytrvat do konce", "Blízkost k Bohu", "Nezasloužené odpuštění", "Odpuštění křivd", "Duchovní zralost", "Boží milosrdenství", "Hledání ztracených", "Radost ze sdílení pravdy", "Radost ve službě", "Malé kroky vpřed", "Poučení a náprava", "Vymazané hříchy", "Klid při nespravedlnosti", "Víra v Ježíše", "Stopy Stvořitele", "Ochrana sboru", "Trvalá oběť", "Duchovní ostražitost", "Smíření s Bohem", "Upřímné odpuštění", "Vytrvalost v pronásledování", "Odvaha ke změně", "Prosba o moudrost", "Hojnost duchovního pokrmu", "Laskavá upřímnost", "Odvaha z víry", "Beze strachu s Jehovou", "Věrné srdce", "Láskyplná výchova", "Radost z dávání", "Trpělivý růst", "Vděčnost, ne nárok", "Nejsi zapomenutý", "Rozhodování podle svědomí", "Naděje na vzkříšení", "Síla z Božího slova", "Věrnost uprostřed odpadlictví", "Vytrvalost v dobrém", "Boží štědrost", "Touha sloužit", "Žít podle Bible", "Prosba o svatého ducha", "Láska k lidem", "Pomstu nechme na Bohu", "Vyvážený vztah k majetku", "Radost v manželství", "Příprava na zkoušky", "Hodnota výkupného", "Víra překoná překážky", "Důvěra z vlastní zkušenosti", "Poznej svoje slabé místo", "Odpuštění kajícímu", "Dar v podobě bratří", "Odpuštění bez trestu", "Království na prvním místě", "Síla uprostřed odporu", "Radost a jednota", "Citlivost k svobodným", "Jehova naše Skála", "Sloužit celým srdcem", "Úplné odpuštění", "Pomoc k pokání", "Nesrovnávej se s druhými", "Naléhavé varování", "Duchovní růst", "Naděje na vzkříšení", "Upřímné uctívání", "Pevnost v pravdě", "Boží trpělivost", "Pomoc v pravou chvíli", "Útěcha od bratrů", "Naděje na věčný život", "Úcta k manželce", "Kristovo smýšlení", "Vykoupení krví", "Východisko ze zkoušky", "Znát svá slabá místa", "Hodnota studia", "Radost z odpuštění", "Připravenost na konec", "Služba z lásky", "Jmenovaní bratři", "Duchovní klid", "Vážnost slibu", "Odvaha k víře", "Radost z kázání", "Bůh jako útočiště", "Nerozdělené srdce", "Láska k nepřátelům", "Trpělivost s hříšníky", "Štědrost k druhým", "Správné priority", "Blízkost v zármutku", "Bůh vidí naše slzy", "Duchovní zralost", "Bázeň před Bohem", "Důvěra v Soudce", "Upřímnost", "Příprava na službu", "Oslava Jehovy", "Jistota odměny", "Radost z pokání", "Bible pro všechny", "Vytrvalost ve zkoušce", "Útěcha po ztrátě", "Obhajoba víry", "Moudrost starších", "Obrazná řeč", "Úcta k manželce", "Starší jako pastýři", "Vděčnost za výkupné", "Na pozoru před pokušením", "Milosrdenství s měřítky", "Podpora bratří", "Zkoumání Písma", "Nesobecká láska", "Moudré rozhodování", "Radost v ráji", "Jehova – naše skála", "Poznání srdce", "Pokorné pokání", "Ochrana sboru", "Síla povzbuzení", "Touha po výsadě", "Ochotná poslušnost", "Naplňující se proroctví", "Bez pomluv", "Zdravá bázeň", "Naděje i pro hříšníka", "Odvaha ke změně", "Jednota v organizaci", "Útěcha v zármutku", "Vzpomínka na Boží skutky", "Chléb věčného života", "Věrnost v manželství", "Ospravedlnění vírou", "Boží smýšlení", "Blízko zlomeným srdcím", "Boží odměna", "Malé kroky k pádu", "Odvaha přes strach", "Posvěcení Božího jména", "Pohostinnost", "Připravenost a bdělost", "Horlivost v kázání", "Bůh si všímá", "Radost z dávání", "Odvaha svědčit", "Vykoupení skrze Krista", "Život vírou", "Proměna mysli", "Kristovo smýšlení", "Poznávání partnera", "Jehova jako skála", "Výlučná oddanost", "Soucitné odpuštění", "Štědrá moudrost", "Dobrá pověst", "Radost z dávání", "Modlitba v nemoci", "Naděje na vzkříšení", "Boží neomezená moc", "Víra jako Noe", "Věrnost slibům", "Pokora", "Boží organizace", "Boží trpělivost", "Vyber si život", "Pravé následování", "Mírnost jako Kristus", "Důvěra v nejistotě", "Boží nestrannost", "Duchovní zralost", "Blízkost k Bohu", "Útěcha v slzách", "Odvaha svědčit", "Vedení rodiny", "Vděčnost za výkupné", "Úleva od pochybností", "Čest být svědkem", "Ochota sloužit", "Útočiště ve sboru", "Boží láska ve výkupném", "Život vírou", "Přitažlivost sboru", "Pochopení Písma", "Důvěra v organizaci", "Důvěra ve vedení", "Vedení k pokání", "Otázky dospívajících", "Víra, která zachraňuje", "Školení druhých", "Nový svět", "Kázání po celém světě", "Manželská věrnost", "Velkorysé odpuštění", "Radost ze služby", "Horlivost do konce", "Pokora", "Když víra kolísá", "Vztah k penězům", "Odolávání pokušení", "Štědré předávání zkušeností", "Místo ve sboru", "Modlitba v zármutku", "Ježíšova láska k lidem", "Svoboda od hříchu", "Věrnost a pilnost", "Moudrá volba práce", "Duchovní ráj", "Království na prvním místě", "Mravní čistota", "Spolehlivost", "Vnitřní pokoj", "Návrat ztraceného", "Radost z dávání"];

  const DAILY_ICONS = {
    heart: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M100,150 C55,115 35,85 55,62 C68,47 90,55 100,73 C110,55 132,47 145,62 C165,85 145,115 100,150 Z" fill="none" stroke="var(--c)" stroke-width="6" stroke-linejoin="round"/>',
    dove: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M42,104 C60,72 82,72 100,98 C118,72 140,72 158,104" fill="none" stroke="var(--c)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M100,98 C100,116 92,128 78,132" fill="none" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><path d="M78,132 C68,132 60,126 58,116 C68,116 76,120 78,132 Z" fill="none" stroke="var(--c)" stroke-width="4" stroke-linejoin="round"/>',
    hourglass: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M68,50 L132,50 L100,100 L132,150 L68,150 L100,100 Z" fill="none" stroke="var(--c)" stroke-width="6" stroke-linejoin="round"/><line x1="60" y1="50" x2="140" y2="50" stroke="var(--c)" stroke-width="6" stroke-linecap="round"/><line x1="60" y1="150" x2="140" y2="150" stroke="var(--c)" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="96" r="2.5" fill="var(--c)"/>',
    sprout: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><line x1="60" y1="145" x2="140" y2="145" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><path d="M100,145 C100,110 100,90 100,65" fill="none" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><path d="M100,110 C80,110 66,96 66,78 C90,78 100,94 100,110 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><path d="M100,90 C120,90 134,76 134,58 C110,58 100,74 100,90 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/>',
    sunrise: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><line x1="45" y1="128" x2="155" y2="128" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><path d="M60,128 A40,40 0 0 1 140,128" fill="none" stroke="var(--c)" stroke-width="6"/><line x1="100" y1="60" x2="100" y2="76" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><line x1="66" y1="76" x2="78" y2="86" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><line x1="134" y1="76" x2="122" y2="86" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/>',
    anchor: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><circle cx="100" cy="56" r="10" fill="none" stroke="var(--c)" stroke-width="5"/><line x1="100" y1="66" x2="100" y2="148" stroke="var(--c)" stroke-width="6" stroke-linecap="round"/><line x1="76" y1="88" x2="124" y2="88" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><path d="M60,110 C60,132 78,148 100,150 C122,148 140,132 140,110" fill="none" stroke="var(--c)" stroke-width="6" stroke-linecap="round"/>',
    lamp: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M100,58 C112,58 120,68 118,80 C116,90 108,96 108,106 L92,106 C92,96 84,90 82,80 C80,68 88,58 100,58 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><line x1="88" y1="106" x2="112" y2="106" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><path d="M78,120 L122,120 L114,146 L86,146 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/>',
    wheat: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M70,150 C90,120 110,90 128,58" fill="none" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><ellipse cx="118" cy="70" rx="7" ry="12" fill="none" stroke="var(--c)" stroke-width="4" transform="rotate(35 118 70)"/><ellipse cx="105" cy="88" rx="7" ry="12" fill="none" stroke="var(--c)" stroke-width="4" transform="rotate(35 105 88)"/><ellipse cx="128" cy="88" rx="7" ry="12" fill="none" stroke="var(--c)" stroke-width="4" transform="rotate(60 128 88)"/><ellipse cx="92" cy="106" rx="7" ry="12" fill="none" stroke="var(--c)" stroke-width="4" transform="rotate(35 92 106)"/><ellipse cx="115" cy="106" rx="7" ry="12" fill="none" stroke="var(--c)" stroke-width="4" transform="rotate(60 115 106)"/>',
    sun: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><circle cx="100" cy="100" r="30" fill="none" stroke="var(--c)" stroke-width="6"/><g stroke="var(--c)" stroke-width="5" stroke-linecap="round"><line x1="100" y1="50" x2="100" y2="38"/><line x1="100" y1="150" x2="100" y2="162"/><line x1="50" y1="100" x2="38" y2="100"/><line x1="150" y1="100" x2="162" y2="100"/><line x1="65" y1="65" x2="56" y2="56"/><line x1="135" y1="65" x2="144" y2="56"/><line x1="65" y1="135" x2="56" y2="144"/><line x1="135" y1="135" x2="144" y2="144"/></g>',
    gift: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M55,120 C55,140 75,152 100,152 C125,152 145,140 145,120" fill="none" stroke="var(--c)" stroke-width="6" stroke-linecap="round"/><path d="M55,120 C75,132 125,132 145,120" fill="none" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><path d="M100,120 C100,100 100,90 100,80" fill="none" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><path d="M100,92 C86,92 76,82 76,70 C92,70 100,80 100,92 Z" fill="none" stroke="var(--c)" stroke-width="4" stroke-linejoin="round"/><path d="M100,80 C114,80 124,70 124,58 C108,58 100,68 100,80 Z" fill="none" stroke="var(--c)" stroke-width="4" stroke-linejoin="round"/>',
    mountain: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M45,140 L85,72 L108,104 L122,84 L155,140 Z" fill="none" stroke="var(--c)" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="128" cy="60" r="10" fill="none" stroke="var(--c)" stroke-width="5"/>',
    ripple: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><ellipse cx="100" cy="112" rx="52" ry="10" fill="none" stroke="var(--c)" stroke-width="4"/><ellipse cx="100" cy="112" rx="34" ry="6.5" fill="none" stroke="var(--c)" stroke-width="4"/><ellipse cx="100" cy="112" rx="16" ry="3.5" fill="none" stroke="var(--c)" stroke-width="4"/><path d="M100,42 C111,57 118,68 118,78 A18,18 0 1 1 82,78 C82,68 89,57 100,42 Z" fill="none" stroke="var(--c)" stroke-width="4" stroke-linejoin="round"/>',
    unity: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><circle cx="84" cy="100" r="34" fill="none" stroke="var(--c)" stroke-width="6"/><circle cx="116" cy="100" r="34" fill="none" stroke="var(--c)" stroke-width="6"/>',
    hands: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><rect x="66" y="108" width="68" height="48" rx="16" fill="none" stroke="var(--c)" stroke-width="5"/><rect x="72" y="64" width="14" height="54" rx="7" fill="none" stroke="var(--c)" stroke-width="5"/><rect x="90" y="48" width="14" height="70" rx="7" fill="none" stroke="var(--c)" stroke-width="5"/><rect x="108" y="42" width="14" height="76" rx="7" fill="none" stroke="var(--c)" stroke-width="5"/><rect x="126" y="58" width="14" height="60" rx="7" fill="none" stroke="var(--c)" stroke-width="5"/><rect x="52" y="88" width="16" height="50" rx="8" fill="none" stroke="var(--c)" stroke-width="5" transform="rotate(-38 60 138)"/>',
    book: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M100,66 C88,58 68,56 54,60 L54,132 C68,128 88,130 100,138 C112,130 132,128 146,132 L146,60 C132,56 112,58 100,66 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><line x1="100" y1="66" x2="100" y2="138" stroke="var(--c)" stroke-width="4"/><line x1="64" y1="78" x2="90" y2="74" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><line x1="64" y1="92" x2="90" y2="88" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><line x1="110" y1="74" x2="136" y2="78" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><line x1="110" y1="88" x2="136" y2="92" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/>',
    scale: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><line x1="100" y1="55" x2="100" y2="140" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><line x1="60" y1="70" x2="140" y2="70" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><path d="M60,70 L46,102 C46,112 74,112 74,102 Z" fill="none" stroke="var(--c)" stroke-width="4" stroke-linejoin="round"/><path d="M140,70 L126,102 C126,112 154,112 154,102 Z" fill="none" stroke="var(--c)" stroke-width="4" stroke-linejoin="round"/><line x1="78" y1="140" x2="122" y2="140" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/>',
    compass: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><circle cx="100" cy="100" r="46" fill="none" stroke="var(--c)" stroke-width="5"/><path d="M118,80 L108,108 L82,120 L92,92 Z" fill="none" stroke="var(--c)" stroke-width="4" stroke-linejoin="round"/><circle cx="100" cy="100" r="4" fill="var(--c)"/>',
    star: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M100,46 L112,86 L154,86 L120,110 L132,150 L100,126 L68,150 L80,110 L46,86 L88,86 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/>',
    storm: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M62,96 C48,96 40,86 40,76 C40,64 50,56 62,58 C64,46 76,38 90,40 C102,42 110,50 112,60 C126,58 138,68 138,80 C138,90 130,96 120,96 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><path d="M100,104 L86,132 L102,132 L90,160" fill="none" stroke="var(--c)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
    blessing: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M68,50 A34,12 0 0 1 132,50" fill="none" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><line x1="72" y1="54" x2="90" y2="132" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><line x1="100" y1="55" x2="100" y2="134" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><line x1="128" y1="54" x2="110" y2="132" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><path d="M78,140 A24,9 0 0 0 122,140" fill="none" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/>',
    glow: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M100,38 L111.3,88.7 L162,100 L111.3,111.3 L100,162 L88.7,111.3 L38,100 L88.7,88.7 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><circle cx="100" cy="100" r="6" fill="var(--c)"/>',
    shield: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M100,46 L140,60 L140,98 C140,128 122,146 100,156 C78,146 60,128 60,98 L60,60 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><path d="M82,100 L94,114 L120,82" fill="none" stroke="var(--c)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
    crown: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M52,132 L52,96 L76,116 L100,80 L124,116 L148,96 L148,132 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><line x1="52" y1="132" x2="148" y2="132" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="80" r="4" fill="var(--c)"/><circle cx="52" cy="96" r="4" fill="var(--c)"/><circle cx="148" cy="96" r="4" fill="var(--c)"/>',
    flame: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M100,48 C118,76 128,96 120,118 C115,132 106,140 100,150 C94,140 85,132 80,118 C72,96 82,76 100,48 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><path d="M100,90 C106,102 108,112 100,124 C92,112 94,102 100,90 Z" fill="none" stroke="var(--c)" stroke-width="4" stroke-linejoin="round"/>',
    embrace: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M55,68 C38,90 40,122 62,140 C74,150 88,152 100,150" fill="none" stroke="var(--c)" stroke-width="6" stroke-linecap="round"/><path d="M145,68 C162,90 160,122 138,140 C126,150 112,152 100,150" fill="none" stroke="var(--c)" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="104" r="16" fill="none" stroke="var(--c)" stroke-width="5"/>',
    handshake: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M35,108 L74,92 L84,102 L100,88 L116,102 L126,92 L165,108" fill="none" stroke="var(--c)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>',
    key: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><circle cx="68" cy="100" r="22" fill="none" stroke="var(--c)" stroke-width="5"/><line x1="90" y1="100" x2="148" y2="100" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><line x1="128" y1="100" x2="128" y2="116" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><line x1="142" y1="100" x2="142" y2="112" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/>',
    path: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M52,152 C68,124 56,100 78,84 C100,68 92,44 108,32" fill="none" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><circle cx="108" cy="32" r="7" fill="none" stroke="var(--c)" stroke-width="4"/>',
    nest: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M48,122 C48,110 152,110 152,122 C152,136 48,136 48,122 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><circle cx="84" cy="112" r="8" fill="none" stroke="var(--c)" stroke-width="4"/><circle cx="104" cy="115" r="8" fill="none" stroke="var(--c)" stroke-width="4"/><circle cx="122" cy="110" r="8" fill="none" stroke="var(--c)" stroke-width="4"/>',
    candle: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M89,152 L89,96 C89,92 111,92 111,96 L111,152 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><path d="M100,72 C108,84 112,92 106,102 C102,108 98,108 94,102 C88,92 92,84 100,72 Z" fill="none" stroke="var(--c)" stroke-width="4" stroke-linejoin="round"/>',
    rainbow: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M38,142 A62,62 0 0 1 162,142" fill="none" stroke="var(--c)" stroke-width="5"/><path d="M58,142 A42,42 0 0 1 142,142" fill="none" stroke="var(--c)" stroke-width="4"/><line x1="30" y1="142" x2="170" y2="142" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/>',
    bridge: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M46,124 A54,54 0 0 1 154,124" fill="none" stroke="var(--c)" stroke-width="5"/><line x1="70" y1="124" x2="70" y2="144" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/><line x1="100" y1="124" x2="100" y2="144" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/><line x1="130" y1="124" x2="130" y2="144" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/><line x1="38" y1="144" x2="162" y2="144" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/>',
    tree: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><line x1="100" y1="155" x2="100" y2="112" stroke="var(--c)" stroke-width="6" stroke-linecap="round"/><path d="M100,120 C60,120 54,92 70,72 C64,54 84,42 100,52 C116,42 136,54 130,72 C146,92 140,120 100,120 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/>',
    bell: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M100,56 C76,56 70,80 70,100 L58,124 L142,124 L130,100 C130,80 124,56 100,56 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><line x1="58" y1="124" x2="142" y2="124" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="50" r="5" fill="none" stroke="var(--c)" stroke-width="4"/><path d="M92,124 C92,134 108,134 108,124" fill="none" stroke="var(--c)" stroke-width="4"/>',
    ladder: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><line x1="76" y1="48" x2="76" y2="152" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><line x1="124" y1="48" x2="124" y2="152" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><line x1="76" y1="66" x2="124" y2="66" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><line x1="76" y1="92" x2="124" y2="92" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><line x1="76" y1="118" x2="124" y2="118" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><line x1="76" y1="144" x2="124" y2="144" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/>',
    gate: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><line x1="62" y1="150" x2="62" y2="66" stroke="var(--c)" stroke-width="6" stroke-linecap="round"/><line x1="138" y1="150" x2="138" y2="66" stroke="var(--c)" stroke-width="6" stroke-linecap="round"/><line x1="62" y1="66" x2="138" y2="66" stroke="var(--c)" stroke-width="6" stroke-linecap="round"/><line x1="85" y1="150" x2="85" y2="80" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/><line x1="115" y1="150" x2="115" y2="80" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/><line x1="70" y1="140" x2="130" y2="96" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/>',
    lighthouse: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M84,152 L92,75 L108,75 L116,152 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><path d="M89,75 L111,75 L106,58 L94,58 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><path d="M94,58 L106,58 L100,46 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><line x1="86" y1="100" x2="114" y2="100" stroke="var(--c)" stroke-width="4"/><line x1="88" y1="126" x2="112" y2="126" stroke="var(--c)" stroke-width="4"/><line x1="112" y1="62" x2="140" y2="50" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/><line x1="112" y1="70" x2="144" y2="72" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/>',
    basket: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M56,108 L68,150 L132,150 L144,108 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><path d="M76,108 A24,28 0 0 1 124,108" fill="none" stroke="var(--c)" stroke-width="5"/><line x1="66" y1="122" x2="134" y2="122" stroke="var(--c)" stroke-width="3"/><line x1="70" y1="136" x2="130" y2="136" stroke="var(--c)" stroke-width="3"/>',
    feather: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M118,46 C130,74 128,108 100,146 C96,132 70,118 62,100 C90,100 96,72 118,46 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><line x1="112" y1="60" x2="76" y2="96" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><line x1="118" y1="78" x2="82" y2="114" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/>',
    flock: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><circle cx="68" cy="118" r="20" fill="none" stroke="var(--c)" stroke-width="5"/><circle cx="100" cy="108" r="24" fill="none" stroke="var(--c)" stroke-width="5"/><circle cx="132" cy="118" r="20" fill="none" stroke="var(--c)" stroke-width="5"/><line x1="52" y1="134" x2="148" y2="134" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/>',
    eye: '<circle cx="100" cy="100" r="82" fill="none" stroke="var(--c)" stroke-width="2" opacity="0.25"/><path d="M48,100 C68,72 132,72 152,100 C132,128 68,128 48,100 Z" fill="none" stroke="var(--c)" stroke-width="5" stroke-linejoin="round"/><circle cx="100" cy="100" r="15" fill="none" stroke="var(--c)" stroke-width="5"/><circle cx="100" cy="100" r="4" fill="var(--c)"/>'
  };
  const DAILY_ICON_PALETTE = ["var(--gold-dark)", "var(--maroon-dark)", "var(--green)", "var(--gold)", "var(--maroon)"];
  const DAILY_ICON_DESCRIPTIONS = {
    heart: "Srdce – láska, výkupné a obětavost.", dove: "Holubice – odpuštění, milosrdenství a smíření.",
    hourglass: "Přesýpací hodiny – trpělivost a správný čas.", sprout: "Rostlinka – duchovní růst a zrání.",
    sunrise: "Východ slunce – naděje a vzkříšení.", anchor: "Kotva – pevná víra a věrnost.",
    lamp: "Lampa – moudrost a poznávání pravdy.", wheat: "Klas obilí – pokora a prostota.",
    sun: "Slunce – radost a chvála.", gift: "Dárek – vděčnost a štědrost.",
    mountain: "Hora – odvaha a síla.", ripple: "Kapka na hladině – klid a pokoj.",
    unity: "Dva propojené kruhy – přátelství a vztahy.", hands: "Pomáhající ruka – služba a péče o druhé.",
    book: "Otevřená kniha – Bible a Boží slovo.", scale: "Váhy – spravedlnost a rozlišování.",
    compass: "Kompas – směřování a priority v životě.", star: "Hvězda – Boží sláva a velikost.",
    storm: "Bouřka s bleskem – zkoušky a nebezpečí.", shield: "Štít – ochrana a bezpečí.",
    crown: "Koruna – Boží království a úcta.", flame: "Plamen – horlivost a zápal.",
    embrace: "Objetí – soucit a útěcha.", handshake: "Podání rukou – důvěra a spolehlivost.",
    key: "Klíč – pochopení a porozumění.", path: "Cesta se značkou – směřování a rozhodnutí.",
    nest: "Hnízdo s vejci – péče o rodinu a děti.", candle: "Svíčka – modlitba.",
    rainbow: "Duha – Boží smlouva a milost.", bridge: "Most – smíření a odpuštění.",
    tree: "Strom – domov a duchovní ráj.", bell: "Zvon – pozvání a kázání.",
    ladder: "Žebřík – postup a kroky vpřed.", gate: "Brána – křest a rozhodnutí.",
    lighthouse: "Maják – varování před nebezpečím.", basket: "Košík – štědrost a sdílení.",
    feather: "Pírko – mírnost a jemnost.", flock: "Stádo – sbor a bratrství.",
    eye: "Oko – bdělost a sebezkoumání.", blessing: "Paprsky shůry – Boží požehnání.",
    glow: "Jiskřička – něco dobrého a duchovního."
  };
  function dayOfYearIdx(d){
    const start = new Date(d.getFullYear(), 0, 1);
    return Math.floor((d - start) / 86400000);
  }
  const DAILY_MOTIFS = ["sprout","handshake","mountain","lighthouse","sun","heart","sunrise","hourglass","hands","lighthouse","bell","handshake","compass","star","compass","handshake","anchor","hourglass","lamp","handshake","gate","dove","wheat","sun","handshake","handshake","anchor","dove","scale","heart","lamp","ripple","hands","dove","sunrise","compass","sprout","handshake","mountain","sunrise","key","scale","embrace","scale","wheat","sun","heart","mountain","star","handshake","scale","star","handshake","dove","wheat","eye","basket","lamp","anchor","scale","sunrise","lamp","bridge","handshake","scale","sun","lighthouse","hourglass","scale","mountain","anchor","unity","flame","hourglass","hourglass","bridge","compass","heart","dove","tree","hourglass","unity","eye","eye","lighthouse","heart","bell","nest","heart","lamp","heart","rainbow","heart","lighthouse","sunrise","sprout","dove","star","heart","key","sun","sun","lighthouse","scale","mountain","star","eye","dove","anchor","lamp","hourglass","lamp","heart","sprout","lamp","dove","blessing","sprout","lamp","dove","scale","anchor","dove","sprout","ripple","bridge","scale","lamp","sun","gate","lighthouse","key","embrace","star","lighthouse","bell","star","blessing","mountain","mountain","key","lighthouse","nest","tree","unity","unity","anchor","lighthouse","storm","mountain","unity","bridge","bridge","sprout","bridge","path","sun","sun","path","key","storm","ripple","anchor","star","flock","blessing","eye","bridge","bridge","mountain","mountain","key","wheat","blessing","anchor","star","anchor","nest","sun","hourglass","basket","sunrise","blessing","sunrise","flame","wheat","flame","basket","hands","key","star","embrace","blessing","unity","unity","storm","gift","bell","blessing","blessing","bridge","basket","bridge","compass","wheat","unity","unity","shield","embrace","rainbow","hands","unity","bell","sprout","sunrise","crown","flame","hourglass","hands","embrace","sunrise","crown","path","gift","storm","blessing","key","rainbow","eye","hands","hands","ripple","rainbow","flame","bell","shield","embrace","blessing","hourglass","basket","compass","glow","embrace","sprout","glow","glow","glow","hands","glow","gift","glow","key","flame","embrace","path","key","glow","crown","hands","gift","eye","rainbow","hands","glow","embrace","glow","tree","shield","embrace","wheat","flock","flame","gift","glow","book","storm","book","sunrise","flame","compass","book","book","wheat","book","path","path","book","gift","path","flame","book","basket","eye","flame","eye","gift","book","gift","path","sprout","path","book","shield","crown","rainbow","basket","crown","gift","candle","book","feather","path","rainbow","wheat","compass","ladder","feather","ladder","feather","candle","gate","flock","ladder","candle","tree","nest","gift","feather","gate","flock","flock","ladder","candle","flock","tree","compass","compass","feather","ripple","gate","nest","ladder","bell","candle","rainbow","flock","shield","wheat","tree","feather","storm","basket","flock","candle","ripple","storm","gate","nest","tree","crown","ladder","shield","ripple","feather","basket"];

  function renderDailyWordAndIcon(d){
    const idx = dayOfYearIdx(d) % DAILY_WORDS.length;
    const word = DAILY_WORDS[idx];
    const motif = DAILY_MOTIFS[idx % DAILY_MOTIFS.length];
    const color = DAILY_ICON_PALETTE[idx % DAILY_ICON_PALETTE.length];
    const wordEl = document.getElementById("dailyTextWord");
    const iconEl = document.getElementById("dailyTextIcon");
    if(wordEl) wordEl.textContent = word;
    if(iconEl) iconEl.innerHTML = '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style="--c:' + color + '">' + DAILY_ICONS[motif] + '</svg>';
    const descEl = document.getElementById("dailyTextIconDesc");
    if(descEl){
      descEl.textContent = DAILY_ICON_DESCRIPTIONS[motif] || "";
      descEl.classList.remove("show");
    }
  }

  let dailyPreviewDate = new Date();
  function updateDailyPreview(d){
    if(dailyTextTitle) dailyTextTitle.textContent = formatDailyTitle(d);
    renderDailyWordAndIcon(d);
  }
  function openDailyTextModal(){
    dailyPreviewDate = new Date();
    updateDailyPreview(dailyPreviewDate);
    if(dailyTextModal) dailyTextModal.classList.add("show");
  }
  function closeDailyTextModal(){
    if(dailyTextModal) dailyTextModal.classList.remove("show");
    dailyPreviewDate = new Date();
  }
  function closeDailyTextModalUnanswered(){
    remindBeforeNextRound = true;
    closeDailyTextModal();
  }
  function openDailyTextWindow(){
    window.open(dailyTextUrl(dailyPreviewDate), "bibleGameDailyText", "width=480,height=760,noopener");
  }

  const dtYes = document.getElementById("dailyTextYes");
  const dtReadBtn = document.getElementById("dailyTextReadBtn");
  const dtLater = document.getElementById("dailyTextLater");
  const dtClose = document.getElementById("dailyTextClose");
  const dtBtn = document.getElementById("dailyTextBtn");
  const dtPrev = document.getElementById("dailyTextPrev");
  const dtNext = document.getElementById("dailyTextNext");
  const dtIcon = document.getElementById("dailyTextIcon");

  if(dtYes) dtYes.addEventListener("click", ()=>{ markDailyTextRead(); closeDailyTextModal(); });
  if(dtReadBtn) dtReadBtn.addEventListener("click", openDailyTextWindow);
  if(dtLater) dtLater.addEventListener("click", ()=>{
    clearDailyTextRead();
    closeDailyTextModal();
    saveSnoozeUntil(Date.now() + LATER_REMIND_MS);
    scheduleLaterReminder();
  });
  if(dtClose) dtClose.addEventListener("click", closeDailyTextModalUnanswered);
  if(dailyTextModal) dailyTextModal.addEventListener("click", (e)=>{ if(e.target === dailyTextModal) closeDailyTextModalUnanswered(); });
  if(dtBtn) dtBtn.addEventListener("click", openDailyTextModal);
  if(dtPrev) dtPrev.addEventListener("click", ()=>{
    dailyPreviewDate = new Date(dailyPreviewDate);
    dailyPreviewDate.setDate(dailyPreviewDate.getDate() - 1);
    updateDailyPreview(dailyPreviewDate);
  });
  if(dtNext) dtNext.addEventListener("click", ()=>{
    dailyPreviewDate = new Date(dailyPreviewDate);
    dailyPreviewDate.setDate(dailyPreviewDate.getDate() + 1);
    updateDailyPreview(dailyPreviewDate);
  });
  if(dtIcon){
    dtIcon.addEventListener("click", ()=>{
      const d = document.getElementById("dailyTextIconDesc");
      if(d) d.classList.toggle("show");
    });
    dtIcon.addEventListener("keydown", (e)=>{
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        const d = document.getElementById("dailyTextIconDesc");
        if(d) d.classList.toggle("show");
      }
    });
  }

  if(dailyTextModal){
    if(!isDailyTextReadToday()){
      const pendingSnooze = loadSnoozeUntil();
      const now = Date.now();
      if(pendingSnooze && pendingSnooze > now){
        scheduleLaterReminder(pendingSnooze - now);
      } else {
        if(pendingSnooze) clearSnoozeUntil();
        openDailyTextModal();
      }
    }
  }

  // ---------- Veřejné API pro jednotlivé hry ----------
  window.BibleGameCommon = {
    awardPoints: awardPoints,
    addPoints: addPoints,
    isDailyTextReadToday: isDailyTextReadToday
  };

})();
