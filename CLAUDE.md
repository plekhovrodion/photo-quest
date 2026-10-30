# CLAUDE.md

Руководство для Claude Code в этом репозитории.

## Что это

«ФотоКвест» (Учи Мастерская): веб-игра для детей 3–8 лет. Заврики Гриша и Соня просят найти предмет дома, ребёнок снимает его на живую камеру, телефон сам проверяет фото (цвет, MobileNet, COCO-SSD, CLIP в Web Worker), после успеха звучит английское слово.
Стек: Vite 6 + TypeScript (без React), vitest. Модели распознавания лежат в `public/models` (около 117 МБ), озвучка в `public/voice`, звуки интерфейса в `public/sfx`.
Бэкенд прогресса живёт в соседнем репозитории `photo-quest-api` (Go, по образцу doloyt-backend); без него игра работает на `localStorage`.

## Команды

```bash
npm install
npm run dev              # Vite, http://localhost:5173/photo_quest/ (API /photo_quest/api проксируется на :8081)
npm test                 # vitest run
npm run build            # tsc --noEmit && vite build (это собирает CI)
npm run voice:test       # проба озвучки ElevenLabs: 5 записей (ключ в .env.voice)
npm run voice            # озвучка всех фраз, заданий и английских слов
node scripts/fetch-sfx.mjs   # звуки интерфейса из Uchi Sound Lab -> public/sfx
```

После любого изменения: `npx tsc --noEmit` и `npx vitest run`, перед пушем ещё `npm run build`. Результат на экране проверяйте в браузере (камеру подменяйте canvas-потоком).

## Скиллы

Скиллы лежат в `.claude/skills/`. Из них для нашей игры подходят:

- `course-analytics`: как писать спецификацию аналитики (воронку) и называть события. Перед тем как расставлять логирование, нужна спецификация.
- `clickstream-logging`: как отправлять события через `@uchi/client-clickstream` по спецификации. В игре пока нет отправки событий; хост задан в `.env.*` (`VITE_CLICK_STREAM_HOST`).
- `branch-creation`: имена веток `{JIRA}_{описание}`, conventional commits, описание MR. Если задачи в Jira нет, спросите её у автора, не выдумывайте.

Остальные скиллы (`react-patterns`, `feature-sliced-design`, `tailwind-patterns`, `tanstack-query-expert`, `zustand-store-ts`) пришли из шаблона и к этому проекту не относятся: в игре нет React, Tailwind и FSD.

## Архитектура

- `src/main.ts`: все экраны и логика (карта мест, место, задание, успех, ошибка) на HTML-шаблонах. Экраны рисует `show(html, cls)`, оболочка места: `.loc`, `locHeader`, `taskScreen`, `bigBtn`.
- `src/game/`: чистая логика игры (конечный автомат заданий), без DOM, покрыта тестами.
- `src/camera/`: живая камера (`capture.ts`), рамка предмета, состояния ошибок камеры с инструкциями (`problems.ts`), объяснение перед запросом камеры (`prepermission.ts`). Фото из файла не берём.
- `src/vision/`: проверка фото на устройстве: цвет (HSV), MobileNet, COCO-SSD, CLIP в `clipWorker.ts`.
- `src/data/`: задания и места (`tasks.ts`), английские слова (`english.ts`), фразы заврика (`phrases.ts`), манифест озвучки (`voice-manifest.json`).
- `src/audio/`: озвучка (`voice.ts` очередь записей, `sounds.ts` запасной голос браузера, `speak`/`speakEnglish`) и звуки интерфейса (`sfx.ts`, Web Audio).
- `src/api/economy.ts`: бусины (баланс, списание за новую находку через сервер, `canAfford`); `src/ui/notice.ts`: окно с сообщением («Бусины закончились»).
- `src/storage/store.ts`: хранилище прогресса: `LocalStore` и `FoundApiStore` (бэкенд) через `SyncedStore` с повтором при сбое сети.
- `src/ui/`, `src/fx/`: иконки, звёзды, оформление карты (`mapDecor.ts`), конфетти.

## Договорённости

- Логику держите в чистых модулях без DOM, чтобы её можно было проверить vitest.
- Тексты для ребёнка короткие, без восклицательных знаков в заданиях, без пояснений, что оказалось в кадре.
- Оплата бусинами только на сервере: клиент не хранит баланс и не решает, что задание оплачено. Находка засчитывается ответом сервера.
- Прогресс, который ребёнок заработал, сохраняем сразу (а не при уходе с экрана): иначе находка пропадёт.
- Любая запись озвучки: источник правды список в коде, файлы создаёт `scripts/build-voice.mjs`; руками манифест не правим.
- Ключи и токены (ElevenLabs и др.) только в `.env.voice` / окружении, в git их не кладём.
- Деплой: `.gitlab-ci.yml` собирает образ, чарт Shaman в `.shaman/` (префикс `/photo_quest`, авторизация через uchiru-login). Подробнее в README.
