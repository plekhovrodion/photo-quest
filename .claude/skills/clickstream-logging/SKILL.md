---
name: clickstream-logging
description: Use when implementing event logging in a project with the internal @uchi/client-clickstream library — setting up the client, sending pageEvent/pageView, adding analytics events from a funnel spec, choosing schema versions, debugging event delivery. Triggers on "добавь логирование", clickstream, pageEvent, pageView, event_source, event_type, event_info, sendBeacon, uchiru.page_events, расставить ивенты
---

# Event Logging with @uchi/client-clickstream

## Overview

`@uchi/client-clickstream` is the internal transport library for client-side analytics: it POSTs events to the company event collector (viewable in Kibana). A course's **analytics spec (воронка)** says *what* to send — this library is *how* to send it. Build the spec first (see the `course-analytics` skill); then each spec row maps to one library call.

The mapping from spec columns to the library:

| Spec column | Library field |
|-------------|---------------|
| Источник = `page_events` | `clickstream.pageEvent(...)` (default subject `uchiru.page_events`) |
| Источник = `pageviews` | `clickstream.pageView(...)` (default subject `uchiru.pageviews`) |
| Источник = `payments` | **not** this library — payment events come from the payment system |
| event_source | `opts.eventSource` (course slug, or `"/"` for out-of-course events) |
| event_type | `opts.eventType` |
| event_info | `opts.eventInfo` — a **string**; JSON payloads are `JSON.stringify`'d with `eventInfoType: 'json'` |
| user_type | `opts.userType` (`'student'`) |
| device type | **automatic** — derived server-side from `user_agent`. `pageView` always sends UA; `pageEvent` needs version ≥ 8 |

The whole skill follows from one rule: **event names and field names are copied from the spec verbatim, and each event string lives in exactly one place in the codebase** (a small wrapper module — never scattered across UI code).

## When to Use

- «Добавь логирование в проект» — set up the client and place events from a spec
- Adding or changing individual events
- Choosing the right schema version or send method
- Debugging "event doesn't show up in Kibana"

## Core Concepts

### 1. Creating the client

```ts
import createClickStream from '@uchi/client-clickstream';

export const clickstream = createClickStream({
  host: Environment.clickStreamHost,      // per environment, never hardcoded
  options: { version: 11 },
});
```

- **Hosts**: prod `https://evt.uchi.ru`, shots/local `https://events.shot-uchi.ru`. Resolve from the project's env mechanism.
- Create the instance **once** (module-level singleton) and import it everywhere.
- Optional `topicPrefix` prefixes every subject (`'1c'` → `1c.uchiru.page_events`); skip unless the project is on a separate topic namespace.

### 2. pageEvent — the workhorse

```ts
clickstream.pageEvent({
  userId,                          // -1 / 0 until known
  userType: 'student',
  eventSource: 'math_race',        // course slug from the spec
  eventType: 'end_task',           // verbatim from the spec
  eventInfo: JSON.stringify({ taskId: 12, success: 1, spentTime: 4300 }),
  eventInfoType: 'json',
});
```

- The schema adds automatically: `full_url`, `created_at` (`%%time%%` — filled server-side), `guest_id`, and `cd1`–`cd3` (from `opts.customDimentions`; exactly three custom dimensions exist — missing ones become `''`, extra keys are dropped).
- `%%time%%` / `%%ip%%` are **server-side placeholders** — never fill them yourself.
- `addOpts.sendBeacon: true` switches delivery to `navigator.sendBeacon` — use for exit-critical events (`exit_course`, `end_task` on unmount), so the event survives page unload.
- `addOpts.subject` overrides the default topic — rarely needed.

### 3. pageView

```ts
clickstream.pageView({ userId, userType: 'student' });
```

`referrer` defaults to `document.referrer`. Fires when a page opens — covers the `pageviews` rows of the spec (land + course entry).

### 4. Schema versions

Passed as `options.version` at creation; it selects the **server-side schema** the collector validates against. For new projects use **11**:

| Version | Adds |
|---------|------|
| 1 | base pageEvent/pageView schema |
| 2 | server schema recognizes `event_info_type` (the client always sends it; on v1 the collector may reject it → 422) |
| 8 | pageEvent sends `user_agent` + `browser_session_id` |
| 11 | pageEvent: UA + `browser_session_id` + `guest_uuid` + `event_info_type` + `event_sub_info` (all nullable-typed) |
| 12 | v11 + viewport dimensions |

Session id (`browser_session_id`) and `GuestUUID` are **managed by the library** (cookies, 30-min sliding session, 2-year guest id shared across `*.uchi.ru`) — never hand-roll them.

### 5. Keep event strings in one wrapper

UI code must not call `pageEvent` with raw strings. Add a thin project module with one typed function per spec event:

```ts
// shared/analytics/events.ts
export const logStartTask = (p: { taskId: number }) =>
  clickstream.pageEvent({ ...base, eventType: 'start_task', eventInfo: JSON.stringify(p), eventInfoType: 'json' });

export const logEndTask = (p: { taskId: number; success: 0 | 1; spentTime: number }) =>
  clickstream.pageEvent({ ...base, eventType: 'end_task', eventInfo: JSON.stringify(p), eventInfoType: 'json' });
```

Call sites stay dumb: `logEndTask({ taskId, success, spentTime: timer.spent })`. If a name has a typo, it exists in exactly one place.

## Workflow: «добавь логирование в проект»

1. **Spec first.** If there is no funnel spec, build one from the code with the `course-analytics` skill (`references/funnel-skeleton.md` there). Every spec row → one event; don't invent events not in the spec.
2. **Setup**: if the project already has a clickstream client, **reuse it** — don't create a second singleton. Otherwise add the dependency and create the singleton client (host from env, `version: 11`).
3. **Wrapper module**: one typed function per spec row. Copy `eventType`/field names from the spec verbatim; `start_*`/`end_*` pairs share id fields, results (`success`, `studentAnswer`, `spentTime`) only on `end_*`.
4. **Place the calls**:
   - `display_*` / `paywall_seen` — on becoming visible, **once per view** (effect/visibility guard, never in render body)
   - `click_*` — in the click handler, before navigation
   - `enter_*` — on screen mount; `pageView` on page open
   - `start_*`/`end_*` — at true process boundaries, `spentTime` from a real timer
   - exit-critical events — with `sendBeacon: true`
5. **Verify**: walk the funnel in a dev build and confirm each spec row fires with the right name and payload (network tab / console; events land in Kibana).

## Common Mistakes

| Mistake | Correct approach |
|---------|------------------|
| Typo in an `eventType` string | Copy from the spec verbatim; keep each string in one wrapper function |
| `eventInfo` passed as an object | It's a string field: `JSON.stringify` + `eventInfoType: 'json'` |
| `eventInfoType: 'json'` on schema v1 | The client always sends `event_info_type`, but the v1 **collector schema** doesn't expect it (→ 422). Use version ≥ 2 (11 for new projects) |
| Missing `user_agent` → no device breakdown | Use version ≥ 8; UA is attached automatically |
| Event lost when the user leaves right after acting | Send exit-critical events with `sendBeacon: true` |
| Hardcoded collector host | Host is per-environment (`evt.uchi.ru` vs `events.shot-uchi.ru`) — resolve from env |
| New client instance per call | Create once as a singleton |
| Filling `created_at` / `user_ip` | `%%time%%` / `%%ip%%` are server-side placeholders — leave them |
| Assuming `customDimentions` accepts arbitrary keys | Only `cd1`–`cd3` exist; extras are dropped, missing become `''` |
| Hand-rolling session/guest ids | Library manages `browser_session_id` and `GuestUUID` cookies itself |
| Adding an event that isn't in the spec | Update the spec first and notify the analyst — the spec is the contract |

## References

- `references/api.md` — full API: `pageEvent`/`pageView`/`send`/`sendBeacon`/`customEvent` signatures, payload schemas per version, `topicPrefix`, session/GuestUUID behavior, Redux middleware.

## Related Skills

- `course-analytics` — designing the funnel/spec that this skill implements. Read it (or build the spec with it) before writing logging code.
