# Logo Loader Studio

Design animated loading indicators from your own logo, then export them as
transparent WebM, GIF or Lottie.

## Features

- **137 parametric presets** across 10 categories — ink & handwriting, path
  drawing, reveal & assemble, fill & colour, signature FX, entrance, orbit,
  spin, pulse and float. 33 engine families.
- **Everything is configurable.** Each preset declares typed parameters
  (amplitude, stroke mode, glow, stagger, ring count…) plus global timing —
  duration, easing, direction and playback speed. Controls are generated from
  the schema, so every parameter the engine reads is exposed in the UI.
- **True transparency**, end to end: WebM with a real alpha plane (VP9
  `yuva420p`), GIF with a reserved transparent palette index, and Lottie with no
  background layer.
- **What you preview is what you export.** The preview, the thumbnails and all
  five export paths call the same engine with the same resolved animation
  object, background included.
- Live-animating preset thumbnails, timeline scrubbing, light and dark
  appearance.

## Architecture

```
lib/core-engine.js   Pure state pass + canvas drawing pass. Dependency-free UMD
                     so it can be imported by the app AND injected verbatim into
                     Puppeteer. Do not add import/export statements to it.
lib/svg-paths.js     Shared SVG shape → path extraction, same UMD constraint.
lib/presets.js       Preset library + PARAM_SCHEMA that drives the settings UI.
lib/*-exporter.js    Client-side GIF / WebM / Lottie encoders.
app/api/export       Server WebM (Puppeteer + ffmpeg, VP9 alpha).
app/api/export-gif   Server GIF (Puppeteer + ffmpeg palettegen/paletteuse).
components/studio/   UI, built on shadcn/ui + Tailwind v4.
```

The client sends the **fully resolved animation object** to the server routes —
never a preset id — so the server cannot disagree with what was previewed.

### Adding a preset

Add an entry to `PRESETS` in `lib/presets.js`. If it uses an existing `family`,
it inherits that family's parameter controls automatically. A new family needs a
`case` in `getFrameState` and an entry in `PARAM_SCHEMA`.

## Keyboard

`Space` play/pause · `←` `→` step a frame (hold `Shift` for 5%) · `Home` restart ·
`[` `]` toggle panels · `/` focus search · `Cmd/Ctrl+E` export.

## Tech Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · shadcn/ui · Lucide ·
Puppeteer · ffmpeg · gifenc · webm-muxer

## Run

```bash
npm install
npx puppeteer browsers install chrome   # needed for the server export routes
npm run dev
```

Open `http://localhost:3000`.

## Production

```bash
npm run build
npm run start
```

Server exports need a Chrome binary. On Vercel/Lambda/Netlify the bundled
`@sparticuz/chromium` is used automatically; elsewhere a normal Puppeteer Chrome
install is used, falling back to the bundled build if none is present.
