# VOID Studio

Underground music production. Browser-based step sequencer + sampler + arranger + AI companion.

**Live:** [voidaidaw.vercel.app](https://voidaidaw.vercel.app)

---

## Project layout

This was originally a single 3,633-line `index.html`. As of the module split, code is organized by concern. **No build step.** Plain HTML, plain CSS, plain JS. Vercel serves it as static files.

```
index.html              Shell — head meta, body markup, ordered <script> tags
css/main.css            All styles
js/01-audio.js          AudioContext setup, drum/melodic synthesis (playDrum, playMel, defSD)
js/02-state.js          Global state — KITS, ITYPES, dGrid, iTracks, bpm, swing, transport vars
js/03-ui-studio.js      Studio tab — timeline, track rows, piano roll, sound design panels
js/04-ui-sampler.js     Sampler tab — pads, mic record, file import, mix record
js/05-ui-ai.js          AI tab — Scoobsy agent, avatar/bg generation, chat, modal
js/06-engine.js         Mixer, sync helpers, addIT, scheduler, startSeq/stopSeq
js/07-ui-soundboard.js  Soundboard tab — drum pads, melodic pads, keyboard handler
js/08-persist-hub.js    Project save/load (window.storage + mt_v4 key), Hub modal
js/09-ui-playground.js  Playground tab — bar arranger, lanes, blocks, transport
js/10-events.js         Studio transport event listeners (Play, Stop, Clear, BPM, swing, etc.)
js/11-init.js           Bootstrap — runs buildBM/buildSI/buildAllTracks/loadProjects/loadAI
api/claude.js           Vercel serverless function — proxies to api.anthropic.com
vercel.json             Function config
```

---

## Architecture notes

### No framework, no modules, no build
Code uses plain `<script>` tags (not `type="module"`). Every JS file shares the global scope. This is intentional — the codebase shares ~30 globals across files (`dGrid`, `iTracks`, `bpm`, `KITS`, etc.) and ES modules would require wrapping all that state in a shared namespace.

**Inline `onclick="fnName(...)"` handlers work natively** because functions land on the global scope. No `window.fn = fn` bridges needed.

### Script load order matters
The order in `index.html` is execution order:
1. Audio engine and state must load first (other files reference them)
2. UI files in any order (they only reference each other inside function bodies, which run after all files load)
3. `10-events.js` registers DOM listeners — must run after the elements exist (it's at end of body, so this is fine)
4. `11-init.js` runs the bootstrap functions — must run last

### Audio engine
Raw Web Audio API. Not Tone.js. Real lookahead scheduler at 25ms intervals with 100ms ahead-window in `06-engine.js`.

### Storage
`window.storage.set('mt_v4', ...)` with `localStorage` fallback. The `mt_v4` key is the schema version — projects save as a single JSON blob.

### State globals (the contract every UI file depends on)
- **Drums:** `dGrid` (per-step `{on, vel}` objects), `dVols`, `dMuted`, `dSD`, `curKit`
- **Melodic:** `iTracks` array — each track has `{id, type, def, notes, rollData, vol, muted, octave, sd}`
- **Transport:** `bpm`, `swing`, `stepCount`, `curStep`, `nextNT`, `seqInt`, `isPlaying`
- **Projects:** `PROJECTS` array, `curProjId`

---

## Development

```bash
# Just open it
open index.html

# Or serve locally if you want module-correct paths and CORS sanity
python3 -m http.server 8000
# then visit http://localhost:8000
```

No `npm install`, no build, no dev server required. Edit any file and refresh.

### Adding a new feature

1. Find the right file by tab/concern (see layout above)
2. Add functions inside that file — they'll be globally accessible
3. If state is needed, add it to `02-state.js`
4. If a new event listener is needed for transport-level controls, add to `10-events.js`
5. If bootstrap initialization is required, add to `11-init.js`

### Adding a new tab

1. Add markup to `index.html` body (look at existing `<div id="screen-...">` pattern)
2. Create `js/NN-ui-yourtab.js` with build/render functions
3. Add `<script src="js/NN-ui-yourtab.js"></script>` to `index.html` in load-order position
4. Wire any bootstrap calls into `11-init.js`

---

## Deployment

Vercel auto-deploys from `main`. Preview deploys auto-generate from PRs.

The only server-side code is `api/claude.js` — a thin proxy to `api.anthropic.com` that injects the API key. The client posts shaped Anthropic Messages API requests directly.

---

## Roadmap

See the v1 implementation spec for the full plan. Next up after the module split:

- **Time-based MIDI rewrite** — replace per-pitch step grid with `{pitch, startTick, duration, velocity}` note model
- Per-track FX rack for drum tracks (melodic tracks already have FX via `.sd`)
- Velocity UI polish for drum steps
- Project schema versioning (formal `schemaVersion` field)
- Undo/redo via snapshot stack
- WAV export via `OfflineAudioContext`

---

## File size benchmarks (post-split)

| File | Size | Lines |
|------|-----:|------:|
| `index.html` | 28 KB | 377 |
| `css/main.css` | 56 KB | 558 |
| `js/05-ui-ai.js` | 56 KB | 1,374 |
| `js/03-ui-studio.js` | 52 KB | 572 |
| `js/01-audio.js` | 32 KB | 143 |
| `js/04-ui-sampler.js` | 16 KB | 227 |
| `js/08-persist-hub.js` | 12 KB | 29 |
| `js/09-ui-playground.js` | 12 KB | 262 |
| `js/06-engine.js` | 8 KB | 29 |
| `js/02-state.js` | 8 KB | 42 |
| `js/07-ui-soundboard.js` | 4 KB | 10 |
| `js/10-events.js` | 4 KB | 12 |
| `js/11-init.js` | 4 KB | 2 |
| **Total JS** | **208 KB** | **2,705** |
