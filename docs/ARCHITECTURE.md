# Architektur

## Technik-Entscheidung

TypeScript + Vite + eigene Canvas-2D-Engine, Oberfläche in HTML/CSS.

- Läuft im Browser, kann hier automatisch getestet und angespielt werden.
- Desktop-Version später per Tauri/Electron, Mobil-Version per Capacitor – gleiche Codebasis.
- Keine Laufzeit-Abhängigkeiten außer der Pixel-Schrift (Google Fonts).

## Schichten

```
src/
  core/      Typen, Event-Bus, Eingabe, deterministischer Zufall
  art/       Prozedurale Pixel-Art: Palette, Painter (mit Auto-Kontur), Tiles, Objekte, Figuren, Sprite-Cache
  data/      Spielinhalte als Daten: Items, Pflanzen, Maschinen, Handel, NPCs, Tutorial, Imperium-Stufen, Karten
  systems/   Reine Spiellogik ohne DOM (testbar): Zustand, Inventar, Anbau, Produktion, Markt, Tag, Quests, Speichern
  world/     Laufzeit-Karte (Kollision, Türen, Objekte), Pfadsuche
  entities/  Figuren (Spieler, NPCs mit Tagesablauf)
  game/      Game (Spielschleife, Interaktionen), Renderer (Welt, Licht, Wetter), Sound
  ui/        HTML-Oberfläche (HUD, Dialoge, Kontextmenüs, Panels)
  tools/     Entwickler-Werkzeuge (Sprite-Galerie)
```

Regel: `systems/` kennt weder `ui/` noch `game/`. Kommunikation läuft über den `EventBus`
(z. B. `harvested`, `sold`, `machineCollected`). Quests und UI hören darauf.

## Inhalte ergänzen

| Was | Wo |
|---|---|
| Neuer Gegenstand / neue Ware | `data/items.ts` (+ Icon in `art/objects.ts → drawIcon`) |
| Neue Pflanze | `data/crops.ts` (+ Grafik in `drawCrop`) |
| Neue Anlage / neues Rezept | `data/machines.ts` (+ Sprite in `art/atlas.ts → machineSprite`) |
| Neuer Abnehmer / Händler | `data/trade.ts` (`CHANNELS` / `SHOPS`) |
| Neue Figur mit Tagesablauf | `data/npcs.ts` |
| Neue Karte / neues Viertel | `data/maps/*.ts`, in `game/game.ts → MAP_DEFS` eintragen |
| Neue Imperium-Stufe / Freischaltung | `data/empire.ts` (setzt Flag `stageN`) |
| Tutorial-Schritt / Ziel | `data/tutorial.ts` |

## Spielstand

- `GameState` (`systems/state.ts`) ist reines JSON und wird komplett gespeichert (automatisch beim Schlafen, manuell im Menü).
- `SAVE_VERSION` + `MIGRATIONS` in `systems/save.ts`: Jede Strukturänderung bekommt eine Migration.
  Beispiel: v1 → v2 bildet die alten Fantasy-Waren auf Cannabis/Tomaten ab.
- Fehlende Felder werden beim Laden aus einem neuen Spielstand ergänzt.

## Grafikstil

- Feste Palette in `art/palette.ts` – neue Farben nur dort.
- `Painter.outline()` erzeugt die einheitliche dunkle Kontur (Ausnahme: Pflanzen mit feinen Blättern).
- Kachelgröße 16 px, ganzzahliger Zoom, Figuren 16×24 px.

## Tests

`npm test` prüft Inventar, Anbau, Produktion, Markt, Aufträge, Tageswechsel, Imperium-Stufen,
Speichern und die Migration alter Spielstände. Für Spieltests im Browser gibt es
`window.underworld.simulate(sekunden)`, das Frames ohne Bildschirm-Aktualisierung durchrechnet.
