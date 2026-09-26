# Landing media

Background footage. `src/components/BackgroundVideo.tsx` picks these names up
automatically (Vite `import.meta.glob`), with no code change. Each clip ships as
`<name>.webm` (VP9, preferred), `<name>.mp4` (H.264 fallback for Safari) and
`<name>-poster.jpg` (first frame; shown while loading and under reduced motion).

| Name | Source | Used by |
|---|---|---|
| `hero` | `output-5` · reefer truck crossing the desert | Hero background; journey chapter 04 (Failure) |
| `port` | `output-2` · container ship at the quay | Journey chapter 01 (Arrival) |
| `lift` | `output-3` · gantry crane lifting a container | Journey chapter 02 (Telemetry) |
| `handover` | `output-4` · container going onto trucks | Journey chapter 03 (Handover) |
| `store` | `output-7` · row of cold-store containers | Journey chapter 05 (Decision) |

The originals live in `landing/media-src/` (git-ignored, ~22 MB). Anything in
this folder is bundled, so never drop raw exports here. Re-encode with ffmpeg:
each clip gets a 0.75 s cross-fade from its tail into its head, so it loops
without a jump:

```sh
X=0.75; d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 in.mp4)
ffmpeg -i in.mp4 -an -filter_complex "[0:v]format=yuv420p,split[a][b];[a]trim=start=$X,setpts=PTS-STARTPTS[m];[b]trim=end=$X,setpts=PTS-STARTPTS[h];[m][h]xfade=transition=fade:duration=$X:offset=$(echo "$d-2*$X" | bc),format=yuv420p" \
  -c:v libx264 -preset slow -crf 25 -movflags +faststart name.mp4
ffmpeg -i name.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 37 -row-mt 1 name.webm
ffmpeg -i name.mp4 -frames:v 1 -q:v 5 name-poster.jpg
```

If a file is missing, the hero falls back to its CSS background, so the page
never breaks. Keep clips short (5–10 s), silent, 16:9, and under ~2 MB each.
The footage is AI-generated and decorative; it is tagged AI-GENERATED on the
page and must never be presented as a real truck, camera feed or measurement.
