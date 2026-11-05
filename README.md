# Kleider – deine Outfit-App

Persönliche Web-App, mit der du deine Kleider verwaltest und dir passende Outfits zum Wetter und zur Tätigkeit
vorschlagen lässt. Läuft komplett im Browser, ist auf dem Handy installierbar (PWA) und funktioniert offline.
Alle Daten und Fotos bleiben **nur auf deinem Gerät** – kein Login, kein Server.

## Funktionen

| Bereich | Was du damit machst |
| --- | --- |
| **Heute** | Wetter am Standort (GPS, Ortssuche oder Bern) für den Zeitraum, in dem du unterwegs bist, Tätigkeit wählen, mit einem Tipp ein Outfit samt Begründung bekommen. «Heute tragen», «Neu», «Nein» (lernt mit) oder «Merken». Fällt der Wetterdienst aus, gibst du die Temperatur selbst ein. |
| **Maker** | Vier Regler (Schlicht↔Experimentell, Praktisch↔Look, Bequem↔Schick, Farblich ruhig↔mutig), Anlass, Wetter an/aus, Ausgangsteil fixieren, Kleider ausschliessen. Drei Vorschläge; pro Teil fixieren 🔒, tauschen ⇄, Rest neu würfeln. |
| **Kleider** | Per Kamera oder Galerie hinzufügen (Foto wird lokal verkleinert, Farben werden direkt im Browser erkannt). Kategorie, Farben, Muster, Stil, Wärmegrad, Regen/Wind, empfindlich, Anlässe, Status, Sterne, Komfort, Look, Notiz, Favorit. Suche, Filter, Sortierung. |
| **Verlauf** | Kalender und Outfit-Liste, Outfits bewerten, Statistik (meistgetragen, nie getragen, länger nicht getragen) und «Das hat die App gelernt». |
| **Einstellungen** (Zahnrad) | Hell/Dunkel, eigene Tätigkeiten mit Regeln, Backup-Export/-Import inkl. Fotos, Beispieldaten, Speicher. |

## Starten (am Computer)

Voraussetzung: [Node.js](https://nodejs.org) 20 oder neuer.

```bash
npm install        # einmalig
npm run dev        # Entwicklungsserver, öffnet http://localhost:5173
npm test           # automatische Tests (Outfit-Logik, Wetter, Backup, Filter …)
npm run build      # fertige App nach dist/ bauen
npm run preview    # gebaute App lokal ansehen (inkl. Offline-Modus)
```

Zum Ausprobieren ohne eigene Fotos: auf «Heute» oder «Kleider» **«Beispieldaten ausprobieren»** tippen.
Die Beispielkleider entfernst du später unter Einstellungen → Beispieldaten (deine eigenen Kleider bleiben).

> Tipp: `npm run dev` zeigt auch eine Netzwerk-Adresse (z. B. `http://192.168.1.20:5173`), die du im WLAN auf dem
> Handy öffnen kannst. Über `http://` blockiert das Handy aber GPS und den Offline-Modus – dafür brauchst du `https`,
> also das kostenlose Hosting unten.

## Kostenlos hosten (GitHub Pages)

Die App ist eine rein statische Seite. Der Workflow `.github/workflows/deploy.yml` testet und baut bei jedem Push
und veröffentlicht den Branch `main` automatisch auf GitHub Pages.

1. Auf GitHub im Repository: **Settings → Pages → Build and deployment → Source: «GitHub Actions»** wählen.
2. Den Stand nach `main` mergen (oder pushen). Unter **Actions** läuft «Test & Deploy».
3. Nach ca. 1–2 Minuten ist die App erreichbar unter
   `https://<dein-github-name>.github.io/Kleider-App/` (die genaue Adresse steht unter Settings → Pages).

Alternativen ohne GitHub Actions, ebenfalls gratis: `npm run build` ausführen und den Ordner `dist/` per Drag & Drop
bei [Netlify Drop](https://app.netlify.com/drop) oder [Cloudflare Pages](https://pages.cloudflare.com) hochladen.
Dank relativer Pfade und Hash-Routing funktioniert die App auf jedem statischen Hoster und in jedem Unterordner.

> Deine Kleider landen dabei **nicht** auf dem Server – gehostet wird nur die leere App. Die Daten speichert jedes
> Gerät für sich in IndexedDB.

## Auf dem Handy installieren

Öffne die gehostete Adresse auf dem Handy:

- **iPhone (Safari):** unten auf **Teilen** tippen → **«Zum Home-Bildschirm»** → Hinzufügen.
- **Android (Chrome):** Menü **⋮** → **«App installieren»** bzw. «Zum Startbildschirm hinzufügen».
  Alternativ in der App unter Einstellungen → «App installieren».

Danach startet «Kleider» wie eine normale App im Vollbild und funktioniert offline. Erscheint eine neue Version,
zeigt die App oben «Neue Version verfügbar – Aktualisieren».

## Deine Daten sichern

- Einstellungen → Backup → **Exportieren** erzeugt `kleider-backup-JJJJ-MM-TT.json` mit allen Kleidern, **Fotos**,
  Outfits, dem Verlauf, Tätigkeiten und Einstellungen. Auf dem Handy speichert «Teilen …» die Datei z. B. in Dateien/Drive.
- **Importieren** bietet «Zusammenführen» (behält vorhandene Daten) oder «Alles ersetzen» (nur nach Bestätigung).
- Browser können Website-Daten bei Speichermangel löschen. Die App bittet um dauerhaften Speicher; installiert ist
  das zuverlässiger. Trotzdem: regelmässig ein Backup exportieren.
- Gelöscht wird nie etwas ohne Bestätigung.

## Wie die Outfit-Logik funktioniert

Die Logik liegt als eigenes, UI-freies Modul in `src/engine/` und ist mit Vitest getestet (`src/engine/engine.test.ts`).

**Harte Regeln** (werden nie verletzt)
- Nur Kleider mit Status «verfügbar».
- Vollständig: Oberteil, Hose, Schuhe. Je nach Wetter zusätzlich Midlayer (gefühlt unter 8°) und/oder Jacke
  (gefühlt unter 13°, bei Regen ab 50 % oder starkem Wind).
- Passend zum Anlass. Ein Kleidungsstück ohne markierte Anlässe gilt als «passt überall».
- Regeln der Tätigkeit, z. B. «keine empfindlichen Kleider» oder Stile, die gemieden werden.

**Punkte** (gewichtete Summe, 0–100)
- *Wärme:* Summe der Wärmegrade (1–5) der Schichten im Vergleich zum Zielwert für die kühlste gefühlte Temperatur.
  Bei grossen Temperaturunterschieden im Zeitraum darf die Basis (ohne Jacke) am Nachmittag nicht zu warm sein → die
  Jacke wird zur abnehmbaren Schicht («morgens 5°, nachmittags 14°: Jacke ausziehen»).
- *Wetterschutz:* Regenfeste Jacke/Schuhe bei Regen, winddichte Jacke bei Wind, empfindliche Teile bei Regen abwerten.
- *Farbharmonie:* Neutraltöne passen immer; Ton-in-Ton, benachbarte und Komplementärfarben geben Punkte,
  zu viele Farbfamilien und mehrere Muster ziehen ab. Der Farb-Regler bestimmt, wie bunt es sein soll.
- *Stil:* Jeder Stil-Tag hat ein Profil (schick, experimentell, praktisch); verglichen mit den Reglern plus
  Stimmigkeit der Teile untereinander.
- *Persönliche Bewertung:* Sterne plus Komfort/Look – bei «Praktisch» zählt Komfort mehr, bei «Look» der Look.
- *Abwechslung:* Kürzlich getragene Teile werden abgewertet; bei «Experimentell» gibt es Bonus für selten Getragenes.
- *Tätigkeit:* bevorzugte Stile, «praktisch & robust».
- *Gelerntes:* Outfit-Bewertungen und «Nein»-Rückmeldungen ergeben Vorlieben für Kombinationen von Teilen
  (ältere Rückmeldungen zählen weniger). Genau abgelehnte Kombinationen kommen nicht wieder.

**Zufall:** Kandidaten werden gewichtet zufällig gezogen; «Experimentell» macht die Auswahl breiter. Die drei
Maker-Vorschläge werden so gewählt, dass sie sich möglichst unterscheiden.

**Fehlt etwas**, sagt die App genau was: z. B. «Bei gefühlt 2° braucht es eine Jacke, aber alle deine Jacken sind
gerade nicht verfügbar» oder «Keine verfügbaren Schuhe passen zum Anlass «Arbeit»».

## Architektur

```
src/
  domain/      Typen, Kategorien, Farben, deutsche Labels (keine UI)
  engine/      Outfit-Logik: Wetterbedarf, Farben, Punkte, Generator, Lernen (+ Tests)
  db/          Dexie/IndexedDB-Schema und Repository-Funktionen
  lib/         Bildkompression, Farberkennung, Wetter (Open-Meteo), Backup, Statistik, Filter (+ Tests)
  hooks/       React-Hooks für Daten, Einstellungen, Wetter
  components/  Collage, Bottom-Sheet, Chips, Regler, Sterne, Dialoge
  features/    Bildschirme: today, maker, wardrobe, history, settings, activities, samples
```

**Datenmodell (IndexedDB, Datenbank `kleider-app`)**
- `garments` – Kleidungsstück mit Foto- und Vorschau-Blob und allen Eigenschaften
- `outfits` – gespeicherte Outfits (Teile-IDs, Kontext: Tätigkeit, Regler, Wetter; Bewertung, Begründung)
- `wearLogs` – «getragen am» (Datum → Outfit/Teile), Grundlage für Kalender, Statistik und Abwechslung
- `feedback` – Ablehnungen/Likes von Kombinationen
- `activities` – Standard- und eigene Tätigkeiten mit Regeln
- `settings` – Ort, Zeitraum, Farbschema, zuletzt gewählte Tätigkeit

Technik: React 19, TypeScript (strict), Vite, Dexie, vite-plugin-pwa (Workbox), Vitest. Wetter von
[Open-Meteo](https://open-meteo.com) (ohne API-Key). Fotos werden vor dem Speichern auf max. 1280 px verkleinert
(WebP/JPEG) plus Vorschaubild.

## Datenschutz

- Fotos und Daten verlassen dein Gerät nie. Die Farberkennung läuft lokal im Browser.
- An Open-Meteo gehen nur die Koordinaten deines Orts (gerundet auf ca. 10 m) bzw. der Suchbegriff bei der Ortssuche.

## Mögliche Erweiterung

KI-Bilderkennung (Kategorie, Farben, Stil automatisch aus dem Foto) ist bewusst **nicht** eingebaut: Sie bräuchte
einen API-Key und ein kleines Backend, damit der Key nicht im Browser liegt, und Fotos dürften nur nach deiner
ausdrücklichen Zustimmung an den Dienst gehen.
