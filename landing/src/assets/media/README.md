# Landing media

Background footage. `src/components/BackgroundVideo.tsx` picks these names up
automatically (Vite `import.meta.glob`), with no code change. Each clip ships as
`<name>.webm` (VP9, preferred), `<name>.mp4` (H.264 fallback for Safari) and
`<name>-poster.jpg` (first frame; shown while loading and under reduced motion).

| Name | Source | Used by | Loop |
|---|---|---|---|
| `hero` | `output-5` · reefer truck crossing the desert | Hero background; journey chapter 04 (Failure) | cross-fade |
| `port` | `output-2` · container ship at the quay | Journey chapter 01 (Arrival) | cross-fade, last 0.5 s dropped (camera lurch) |
| `lift` | `output-3` · gantry crane lifting a container | Journey chapter 02 (Telemetry) | ping-pong + baked drift (12 s) |
| `handover` | `output-4` · container going onto trucks | Journey chapter 03 (Handover) | first 3 s at 1x, tail at 1.5x, cross-fade |
| `store` | `output-7` · row of cold-store containers | Journey chapter 05 (Decision) | ping-pong + baked drift (12 s) |

The footage must never look like it stops. Near-static shots (`lift`, `store`)
play forward then backward, so the turn and the loop point are seamless, and
get a slow camera drift (zoompan, exactly one period per loop) baked in; a shot
whose motion dies away (`handover`) has its slow tail sped up. The drift lives
in the file, not in CSS: scaling a playing `<video>` every frame made it miss
frames.

The originals live in `landing/media-src/` (git-ignored, ~22 MB). Anything in
this folder is bundled, so never drop raw exports here. Re-encode with ffmpeg.
The brand grade (desaturated, darkened, cool teal) is baked in with `$G`
rather than applied in CSS: a CSS filter or blend over playing video repaints
every frame and made the page lag. Cross-fade clips get a 1 s dissolve from their
tail into their head (0.8 s for `handover`) and a keyframe every second:

```sh
G="eq=saturation=0.3:contrast=1.1,colorlevels=romax=0.6:gomax=0.68:bomax=0.74,colorbalance=rs=-0.06:gs=0.02:bs=0.06:rm=-0.06:gm=0.02:bm=0.05"
X=1.0; d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 in.mp4)
ffmpeg -i in.mp4 -an -filter_complex "[0:v]$G,format=yuv420p,split[a][b];[a]trim=start=$X,setpts=PTS-STARTPTS[m];[b]trim=end=$X,setpts=PTS-STARTPTS[h];[m][h]xfade=transition=fade:duration=$X:offset=$(echo "$d-2*$X" | bc),format=yuv420p" \
  -c:v libx264 -preset slow -crf 25 -g 24 -movflags +faststart name.mp4
ffmpeg -i name.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 37 -g 24 -row-mt 1 name.webm
ffmpeg -i name.mp4 -frames:v 1 -q:v 5 name-poster.jpg

# Ping-pong + baked drift instead (lift, store). F = frame count of in.mp4;
# the loop is N = 2F-3 frames and the drift completes one period in N.
F=145; N=$((2*F-3))
Z="zoompan=z='1.04+0.06*(1-cos(2*PI*on/$N))/2':x='(iw-iw/zoom)/2+(iw/zoom)*0.015*sin(2*PI*on/$N)':y='(ih-ih/zoom)/2':d=1:s=1280x720:fps=24"
ffmpeg -i in.mp4 -an -filter_complex "[0:v]$G,format=yuv420p,split[a][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r0];[r0]trim=end_frame=$((F-2)),setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1,scale=3840:2160:flags=lanczos,$Z,format=yuv420p" \
  -c:v libx264 -preset slow -crf 25 -g 24 -movflags +faststart name.mp4
```

If a file is missing, the hero falls back to its CSS background, so the page
never breaks. Keep clips short (5–10 s), silent, 16:9, and under ~2 MB each.
The footage is AI-generated and decorative; it is tagged AI-GENERATED on the
page and must never be presented as a real truck, camera feed or measurement.
