#!/usr/bin/env bash
# Проба озвучки: открывает .env.voice для вставки ключа, потом озвучивает первые 5 записей.
# Запуск: ./scripts/voice-test.sh   (или npm run voice:test)
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.voice ]; then
  cat > .env.voice <<'ENV'
ELEVENLABS_API_KEY=вставьте_секретный_ключ_sk_...
ELEVENLABS_VOICE_ID=вставьте_id_голоса
ENV
  echo "Создал .env.voice (он в .gitignore, в git не попадёт)."
fi

open -e .env.voice
echo "В TextEdit вставьте ключ и id голоса, сохраните файл (Cmd+S)."
read -r -p "Когда сохранили, нажмите Enter, чтобы озвучить первые 5 записей... " _

node scripts/build-voice.mjs --limit=5
