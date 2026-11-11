#!/bin/bash
# Generate the five music beds with ElevenLabs Music. Usage: tools/music.sh  (needs ELEVENLABS_API_KEY, or a proxy that injects it)
set -u
cd "$(dirname "$0")/.."
gen() { # name length_ms prompt
  [ -s "audio/music/$1.mp3" ] && return
  curl -sS -m 900 -X POST "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192" -H "Content-Type: application/json" -H "xi-api-key: ${ELEVENLABS_API_KEY:-proxy}" \
    -d "{\"prompt\":\"$3\",\"music_length_ms\":$2}" -o "audio/music/$1.mp3" -w "$1 %{http_code} %{size_download}\n"
}
BASE="Instrumental only, no vocals, no spoken words. Underscore for a premium 3D-animated technology documentary, mixed to sit under narration: no sudden loud hits, no busy lead melody."
gen a_hook 205000 "Cinematic electronic intrigue. Starts sparse with a soft ticking pulse and a low sub drone, slowly adds warm analog synth pads and a gentle arpeggio, a sense of mystery and anticipation that opens up into a confident, curious groove. 95 BPM, D minor. $BASE"
gen b_machine 330000 "Steady, precise mid-tempo electronic groove. Muted plucked synth ostinato, soft kick and brushed hi-hats, round bass, light glassy bell accents, mechanical and methodical like well-engineered machinery, quietly optimistic. 100 BPM, A minor. $BASE"
gen c_flow 210000 "Calm, flowing ambient electronica. Liquid evolving pads, soft rippling arpeggios, gentle piano notes with long reverb, slow warm bass, serene and reassuring, like water moving. 84 BPM, F major. $BASE"
gen d_wonder 280000 "Deep, awe-filled cinematic electronic. Slow shimmering textures and granular sparkles, wide sub bass, a patient rising chord progression that builds wonder as if travelling into a microscopic world, restrained pulses, subtle strings. 90 BPM, C minor. $BASE"
gen e_resolve 235000 "Uplifting, resolved cinematic electronic finale. Warm strings and synth pads, steady hopeful pulse, gentle piano motif, gradual lift to a satisfying, confident conclusion and a soft ending. 96 BPM, D major. $BASE"
