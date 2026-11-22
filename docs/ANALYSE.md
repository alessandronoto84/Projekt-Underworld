# Bestandsaufnahme & Umstellungsplan (Neuausrichtung „Drogenimperium“)

Stand: Tag der Neuausrichtung. Technik: TypeScript + Vite, eigene Canvas-Engine, HTML-Oberfläche.

## 1. Vorhandene Systeme

| System | Datei(en) | Zustand | Maßnahme |
|---|---|---|---|
| Spielschleife, Eingabe, Kamera | `game/game.ts`, `core/input.ts`, `game/renderer.ts` | funktioniert, getestet | behalten |
| Prozedurale Pixel-Art (Palette, Kontur) | `art/*` | funktioniert | erweitern (Cannabis, Pillen, Pakete, neue Maschinen) |
| Karten (datengetrieben), Kollision, Türen | `world/*`, `data/maps/*` | funktioniert | Texte/Namen umstellen, später neue Viertel |
| Zeit, Tag/Nacht, Wetter, Licht | `systems/time.ts`, `systems/day.ts`, Renderer | funktioniert | behalten |
| Inventar | `systems/inventory.ts` | funktioniert, getestet | behalten |
| Anbau (Pflanzen) | `systems/farming.ts`, `data/crops.ts` | funktioniert, getestet | **Inhalte ersetzen** (Cannabis statt Fantasy) |
| Produktion (Maschinen, Chargen) | `systems/production.ts`, `data/machines.ts` | funktioniert, getestet | **Inhalte ersetzen**, neue Maschinen |
| Handel, dynamische Preise, Aufträge | `systems/market.ts`, `data/trade.ts` | funktioniert, getestet | **Kanäle umstellen**, Straßenverkauf ergänzen |
| NPCs mit Tagesablauf, Pfadsuche | `entities/npc.ts`, `data/npcs.ts` | funktioniert | **Dialoge umschreiben** |
| Tutorial / Ziele | `systems/quests.ts`, `data/tutorial.ts` | funktioniert | **umschreiben**, Imperium-Stufen statt loser Ziele |
| Speichern mit Versionierung | `systems/save.ts` | funktioniert, getestet | **Migration v1 → v2** für alte Spielstände |
| UI: HUD, Schnellleiste, Dialog, Kontextmenü, Laden, Handel, Karte | `ui/*` | funktioniert | Texte umstellen, Stufenanzeige |
| Sound (synthetisiert) | `game/sfx.ts` | funktioniert | später erweitern |

## 2. Nicht passende Inhalte (werden ersetzt)

- Glimmerkraut, Glimmer-Bündel, Mondbeeren, Mondrosinen (Fantasy-Produkte)
- Rübe als zentrale Feldfrucht → Tomate bleibt nur als legale „Tarnung“
- Ricos Texte („Glimmer“), Tutorial-Texte, Titel-Untertitel
- Lose Ziele nach dem Tutorial → durch Imperium-Stufen ersetzt

## 3. Neues Produktsystem (abstrakte Spielmechanik)

| Produkt | Herkunft | Verarbeitung | Freischaltung |
|---|---|---|---|
| Cannabis | Anbau (Steckling, 4 Tage) | Trockengestell: frisch → getrocknet | Start |
| Ecstasy (MDMA) | Rohstoff-Kit von Rico | Pillenpresse | Stufe 2 |
| Kokain | Großmenge vom Großhändler | Packtisch: Großmenge → Verkaufseinheiten | Stufe 3 |
| Amphetamin | Rohstoff-Kit | Labor (abstrakt) | Stufe 4 (Fraktion, Phase 4) |
| Heroin | Großmenge (Harbor Kings) | Packtisch | Stufe 4 (Fraktion, Phase 4) |

Alle Herstellungsschritte sind reine Spielwerte: Eingabe-Gegenstand + Maschine + Zeit → Ware.
Keine realen Rezepturen, Chemikalien, Mengenangaben oder Verfahren.

## 4. Umgesetzt in Phase 2 („Lebendige Welt“)

- Wald-Gebiet südlich des Grundstücks (Lichtungen, Bach, Teich, Hochsitz)
- Fundstücke täglich neu: wilder Hanf, Psilo-Pilze, Pfandflaschen, alte Uhren; Mülltonnen durchsuchbar
- Neue Waren: Greenfield Kush (Theos Spezialsorte), Psilo-Pilze; Trocknen im Gestell
- Passanten mit eigenen Wegen, nachts teils Kundschaft (Direktverkauf)
- Tiere: Tauben und Krähen (fliegen auf), Katzen und Hunde (streicheln), Enten
- Atmosphäre: Schmetterlinge, Glühwürmchen, Schornsteinrauch, fallendes Laub, Regenspritzer
- Hauptgeschichte Akt 1 „Theos Schulden“ mit Frist und Konsequenzen; 3 Nebenquests; Questbuch (J)

## 5. Fehlende Systeme (Reihenfolge der Umsetzung)

1. Akt 2 der Hauptgeschichte (Old Guard, „der Alte“)
2. Darknet-Oberfläche (Laptop), Smartphone als App-Sammlung (Kontakte, Nachrichten, Finanzen, Karte)
3. Neue Stadtviertel (Southside, Nightlife District zuerst), mehr NPCs, Zufallsereignisse
4. Fraktionen mit Ruf/Beziehungen, Fraktionsmissionen, Hauptgeschichte
5. Polizei / Verdacht (Heat), Konsequenzen
6. Immobilien kaufen, Gewächshaus, Lager, Upgrades, Betriebskosten
7. Mitarbeiter, Automatisierung
8. Fahrzeuge, Kampf, weitere Städte
9. Erfolge, Musik, Balancing
