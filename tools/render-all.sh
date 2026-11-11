#!/bin/bash
# Render the whole picture in resumable chunks (out/chunks/cNN.mp4). Re-run to continue; finished chunks are skipped.
# Settings come from the environment (defaults in brackets):
#   WIDTH [1920] HEIGHT [1080] FPS [30] SCALE [1] QUALITY [high] CRF [14] LEN [60 s per chunk]
#   GPU [1 = use the graphics card, 0 = software]  HEADED [0; 1 shows the browser window]  BUDGET [seconds, unlimited]
# Examples:  tools/render-all.sh                       # 1080p30 on the GPU
#            WIDTH=3840 HEIGHT=2160 tools/render-all.sh # 4K
#            GPU=0 QUALITY=draft SCALE=0.8 FPS=24 tools/render-all.sh   # CPU-only fallback
# Changing any setting? Delete out/chunks first so old and new chunks are not mixed.
cd "$(dirname "$0")/.."
WIDTH=${WIDTH:-1920}; HEIGHT=${HEIGHT:-1080}; FPS=${FPS:-30}; SCALE=${SCALE:-1}; QUALITY=${QUALITY:-high}; CRF=${CRF:-14}
LEN=${LEN:-60}; GPU=${GPU:-1}; HEADED=${HEADED:-0}; BUDGET=${BUDGET:-0}
FLAGS=(); [ "$GPU" = 1 ] && FLAGS+=(--gpu); [ "$HEADED" = 1 ] && FLAGS+=(--headed)
TOTAL=$(node -e "import('./content/timing.js').then(m=>console.log(Math.ceil(m.TIMING.total)))")
mkdir -p out/chunks
echo "$WIDTH x $HEIGHT @ $FPS fps, scale $SCALE, quality $QUALITY" > out/chunks/settings.txt
START=$(date +%s); i=0
for ((t=0; t<TOTAL; t+=LEN)); do
  f=$(printf "out/chunks/c%03d.mp4" $i); i=$((i+1))
  [ -s "$f" ] && continue
  [ "$BUDGET" -gt 0 ] && [ $(( $(date +%s) - START )) -gt "$BUDGET" ] && { echo "budget reached, re-run to continue"; exit 0; }
  to=$((t+LEN)); [ $to -gt $TOTAL ] && to=$TOTAL
  node tools/render-video.mjs --width $WIDTH --height $HEIGHT --from $t --to $to --fps $FPS --scale $SCALE --quality $QUALITY --crf $CRF "${FLAGS[@]}" --out "$f.part.mp4" \
    && mv "$f.part.mp4" "$f" || { echo "chunk $f failed"; exit 1; }
done
echo "all chunks done"
