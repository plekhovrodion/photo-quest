# event_info Field Glossary

Merged glossary of `event_info` fields seen across real course specs. **Check here before inventing a new field name** — if a concept already has a conventional name, reuse it (downstream dashboards are built on these names).

Casing is intentionally inconsistent across courses (`taskId` vs `task_id`, `spentTime` vs `spent_time`) — this is a per-course decision made once. Pick the style of the existing rows in *your* course's spec and stay consistent within it.

## Identity / session

| Field | Type | Meaning |
|-------|------|---------|
| `session_id` | string | unique user session id — stitches one user's journey |
| `coreId` | string | session id variant (core-session context) |
| `coreSessionId` | number | порядковый номер кор-сессии |
| `coreSessionType` | enum | `educational` / `game` |
| `raceId` | number | id конкретной гонки/матча — для соревновательных механик |
| `homework_id` | number | id домашки, если курс запущен из ДЗ |

## Device / user

| Field | Type | Meaning |
|-------|------|---------|
| `deviceType` | enum | `desktop` / `tablet` / `mobile` / `other` (из user_agent) — отправлять всегда |
| `user_type` | enum | обычно `student`; колонка спеки, не event_info |
| `from` | enum | откуда попал в курс: `main` (из ЛК) / `hw` (из домашки) |

## Navigation / placement

| Field | Type | Meaning |
|-------|------|---------|
| `source` | enum | экран, с которого перешёл (`main`, `paywall`, название домика, `other`) |
| `place` | enum | где нажал: `paywall` / `main` / `land`; на пейволе может быть `paywall_top` / `paywall_medium` / `paywall_bottom` |
| `screen` | enum | какой экран (`main`, `game`, `matching`, `paywall`, `stat`, ...) — для `open_screen` / `click_back_btn` |
| `location` | enum | игровая локация (per-course enum, e.g. `straight_road` / `circle_road`) |

## Tasks / learning outcomes

| Field | Type | Meaning |
|-------|------|---------|
| `taskId` / `task_id` | number/string | id задания |
| `taskNumber` | number | порядковый номер задания в сессии |
| `task_type` | enum | тип задания, если в курсе несколько (`theory` / `task`, mechanicName) |
| `task_difficulty` / `complexity` | number | сложность задания |
| `theme` | enum | тема/навык задания |
| `enterType` | enum | способ ввода ответа: `keypad` / `select` |
| `success` / `isCorrect` | 1/0 или bool | успешность / корректность ответа |
| `studentAnswer` | any | ответ ученика |
| `rightAnswer` | any | правильный ответ |
| `attempts` | number | количество попыток |
| `spentTime` / `spent_time` | number (ms) | время на задание/видео/сессию |
| `sessionTime` | number | продолжительность сессии |

## Results / rewards

| Field | Type | Meaning |
|-------|------|---------|
| `congrat` | bool | дошёл ли ученик до конграта |
| `resultCoins` | number | монетки, заработанные за сессию |
| `resultFriendship` | number | опыт/дружба, заработанные за сессию |
| `coins` / `eggs` | number | валюты в наградах (гонки, сундуки) |
| `reward` | number | награда за задачу |
| `resultPlace` | number | место по итогам гонки |
| `countTasks` / `countRightTasks` | number | всего заданий / решено верно |
| `questName` | string | название квеста/хотелки питомца |
| `questCongrat` | object | награда за квест `{ coins, friendship }` |

## Economy / shop

| Field | Type | Meaning |
|-------|------|---------|
| `userCoins` | number | монеток на балансе до покупки |
| `itemName` / `itemCategory` / `itemPrice` | string / string / number | товар в магазине |
| `itemAvailable` | bool | хватает ли монеток на товар |
| `houseName` | string | название домика питомца (= имя питомца) |
| `housePrice` | number | стоимость домика |
| `heroType` / `skinType` | enum | выбранный герой / скин |
| `cost` | number | стоимость героя/скина |
| `levelFriendship` | number | уровень дружбы питомца |
| `wordsAvailable` | number | кол-во доступных слов у питомца |
| `objectName` | string | название интерактивного предмета |

## Media / content

| Field | Type | Meaning |
|-------|------|---------|
| `videoId` / `video_id` | number | порядковый номер / id видео |
| `level` | string | номер уровня (формат per-course, e.g. класс-локация-урок) |
| `isMicrophoneAllowed` / `isMicrophoneAvailable` | bool | состояние микрофона (курсы со speech-механиками) |

## Payments / fakedoor

| Field | Type | Meaning |
|-------|------|---------|
| `product` | string | `<course_slug>` — идентификатор курса в payments/fakedoor событиях |
| `inputvalue` | string | введённые цифры карты на фейкдоре |
