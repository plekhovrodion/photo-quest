---
name: course-analytics
description: Use when designing, implementing, or reviewing event logging (analytics) for a course — writing an analytics spec table, naming events, choosing event_info fields, building or debugging a conversion funnel. Triggers on page_events, event_type, event_info, event_source, analytics spec, воронка, логирование, аналитика курса, paywall_seen, start_task/end_task
---

# Course Analytics / Event Logging

## Overview

A course's analytics is defined by a **spec table** (Google Sheets, maintained with an analyst): one row per user action — which event fires, on which source, with which fields. All courses share the same event transport model and a common funnel skeleton; each course adds its own domain events on top.

> Scope: this skill is for **courses** — the five-phase funnel below is course-shaped (acquisition → entry → onboarding → core loop → monetization). For non-course products the skeleton does not apply.

The whole skill follows from one rule: **the spec table is the contract between product/analytics and developers — events in code must match it exactly (event names, field names, casing).** Most real-world analytics bugs are drift between the spec and the code, not wrong code.

## When to Use

- Writing an analytics spec for a new course
- Implementing event sending in a course codebase
- Extending or reviewing an existing course's logging
- Debugging "why doesn't the funnel count" questions

## Core Concepts

### 1. The event model

Every event is described by the same aspects (these are the spec table's columns):

| Aspect | What | Typical values |
|--------|------|----------------|
| Источник (source) | transport / stream the event goes to | `page_events` (in-product events), `pageviews` (page visits), `payments` / `payments_detail` (purchases) |
| event_source | course slug, or context | the course slug (`english_ai`, `math_race`), or `"/"` for events fired **outside** the course |
| event_type | snake_case event name | `display`, `click`, `enter_course`, `start_task`, ... |
| event_info | JSON payload of extra fields | `{ session_id, taskId, spentTime }` |
| user_type | who fired it | usually `student` |
| deviceType | device class, derived from `user_agent` | `desktop` / `tablet` / `mobile` / `other` — must always be sent |

Two traps in the acquisition rows:

- The course tile (плашка) lives **outside** the course, so its `display`/`click` events fire with `event_source: "/"`, and the course slug travels in `event_info` instead.
- `payments` events have no custom event_type — the course is identified by `product = "<course_slug>"` in the payload.

### 2. Verb prefixes (naming taxonomy)

Event names are built from a small set of prefixes. Reuse them before inventing new ones:

| Prefix | Meaning | Examples |
|--------|---------|----------|
| `display_*` / bare `display` | user **saw** something (impression) | `display_intro`, `display_shop`, `paywall_seen` |
| `click_*` / bare `click` | user **clicked** something | `click_buy`, `click_pet_house` |
| `enter_*` / `exit_*` | user entered / left a screen or flow | `enter_course`, `exit_core_session` |
| `start_*` / `end_*` | a process **with duration** | `start_task`/`end_task`, `start_video`/`end_video`, `start_matching`/`end_matching` |
| `open_*` / `close_*` | UI opened / dismissed | `open_map`, `close_paywall` |

**`start_*` / `end_*` pairs must be symmetric**: the same id fields on both sides (`taskId`, `raceId`, `session_id`), so analysts can compute duration and completion. Results (`success`, `studentAnswer`, `spentTime`) go on the `end_*` event only.

### 3. The canonical funnel skeleton

Every course funnel has the same five phases; course-specific events slot into them:

1. **Acquisition** — `display` / `click` of the course tile, `event_source: "/"`
2. **Entry** — `pageviews` (land + course), `loader`, `enter_course`
3. **Onboarding** — intro / tutorial (`display_intro`, `tutorial_start` / `tutorial_event` / `tutorial_end`)
4. **Core loop** — `start_task` / `end_task` (+ level/session completion: `end_level`, `exit_core_session` with results and rewards)
5. **Monetization** — `paywall_seen`, `click_buy { place }`, `close_paywall`, then `payments` with `product = "<course_slug>"`

The full table with per-event fields is in `references/funnel-skeleton.md` — **start every new course spec from it**, don't write from scratch.

### 4. Required context fields

On (almost) every event, regardless of course:

- **A session identifier** — pick one per course (`session_id`, `coreId`, `raceId`, ...) and use it consistently on *all* events of the flow. It is what lets an analyst stitch one user's journey.
- `deviceType` (from `user_agent`) and `user_type` (`student`).
- On task events: `taskId` + `spentTime` always; `success`/`isCorrect`, `studentAnswer`, `rightAnswer`, `attempts` on the `end_*` event.

The full merged glossary of fields seen across courses is in `references/field-glossary.md` — check it before inventing a new field name (e.g. don't add `answer` when the convention is `studentAnswer`).

### 5. Spec table conventions

Column layout and markup (`+` for events the analyst tests, empty sections for future work, status/date columns) are described in `references/spec-conventions.md`, together with the analysts' own bad-practices list. Read it before writing or editing a spec.

## Workflow

### Writing a spec for a new course

1. Copy the skeleton from `references/funnel-skeleton.md`; replace `<course_slug>` everywhere (one slug, chosen once).
2. Walk the course's screens and flow: each screen → `enter_*`/`display_*` events, each interaction → `click_*`.
3. For every `start_*` add the matching `end_*` with the same ids plus result fields.
4. Add course-specific domain events (economy, pets, heroes, shop, quests) using the same prefixes and the field glossary.
5. Check every row against the Common Mistakes table below.

### Deriving a spec from existing code

When the task is «добавь логирование в проект» and the project already has code but no spec, **reverse-engineer the spec from the codebase**, then fill the gaps. Start from `references/funnel-skeleton.md` and walk the code phase by phase:

1. **Pick the slug once.** Find the course identifier in routes/config (e.g. `math_race`); use it as `<course_slug>` in every `event_source` and `product`. Do not derive it differently per screen.
2. **Acquisition + Entry** — find routing/page components: land page and course page → `pageviews` rows; the course tile (usually outside the course shell) → `display`/`click` with `event_source: "/"` and the slug in `event_info`; the loader screen → `loader`; main screen mount → `enter_course`.
3. **Onboarding** — find intro/tutorial components → `display_intro` / `tutorial_start` / `tutorial_event { type }` / `tutorial_end`. Keep the `*_start`/`*_event`/`*_end` structure even if the course has a single intro video.
4. **Core loop** — find the task boundary: where a task starts and where it's checked/submitted. That's the `start_task` / `end_task` pair. `end_task` must carry the result triple (`success`/`isCorrect`, `studentAnswer`, `rightAnswer?`, `spentTime` from a real timer). If tasks are wrapped in a level/session/race, add `start_level`/`end_level` or `enter_core_session`/`exit_core_session` with their own id (`raceId`, `coreSessionId`).
5. **Monetization** — find paywall components → `paywall_seen { source/place }`, `close_paywall`, `click_buy { place }`, fakedoor → `input_card_fake`. The purchase itself is a `payments` row (`product = "<course_slug>"`), not a `page_events` event.
6. **Stitch one session id.** Identify the per-flow id (`session_id`, `coreId`, `raceId`) and check it's the same on `start_*` and `end_*` of every pair. Asymmetric ids = bug.
7. **Domain events** — economy/pets/heroes/shop/quests slot into phases 3–4; reuse the prefixes and check `references/field-glossary.md` before naming a new field.
8. **Output** the filled skeleton table; mark rows the code already sends vs. rows that need to be **added**. Hand the table to the `clickstream-logging` skill for implementation — don't write the wrapper code here.

### Implementing events in code

Implementing the spec in code is the job of the **`clickstream-logging`** skill (the `@uchi/client-clickstream` transport, the wrapper module, call placement, `sendBeacon`, schema versions). The contract carried over from this skill: event names and field names are copied **from the spec verbatim**, never retyped; after implementing, fire the flow in a dev build and confirm each spec row produces its event with all fields.

## Common Mistakes

All of these are real defects seen in shipped course specs:

| Mistake | Correct approach |
|---------|------------------|
| Course slug inconsistent across rows (e.g. `math_race` in some rows, `math_races` in others) | Pick one slug once (here `math_race`) and use it in every `event_source` and `product` |
| Typos in key names (`eventy_type`, `evant_type`) | Copy names from the spec verbatim; never retype |
| Leading/trailing spaces in event names | Trim; event names are exact-match strings downstream |
| Asymmetric pairs: `start_*` without `end_*`, or ids only on one side | Same id fields on both; results on `end_*` |
| `end_task` without `success`/`studentAnswer`/`spentTime` | The end event is where all result fields live — it's the most analytically valuable event |
| An event_type equal to the course slug (the `text_tasks_video` bug) | event_type is a verb-prefixed action name, never the slug |
| Changing logging (adding/altering events in target groups) without telling the analyst | Any logging change → update the spec and notify the analyst |
| Inconsistent `event_info` formatting across rows | One JSON shape convention per course; match the existing rows |

## References

- `references/funnel-skeleton.md` — the canonical five-phase funnel with per-event fields. **Read this first** when writing a new course spec.
- `references/field-glossary.md` — merged glossary of `event_info` fields across courses; check before inventing new field names.
- `references/spec-conventions.md` — spec table columns, markup conventions, and the analysts' bad-practices list.
- `references/examples/` — four real specs from shipped courses, cleaned of typos and bugs (see its README for what each demonstrates). Consult when you need a concrete reference implementation of the skeleton.

## Related Skills

- `clickstream-logging` — implementing a spec in code with `@uchi/client-clickstream`. After deriving/writing the spec here, hand it off to that skill for the wrapper module and call placement.
