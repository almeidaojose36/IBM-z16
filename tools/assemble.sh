#!/bin/bash
# Join the rendered chunks and the soundtrack into the final video.
# Usage: tools/assemble.sh [out/z16-how-a-mainframe-works.mp4]
cd "$(dirname "$0")/.."
OUT=${1:-out/z16-how-a-mainframe-works.mp4}
ls out/chunks/c[0-9][0-9].mp4 | sed "s|^out/chunks/|file '|; s|$|'|" > out/chunks/list.txt
ffmpeg -y -v error -f concat -safe 0 -i out/chunks/list.txt -i out/audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "$OUT" && echo "wrote $OUT"
