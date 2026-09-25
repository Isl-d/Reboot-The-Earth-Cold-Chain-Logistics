# Landing media

Drop background footage here. `src/components/BackgroundVideo.tsx` picks these
names up automatically (Vite `import.meta.glob`), with no code change:

| File | Used by | Notes |
|---|---|---|
| `hero.webm` | Hero background | Preferred source (smaller). |
| `hero.mp4` | Hero background | H.264 fallback for Safari. |
| `hero-poster.jpg` | Hero background | First frame; shown while loading and under reduced motion. |

If a file is missing, the hero falls back to its CSS background, so the page
never breaks. Keep clips short (5–10 s), loopable, silent, 16:9, and under
~8 MB. The footage is AI-generated and decorative; it must never be presented as
a real truck, camera feed or measurement.
