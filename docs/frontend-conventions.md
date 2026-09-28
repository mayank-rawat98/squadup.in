# Frontend conventions

How frontend code is written in `apps/web`, `apps/ops` and `libs/ui`, and where it lives. A pattern written down once is cheaper than the same argument at every component.

[libs/ui/README.md](../libs/ui/README.md) covers consuming the library and its build. This page covers the rules behind it.

## The stack

| Concern       | Choice                                                         |
| ------------- | -------------------------------------------------------------- |
| Framework     | Next.js 16, App Router                                         |
| UI            | React 19, TypeScript strict                                    |
| Styling       | Tailwind CSS v4 (`@theme`, `@utility`)                         |
| Variants      | `tailwind-variants`, through the local `tv`                    |
| Class merging | `tailwind-merge`, through the local `cn`                       |
| Animation     | `motion/react`                                                 |
| Icons         | `lucide-react`                                                 |
| Fonts         | Inter through `next/font`, self-hosted at build time           |
| Server state  | TanStack Query (ROADMAP.md §1.1)                               |
| Forms         | `react-hook-form` with `zod` and `@hookform/resolvers` (ditto) |
| Tests         | Jest with Testing Library; Cypress for e2e (`apps/web-e2e`)    |

**Not used:** `react-router-dom`, `framer-motion` (use `motion/react`), Redux, MUI, Emotion, and component kits that bring their own styling (shadcn/ui, Radix themes). Adding one needs an issue that says why the existing stack can't do the job.

## Where code lives

```
libs/
  ui/                        @squadup.in/ui, every reusable component
    src/
      styles/index.css       tokens, Tailwind theme, base layer, light and dark
      utils.ts               cn() and tv()
      atoms/                 pure primitives
      molecules/             compositions of atoms
      organisms/             larger compositions (create it when the first one exists)

apps/
  web/                       customers: landing page, auth, dashboard, arenas…
  ops/                       SquadUp staff
    src/
      app/                   routes; route groups separate audiences, e.g. (auth)
      features/<feature>/    components, types and constants for one feature
        components/
        constants/
        types/
        index.ts             the feature's public surface
      components/            app-only shell pieces: SiteHeader, SiteFooter, Logo
      config/                app constants, e.g. navigation.ts
      lib/                   app infrastructure: api/ (the client), auth/ (the session)
```

`apps/web/src/features/landing` is the reference for feature layout. Open it before adding a feature.

### The rule that makes this worth it

**A component that could serve a second application belongs in `libs/ui`.** That is what stops `web` and `ops` growing two Buttons. ESLint enforces the other half: an app can't import another app (`@nx/enforce-module-boundaries`), so sharing through the library is the only route.

What stays in an app: its routes, layouts, data access, and feature components that are genuinely specific to it. What moves to `libs/ui`: every primitive, every composition of primitives, every pattern a second screen would want.

## Atomic design

Three tiers. The boundary between them is about composition, not size.

| Tier         | Contains                                          | May import          |
| ------------ | ------------------------------------------------- | ------------------- |
| `atoms/`     | Button, Badge, Card, Typography, Avatar, Input…   | Nothing but `utils` |
| `molecules/` | Accordion, EmptyState, SectionHeading, FormField… | Atoms               |
| `organisms/` | DataTable, a sidebar, a date picker               | Atoms and molecules |

**No business logic in any tier.** No component in `libs/ui` fetches data, reads a session, or knows what an arena is. A component that needs to know is a feature component and belongs in the app.

Each tier has a barrel `index.ts`, and `src/index.ts` re-exports all of them plus `cn` and `tv`. Importing a deep path from another package is a boundary violation: `import { Button } from '@squadup.in/ui'`, never `@squadup.in/ui/src/atoms/Button`.

## Components

The shape every component in `libs/ui` takes (see `atoms/Button.tsx`):

```tsx
'use client'; // only if it has state, handlers or browser APIs

import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { type VariantProps } from 'tailwind-variants';
import { buttonVariants } from './button.variants';
import { cn } from '../utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = 'button', ...props }, ref) => <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />);
Button.displayName = 'Button';

export default Button;
```

- **`forwardRef`, always.** A component that can't take a ref can't be focused, measured or anchored to, and finding that out later means changing every caller.
- **Props extend the element's attributes and `VariantProps`,** so the variant names are the single source of truth for what the component can look like.
- **`displayName` is set,** or every stack trace and devtools row says `ForwardRef`.
- **Default export, re-exported by name from the barrel.**
- **Variants carry the styling.** A prop that becomes a conditional class string in the body is a variant that hasn't been written yet.

### Server and client components

Components in `libs/ui` are presentation, so most work from a server component. **Anything with state, an event handler or a browser API puts `'use client'` at the top of its own file**, not at the top of the page that uses it. Marking the page instead drags its whole tree into the client bundle.

When a server component needs a client component's styling (a `<Link>` that looks like a button), keep the variants in their own module with no `'use client'`, as `button.variants.ts` does. Calling a client export from the server fails at prerender.

### Links look like buttons, not the other way round

An action that navigates is a real anchor (`<Link className={buttonVariants(...)}>`), so it can be middle-clicked and opened in a tab. Never a `<button>` whose `onClick` pushes a route.

### Native controls first

Wrap `<select>`, `<input type="checkbox">`, `<input type="radio">` and `<dialog>` rather than reimplementing them. A native control brings keyboard behaviour, screen-reader semantics and, on a phone, the platform picker for free. `showModal()` alone supplies the focus trap, focus restoration and Escape.

Build a custom control only where the native one can't express the meaning, and write down why in the file.

## Data

### Every screen reads through one client

A component never calls `fetch`. It calls a typed function that goes through the app's API client in `src/lib/api/`. The client owns the base URL, `credentials: 'include'`, the auth headers, the `{ success, data, message }` envelope and the single-flight refresh on `401` (ROADMAP.md §1.1 has the details). That behaviour lives in one place so it can't drift between screens.

- **Response types sit beside the function that calls the endpoint.** Check the real shape in Swagger or the controller before typing it; don't guess.
- **Types only the browser knows about** (props, view models, form state) sit beside the component that owns them.
- **Mutations replace the cached value from the response** where the endpoint returns the resource, rather than patching the old value in the browser. The server already computes derived fields; recomputing them client-side is a second implementation of rules that already exist.
- **Show the server's `message`** in a toast or next to the field. It is written for users.

### Providers sit at the narrowest layout that needs them

A provider in the root layout is on every route forever, including the ones added later. Put the query provider in the layout of the routes that fetch, not above the landing page.

## Styling

### Tokens

Every value comes from `libs/ui/src/styles/index.css`: the palette (violet primary, hue 262), type scale, radii and shadows, with a light and a dark set. Apps import it once from their root layout.

- **Never** a hex code in a component.
- **Never** an arbitrary spacing value where a scale step exists.
- Use the semantic names (`bg-primary`, `text-muted-foreground`, `bg-card`, `border-input`), so a component works in both themes without a `dark:` class.
- `dark:` is bound to the theme toggle's `.dark` class, not the OS preference. Check both themes before calling a screen done.

### `cn` and `tv`: why both are local

Two things here aren't obvious:

- **`tailwind-variants` runs its own internal merge.** Configuring only `cn` isn't enough. A component built with a bare `tv` imported from the package merges classes differently from one built with ours. Always import `tv` from `../utils`.
- **Custom `text-*` utilities must be registered in the `font-size` group.** `text-h1`, `text-body` and friends are font sizes, but `tailwind-merge` reads an unrecognised `text-*` as a colour. Unregistered, `text-h1 text-white` silently drops `text-h1`. Add every new `@utility text-*` to `FONT_SIZE_SUFFIXES` in `utils.ts`.

### Typography

All text goes through the `Typography` atom. `as` chooses the element and `variant` chooses the scale, so semantic markup and visual size are independent. That is how a page keeps one `h1` while something else looks like one.

## Testing

Test what breaks silently: variant resolution, class merging, and anything where a wrong answer still renders. `cn` dropping a typography class produces a component that looks _almost_ right, which is exactly the failure a reviewer waves through.

- Presentational snapshots aren't worth their maintenance and aren't expected.
- **Move a rule into a plain module the moment it has a branch,** and test it there: the safe-redirect check, a validation schema, a leaderboard ranking. A `page.tsx` may export only the App Router's reserved names anyway, so helpers have to live elsewhere.
- **Assert exactly.** A test that allows tolerance hides the bug inside the tolerance.
- **Pick the environment the code runs in.** Use `@jest-environment node` in the docblock for code that touches no DOM, rather than polyfilling what jsdom lacks.

## Quality

- Strict TypeScript. `any` needs a comment justifying it.
- Small, focused components; composition over configuration.
- Semantic heading hierarchy, one `h1` per page.
- Accessible by construction: real `button` elements, labels tied to inputs, visible focus. A control that captures a key must also release it (WCAG 2.1.2); a code editor that takes Tab must let Escape free the next Tab.
- Status is a word as well as a colour, everywhere: a badge, a timer's warning, a form error. A red border alone reaches nobody using a screen reader.
- Works at 360px wide, in light and dark, with the keyboard alone (ROADMAP.md's definition of done).
