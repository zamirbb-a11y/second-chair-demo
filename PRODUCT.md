# Product

## Register

product

## Users

Hebrew-speaking Israeli litigators (currently pilot users, invite-only). They work in long, high-concentration sessions preparing and managing active litigation: reviewing case material, tracking disputes (מחלוקות), evidence, witnesses, timelines, and pleadings. The interface is fully RTL Hebrew. They are legal experts but not technologists; the tool must fit a lawyer's workflow, not a developer's mental model.

The job to be done: keep a living, trustworthy picture of the case — what's in dispute, how strong each claim is, what evidence supports it, what's missing, and what changed since they last looked.

## Product Purpose

Second Chair is an AI-assisted litigation workspace: it analyzes case material into structured disputes, evidence maps, timelines, and legal assessments, then keeps that analysis alive as new documents and information arrive. AI proposes; the lawyer approves. Success means a lawyer trusts the case picture enough to base real litigation decisions on it.

## Brand Personality

Calm senior colleague. Quiet confidence, restraint, precision. The lawyer's own judgment stays at the center; the system supports rather than performs. Three words: calm, precise, trustworthy. Emotional goal: the relief of having a meticulous second chair who never misses a detail — not the excitement of a flashy AI tool.

## Anti-references

- **Old Israeli legal software**: cluttered gray form-grids, dated Windows-style chrome, walls of undifferentiated text. This is what users are escaping.
- **Consumer-app playfulness**: rounded candy colors, emoji-heavy UI, gamified touches. Undermines trust in a professional legal context.
- AI-tool clichés in general (gradient text, glassmorphism, chatbot-first layouts) conflict with the calm-colleague personality.

## Design Principles

1. **The case is the hero, not the AI.** AI-proposed changes appear quietly, in context (inside the relevant dispute card), and always behind explicit lawyer approval.
2. **Calm density.** Lawyers need a lot of information per screen, but organized with clear hierarchy — dense is fine, noisy is not.
3. **RTL is first-class.** Every element is designed and tested in Hebrew RTL; LTR fragments (citations, numbers, English terms) must sit correctly within RTL flow.
4. **Trust through restraint.** Muted palette, no decoration without meaning, severity/strength signaled with weight and position before color.
5. **Long-session comfort.** Typography and contrast tuned for hours of reading, not for screenshots.

## Accessibility & Inclusion

WCAG 2.1 AA: body text contrast ≥4.5:1, keyboard-accessible interactions, visible focus states. Respect `prefers-reduced-motion`. Color is never the only carrier of meaning (assessment strength, severity, pending states also encoded in text/weight).
