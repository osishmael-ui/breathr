# Breathr

Breathr is a private, browser-based breathing companion for relaxation and calm. It pairs simple inhale, hold, and exhale rhythms with three local 2ndBell soundtracks.

## Run locally

```bash
npm install
npm run dev
```

## Check and build

```bash
npm run lint
npm run build
npm test
npx playwright install chromium
npm run test:audio
```

See [binaural verification](docs/binaural-verification.md) for the results and headphone test procedure.

## Deploy to Vercel

Vercel can deploy this Vite app with `npm run build` and the `dist` output directory. `SITE_URL` is optional; Vercel's production URL is used automatically for canonical and social metadata.

## Current product scope

- Three 2ndBell relaxation recordings: Restore, Arrive, and Downshift
- Optional stereo binaural layer, off by default
- Guided Calm 4–6, Settle 4–4–6, and Box 4–4–4–4 breathing patterns
- Flexible and open-ended session timers
- Configurable Pomodoro cycles and completion cues
- Theme selection, keyboard shortcuts, and optional screen wake lock
- Local preference and active-session persistence
- Installable offline PWA shell

Audio files are bundled in `public/audio/` and played locally in the browser. No account, backend, or audio upload is required.
