# Biblické hry

Jednoduchý statický web bez závislostí — samostatné HTML hry, mapa a rozcestník mezi nimi.

## Struktura

```
index.html          — rozcestník (výběr hry)
casova-osa.html      — hra Časová osa (řazení postav a událostí chronologicky)
biblicke-knihy.html  — hra Biblické knihy (pořadí knih, pisatelé, doba vzniku...)
mapa-evangelii.html  — interaktivní mapa míst z evangelií (klik na číslo = události)
```

Žádné buildy, žádné závislosti — stačí otevřít `index.html` v prohlížeči.

## Import do gitu

```bash
cd bible-games-site
git init
git add .
git commit -m "Initial commit: biblické hry"
git branch -M main
git remote add origin <URL_TVÉHO_REPOZITÁŘE>
git push -u origin main
```

## Nasazení přes GitHub Pages

1. V nastavení repozitáře na GitHubu otevři **Settings → Pages**.
2. Jako zdroj vyber větev `main` a složku `/ (root)`.
3. Po uložení bude web dostupný na `https://<uzivatel>.github.io/<nazev-repozitare>/`.
