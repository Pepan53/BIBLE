/* ============================================================
   Přetahování položek (seřazování) prstem i myší – bez HTML5 drag&drop.
   HTML5 drag&drop na dotykových displejích (Samsung S25 Ultra, Fold…)
   nefunguje spolehlivě: čeká na dlouhý stisk, bojuje s rolováním a výběrem
   textu. Tady se používají „pointer events“:
     • dotyk na úchyt (☰ / ✍️ / 🕑)  → přetahování začne hned,
     • dotyk jinde na položce        → přetahování začne po krátkém podržení
                                       (rychlé tažení = normální rolování stránky),
     • myš                           → přetahování začne po pohybu o pár pixelů.
   Při tažení se pod prstem vznáší „duch“ položky a u okraje obrazovky
   (nebo seznamu) se automaticky rolují stránka i seznam.

   TouchSort.attach({
     containers: [ul, ul],   // jeden či více seznamů (u mřížky lze přetáhnout i mezi nimi)
     itemSel: ".book-item",  // selektor přetahovaných položek
     handleSel: ".handle",   // volitelně: úchyt, kterým jde táhnout hned
     grid: false,            // true = položky jsou zalomené do řádků (čtverečky)
     onEnd: function(container){}   // po pustění
   });
   Po pustění se na seznamu vyvolá i událost "dragend" (kvůli starším posluchačům).
   ============================================================ */
(function(){
  var css = document.createElement("style");
  css.textContent =
    ".ts-item{ -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; -webkit-tap-highlight-color:transparent; }" +
    ".ts-item .ts-handle, .ts-handle{ touch-action:none; }" +
    ".ts-ghost{ position:fixed; z-index:99999; pointer-events:none; margin:0 !important; opacity:.94;" +
    " box-shadow:0 10px 26px rgba(30,22,10,.35); transform:scale(1.03); transition:none !important; }" +
    "body.ts-dragging, body.ts-dragging *{ -webkit-user-select:none !important; user-select:none !important; cursor:grabbing !important; }";
  document.head.appendChild(css);

  var HOLD_MS = 220;     // podržení prstu na těle položky
  var TOUCH_TOL = 9;     // pohyb (px) při čekání na podržení = uživatel chce rolovat
  var MOUSE_TOL = 4;

  function attach(opts){
    var containers = opts.containers;
    var itemSel = opts.itemSel;
    var handleSel = opts.handleSel || null;
    var grid = !!opts.grid;
    var onEnd = opts.onEnd || function(){};
    var st = null;

    // dotykové chování nastavit předem (touch-action se čte při začátku dotyku)
    var pre = document.createElement("style");
    pre.textContent = itemSel + "{ -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; -webkit-tap-highlight-color:transparent; }" +
      (handleSel ? itemSel + " " + handleSel + "{ touch-action:none; }" : "");
    document.head.appendChild(pre);

    function setupItem(el){
      if(el.classList) el.classList.add("ts-item");
    }

    containers.forEach(function(c){
      c.addEventListener("pointerdown", onDown);
      c.addEventListener("contextmenu", function(e){ if(st) e.preventDefault(); });
      c.addEventListener("selectstart", function(e){ if(st) e.preventDefault(); });
      c.addEventListener("dragstart", function(e){ e.preventDefault(); });
    });

    function onDown(e){
      if(st) return;
      if(e.pointerType === "mouse" && e.button !== 0) return;
      var item = e.target.closest(itemSel);
      if(!item) return;
      var holder = null;
      for(var i=0;i<containers.length;i++){ if(containers[i].contains(item)){ holder = containers[i]; break; } }
      if(!holder) return;
      var onHandle = !!(handleSel && e.target.closest(handleSel));
      if(!onHandle && e.target.closest("button, a, input, select, textarea")) return;
      setupItem(item);
      if(handleSel){
        var hd = item.querySelector(handleSel);
        if(hd) hd.classList.add("ts-handle");
      }
      var isTouch = e.pointerType !== "mouse";
      st = {
        el: item, home: holder, pid: e.pointerId, x: e.clientX, y: e.clientY,
        sx: e.clientX, sy: e.clientY, active: false, ghost: null, raf: 0, timer: 0,
        touch: isTouch, offX: 0, offY: 0
      };
      // zabrání rolování po zahájení tažení (musí být nepasivní a na samotné položce)
      item.addEventListener("touchmove", blockScroll, {passive:false});
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onCancel);
      if(isTouch){
        if(onHandle){ begin(); }
        else{ st.timer = setTimeout(begin, HOLD_MS); }
      }
    }

    function blockScroll(e){
      if(st && st.active && e.cancelable) e.preventDefault();
    }

    function begin(){
      if(!st || st.active) return;
      st.active = true;
      var el = st.el;
      var r = el.getBoundingClientRect();
      st.offX = st.x - r.left; st.offY = st.y - r.top;
      var g = el.cloneNode(true);
      g.classList.add("ts-ghost");
      g.classList.remove("dragging","drop-target","correct","incorrect");
      g.style.width = r.width + "px";
      g.style.height = r.height + "px";
      document.body.appendChild(g);
      st.ghost = g;
      moveGhost();
      el.classList.add("dragging");
      document.body.classList.add("ts-dragging");
      try{ el.setPointerCapture(st.pid); }catch(err){}
      if(navigator.vibrate){ try{ navigator.vibrate(12); }catch(err){} }
      loop();
    }

    function moveGhost(){
      if(!st || !st.ghost) return;
      st.ghost.style.left = (st.x - st.offX) + "px";
      st.ghost.style.top = (st.y - st.offY) + "px";
    }

    function onMove(e){
      if(!st || e.pointerId !== st.pid) return;
      st.x = e.clientX; st.y = e.clientY;
      if(!st.active){
        var dx = st.x - st.sx, dy = st.y - st.sy;
        var d = Math.sqrt(dx*dx + dy*dy);
        if(st.touch){
          if(d > TOUCH_TOL){ cleanup(false); }   // prst se hýbe dřív než po podržení → rolování
        }else if(d > MOUSE_TOL){
          begin();
        }
        return;
      }
      if(e.cancelable) e.preventDefault();
      moveGhost();
      place();
    }

    function onUp(e){
      if(!st || e.pointerId !== st.pid) return;
      cleanup(true);
    }
    function onCancel(e){
      if(!st || e.pointerId !== st.pid) return;
      cleanup(true);
    }

    function cleanup(commit){
      if(!st) return;
      var s = st; st = null;
      clearTimeout(s.timer);
      cancelAnimationFrame(s.raf);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
      s.el.removeEventListener("touchmove", blockScroll);
      if(s.ghost && s.ghost.parentNode) s.ghost.parentNode.removeChild(s.ghost);
      document.body.classList.remove("ts-dragging");
      if(s.active){
        s.el.classList.remove("dragging");
        try{ s.el.releasePointerCapture(s.pid); }catch(err){}
        containers.forEach(function(c){
          c.querySelectorAll(".drop-target").forEach(function(x){ x.classList.remove("drop-target"); });
        });
        var cont = s.el.parentElement || s.home;
        try{ cont.dispatchEvent(new Event("dragend")); }catch(err){}
        if(s.home !== cont){ try{ s.home.dispatchEvent(new Event("dragend")); }catch(err){} }
        onEnd(cont);
      }
    }

    // ---------- umístění přetahované položky ----------
    function place(){
      if(!st || !st.active) return;
      var el = st.el, x = st.x, y = st.y;
      containers.forEach(function(c){
        c.querySelectorAll(".drop-target").forEach(function(t){ t.classList.remove("drop-target"); });
      });
      if(grid){
        var cont = pickContainer(x, y);
        placeTile(cont, el, x, y);
      }else{
        var home = el.parentElement || st.home;
        var after = afterElement(home, y);
        if(after == null){
          if(home.lastElementChild !== el) home.appendChild(el);
        }else if(after !== el.nextElementSibling){
          home.insertBefore(el, after);
          after.classList.add("drop-target");
        }
      }
    }

    function afterElement(container, y){
      var els = container.querySelectorAll(itemSel);
      var best = {offset: -Infinity, element: null};
      for(var i=0;i<els.length;i++){
        var it = els[i];
        if(it === st.el) continue;
        var b = it.getBoundingClientRect();
        var off = y - b.top - b.height/2;
        if(off < 0 && off > best.offset) best = {offset: off, element: it};
      }
      return best.element;
    }

    function pickContainer(x, y){
      var best = null, bestD = Infinity;
      containers.forEach(function(c){
        var r = c.getBoundingClientRect();
        var dx = x < r.left ? r.left - x : (x > r.right ? x - r.right : 0);
        var dy = y < r.top ? r.top - y : (y > r.bottom ? y - r.bottom : 0);
        var d = dx*dx + dy*dy;
        if(d < bestD){ bestD = d; best = c; }
      });
      return best || st.home;
    }

    function placeTile(container, el, x, y){
      var tiles = [].filter.call(container.querySelectorAll(itemSel), function(t){ return t !== el; });
      if(!tiles.length){ container.appendChild(el); return; }
      var closest = null, cd = Infinity;
      tiles.forEach(function(t){
        var b = t.getBoundingClientRect();
        var cx = b.left + b.width/2, cy = b.top + b.height/2;
        var d = (x-cx)*(x-cx) + (y-cy)*(y-cy);
        if(d < cd){ cd = d; closest = {el:t, cx:cx, cy:cy, h:b.height}; }
      });
      var sameRow = Math.abs(y - closest.cy) < closest.h * 0.6;
      var after = sameRow ? (x > closest.cx) : (y > closest.cy);
      var ref = after ? closest.el.nextElementSibling : closest.el;
      if(ref === el) return;
      if(ref) container.insertBefore(el, ref); else container.appendChild(el);
      closest.el.classList.add("drop-target");
    }

    // ---------- automatické rolování u okrajů ----------
    function loop(){
      if(!st || !st.active) return;
      var y = st.y;
      var vh = window.innerHeight;
      var edge = 80, speed = 0;
      if(y < edge) speed = -Math.ceil((edge - y) / edge * 20);
      else if(y > vh - edge) speed = Math.ceil((y - (vh - edge)) / edge * 20);
      var moved = false;
      // vnitřní rolovatelný seznam
      var c = st.el.parentElement;
      if(c && c.scrollHeight > c.clientHeight + 2){
        var r = c.getBoundingClientRect();
        var ce = 50, cs = 0;
        if(y < r.top + ce) cs = -Math.ceil((r.top + ce - y) / ce * 16);
        else if(y > r.bottom - ce) cs = Math.ceil((y - (r.bottom - ce)) / ce * 16);
        if(cs){
          var before = c.scrollTop;
          c.scrollTop += cs;
          if(c.scrollTop !== before) moved = true;
        }
      }
      if(speed && !moved){
        var wy = window.scrollY;
        window.scrollBy(0, speed);
        if(window.scrollY !== wy) moved = true;
      }
      if(moved) place();
      st.raf = requestAnimationFrame(loop);
    }
  }

  window.TouchSort = { attach: attach };
})();
