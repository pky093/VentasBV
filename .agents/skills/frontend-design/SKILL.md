---
name: frontend-design
description: >-
  Expert instructions and design systems for UI/UX design, modern responsive interfaces,
  Tailwind CSS styling, component hierarchy, accessibility (a11y), visual polish,
  color theory, typography, and interactive frontend patterns. Use whenever designing,
  building, refining, or evaluating user interfaces and frontend web components.
---

# Frontend Design & UI/UX Specialist Skill

This skill guides the design and implementation of modern, clean, accessible, and high-conversion user interfaces.

## 1. Core Visual Design Principles

- **Visual Hierarchy**: Guide the user's eye naturally. Key actions (primary CTAs) should have high contrast; secondary actions should be subtle (ghost/outline buttons).
- **8-Point Spacing Grid**: Use consistent multiples of 4px / 8px (`gap-2`, `gap-4`, `p-4`, `p-6`, `m-8`) to maintain visual rhythm.
- **Surface & Elevation**:
  - Prefer subtle borders (`border border-slate-200 dark:border-slate-800`) combined with soft diffuse shadows (`shadow-sm`, `shadow-md`).
  - Use layered surfaces (`bg-slate-50`, `bg-white`, `bg-slate-900`, `bg-slate-950`) to establish depth.
- **Typography & Pairing**:
  - Use a modern sans-serif for UI (Inter, IBM Plex Sans, Geist, Roboto) and clean mono for data/code (IBM Plex Mono, JetBrains Mono).
  - Clear scale: `text-xs` (captions/tags), `text-sm` (body/tables/inputs), `text-base` (lead body), `text-lg` to `text-3xl` (headers).
  - Proper letter spacing: `tracking-tight` for titles/display, `tracking-normal` for body.

## 2. Color System & Contrast

- **Brand & Semantic Tokens**:
  - `Primary`: Key buttons, active tabs, main accents (e.g., Indigo, Violet, Emerald, or Blue).
  - `Success`: Confirmations, positive trends (`emerald-600`, `teal-500`).
  - `Warning`: Cautionary notices, pending items (`amber-500`, `yellow-600`).
  - `Danger/Destructive`: Deletions, errors (`rose-600`, `red-500`).
  - `Neutral/Muted`: Secondary text (`slate-500`, `zinc-400`), borders (`slate-200`, `zinc-800`), muted backgrounds.
- **Accessibility (WCAG AA/AAA)**: Always ensure text meets minimum 4.5:1 contrast against its background.

## 3. Component Architecture & Patterns

- **Button Hierarchy**:
  - *Primary*: Solid background, high contrast, subtle active scale (`active:scale-[0.98]`).
  - *Secondary*: Muted background or border (`bg-slate-100 dark:bg-slate-800 hover:bg-slate-200`).
  - *Outline / Ghost*: Border-only or transparent with hover tint.
  - *Destructive*: Soft red tint or solid rose for dangerous actions.
- **Inputs & Form Controls**:
  - Clear label, visible focus ring (`focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none`).
  - Integrated validation error message underneath the input in `text-rose-500 text-xs`.
- **States (Every component must handle 4 states)**:
  1. Default
  2. Hover / Focus / Active
  3. Disabled / Readonly
  4. Loading / Skeleton / Empty State

## 4. Modern Tailwind CSS & Animations

- Use `clsx` and `tailwind-merge` (via a `cn()` helper) for flexible class compositions:
  ```ts
  import { clsx, type ClassValue } from 'clsx';
  import { twMerge } from 'tailwind-merge';

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```
- **Micro-interactions & Polish**:
  - Smooth transitions: `transition-all duration-200 ease-in-out`.
  - Icon integration (e.g. `lucide-react`): consistent sizing (`w-4 h-4` for button icons, `w-5 h-5` for standalone navigation).
  - Empty states with illustrative icons, supportive description, and a clear call-to-action button.

## References & Recipes

- Detailed UI component patterns: [UI Patterns](./references/ui_patterns.md)
- Tailwind layout and styling recipes: [Tailwind Recipes](./references/tailwind_recipes.md)
