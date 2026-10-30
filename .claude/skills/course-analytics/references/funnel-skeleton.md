# Canonical Course Funnel Skeleton

The five-phase funnel shared by all courses. `<course_slug>` is the course's single snake_case identifier (e.g. `english_ai`, `math_race`) — choose it once and use it in every row.

Phases 1–2 and 5 are nearly identical across courses; phases 3–4 are where course-specific events go.

## Phase 1 — Acquisition (outside the course)

| Описание | Источник | event_source | event_type | event_info |
|----------|----------|--------------|------------|------------|
| Увидели плашку курса | page_events | `"/"` | `display` | `<course_slug>` |
| Кликнули на плашку | page_events | `"/"` | `click` | `<course_slug>` |

The tile lives outside the course, so `event_source` is `"/"` and the slug travels in `event_info`.

## Phase 2 — Entry

| Описание | Источник | event_source | event_type | event_info |
|----------|----------|--------------|------------|------------|
| Посетили ленд/курс | pageviews | ссылка на ленд/курс | — | — |
| Лоадер (экран загрузки) | page_events | `<course_slug>` | `loader` | `{ from? }` — откуда попал: main / hw + homework_id |
| Посетили курс (главный экран) | page_events | `<course_slug>` | `enter_course` | `{ session_id, deviceType }` |

`pageviews` rows carry the page URL convention: separate pages for the land and the course, e.g. `uchi.ru/<course>/land` and `uchi.ru/<course>/game` (sub-screens append to the course page via slash).

## Phase 3 — Onboarding

| Описание | Источник | event_source | event_type | event_info |
|----------|----------|--------------|------------|------------|
| Показали интро(-видео) | page_events | `<course_slug>` | `display_intro` / `intro_*` | `{ session_id }` |
| Начало туториала | page_events | `<course_slug>` | `tutorial_start` | — |
| Шаг туториала | page_events | `<course_slug>` | `tutorial_event` | `{ type }` — enum of step ids |
| Завершение туториала | page_events | `<course_slug>` | `tutorial_end` | — |
| Повтор онбординга | page_events | `<course_slug>` | `repeat_intro` | `{ session_id }` |

Shape varies per course (single intro video vs. multi-step tutorial vs. hub walkthrough) — keep the `*_start` / `*_event` / `*_end` structure.

## Phase 4 — Core loop

The heart of the funnel. `start_task` / `end_task` is the single most valuable pair: it carries learning outcomes.

| Описание | event_type | event_info |
|----------|------------|------------|
| Открыл задание | `start_task` | `{ session_id, taskId, taskNumber?, theme?, complexity?, enterType? }` |
| Завершил задание | `end_task` | **same ids as start_task** + `{ success / isCorrect, studentAnswer, rightAnswer?, spentTime, attempts? }` |
| Начали уровень/сессию | `start_level` / `enter_core_session` | `{ session_id, level?, ...context }` |
| Завершили уровень/сессию (экран наград) | `end_level` / `exit_core_session` | **same ids** + `{ congrat, resultCoins?, resultFriendship?, countTasks?, countRightTasks?, sessionTime }` |

Rules:

- `end_task` must carry the result triple: `success`/`isCorrect`, `studentAnswer` (+ `rightAnswer` where meaningful), `spentTime` (ms).
- Ids on `end_*` are a superset of ids on `start_*`, never a different set.
- If the course has levels/sessions/races around tasks, wrap the task pair in a session pair (`start_level`/`end_level` or `enter_core_session`/`exit_core_session`) with its own id (`raceId`, `coreSessionId`).

## Phase 5 — Monetization

| Описание | Источник | event_source | event_type | event_info |
|----------|----------|--------------|------------|------------|
| Увидели пейвол | page_events | `<course_slug>` | `paywall_seen` | `{ source / place }` — откуда пришёл |
| Закрыли пейвол | page_events | `<course_slug>` | `close_paywall` | — |
| Нажали «Купить» | page_events | `<course_slug>` | `click_buy` | `{ place }` — paywall / main / paywall_top/medium/bottom |
| Фейк-дор: ввели 3 цифры карты | page_events | `<course_slug>` (или `money`) | `input_card_fake` / `fakedoor_numbers` | `{ product, inputvalue? }` |
| Купили курс | payments (`payments` / `payments_detail`) | — | — | `product = "<course_slug>"` |

`click_buy.place` granularity is a per-course decision (single `paywall` vs. per-position on the paywall) — match what the analyst wants to compare.

## Course-specific extensions (slot into phases 3–4)

Domain events reuse the same prefixes. Seen in real courses, grouped:

- **Economy / shop**: `display_shop`, `click_shop_button`, `display_shop_item`, `click_buy_item { itemName, itemCategory, itemPrice, userCoins, itemAvailable? }`
- **Pets / characters**: `display_pet_house`, `click_pet_house`, `enter_pet_house { houseName, ... }`, `hero_click { heroType }`, `skin_click { skinType }`, `buy_hero { heroType, cost }`
- **Quests / rewards**: `display_pet_quest { questName }`, `click_get_congrat { questCongrat }`, `chest_earned { skin, coins, eggs }`
- **Meta screens**: `open_screen { screen }`, `click_back_btn { screen }`, `fullscreen`, `sound { off/on }`, `game_statistics`, `error_page`, `reload_click`
- **Feedback**: `click_feedback` (сердечко)
- **Homework integration** (если курс выдаётся через ДЗ): `from: hw` + `homework_id` on entry and task events

When adding a domain event, check `field-glossary.md` first — most fields you need already have a conventional name.
