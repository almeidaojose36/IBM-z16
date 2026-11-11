#!/bin/bash
# Render the whole video in resumable chunks (out/chunks/cNN.mp4). Re-run to continue; finished chunks are skipped.
# Usage: tools/render-all.sh [chunk seconds=120] [fps=24] [scale=0.8] [budget seconds=6000]
cd "$(dirname "$0")/.."
LEN=${1:-120}; FPS=${2:-24}; SCALE=${3:-0.8}; BUDGET=${4:-6000}
TOTAL=$(node -e "import('./content/timing.js').then(m=>console.log(Math.ceil(m.TIMING.total)))")
mkdir -p out/chunks
START=$(date +%s); i=0
for ((t=0; t<TOTAL; t+=LEN)); do
  f=$(printf "out/chunks/c%02d.mp4" $i); i=$((i+1))
  [ -s "$f" ] && continue
  [ $(( $(date +%s) - START )) -gt $BUDGET ] && { echo "budget reached, re-run to continue"; exit 0; }
  to=$((t+LEN)); [ $to -gt $TOTAL ] && to=$TOTAL
  node tools/render-video.mjs --from $t --to $to --fps $FPS --scale $SCALE --crf 17 --out "$f.part.mp4" && mv "$f.part.mp4" "$f"
done
echo "all chunks done"
