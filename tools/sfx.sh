#!/bin/bash
# Generate the sound effects with ElevenLabs. Usage: tools/sfx.sh  (needs ELEVENLABS_API_KEY, or a proxy that injects it)
cd "$(dirname "$0")/.."
mkdir -p audio/sfx
gen() { # name seconds prompt
  [ -s "audio/sfx/$1.mp3" ] && return
  curl -sS -m 180 -X POST "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192" -H "Content-Type: application/json" -H "xi-api-key: ${ELEVENLABS_API_KEY:-proxy}" \
    -d "{\"text\":\"$3\",\"duration_seconds\":$2,\"prompt_influence\":0.6}" -o "audio/sfx/$1.mp3" -w "$1 %{http_code} %{size_download}\n"
}
gen slide 3 "Heavy metal server drawer sliding smoothly out of a rack on steel rails, ending with a soft solid clunk, close and clean, no reverb"
gen whoosh 1.5 "Soft airy cinematic whoosh transition, smooth and short, no impact"
gen door 3 "Tall metal cabinet door unlatching and swinging open smoothly on hinges, subtle, clean"
gen thud 1.2 "Heavy equipment rack settling onto the floor, deep soft thud, short"
gen beep 0.6 "Single short clean electronic beep from a contactless card payment terminal"
gen approved 1.2 "Pleasant two-tone ascending confirmation chime from a payment terminal, payment approved, clean"
gen click 0.5 "Small precise plastic and metal latch click, computer card snapping into a slot, dry and close"
gen lift 2 "Thin sheet metal cover panel lifting off a machine, light metallic scrape and release, subtle"
gen servo 1.8 "Soft futuristic mechanical servo movement, several small parts gliding apart smoothly, subtle sci-fi interface motion"
gen alert 1 "Soft low two-pulse warning tone, a gentle fault alert, not harsh"
gen water 4 "Water flowing steadily through a narrow tube, soft liquid gurgle and gentle pump hum, clean close recording"
gen chime 1.5 "Gentle bright glassy success chime with a soft shimmer, positive and calm"
gen compute 4 "Fast soft digital data processing texture, rapid tiny electronic ticks and a rising shimmering tone, a neural network thinking, subtle"
gen zap 1 "Short soft electrical energy pulse with a clean synthetic sparkle, a signal switching on, not harsh"
gen tick 0.5 "Very short soft high-tech user interface tick, a label popping in, subtle and clean"
gen riser 4 "Smooth cinematic riser, airy tonal swell building tension as if diving into a microscopic world, ends without a hit"
gen data 2 "Fast bright digital data stream passing by, soft glittering electronic sweep travelling through a cable"
gen chapter 3 "Deep soft cinematic sub boom followed by an airy tonal swell, an elegant title reveal, not aggressive"
gen impact 4 "Powerful but smooth cinematic low impact with a long warm tail, main title reveal"
