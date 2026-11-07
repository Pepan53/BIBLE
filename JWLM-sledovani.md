# Sledování JWLManageru pro „Moje poznámky JWL“

Stránka `moje-poznamky-jwl.html` přebírá logiku zápisu zálohy JW Library z programu
[JWLManager](https://github.com/erykjj/jwlmanager) (licence MIT). Tento soubor slouží
týdenní kontrole: porovná nejnovější verzi JWLManageru s verzí níže a ověří, jestli se
nezměnilo něco, co stránka převzala.

## Naposledy ověřená verze

- **Verze:** v12.8.0
- **Commit:** 188977c59dabe78fa8a5466c7e3c4af57aee6077 (26. 10. 2026)
- **Ověřeno:** 7. 11. 2026 – JW Library 15.10 (Android i Windows), databáze verze 16

## Co stránka převzala (sledovat změny v JWLManager.py)

| Funkce v JWLManageru | Kde ve stránce | Co hlídat |
|---|---|---|
| `upgrade_schema` / `downgrade_schema`, kontrola verze | `WRITE_SCHEMAS = [16]` | nová verze schématu (17…), nové tabulky/sloupce |
| `zip_file` / `update_manifest` | `buildBackup()` | pole v `manifest.json`, název DB, hash, formát dat |
| `trim_db` | `TRIM_SQL` | nové úklidové příkazy, nové tabulky |
| `delete_items` (Highlights, Notes…) | `doDelete()`, hromadné mazání | jiný způsob mazání |
| `delete_playlist_items` | `deletePlItems()` | mazání médií a souborů |
| `import_notes` (`update_note`, `add_usermark`, lokace) | import CSV | párování duplicit, zakládání lokací |
| `res/resources.db` (Languages, Publications) | `assets/jwl/jwl-data.js` | nové jazyky / publikace |

Přímé slučování („merge“) v JWLManageru volá uzavřenou knihovnu jwlCore – stránka má vlastní
implementaci `mergeFrom()`; sledovat jen případnou změnu verze schématu.

## Historie kontrol

- 7. 11. 2026 – výchozí stav, v12.8.0.
