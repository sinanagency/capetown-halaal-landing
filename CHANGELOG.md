# Changelog

All notable changes to Cape Town Halaal Landing are documented here.

## v0.2.0 (2026-06-13)

### Features

- **Brain-core integration**: Vendor relationship engine with persistent knowledge capture. Enables festival-brain wall for contextual decision-making in approvals and outreach.
- **Vendor contract e-sign**: Full e-signature workflow for vendor contracts, audit-logged and integrated with vendor application state.
- **Admin vendor profile**: Relationship view showing contract status, payment history, stand allocation, communication timeline, and compliance flags.
- **Unified admin inbox**: WhatsApp + email consolidation with AI thread summarization, composer templates, standalone message view, and bulk operations (mark-read, archive, assign).
- **Exhibitor portal foundations**: Gated real-estate portal with authentication, profile, documents, announcements, staff, resources, and support channels. Live demo logins.
- **Fixed vendor_application_approved param**: Corrected logic in applications route for proper state transitions.

### In Progress

- Smart applications queue: ML-ranked applicants by admission likelihood and risk scores.
- Unified inbox AI: On-demand summarization and tone-aware response suggestions.
- Mass outreach system: Segment-based vendor campaigns with delivery confidence and A/B testing.
- Festival-brain wall: Visual decision support layer for admin approvals, backed by brain-core entities.

### Improvements

- Security hardening: Bearer auth on cron routes, CSP/HSTS headers.
- Observability: Structured JSON logging library for audit trails.
- SEO: Per-route metadata, sitemap, robots.txt.
- Database: v13 RLS policies covering mail, WhatsApp, and admin surfaces.
- Idempotency: Max-1-retry guards on critical webhooks (Yoco, IMAP, e-sign).

### Dependencies

- Updated TypeScript, Next.js, Supabase client to latest stable.
- Added playwright for e2e tests.
- Added bot-guards library for AI outbound content filtering.

---

See AUDIT-25K-SCALE-2026-06-10.md for full production audit and scaling analysis.
