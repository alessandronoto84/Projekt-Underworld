# UNDERWORLD

2D-Pixel-Art-Aufbauspiel: Vom kleinen Dealer zum Imperium. Fiktion – alle Personen, Orte und
Organisationen sind erfunden; Herstellung und Handel sind abstrakte Spielmechaniken.

## Starten

```bash
npm install
npm run dev        # http://localhost:5173
```

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm test` | Unit-Tests der Spielsysteme (Vitest) |
| `npm run build` | Typprüfung + Produktions-Build nach `dist/` |

Sprite-Galerie für Grafik-Reviews: `http://localhost:5173/tools/sprites.html?scale=8`

## Steuerung

- **WASD / Pfeile** laufen, **Shift** rennen
- **Leertaste / Linksklick** Werkzeug oder Gegenstand benutzen
- **E / Rechtsklick** sprechen, ernten, Maschinen bedienen
- **1–8 / Mausrad** Gegenstand wählen
- **I** Inventar · **H** Handel · **M** Karte · **Esc** Menü

## Dokumentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – Aufbau des Codes, wie man Inhalte ergänzt
- [docs/ANALYSE.md](docs/ANALYSE.md) – Bestandsaufnahme und Umsetzungsplan
