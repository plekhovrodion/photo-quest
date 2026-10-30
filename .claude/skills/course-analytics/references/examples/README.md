# Example Specs

Real analytics specs from shipped courses, **cleaned**: typos in key names fixed (`eventy_type` → `event_type`), course slugs unified, broken event names repaired, missing `user_type`/`user_agent` filled in. Use them as reference implementations of the funnel skeleton — not as copy-paste sources (each course's slug, field casing, and domain events are its own).

| File | Course | What it demonstrates |
|------|--------|----------------------|
| `3d_tournaments.csv` | Турниры (3D) | Minimal spec: hub → tournament flow → task pair; single `session_id` context |
| `eng_abc.csv` | Английский (english_ai) | Rich spec: core-sessions with microphone state, pet house economy, shop, quests, full field glossary cell |
| `happy_tasks.csv` | Веселые задачки (text_tasks_video) | snake_case field style, video + level loop, sorry-pages, fakedoor |
| `math_race.csv` | Математические гонки (math_race) | Competitive mechanics (raceId, matching, themes/complexity), acceptance JSON fixtures in Тест аналитика, teacher-LK / homework integration via cd1/cd2/cd3 |

Note the per-course differences that are *legitimate* (per-course decisions, not bugs): field casing (`taskId` vs `task_id`, `spentTime` vs `spent_time`), column layout, and which optional columns exist (Экран, cd1–cd3, page).
