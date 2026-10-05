# Changelog

## [1.2.0] - In Development

### Added

- Loading skeletons for the four dashboard tab routes (`loading.tsx`), reducing perceived lag when switching tabs.
- Multi-caregiver collaboration: cat owners can invite up to 3 people (including themselves) by email to jointly log daily care and blood tests for a cat. Free for everyone, not gated behind the Pro subscription.
- Proactive reminder scheduling via Web Push (fluid/medication/daily-log reminders). Owners manage schedules; accepted caregivers can view them and enable push notifications on their own device. Triggered by [cron-job.org](https://cron-job.org/) polling `api/cron/send-reminders` every minute. Free for everyone, not gated behind the Pro subscription.

### Changed

- Multi-caregiver collaboration was originally planned as a Pro-subscription-gated feature; changed to permanently free during development. See [ADR-002](docs/05-decisions/ADR-002-subscription-tier-model.md).
- Proactive reminder scheduling was also originally planned as Pro-subscription-gated; changed to permanently free after multi-caregiver collaboration was. As of this release, the ECPay subscription no longer unlocks any shipped feature — see the second Update in [ADR-002](docs/05-decisions/ADR-002-subscription-tier-model.md).

### Fixed (code review)

- Caregivers could previously delete a cat's entire care history via the API (RLS granted `delete`, not just read/write); narrowed to `select`/`insert` only.
- Concurrent invite requests could push a cat's caregiver count past the 3-person cap; a DB trigger with an advisory lock now enforces it as a backstop.
- Caregiver email lookup was case-sensitive, silently rejecting valid invites when casing differed from the stored account email.
- Accepting an already-removed or already-processed invitation reported success without actually granting access.

### Fixed

- `api/cron/send-reminders` was unreachable in production: the global auth middleware redirected the unauthenticated GitHub Actions request to `/login` before the route's own `CRON_SECRET` check ever ran. Exempted this path the same way the ECPay webhook callback is.
- Signing out of PetVitals only cleared our own session, not Google's; signing in with Google again silently reused whatever Google account was already active on the device, with no way to switch accounts. Added `prompt: select_account` to force the account picker every time.
- A reminder's `timeOfDay` accepted any minute value, but the cron matcher floors the current time to the nearest 5-minute mark before comparing. Schedules set to a non-multiple-of-5 minute (e.g. `18:28`) could never match and would silently never fire. The schema now rejects non-5-minute values, and the time field is two Select dropdowns (hour, minute limited to multiples of 5) instead of a native `<input type="time">`, since mobile browsers don't reliably honor its `step` attribute.
- `listReminderSchedulesForPet`/`listDueReminders` used a throwing parse per row, so one row that no longer matched the schema (e.g. after the `timeOfDay` tightening above) crashed the entire settings/reminders page and the cron scan for every other schedule on that cat. Switched to a safe parse that logs and skips the offending row instead.
- Production GitHub Actions scheduled runs were empirically 4-5 hours apart despite a `*/5 * * * *` cron expression, making timely reminders impossible. Replaced with [cron-job.org](https://cron-job.org/), a dedicated free scheduling service with a 1-minute minimum interval.

See [docs/06-releases/v1.2.0.md](docs/06-releases/v1.2.0.md) for the full change proposal.

## [1.0.0] - Released

### Added

- Daily care logging (fluid, water intake, weight) with soft validation against prescribed fluid amounts.
- Blood test tracking with IRIS-stage-based phosphorus threshold alerts.
- Multi-axis Chart.js dashboards (weight vs. fluid, BUN/Creatinine vs. phosphorus).
- One-tap A4 PDF vet visit report export.
- Supabase Auth (Magic Link + Google OAuth) with Row Level Security.
- ECPay recurring credit-card subscription billing (NT$199/month).
- PWA installability with offline browsing of cached data.

See [docs/06-releases/v1.0.0.md](docs/06-releases/v1.0.0.md) for the development timeline.
