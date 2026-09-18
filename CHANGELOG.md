# Changelog

## [1.2.0] - In Development

### Added

- Loading skeletons for the four dashboard tab routes (`loading.tsx`), reducing perceived lag when switching tabs.

### Planned (design complete, not yet implemented)

- Multi-caregiver collaboration (up to 3 people per cat, including the owner), gated behind the Pro subscription.
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
