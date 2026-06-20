# Hermes Desktop — UI/UX Design Spec v1.0

> **Design Philosophy:** Native macOS first. This is NOT a web app — it's a desktop application that happens to use web technologies. Every pixel should feel like it belongs on macOS.

---

## 1. Design Principles

### Core Axioms
1. **13px body text** — not 16px. This is the #1 differentiator from web apps.
2. **`cursor: default` everywhere** — only `pointer` on actual links.
3. **Vibrancy/translucency** on sidebar and toolbar — `backdrop-filter: blur(20px) saturate(180%)`.
4. **Minimal hover effects** — native macOS apps don't highlight everything on hover.
5. **Rounded rect selection** in sidebar — NOT left-border indicators.
6. **Thin auto-hiding scrollbars** — 8px, transparent track.
7. **System accent color** (#0A84FF) — not custom colors.
8. **Dense, compact layout** — macOS is more compact than web design.

### Inspiration Hierarchy
1. **Apple HIG** — System colors, typography, spacing, controls
2. **Raycast** — Dark theme feel, macOS-native shadows, keyboard-first
3. **Linear** — Developer tool minimalism, precise typography

---

## 2. Color System

### Dark Mode (Primary)

| Token | Hex/Value | CSS Variable | Usage |
|-------|-----------|--------------|-------|
| **Window** | `#323232` | `--mac-window` | Main window background |
| **Sidebar** | `rgba(44,44,46,0.85)` | `--mac-sidebar` | Sidebar with vibrancy |
| **Content** | `#1E1E1E` | `--mac-content` | Chat/content area |
| **Control** | `#1C1C1E` | `--mac-control` | Input backgrounds |
| **Toolbar** | `#3A3A3C` | `--mac-toolbar` | Toolbar area |
| **Surface** | `#252525` | `--mac-surface` | Elevated cards |

### Text Colors (Dark Mode)

| Token | Value | Usage |
|-------|-------|-------|
| `label` | `#FFFFFF` | Primary text |
| `secondaryLabel` | `rgba(235,235,245,0.6)` | Secondary text |
| `tertiaryLabel` | `rgba(235,235,245,0.3)` | Tertiary/disabled |
| `quaternaryLabel` | `rgba(235,235,245,0.2)` | Very subtle |
| `placeholderText` | `rgba(235,235,245,0.3)` | Placeholder |

### Semantic Colors

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `systemBlue` | `#0A84FF` | `#007AFF` | Accent, links, focus |
| `systemGreen` | `#32D74B` | `#34C759` | Success |
| `systemRed` | `#FF453A` | `#FF3B30` | Destructive |
| `systemOrange` | `#FF9F0A` | `#FF9500` | Warning |
| `systemGray` | `#98989D` | `#8E8E93` | Muted |

### Separators

| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| `separator` | `rgba(84,84,88,0.6)` | `rgba(60,60,67,0.3)` |
| `opaqueSeparator` | `#38383A` | `#C6C6C8` |

### Light Mode

| Token | Hex | Usage |
|-------|-----|-------|
| Window | `#ECECEC` | Main background |
| Sidebar | `rgba(245,245,247,0.85)` | Sidebar with vibrancy |
| Content | `#FFFFFF` | Chat/content area |
| Control | `#FFFFFF` | Input backgrounds |
| Text primary | `#000000` | Primary text |
| Text secondary | `rgba(60,60,67,0.6)` | Secondary text |

---

## 3. Typography

### Font Stack
```css
/* Primary — resolves to SF Pro on macOS */
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif;

/* Monospace — for code */
font-family: "SF Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

### Type Scale (macOS Native)

| Style | Size | Weight | Line Height | Letter Spacing | Use |
|-------|------|--------|-------------|----------------|-----|
| Large Title | 26px | 700 | 32px | -0.26px | Window titles |
| Title 1 | 22px | 700 | 28px | -0.2px | Section titles |
| Title 2 | 17px | 700 | 22px | -0.43px | Subsection headers |
| Title 3 | 15px | 600 | 20px | -0.1px | Card/group headers |
| Headline | 13px | 600 | 16px | -0.08px | Emphasized text |
| **Body** | **13px** | **400** | **16px** | **-0.08px** | **Default body text** |
| Callout | 12px | 400 | 16px | -0.16px | Secondary descriptions |
| Subhead | 11px | 400 | 14px | -0.07px | Supporting text |
| Footnote | 10px | 400 | 13px | +0.06px | Metadata, timestamps |
| Caption | 10px | 400 | 13px | +0.1px | UI hints |
| Caption 2 | 10px | 500 | 12px | +0.07px | Micro labels |

### Font Weight Rules
- **Regular (400)** — body text, labels
- **Medium (500)** — emphasis, navigation
- **Semibold (600)** — headings, buttons
- **Bold (700)** — titles only
- **Never use** Ultralight, Thin, or Light weights

---

## 4. Spacing & Layout

### Window Spacing

| Element | Value | Tailwind |
|---------|-------|----------|
| Window margin (all sides) | 20px | `p-5` |
| Title bar → content gap | 14px | `pt-3.5` |
| Between stacked controls | 6px | `space-y-1.5` |
| Above/below separators | 12px | `py-3` |
| Group box internal margin | 16px | `p-4` |
| Between sections | 12px | `space-y-3` |
| Section title → first control | 8px | `space-y-2` |
| Between related controls | 4px | `space-y-1` |

### Window Dimensions

| Element | Value |
|---------|-------|
| Minimum window size | 600×400px |
| Default width | 900px |
| Default height | 680px |
| Sidebar width | 240px (range: 180-350px) |
| Toolbar height | 52px (unified) / 38px (compact) |
| Traffic light position | 12px from left, centered vertically |

---

## 5. Component Specs

### Sidebar

| Property | Value |
|----------|-------|
| Width | 240px default |
| Min width | 180px |
| Row height | 28px (default) |
| Icon size | 16×16px |
| Icon-to-label gap | 8px |
| Horizontal padding | 16px |
| Section label | 11px, semibold, uppercase, tracking wide |
| Item font | 13px, regular |
| Background | `rgba(44,44,46,0.85)` + `backdrop-filter: blur(20px) saturate(180%)` |

**Selection States:**
| State | Background | Text |
|-------|------------|------|
| Default | transparent | `label` |
| Hovered | `rgba(255,255,255,0.05)` | `label` |
| Selected (focused) | `rgba(255,255,255,0.1)` | `label` |
| Selected (unfocused) | `rgba(255,255,255,0.05)` | `secondaryLabel` |
| Pressed | `rgba(0,0,0,0.1)` | `label` |

**Key:** Selection uses rounded rectangle (`border-radius: 6px`), NOT left-border indicator.

### Buttons

#### Push Button (Standard)
```css
height: 22px;
padding: 0 16px;
font-size: 13px;
border-radius: 4px;
background: linear-gradient(180deg, #4D4D4D 0%, #3D3D3D 100%);
border: 0.5px solid rgba(0,0,0,0.25);
color: var(--mac-text-primary);
```

#### Primary Button
```css
background: linear-gradient(180deg, #1A8CFF 0%, #0A70E0 100%);
color: #FFFFFF;
border-color: rgba(0,0,0,0.2);
```

#### Destructive Button
```css
background: linear-gradient(180deg, #FF5E57 0%, #E0443D 100%);
color: #FFFFFF;
```

#### Toolbar Button (icon only)
```css
width: 28px;
height: 28px;
border-radius: 6px;
background: transparent;
border: none;
color: var(--mac-text-secondary);
/* Hover: background: rgba(255,255,255,0.08); */
/* Active: background: rgba(255,255,255,0.12); */
```

### Text Inputs

```css
height: 22px;
padding: 0 8px;
font-size: 13px;
background: #1C1C1E;
border: 0.5px solid rgba(255,255,255,0.1);
border-radius: 4px;
color: var(--mac-text-primary);

/* Focus */
border-color: #0A84FF;
box-shadow: 0 0 0 3px rgba(10,132,255,0.25);

/* Placeholder */
color: rgba(235,235,245,0.3);
```

### Toggle/Switch

```css
width: 38px;
height: 22px;
border-radius: 11px;
/* Off: background: #4D4D4D */
/* On: background: #32D74B */
/* Knob: 18px diameter, white, 2px offset */
```

### Segmented Control

```css
height: 22px;
border-radius: 5px;
/* Selected segment: rgba(255,255,255,0.1) */
/* Font: 13px */
/* Segment padding: 12px horizontal */
```

---

## 6. Global CSS Rules

### Cursor Rules
```css
/* Default cursor for ALL elements */
* { cursor: default; }

/* Only pointer on actual links */
a, [role="link"] { cursor: pointer; }

/* Text cursor for editable text */
input[type="text"], input[type="search"], textarea, [contenteditable] { cursor: text; }
```

### Text Selection Rules
```css
/* NO selection on UI chrome */
.sidebar, .toolbar, button, label, .no-select, nav, header, aside {
  user-select: none;
  -webkit-user-select: none;
}

/* YES selection on content */
.message-content, .code-block, .selectable {
  user-select: text;
  -webkit-user-select: text;
}
```

### Scrollbar Rules
```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.3);
}

* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.15) transparent;
}
```

### Focus Rules
```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(10,132,255,0.25);
  border-radius: 4px;
}
```

### Vibrancy Classes
```css
.vibrancy-sidebar {
  background: rgba(44,44,46,0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}

.vibrancy-toolbar {
  background: rgba(58,58,60,0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}
```

---

## 7. Layout Structure

### App Shell
```
┌─────────────────────────────────────────────┐
│ [●●●]    Title Bar (52px, draggable)        │
├──────────┬──────────────────────────────────┤
│          │  Toolbar (optional)               │
│ Sidebar  │──────────────────────────────────│
│ (240px)  │                                   │
│          │  Content Area                     │
│ Sessions │  (Chat Messages)                  │
│ List     │                                   │
│          │                                   │
│          │──────────────────────────────────│
│          │  Input Area                       │
└──────────┴──────────────────────────────────┘
```

### Sidebar Item Template
```tsx
<div className="flex items-center gap-2 px-4 py-1.5 rounded-md cursor-default
                hover:bg-white/5 text-[13px] leading-4 text-white
                select-none">
  <svg className="w-4 h-4 opacity-80" ...>icon</svg>
  <span>Item Label</span>
</div>

{/* Selected state */}
<div className="flex items-center gap-2 px-4 py-1.5 rounded-md cursor-default
                bg-white/10 text-[13px] leading-4 text-white
                select-none">
  <svg className="w-4 h-4 text-[#0A84FF] opacity-90" ...>icon</svg>
  <span>Selected Item</span>
</div>
```

### Section Headers (Sidebar)
```tsx
<div className="px-4 pt-4 pb-1 text-[11px] font-semibold tracking-wide
                text-[rgba(235,235,245,0.3)] uppercase select-none">
  TODAY
</div>
```

---

## 8. Chat-Specific Design

### Message Bubbles
- **User messages:** Right-aligned, subtle background (`rgba(255,255,255,0.05)`), 12px radius
- **Assistant messages:** Left-aligned, no background (text directly on content bg)
- **Tool badges:** Small pill badges with icon + tool name, `rgba(255,255,255,0.08)` bg

### Chat Input Area
```css
/* Fixed at bottom of content area */
border-top: 1px solid rgba(84,84,88,0.6);
padding: 12px 20px;
background: #1E1E1E;
```

### Input Field
```css
min-height: 44px;  /* Generous for desktop */
max-height: 200px;
padding: 10px 14px;
font-size: 13px;
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 8px;
/* Focus: border-color: #0A84FF */
```

### Status Bar
```css
height: 24px;
font-size: 10px;
color: rgba(235,235,245,0.3);
border-top: 1px solid rgba(84,84,88,0.6);
padding: 0 20px;
```

---

## 9. Animations

### Timing
- Panel show/hide: 200-300ms
- Sidebar collapse: 250ms
- Selection changes: 100-150ms
- Button hover: 100ms

### Easing
```css
/* macOS standard easing */
transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);

/* For sidebar */
transition: width 250ms cubic-bezier(0.25, 0.1, 0.25, 1),
            opacity 200ms ease-in-out;
```

---

## 10. Anti-Patterns to AVOID

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| 16px body text | 13px body text |
| `cursor: pointer` on buttons | `cursor: default` |
| Heavy hover effects on everything | Minimal, subtle hover |
| Left-border selection indicator | Rounded rect background |
| Thick permanent scrollbars | 8px thin auto-hiding |
| Pure black (#000) backgrounds | #323232 / #1E1E1E |
| Custom accent colors | System blue (#0A84FF) |
| Solid opaque sidebar | Translucent blur |
| Text always selectable | `user-select: none` on chrome |
| Emoji as icons | SVG icons (Lucide/Heroicons) |
| Web-style borders everywhere | Background differences + subtle shadows |
| Large whitespace (web style) | Compact, dense layout |
| Fast/linear animations | Smooth, physics-based curves |

---

## 11. Implementation Checklist

### Phase 1: Foundation
- [ ] Update Tailwind config with macOS color tokens
- [ ] Update font stack to `-apple-system`
- [ ] Add global CSS rules (cursor, selection, scrollbar, focus)
- [ ] Add vibrancy CSS classes

### Phase 2: Layout
- [ ] Implement custom titlebar with traffic lights
- [ ] Refactor sidebar with vibrancy background
- [ ] Update sidebar selection states (rounded rect)
- [ ] Update section headers (11px, uppercase, semibold)

### Phase 3: Components
- [ ] Refactor buttons to macOS push button style
- [ ] Refactor inputs to macOS text field style
- [ ] Update message bubbles (user: subtle bg, assistant: no bg)
- [ ] Update chat input area
- [ ] Update status bar

### Phase 4: Polish
- [ ] Add light mode support
- [ ] Test all animations (timing, easing)
- [ ] Verify cursor behavior across all elements
- [ ] Test text selection rules
- [ ] Screenshot and review each page
