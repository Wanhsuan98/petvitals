# Changelog

## [1.2.0] - In Development

### Added

- Loading skeletons for the four dashboard tab routes (`loading.tsx`), reducing perceived lag when switching tabs.
- Multi-caregiver collaboration: cat owners can invite up to 3 people (including themselves) by email to jointly log daily care and blood tests for a cat. Free for everyone, not gated behind the Pro subscription.

### Changed

- Multi-caregiver collaboration was originally planned as a Pro-subscription-gated feature; changed to permanently free during development. See [ADR-002](docs/05-decisions/ADR-002-subscription-tier-model.md).

### Fixed (code review)

- Caregivers could previously delete a cat's entire care history via the API (RLS granted `delete`, not just read/write); narrowed to `select`/`insert` only.
- Concurrent invite requests could push a cat's caregiver count past the 3-person cap; a DB trigger with an advisory lock now enforces it as a backstop.
- Caregiver email lookup was case-sensitive, silently rejecting valid invites when casing differed from the stored account email.
- Accepting an already-removed or already-processed invitation reported success without actually granting access.

### Planned (not yet implemented)

- Proactive reminder scheduling via Web Push (fluid/medication/daily-log reminders), gated behind the Pro subscription.

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
