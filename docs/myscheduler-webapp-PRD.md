# MyScheduler — Personal Planner & Expense Tracker Web App

**PRD v1.0 — July 2026** **Owner:** Sir Dave (solo build)

## Problem Statement

Sir Dave built a Notion-based daily/weekly/monthly planner and naira expense tracker to replace ad-hoc planning. Over the course of building it, the Notion API/UI surface repeatedly got in the way: no true side-by-side layout control, a chart/filter DSL that silently drops conditions, database-query features gated behind a paid plan, no way to delete a stray view, and content-editing operations that can destructively trash pages as a side effect (this happened once during the build). These aren't one-off bugs — they're structural limits of building a real dashboard on top of a general-purpose notes tool. Continuing to invest in the Notion version has diminishing returns and real data-loss risk. A purpose-built single-user web app removes the ceiling entirely.

## Recommended Architecture

**Fully independent: own Postgres database, no Notion dependency.**

Rationale: the friction hit today (layout control, view/filter bugs, plan-gated query features, destructive edit side-effects) all live in Notion's interface and MCP layer — not something a Notion-API-backed frontend fully escapes, since the underlying data model (properties, views, relations) still shapes what's easy to build. A dedicated schema gives full control over layout, querying, and behavior with no vendor ceiling, and for a single-user app the operational cost is trivial: Next.js on Vercel (frontend \+ API routes), Postgres on Neon or Supabase (free tier), Google Calendar API called directly (OAuth \+ a scheduled sync job), and a simple single-user auth scheme. This is also the more durable choice if the tool ever gets reused as a template for something bigger later — no migration off Notion required down the line.

Trade-off acknowledged: this is more upfront work than a Notion-API-backed frontend would be, since existing Notion data won't carry over automatically (see Non-Goals) and the schema/CRUD/sync all get built from scratch. Given the 1-week timeline, this is the main scope risk — see Timeline Considerations.

## Goals

1. Fully replace Notion as the daily planning tool within 1 week of launch — Sir Dave opens the new app instead of Notion on ≥5 of 7 days in week 2 post-launch.  
2. Zero manual re-entry of calendar events — Google Calendar sync runs automatically; 100% of new real events appear within one sync cycle over the first 2 weeks, no duplicates.  
3. True custom dashboard layout — Today view and Calendar render together on one screen (side-by-side on desktop) with no DSL workarounds, verified visually.  
4. Eliminate accidental data-loss risk — 0 destructive-edit incidents post-launch, versus 1 during the Notion build.  
5. $0/month hosting — stay within Vercel \+ Neon/Supabase free tiers for a single low-traffic user.

## Non-Goals

1. **Multi-user / team collaboration** — v1 is single-user only ("just me"). Revisit only if this becomes a product later.  
2. **Native App Store/Play Store app** — v1 is a responsive web app (installable as a PWA for push support), not a published native app. "Mobile-friendly" means usable in a phone browser or home-screen PWA, not an app-store build.  
3. **Automatic bank statement import** — expenses are logged manually from the bank app, as today. No Mono/Okra/Plaid-style integration in v1.  
4. **Automatic Notion data migration** — no migration script for v1. Sir Dave can port the handful of existing sample rows manually, or start fresh.  
5. **SMS/carrier text reminders** — phone notifications are delivered via Web Push, not SMS. Keeps cost at $0/month and avoids a telco integration.

## User Stories

- As the sole user, I want to see today's tasks, time blocks, and calendar events on one screen so I can plan my day without switching tools.  
- As the sole user, I want my Google Calendar events to appear automatically in the planner so I never have to manually re-enter a meeting.  
- As the sole user, I want to log an expense in naira with a category and project tag so I can track spend without opening a spreadsheet.  
- As the sole user, I want to mark a habit done for the day and see a simple streak so I stay consistent.  
- As the sole user, I want to tie a task or time block to a goal so I can see whether my day's work ladders up to something real.  
- As the sole user, I want weekly and monthly views so I can zoom out from today without losing context.  
- As the sole user, I want a reminder before a time-sensitive item so I don't miss it, without depending on a third-party app's notification settings.  
- As the sole user, I want that reminder to reach me as a push notification on my phone, not just inside the app, so I actually see it in time.  
- As the sole user, I want to create an event in MyScheduler and have it show up on my real Google Calendar, so I'm not maintaining two separate calendars.  
- As the sole user, I want the app usable from my phone browser so I can check or update it away from my desk.  
- As the sole user, I want to log in with one seeded password, not a signup flow, so setup doesn't become its own project.

## Requirements

### Must-Have (P0)

1. **Single-user auth, password only, seeded** — one password set at deploy time (env variable / seed script), no signup flow, no account-creation path exposed.  
     
   - Given an unauthenticated visitor, when they load the app, then they're redirected to login.  
   - Given the seeded password entered correctly, then a session is established and persists across reloads.  
   - Given an incorrect password, then access is denied and no path to create a new account is shown.

   

2. **Unified planner data model** — tasks, habits, time blocks, and goals as one entity type with name, type, project, date/time, priority, status, and linked-goal fields.  
     
   - [ ] Create, edit, delete each item type via the UI.

   

2. **Daily / Weekly / Monthly views \+ calendar grid** — filterable by horizon, plus a real calendar view showing all dated items together.  
     
   - Given the Week view is open, when a time block with a start/end time exists, then it renders on the correct date and time slot.

   

2. **Habit tracking with streaks** — mark done/not-done per day; show current streak.  
     
   - Given a habit marked done today, when yesterday was also done, then the streak count increments correctly.

   

3. **Goals tied to projects** — goals carry a project tag; tasks/time blocks can link to a goal.  
     
   - Given a goal's detail view, then all linked items appear.

   

4. **Expense tracker (₦)** — log expense/income with amount, category, project, payment method, date.  
     
   - [ ] Totals filterable by month, category, and project.

   

2. **Google Calendar two-way sync** — OAuth connect once (read \+ write scope). Automatic recurring pull of new Google Calendar events into the planner as time blocks, AND items created in MyScheduler with a date push out as real Google Calendar events.  
     
   - Given the sync runs twice on the same inbound event, then no duplicate row is created (idempotent on calendar event ID).  
   - Given a time block created in MyScheduler with calendar sync enabled, when saved, then a corresponding Google Calendar event is created and its event ID stored, so re-syncing doesn't create a duplicate.  
   - Given a MyScheduler-created event is later edited or deleted in the app, then the change reflects on the Google Calendar event too.

   

2. **Reminders — in-app and phone push** — for items with a reminder time set, deliver both an in-app reminder and a Web Push notification to Sir Dave's phone.  
     
   - Given an item with a reminder time and push permission granted, then a push notification is delivered to the subscribed device within 5 minutes of that time.  
   - Given push permission has not been granted, then the in-app reminder still fires and the user is prompted to enable push.

   

3. **Responsive layout** — usable on a phone browser, no horizontal scroll or broken layout at 390px width.  
     
4. **True dashboard layout** — Today view and Calendar visible together (side-by-side ≥1024px, stacked on mobile), no workaround needed.

### Nice-to-Have (P1)

- Simple in-app stats (tasks completed this week, monthly spend, habit completion rate) computed directly in app code — not dependent on any gated query feature.  
- Dark mode.  
- Quick-add via keyboard shortcut / command palette (Cmd+K).  
- CSV export of expenses for a given month.  
- Drag-to-reschedule time blocks on the calendar view.

### Future Considerations (P2)

- Multi-user / shared workspace support, if this becomes a broader product later. Schema should avoid decisions that would block adding per-tenant auth down the line, even though it's not built now.  
- Native push notifications (browser Push API or mobile).  
- Bank statement / open-banking import (Mono, Okra) for automatic expense capture.  
- AI-assisted daily planning — auto-suggested time blocks based on goals and calendar gaps.

## Success Metrics

**Leading (days–weeks)**

- Daily active use: opened on ≥5 of 7 days in the first two weeks post-launch.  
- Calendar sync reliability: 100% of real events appear within one sync cycle, 0 duplicates, over the first 2 weeks.  
- 0 data-loss incidents in month 1 (vs. 1 during the Notion build).

**Lagging (weeks–months)**

- Full Notion retirement: Notion dashboard unused within 30 days of web app launch.  
- Sustained habit tracking: at least one habit reaches a 7-day+ streak within month 1\.

## Open Questions

- ~~Reminder delivery channel~~ — resolved: in-app \+ Web Push to phone.  
- ~~Auth mechanism~~ — resolved: single seeded password only.  
- ~~Hosting~~ — resolved: Vercel.  
- iOS Web Push is only available for a site added to the home screen as a PWA (Safari restriction since iOS 16.4); Android Chrome supports push directly in-browser without that step. If Sir Dave's phone is iOS, the setup instructions need to include "add to home screen." **(Sir Dave — non-blocking, but confirm phone OS before Day 5 push work)**  
- Google Calendar write scope (`calendar.events`, not just `calendar.readonly`) is a "sensitive scope" in Google's OAuth console. For a single test user under Google's Testing publishing status this works without formal app verification, but the consent screen will show an "unverified app" warning that Sir Dave has to click through himself. **(Engineering — non-blocking, just a one-time click-through, not a blocker)**  
- Should the existing Notion sample data (goals, habits, time blocks, expenses) be manually re-entered, or is a clean start preferred? **(Sir Dave — non-blocking, doesn't affect build start)**

## Timeline Considerations

**Hard target:** this week, per Sir Dave.

Scope note: two-way Google Calendar sync (vs. one-way pull) and phone push notifications both add real engineering time beyond the original estimate — this is the main risk to the one-week target. Realistic phasing:

- **Day 1–2:** Data model \+ CRUD (tasks, habits, time blocks, goals, expenses), seeded-password auth.  
- **Day 3:** Google Calendar OAuth (read \+ write scope) \+ inbound sync job (Vercel Cron) \+ outbound event creation on save.  
- **Day 4:** Today / Week / Month views, calendar grid, side-by-side dashboard layout.  
- **Day 5:** Web Push setup (service worker, VAPID keys, subscription flow) \+ reminder scheduling, responsive polish, deploy to Vercel.

**Dependency:** Google Cloud Console OAuth credentials (with `calendar.events` write scope) must be set up before Day 3 — works immediately in Testing mode for single-user use, just requires clicking through an "unverified app" warning once.

**If the week gets tight, cut in this order first:** drag-to-reschedule and CSV export (already P1) → outbound calendar writes (fall back to read-only pull for v1, add write direction as a fast-follow) → Web Push (fall back to in-app-only reminders temporarily, since push setup is the newest and least-proven piece of scope).  
