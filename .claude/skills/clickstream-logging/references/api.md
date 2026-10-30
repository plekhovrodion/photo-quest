# @uchi/client-clickstream — API Reference

Source: the `client-clickstream` repo (`src/index.js`, `src/redux/`). Events are viewable in Kibana: https://events-kibana.runit.cc/

## Creating the client

```js
import createClickStream from '@uchi/client-clickstream';

const clickstream = createClickStream({
  host: 'https://evt.uchi.ru',        // prod; shots/local: https://events.shot-uchi.ru
  options: { version: 11 },           // default: { version: 1 }
  topicPrefix: '1c',                  // optional
});
```

`topicPrefix` is prepended to every subject: `pageEvent(...)` → subject `1c.uchiru.page_events`. If a subject already starts with the prefix, it is not doubled.

## Methods

### `pageEvent(opts, addOpts)` — action on the page

Default subject: `uchiru.page_events`.

| opt | type | meaning |
|-----|------|---------|
| `userId` | string/number | user id (`-1`/`0` until known) |
| `userType` | string | `teacher`, `student`, ... |
| `eventSource` | string | источник события — course slug, `"/"` for out-of-course |
| `eventType` | string | event name |
| `eventInfo` | string | event payload; JSON must be `JSON.stringify`'d by the caller |
| `eventInfoType` | string | `'json'` when eventInfo is serialized JSON (version ≥ 2) |
| `eventSubInfo` | string | целевой элемент возникновения события (version ≥ 11) |
| `customDimentions` | object | `cd1`, `cd2`, `cd3` — **only these three keys**; missing → `''`, extras dropped |
| `guestId` | string/number | sets base `guest_id` (default `0`); distinct from `guestUuid` (the v7+/v11 `guest_uuid` field) |
| `guestUuid` | string | overrides the auto-managed GuestUUID |

| addOpt | meaning |
|--------|---------|
| `subject` | override the default topic |
| `sendBeacon` | send via `navigator.sendBeacon` instead of `fetch` — survives page unload |

Base payload sent (before version-specific fields):

```js
{
  full_url: window.location.href,
  created_at: '%%time%%',          // filled server-side
  user_id, user_type, guest_id,
  event_source, event_type, event_info, event_info_type,
  cd1, cd2, cd3,
}
```

### `pageView(opts, addOpts)` — page opened

Default subject: `uchiru.pageviews`.

| opt | type | meaning |
|-----|------|---------|
| `userId` | string/number | user id |
| `userType` | string | user type |
| `referrer` | string | default `document.referrer` |
| `customDimentions` | object | same cd1–cd3 rule |
| `guestId` | string/number | sets base `guest_id` (default `0`) |
| `guestUuid` | string | overrides auto GuestUUID |
| `eventInfoType` | string | versions 8/9 |

Base payload: `full_url`, `referrer`, `created_at: '%%time%%'`, `user_id`, `user_type`, `user_agent`, `user_ip: '%%ip%%'` (server-side), `guest_id`, `cd1`–`cd3`. **`user_agent` is always sent on pageView** (it's in the base, not version-gated).

### `send(subject, payload, { version })`

Raw POST of an arbitrary payload to any subject (returns the `fetch` promise). The version falls back to the instance's `options.version`.

### `sendBeacon(subject, payload, { version })`

Same body via `navigator.sendBeacon` (no-op if the browser lacks it). Use for events fired during page unload.

### `customEvent(payload, { subject, version })`

Schema-less event; same as `send` but with a redux-middleware-compatible signature.

## Schema versions

`options.version` is sent with every event and selects the **server-side schema** the collector validates against. The client payload is built per-version in `src/index.js`. **Default to 11 for new integrations.** Per-call override: `clickstream.send(subject, payload, { version: 7 })`.

**pageEvent** — base (all versions): `full_url`, `created_at`, `user_id`, `user_type`, `guest_id`, `event_source`, `event_type`, `event_info`, `event_info_type`, `cd1`–`cd3`.

| Version | Adds on top of base |
|---------|---------------------|
| 8 | `user_agent` (raw string), `browser_session_id` (raw) |
| 11 | `user_agent`, `browser_session_id`, `event_sub_info`, `event_info_type`, `guest_uuid` — all as `{ string } \| null` (`event_info_type` is overwritten in nullable form) |
| 12 | v11 + `viewport_width` / `viewport_height` |

Versions 1–7, 9, 10 send the base payload only — no `user_agent` / `browser_session_id` on pageEvent.

**pageView** — base (all versions): `full_url`, `referrer`, `created_at`, `user_id`, `user_type`, `user_agent`, `user_ip` (`%%ip%%`), `guest_id`, `cd1`–`cd3`.

| Version | Adds on top of base |
|---------|---------------------|
| 5 | `browser_session_id` (raw) |
| 7 | `browser_session_id`, `guest_uuid` as `{ string }` |
| 8 / 9 | `event_info_type`, `browser_session_id`, `guest_uuid` |
| 9 | + `viewport_width` / `viewport_height` |

> Client vs. server: the client **always** includes `event_info_type` in the pageEvent base payload (its value is whatever you pass, possibly `undefined`). The `version` tells the collector which schema to validate against — the risk on low versions is the collector's schema not expecting the field (→ HTTP 422), not the client omitting it. Use version ≥ 2 (11 for new projects) so the collector recognizes `event_info_type`.

## Session and guest identity (auto-managed)

- `browser_session_id`: uuid-timestamp, stored in cookie + localStorage (`clickstream-session-id`), 30-minute sliding TTL — renewed on every `send`, regenerated after 30 min of inactivity.
- `GuestUUID`: cookie, 2-year TTL, set on the parent domain (`.uchi.ru`) so it is shared across subdomains.

Never generate or persist these yourself.

## Redux middleware (optional, not shipped in the published package)

The library source has a redux middleware (`src/redux/{middleware,actions}.js`), but the build bundles only `src/index.js` into `lib/` and `package.json` exposes no `exports` map — so `@uchi/client-clickstream/redux` does **not** resolve from the installed package. To use it, copy `src/redux/middleware.js` and `src/redux/actions.js` into your project:

```js
import { clickstreamMiddleware, pageEvent, pageView, customEvent } from './redux/clickstream'; // your local copy

const store = createStore(reducer, applyMiddleware(clickstreamMiddleware(clickstream)));

store.dispatch(pageEvent({ eventSource: '...', eventType: '...', ... }, { subject, version }));
```

The middleware intercepts `CLICKSTREAM_ACTION`, calls `clickstream[meta.eventType](payload, { subject, version })`, and **swallows** errors — on HTTP failure it `console.error`s but does not rethrow, so a failed event will not surface to the caller.

## Debugging

- Watch the `POST` to the collector host in the network tab; body = `{ subject, version, payload }`.
- `422` from the collector = payload doesn't match the schema version (wrong field types, missing required fields).
- Event missing in Kibana: check subject (topicPrefix?), version (field dropped by that version's schema?), and whether the tab closed before `fetch` finished (use `sendBeacon`).
