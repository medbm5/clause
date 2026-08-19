# NOTES

A running log of what was tried, what broke, and what not to try again.

## Phase 0

- `create-next-app` refuses to scaffold into a directory containing `BUILD.md`
  ("contains files that could conflict"). Moved the brief out and back around
  the scaffold rather than fighting the flag set.
- `next lint` no longer exists in Next 16 — running it fails outright. The
  `verify` gate uses the `eslint` binary instead (see DECISIONS.md).
- Read the installed `.d.ts` files before writing any call:
  - `unpdf`: `extractText(docOrData, { mergePages: true })` returns
    `{ totalPages: number; text: string }`. The single-arg / `mergePages: false`
    overload returns `text: string[]`, so the option is load-bearing for typing.
  - `openai` v7: `response_format.json_schema` takes
    `{ name, schema?, strict?, description? }` — `schema` is optional in the
    type, so the wrapper in `lib/openai.ts` must always pass it.
  - `motion` v13 re-exports framer-motion from `motion/react`;
    `useReducedMotion`, `AnimatePresence`, `useSpring`, `useMotionValue` are all
    available from that entry point.
- `next/font/google` needs network at build time. It works here and on Vercel;
  it is unrelated to `OPENAI_API_KEY`, so a keyless build still succeeds.
