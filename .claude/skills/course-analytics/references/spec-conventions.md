# Spec Table Conventions

The analytics spec is a Google Sheets table maintained jointly by the analyst and developers. This file describes its column layout and markup, so a spec can be read, edited, or written from scratch. Column order varies slightly between courses — the meaning doesn't.

## Columns

| Column | Who fills | Meaning |
|--------|-----------|---------|
| Статус | analyst/dev | rollout state of the event |
| Дата раскатки / Дата выкатки на прод | dev | when the event shipped to prod |
| Тест аналитика / Метрика | analyst | `+` = analyst verifies this event in testing; may also hold test values or expected enums |
| Экран (optional) | analyst | screen/section of the course the row belongs to (Учи, Главная, Кор-сессия, Пейвол, ...) |
| Описание | analyst | human-readable action in Russian («увидели плашку», «завершил задание») |
| Источник | both | transport: `page_events`, `pageviews`, `payments`, `payments_detail` |
| event_source / ссылка | dev | course slug, `"/"` for out-of-course events, or the page URL for pageviews |
| Название события (event_type) | dev | snake_case event name |
| Дополнительные поля (event_info) | dev | the JSON payload fields for this row |
| Значения дополнительных полей (event_info) | analyst/dev | glossary of the payload fields (often one merged cell for the whole table) |
| page (optional) | dev | page URL convention (land vs course pages) |
| user_type | both | usually `student` |
| device type / user_agent | dev | `user_agent` = deviceType is derived and sent |

The table is bilingual by design: Описание and comments are in Russian, event names and field names in English snake_case/camelCase.

## Markup conventions

- **`+` in Тест аналитика** — the analyst checks this event during acceptance testing. Core-funnel events are usually `+`; auxiliary ones may not be.
- **Empty rows / section headers** («Задел на будущее», «ЛК Учителя», «Сюжет») — future work, not part of the current funnel. Keep them visible; don't delete.
- **Test values in the Тест аналитика column** — expected enums or even full example JSON payloads (see math_race `start_task`/`end_task` rows) — these are the analyst's acceptance fixtures; keep them in sync with event_info.
- **«выделенные зеленым ячейки заполняются разработчиками»** — coloring marks dev-owned cells; CSV exports lose it, so don't rely on color alone.

## pageviews page convention

Separate `page` values for the land and the course:

- ленд: `uchi.ru/<course>/land`
- курс: `uchi.ru/<course>/game`, sub-screens append via slash: `uchi.ru/<course>/game/...`

## Bad practices (analysts' own list, from real specs)

How NOT to do it — each of these caused real pain:

- пробелы в начале названий ивентов
- мусорные значения в `user_type` (в словесной битве добавили `bc` / `bt`)
- не сообщать аналитику, если логирование меняется (добавляется или меняется в таргет-группах)
- небрежное оформление JSON в event_info (пример: магическая математика)
- 10-секундный лаг отправления ивента: если ученик кликнул и покинул страницу меньше чем за 10 секунд, ивент не отправится
- не отправлялся `user_agent` → невозможно определить девайсы, на которых проходился контент
- если тест раздаётся на новых пользователей — создавать нового тестового ученика, а не переиспользовать старого
