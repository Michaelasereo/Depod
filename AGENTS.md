# Depod — notes for agents

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## How work lands here

- Source of truth: the Depod PRD (build plan, data model, permissions) and the Figma file "Official Depod Web Application" (`F6ZRY82Y6uXJQ4UXdGcGqa`), page "07 · High fidelity".
- One work package per branch, with a preview deployment. A package merges only when its "done when" test passes on the preview **and** Michael has done design QA.
- Michael owns design decisions. If a screen needs something the Figma file doesn't show, ask — don't invent UI or copy.

## Design system rules

- Colours: semantic tokens only (`bg-bg-surface`, `text-text-secondary`, `border-border-default`, `bg-action-primary`…). Never primitives or hex in screens. Light, dark and system come from `data-theme` on `<html>`.
- Type: `text-display-64/48/40`, `text-heading-20`, `text-title-17`, `text-body-15`, `text-label-13`, `text-caption-12`.
- Tokens are generated: edit `design/tokens.json`, then `npm run tokens`. Icons and illustrations: edit `design/`, then `npm run assets`. Don't hand-edit generated files.
- Reuse components in `src/components` (names match Figma components and their variants/properties). `/components` shows them all, light and dark.
- The marketing site is light only.
