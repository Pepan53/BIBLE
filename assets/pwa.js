/* Registrace offline režimu (service worker) – web jde nainstalovat na plochu a funguje bez internetu. */
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
}
