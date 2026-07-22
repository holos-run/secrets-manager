# Frontend Patterns

Common patterns used across the React frontend. Follow these when adding new features to keep the UI consistent and testable.

## Operator Page Layout

Authenticated routes use `PageLayout` and `PageHeader` from
`frontend/src/components/page-layout.tsx`. This creates a consistent,
scan-friendly structure for dense resource workflows:

- **32px** (`gap-8`) separates the page header from major content regions.
- **24px** (`gap-6`) separates sections inside settings and detail cards.
- **16px** (`gap-4`) separates controls and related field groups.
- **8px** (`gap-2`) separates compact actions, badges, and inline controls.

The page header uses an optional uppercase eyebrow for resource context, one
`h1` title, a short description, and right-aligned primary actions. List-page
actions belong in the page header; the table card should focus on filtering and
resource rows. Prefer `flex` or `grid` with `gap-*` over `space-x-*` and
`space-y-*` so the rhythm remains predictable when children are conditional.

## Typography and Color

Typography is token-driven in `frontend/src/app.css`. The UI stack prefers
Inter when installed and falls back through native variable system fonts. The
code stack prefers Berkeley Mono when installed and falls back through native
monospace faces. Use `font-sans` for interface copy and `font-mono` for slugs,
secret values, tokens, and machine output; do not load fonts from a CDN.

Use semantic color utilities (`bg-background`, `text-muted-foreground`,
`border-border`, `text-primary`, and component variants). Do not use raw
Tailwind palette utilities such as `bg-yellow-500`. The console remains
dark-only per ADR-011.

## Copy to Clipboard

Use `navigator.clipboard.writeText` followed by `toast.success('Copied to clipboard')`. This combination is the standard for all copy actions in this codebase.

```tsx
import { toast } from 'sonner'

const handleCopy = (value: string) => {
  navigator.clipboard.writeText(value)
  toast.success('Copied to clipboard')
}
```

The `Toaster` component is mounted once at the root in `frontend/src/routes/__root.tsx` and uses the custom wrapper at `frontend/src/components/ui/sonner.tsx` (dark theme, lucide icons).

### Testing copy actions

Mock `sonner` and `navigator.clipboard` in unit tests, then assert both were called:

```tsx
import { toast } from 'sonner'
import { vi } from 'vitest'

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}))

it('copy button copies the value and shows a toast', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: { writeText } })

  // render component ...
  fireEvent.click(screen.getByLabelText('copy'))

  await waitFor(() => expect(writeText).toHaveBeenCalledWith('expected value'))
  expect(toast.success).toHaveBeenCalledWith('Copied to clipboard')
})
```

## Toast Notifications

All toast notifications use `sonner`. Import directly from the package:

```tsx
import { toast } from 'sonner'

toast.success('Operation succeeded')
toast.error('Something went wrong')
```

Do not import from `@/components/ui/sonner` — that file exports the `Toaster` component only (used once in the root layout). The `toast` function always comes from `'sonner'` directly.

Every mutation should provide both forms of feedback:

- Show `toast.success(...)` after the mutation resolves.
- Show `toast.error(...)` when it rejects. Keep an inline destructive `Alert` as well when the user needs the error beside an open editor or dialog.

## Loading and Error States

Use the shadcn `Skeleton` component for content-area loading states. Give the skeleton container an accessible loading label, and avoid bare loading text or custom CSS spinners.

Use a destructive `Alert` and `AlertDescription` for query errors. Dense list pages should delegate loading, errors, filtering, pagination, and empty states to `ResourceTable` so those states stay consistent.

## Resource Display Name and Name Fields

When a resource has both a human-readable **Display Name** and a machine-safe **Name** (slug):

- **Display Name comes first** in every create/edit form. It is what users think of first.
- **Name is auto-derived** from Display Name using `toSlug()` (`frontend/src/lib/slug.ts`) as the user types.
- **Name is overridable** — once the user edits it directly, auto-derivation stops. Show a reset affordance (`"Auto-derive from display name"`) that re-enables derivation.
- **Name validation** uses the pattern `[a-z0-9-]+`. Display Name has no constraints.
- This pattern applies to all future resource creation dialogs (organizations, projects, secrets, etc.).

### Slug algorithm

```ts
import { toSlug } from '@/lib/slug'

// "Test Project" → "test-project"
// "  Hello World  " → "hello-world"
// "My Org 2" → "my-org-2"
toSlug(displayName)
```

### State shape

```ts
const [displayName, setDisplayName] = useState('')
const [name, setName] = useState('')
const [nameEdited, setNameEdited] = useState(false)

const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const val = e.target.value
  setDisplayName(val)
  if (!nameEdited) setName(toSlug(val))
}

const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setNameEdited(true)
  setName(e.target.value)
}

const handleResetName = () => {
  setNameEdited(false)
  setName(toSlug(displayName))
}
```

Reset state (`nameEdited = false`, clear fields) on successful submit so re-opening the dialog starts fresh.

### Helper text

- Default: `"Auto-derived from display name. Lowercase letters, numbers, and hyphens only."`
- When edited: render a `<button type="button">` with text `"Auto-derive from display name"` that calls `handleResetName`.

## Browser Automation (agent-browser)

**Use `eval`-based clicking for React buttons**, not `agent-browser click`.

`agent-browser click <selector>` uses CDP's `Input.dispatchMouseEvent` which does **not** bubble through React's synthetic event system. React attaches event handlers to the document root via event delegation, so CDP mouse events that bypass bubbling will not trigger React `onClick` handlers.

```bash
# Wrong — CDP click, React onClick never fires
$AB click '[aria-label="copy"]'

# Correct — DOM .click() bubbles normally through React's event system
$AB eval "document.querySelector('[aria-label=\"copy\"]')?.click()"

# Correct — find by text and click
$AB eval "
  for (const b of document.querySelectorAll('button')) {
    if (b.textContent.trim() === 'Create Organization' && !b.disabled) { b.click(); break; }
  }
"
```

This applies to any React `onClick` handler. For non-React interactions (scrolling, focus, native inputs), `agent-browser click` / `agent-browser fill` works fine.
