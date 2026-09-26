# Buchtutor project instructions

Project owner decisions from 2026-09-25 are recorded in [docs/PROJECT_DIRECTION.md](docs/PROJECT_DIRECTION.md). Read that file before changing the reader, data architecture, AI provider, or visual design.

- Primary audience: Q12/Q13 in Bavaria. Prioritize iPad portrait and landscape, with usable mobile and desktop adaptations.
- The approved public brand is Buchtutor with an open-book mark and a terracotta annotation tab. Preserve legacy storage keys, backup format IDs and the existing Vercel project so a rename does not orphan personal data.
- Never use the Impeccable skill for this project.
- Use calm, functional UI and concise literal German copy. Avoid marketing heroes, decorative statistics, generic AI slogans, and faux luxury styling.
- The owner selected A · Fokus and authorized implementation, Vercel hosting and a free shared cloud cache. Do not ask for the design choice again.
- Requested future AI: OpenAI GPT-6 Luna via OpenRouter, reasoning effort max. Do not silently downgrade the model or reasoning. Keep the operator's key server-side.
- Target personal-data architecture: local device storage and explicit encrypted transfer. Shared cloud caching may contain canonical public-text analyses only; never free questions, private notes, or pupil identifiers.
- The owner explicitly authorized visitor and AI usage statistics. Public-path-only Vercel Analytics must strip query/fragment data and honor DNT/GPC. AI metrics are daily aggregate numbers in Redis, retained 90 days and visible only in the password-protected operator dashboard. Never include questions, answers, notes or user identifiers in metrics.
- The Vercel version uses IndexedDB for personal reading data and Upstash Redis in Frankfurt for standard analyses and short-lived quota counters. The earlier Cloudflare site and its D1 tables are separate legacy resources; do not claim old notes were migrated or deleted.
- OpenRouter API key will be entered later by the owner. Keep prepared examples functional and live AI visibly unavailable until configured. Operator/imprint details remain explicitly requested placeholders.
- A short self-contained code cannot hold unlimited notes. Do not promise accountless strict per-person limits or automatic sync from manual export/import.
- Preserve canonical edition/verse anchors, source accuracy, selection context, and spoiler limits.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
