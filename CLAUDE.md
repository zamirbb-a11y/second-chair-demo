# Second Chair — Claude Working Rules

## Architecture
- Overlay system is the source of truth for incremental updates. Never mutate `analysis`.
- Deterministic merges only. No new AI calls for merging.
- Overlays must be rollback-friendly (id, createdAt, patch, isNew).
- `analysis` state is immutable after initial analysis.

## Implementation
- Make the smallest diff that works.
- Do not refactor working files unless explicitly asked.
- Do not rewrite App.jsx unless the change requires it.
- Prefer extending existing patterns over introducing new ones.

## Schema
Before coding any new overlay or delta type, verify:
- Overlay shape matches existing structure in `applyOverlays.js`
- Props passed down match what the component expects
- `localStorage` backward compatibility (saved overlays must still load)
- API response fields match what the client reads

## Bug prevention
Before coding, ask: "How could this break after 5 incremental updates?"
Watch for: disappearing overlays, stale pending state, duplicate updates, rollback gaps, localStorage corruption.

## Product
- Render updates inside the relevant IssueCard, not in generic lists.
- Fallback sections are safety nets, not primary UX.
- Test RTL layout for any new UI element.
- Ask: does this fit a lawyer's workflow, or just a developer's model?

## AI Calls
- Prefer targeted context over full-case prompts.
- Never send the full case unless explicitly necessary.

## State
- Event log is append-only.
- New information should create events, not rewrite prior state.

## Git
- New branch per feature area.
- Push at stable checkpoints, not mid-feature.
- If uncertain about a large change — ask before coding.
