#!/usr/bin/env bash
# Suno 등에서 만든 원곡 → 웹용 BGM (무음 제거, -16 LUFS 정규화, 앞뒤 페이드, MP3 128k)
# usage: tools/build_bgm.sh <트랙id> <원곡.mp3|wav>   (트랙id: main | civil_war | primordial | lidellut | troll)
set -euo pipefail
id="$1"; src="$2"
out="$(dirname "$0")/../apps/client/public/bgm/$id.mp3"
ffmpeg -v error -y -i "$src" -vn \
  -af "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.3,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.3,areverse,loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=1.2,areverse,afade=t=in:d=2,areverse" \
  -ar 44100 -c:a libmp3lame -b:a 128k -id3v2_version 0 -write_xing 1 "$out"
echo "$out $(du -h "$out" | cut -f1)"
