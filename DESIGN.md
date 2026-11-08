# DESIGN.md — Design Style Guide

Visual + layout rules for this project. Source of truth for UI work. Read before building or changing any screen.

Stack: React 19 + Vite + Tailwind v4 + shadcn/ui (style `base-nova`, base color `neutral`, Base UI primitives, lucide icons). Components live in `src/components/ui/` and are edited in place.

---

## 1. Principles

1. **shadcn-first.** Use an existing shadcn component before writing custom UI. Add missing ones with `bunx --bun shadcn@latest add <name>`.
2. **Neutral and quiet.** Chrome stays grayscale. Color only for state (destructive, focus) and note categories.
3. **Reading-first.** Learning content optimized for long reading: comfortable line length, generous vertical rhythm, code and notes visually distinct from prose.
4. **Tokens, not hex.** Use Tailwind semantic classes (`bg-background`, `text-muted-foreground`, `border-border`). Never hard-code colors in components.
5. **Responsive down to phone.** Every screen works at 360px width with a 16px side gutter and no horizontal page scroll (except inside code blocks).

---

## 2. Theme tokens

Theme lives in `src/style.css` as CSS variables on `:root` and `.dark`. Keep shadcn's `base-nova` neutral tokens as the base.

Rules:
- Remove leftover Vite scaffold CSS (`#app` fixed width, `.hero`, `#next-steps`, `#docs`, `#spacer`, `.ticks`, `.counter`, `h1`/`h2` global overrides, `--text`/`--social-bg` etc.). Those conflict with the layout below.
- Do not set global `h1`/`h2` sizes in CSS. Set type per component with Tailwind classes.
- Keep `body { margin: 0 }` and `@layer base` border/outline defaults.
- Dark mode: class-based `.dark` (already defined). Defaults to dark; a toggle button (`ThemeToggle`) switches it and the choice is saved in `localStorage` (`src/lib/theme.ts`).

Semantic tokens in use:

| Token | Use |
|---|---|
| `background` / `foreground` | Page bg, body text |
| `card` / `card-foreground` | Note and example surfaces |
| `muted` / `muted-foreground` | Code block bg, secondary text, sidebar hover |
| `border` | All dividers, 1px |
| `primary` / `primary-foreground` | Active topic, primary CTA |
| `accent` | Hover on nav items |
| `ring` | Focus ring |
| `destructive` | Warnings only |
| `sidebar*` | Left and right sidebars (`bg-sidebar`, `border-sidebar-border`) |

Note-category colors (use Tailwind palette via `Alert` variants, not new tokens):
- Tip → `emerald`
- Warning / gotcha → `amber`
- Info → `sky`
- Danger → `destructive`

---

## 3. Typography

Font: `Geist Variable` (already imported via `@fontsource-variable/geist`). Mono: system mono stack via `font-mono` (Geist Mono is not loaded; do not add it unless asked).

| Element | Classes |
|---|---|
| Page / lesson title (`h1`) | `text-3xl font-semibold tracking-tight sm:text-4xl` |
| Section title (`h2`) | `text-xl font-semibold tracking-tight mt-12 scroll-mt-20` |
| Sub-section (`h3`) | `text-base font-semibold mt-8` |
| Lead / description | `text-lg text-muted-foreground leading-relaxed` |
| Body | `text-base leading-7` (max `prose` width ~ `max-w-prose`, ~70ch) |
| Sidebar group label | `text-xs font-medium uppercase tracking-wide text-muted-foreground` |
| Sidebar item | `text-sm` |
| Code | `font-mono text-sm leading-6` |
| Inline code | `font-mono text-[0.9em] rounded px-1.5 py-0.5 bg-muted` |

Every heading gets an `id` and an anchor link (for right sidebar "On this page" and deep linking). Headings always use `scroll-mt-20` so sticky header does not cover them.

---

## 4. Layout: Learning screen (3-column)

Three regions. Desktop ≥ 1024px shows all three. Below that, sidebars collapse (see §4.3).

```
┌──────────────┬───────────────────────────────────────┬──────────────────┐
│ LEFT         │ MAIN                                  │ RIGHT            │
│ Main topics  │ Title                                 │ Sub-topics of    │
│ (≈ 256px)    │ Description                           │ active topic     │
│              │ Sections: prose, code, notes, examples│ (≈ 240px)        │
│              │ Prev / Next                           │ "On this page"   │
└──────────────┴───────────────────────────────────────┴──────────────────┘
```

### 4.1 Container

```tsx
<div className="flex min-h-svh bg-background text-foreground">
  <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-r bg-sidebar lg:block" />   {/* left */}
  <main className="min-w-0 flex-1" />                                                      {/* main */}
  <aside className="sticky top-0 hidden h-svh w-60 shrink-0 border-l bg-sidebar xl:block" /> {/* right */}
</div>
```

- Left sidebar: `w-64` (256px), `lg` and up.
- Right sidebar: `w-60` (240px), `xl` and up. Main keeps `min-w-0` so long code scrolls inside its box.
- Main content column: `mx-auto w-full max-w-3xl px-6 py-10 lg:px-10`. Do not stretch prose beyond `max-w-3xl`.
- Sidebars are `h-svh sticky top-0` and scroll internally with `ScrollArea`.

### 4.2 Left sidebar — Main topics

- Header: app name or logo, `h-14`, `px-4`, `border-b`.
- List of **main topics** grouped by category when needed (group label style from §3).
- Each item: `Button variant="ghost" size="sm"` full width, `justify-start`, left icon (lucide, `size-4`), label, optional count `Badge variant="secondary"` (lessons count or progress).
- **Active topic:** `variant="secondary"` + `font-medium` (or `bg-sidebar-accent text-sidebar-accent-foreground`). Set `aria-current="page"`.
- Hover: `hover:bg-sidebar-accent`.
- Selecting a topic updates the right sidebar and loads that topic's first sub-topic into main, unless a sub-topic is already selected in that topic.
- Wrap list in `ScrollArea`. Use `Separator` between groups.

### 4.3 Right sidebar — Sub-topics

- Header: active main topic name as `text-sm font-semibold`, plus `text-xs text-muted-foreground` lesson count.
- List of **sub-topics** of the active topic (`Button variant="ghost"`, `size="sm"`, `justify-start`). Active sub-topic: `variant="secondary"`.
- Below sub-topics, a second block "On this page": anchor links to the `h2`/`h3` headings of the currently rendered lesson. Active heading highlighted via IntersectionObserver.
- Use `Tooltip` only for truncated labels (titles longer than the column). Do not put tooltips on every item.

### 4.4 Responsive behavior

| Breakpoint | Left sidebar | Right sidebar | Main |
|---|---|---|---|
| `< lg` (< 1024px) | Hidden. Opened via `Sheet` triggered by a menu `Button` in a top bar | Hidden. Sub-topics shown as horizontal scroll chips under the title, or inside the same `Sheet` | Full width, `px-4` gutter |
| `lg` – `xl` | Visible | Hidden. Sub-topics move into a `Sheet` / `DropdownMenu` opened from top bar | Visible |
| `≥ xl` | Visible | Visible | Visible |

- Top bar (mobile/tablet only): `sticky top-0 z-10 h-14 border-b bg-background/80 backdrop-blur`, menu buttons left and right.
- Prefer shadcn `Sheet` (side="left" / side="right") for drawers. Do not hand-roll drawers.
- Phone: 16px side gutter, no horizontal page scroll. Code blocks scroll horizontally inside their own box.

---

## 5. Main section — Learning content

Content renders in this order per lesson:

1. **Breadcrumb** (`Topic / Sub-topic`), `text-sm text-muted-foreground`.
2. **Title** (`h1`).
3. **Description** (lead paragraph, §3).
4. **Body blocks** in author order. Block types below.
5. **Prev / Next** navigation at the bottom: two `Button variant="outline"` with the neighbor sub-topic title. `Separator` above.

### 5.1 Block types

**Section (`h2` + prose)**
- `h2` with anchor id, `mt-12`. Then paragraphs `mt-4`. Lists use `ul` with `list-disc pl-6 space-y-2`.

**Code example**
Use a custom `CodeBlock` built from shadcn parts (do not use a third-party highlighter unless approved):

```tsx
<figure className="my-6 overflow-hidden rounded-lg border bg-muted">
  <figcaption className="flex items-center justify-between border-b px-4 py-2">
    <span className="text-xs font-medium text-muted-foreground">tsx · App.tsx</span>
    <Button variant="ghost" size="icon-xs" aria-label="Copy code">{/* Copy icon */}</Button>
  </figcaption>
  <pre className="overflow-x-auto p-4 font-mono text-sm leading-6"><code>{/* code */}</code></pre>
</figure>
```

Rules:
- Header row: language label (left), copy button (right, `size="icon-xs"` + `Tooltip` "Copy"). Show "Copied" state for 2s.
- `bg-muted`, `border`, `rounded-lg`. No gradients, no shadows.
- `overflow-x-auto` on `pre`. Never wrap code (`whitespace-pre`).
- Optional filename caption in the header.
- Optional line highlight: `bg-primary/10` on the line + `border-l-2 border-primary`.
- Inline code in prose uses the inline-code style in §3.
- Syntax colors: keep to `text-foreground` plus muted tones for comments (`text-muted-foreground italic`). Do not add a rainbow.

**Highlighted note (`Alert`)**
Use shadcn `Alert` with a lucide icon and a category:

| Category | Icon (lucide) | Style |
|---|---|---|
| Note / Info | `Info` | `Alert` default, `border-sky-500/40 bg-sky-500/5` |
| Tip | `Lightbulb` | `border-emerald-500/40 bg-emerald-500/5` |
| Warning | `TriangleAlert` | `border-amber-500/40 bg-amber-500/5` |
| Danger | `OctagonAlert` | `variant="destructive"` |

- `AlertTitle` = category label ("Tip", "Warning"). `AlertDescription` = 1–3 sentences max.
- Place notes directly after the paragraph/code they qualify. Max 2 notes per section to keep signal high.
- Notes never replace body text. Essential info stays in prose.

**Real-life example**
Card-style block for analogies or production stories:

- `Card` (shadcn) with `CardHeader` (title "Real-life example" or custom), `CardContent` prose, optional `Badge variant="outline"` for context tag ("E-commerce", "Auth", ...).
- Visually distinct from notes: `Card` default surface, no colored border.
- Include only when it clarifies a concept. Not on every section.

**Table**
shadcn `Table` for comparisons. Header `text-muted-foreground`, rows `border-b`.

**Steps**
Ordered list with numbered circles: `size-6 rounded-full border text-xs font-medium` numbers, `ol` with `space-y-4`.

---

## 6. Components (shadcn)

Use these. Add missing ones via CLI, do not copy from random sources.

| Need | Component |
|---|---|
| Nav items, buttons | `Button` (variants: `ghost`, `secondary`, `outline`) |
| Scroll regions | `ScrollArea` |
| Dividers | `Separator` |
| Counts, tags | `Badge` |
| Notes | `Alert`, `AlertTitle`, `AlertDescription` |
| Real-life examples | `Card`, `CardHeader`, `CardTitle`, `CardContent` |
| Mobile drawers | `Sheet` |
| Tooltips (copy, truncated text) | `Tooltip` (wrap app in `TooltipProvider`) |
| Comparisons | `Table` |
| Progress (optional) | `Progress` |
| Menus (optional) | `DropdownMenu` |

Already present in `src/components/ui/`: `button`, `scroll-area`, `separator`, `badge`, `alert`, `tooltip`.

Rules:
- Compose with `cn()` from `@/lib/utils`. Do not write inline style for things Tailwind covers.
- Icons: lucide only, `size-4` default in nav, `size-5` in headings or notes. Always `aria-hidden` when decorative.
- Do not introduce a second UI library or CSS framework.

---

## 7. Spacing, radius, elevation

- Spacing scale: Tailwind default (4px base). Section gap `mt-12`, paragraph `mt-4`, block `my-6`.
- Radius: use `rounded-lg` for code, cards, alerts; `rounded-md` for buttons (shadcn default). Use `--radius` token; do not hard-code px radius.
- Elevation: none in content. `shadow-sm` only on `Card` if shadcn default. No custom shadows.
- Borders carry structure, not shadows.

---

## 8. Interaction and motion

- Hover: background change only (`hover:bg-accent` / `hover:bg-sidebar-accent`). No scale transforms on nav.
- Focus: keep shadcn `focus-visible:ring-3 ring-ring/50`. Never remove outlines.
- Transitions: `transition-colors duration-150`. No page-level animations.
- Scroll: smooth scroll for anchor links (`scroll-behavior: smooth` on `html` only if no reduced-motion preference: wrap in `@media (prefers-reduced-motion: no-preference)`).
- Route/topic change: update URL hash or query (`?topic=&sub=`) so state is shareable and back button works.

---

## 9. Accessibility

- Sidebars: `<nav aria-label="Topics">` (left), `<nav aria-label="Sub-topics">` (right).
- Active nav item: `aria-current="page"`.
- Code copy button has `aria-label`. Announce "Copied" via `aria-live="polite"`.
- Color is never the only signal (notes have icon + label).
- Contrast: body text `text-foreground` on `bg-background`; secondary text `text-muted-foreground` must pass AA for body size. Do not go lighter.
- Headings in order: one `h1` per page, `h2` for sections, `h3` for sub-sections. No skipping levels.

---

## 10. Content data shape (for the learning screen)

Keep content as data, not hard-coded JSX, so topics and lessons can be added without touching layout.

```ts
type Block =
  | { type: "section"; title: string; body: string[]; links?: { title: string; url: string }[] } // body paragraphs (inline `code` allowed); links = "Further reading"
  | { type: "code"; language: string; filename?: string; code: string; highlight?: number[] }
  | { type: "note"; variant: "info" | "tip" | "warning" | "danger"; title?: string; text: string }
  | { type: "example"; title: string; context?: string; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "steps"; items: string[] };

type SubTopic = { slug: string; title: string; description: string; blocks: Block[] };
type Topic = { slug: string; title: string; icon: string /* lucide name */; subTopics: SubTopic[] };
```

- `slug` drives URL and anchor ids. Unique per level.
- Heading ids derived from `section.title` via slugify.
- Put data in `src/data/learning/` (one file per topic). Layout components only consume it.

---

## 11. File structure (target)

```
src/
  components/
    ui/                  # shadcn generated, edited in place
    learning/
      LearningLayout.tsx # 3-column shell, responsive drawers
      TopicSidebar.tsx   # left, main topics
      SubTopicSidebar.tsx# right, sub-topics + on-this-page
      LessonView.tsx     # main section, renders blocks
      CodeBlock.tsx
      NoteAlert.tsx
      ExampleCard.tsx
  data/learning/         # topic + sub-topic content as data
  lib/utils.ts
  style.css
```

---

## 12. Do / Don't

Do:
- Use shadcn components and tokens.
- Keep prose width ≤ `max-w-3xl`.
- Keep code in `pre` with horizontal scroll.
- Use one note per idea; max 2 per section.
- Keep layout logic separate from content data.

Don't:
- Add a new UI library, CSS-in-JS, or syntax highlighter without approval.
- Hard-code hex colors or px radii in components.
- Put lesson text inside components.
- Use gradients, glassmorphism, or heavy shadows.
- Nest scroll areas inside each other (sidebar scroll is the only scroll region besides code).
- Ship a sidebar that is visible on phone without a drawer.

---

## 13. Checklist before merge

- [ ] 3 columns at ≥ xl, 2 columns at lg, drawers below lg.
- [ ] Left = main topics, right = sub-topics of active topic.
- [ ] Title, description, sections, code (copy button), notes, examples render from data.
- [ ] No horizontal page scroll at 360px.
- [ ] Light and dark both readable.
- [ ] `bun run build` passes (tsc strict, `noUnusedLocals`).
- [ ] Focus rings visible; keyboard can open drawers, switch topics, copy code.
