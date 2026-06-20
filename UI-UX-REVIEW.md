# Hermes Desktop — UI/UX Design Review

**Date:** 2026-06-19
**Reviewer:** UI/UX Pro Max (automated analysis)
**Scope:** Glass design system, components, accessibility, interaction patterns

---

## Executive Summary

The current glass design implementation has **good foundations** but needs refinements in accessibility, interaction feedback, and consistency. The glassmorphism effect is visible but some components don't follow the "cinematic dark" style recommended for AI tools.

---

## 1. CRITICAL — Accessibility (Priority 1)

### ✅ Passing
- [x] SVG icons used (Lucide) — no emojis
- [x] Focus states exist (`:focus-visible`)
- [x] Form inputs have labels

### ❌ Issues Found

| Issue | Location | Fix |
|-------|----------|-----|
| **Missing `aria-label` on icon buttons** | ChatInput send button, toolbar icon buttons | Add `aria-label="Send message"` etc. |
| **Missing `role="alert"` on error messages** | ConnectionConfigPage error/success messages | Add `role="alert"` for screen readers |
| **No `prefers-reduced-motion` support** | index.css animations | Add `@media (prefers-reduced-motion: reduce)` |
| **Missing keyboard navigation for session list** | SessionList items | Add `tabIndex={0}` + `onKeyDown` handler |
| **Missing skip-to-content link** | App shell | Add skip link for keyboard users |

---

## 2. CRITICAL — Touch & Interaction (Priority 2)

### ✅ Passing
- [x] Send button: 36px (close to 44px target)
- [x] Input min-height: 44px ✓
- [x] Loading states shown (spinner)

### ❌ Issues Found

| Issue | Location | Fix |
|-------|----------|-----|
| **Icon buttons too small** | `mac-icon-btn` is 28x28px | Increase to 32x32px or extend hit area |
| **No press feedback on session items** | SessionItem.tsx | Add `active:scale-98` transform |
| **Missing loading state on send button** | ChatInput.tsx | Show spinner when `disabled` (streaming) |
| **No error recovery guidance** | ConnectionConfigPage | Add "Check your URL and API key" helper text |

---

## 3. HIGH — Style Selection (Priority 4)

### Design System Match

| Criterion | Status | Notes |
|-----------|--------|-------|
| Style consistency | ⚠️ Partial | Glass panels consistent, but some solid backgrounds remain |
| Effects match style | ⚠️ Partial | Blur/glow present, but missing ambient light blobs |
| Platform adaptive | ✅ | macOS-native patterns followed |
| State clarity | ⚠️ | Hover states subtle, pressed states need work |
| Elevation consistent | ✅ | Shadow scale defined |

### Recommendations from UI/UX Pro Max

The skill recommends **"Modern Dark (Cinema Mobile)"** style for AI tools:
- Background: `#0a0a0f` → `#020203` gradient
- Accent: `#5E6AD2` (indigo) or current `#0A84FF` (blue)
- Border: `rgba(255,255,255,0.08)`
- Cards: `borderRadius: 16px`
- Ambient animated blobs for depth
- Blur intensity: 20px on headers/nav

**Current implementation matches ~70% of this style.**

---

## 4. HIGH — Layout & Responsive (Priority 5)

### ✅ Passing
- [x] Mobile sidebar overlay pattern
- [x] `min-h-dvh` used
- [x] Max-width on content (`max-w-3xl`)

### ❌ Issues Found

| Issue | Location | Fix |
|-------|----------|-----|
| **No responsive breakpoints for large screens** | ChatPage | Add `max-w-5xl` on ultra-wide |
| **Sidebar width fixed at 240px** | Layout | Should be resizable (EPIC 4 planned) |
| **Missing safe area padding on macOS** | App shell | Add titlebar offset padding |

---

## 5. MEDIUM — Typography & Color (Priority 6)

### ✅ Passing
- [x] 13px body text (macOS native)
- [x] SF Pro font stack
- [x] Semantic color tokens

### ❌ Issues Found

| Issue | Location | Fix |
|-------|----------|-----|
| **Text contrast on glass** | Session list, status bar | Increase secondary label opacity to 0.7 |
| **Missing line-height on body** | index.css | Add `line-height: 1.5` for readability |
| **Inconsistent font weights** | Various components | Standardize: 400 body, 500 emphasis, 600 headings |

---

## 6. MEDIUM — Animation (Priority 7)

### ✅ Passing
- [x] Command palette: 180ms scale animation
- [x] Button transitions: 150ms
- [x] Loading skeletons present

### ❌ Issues Found

| Issue | Location | Fix |
|-------|----------|-----|
| **No `prefers-reduced-motion`** | All animations | Add media query to disable/reduce |
| **Missing exit animations** | Command palette | Add exit transition (60-70% of enter) |
| **No stagger on list items** | Session list | Add 30ms stagger on mount |
| **Missing scale feedback on press** | All buttons | Add `active:scale-98` |
| **Linear easing on some transitions** | index.css | Use `cubic-bezier(0.16, 1, 0.3, 1)` |

---

## 7. MEDIUM — Forms & Feedback (Priority 8)

### ✅ Passing
- [x] Visible labels on inputs
- [x] Error messages shown
- [x] Loading states on buttons

### ❌ Issues Found

| Issue | Location | Fix |
|-------|----------|-----|
| **No inline validation** | ConnectionConfigPage | Validate on blur, not just submit |
| **Missing password toggle** | API Key input | Add show/hide toggle |
| **No success toast** | Save credentials | Brief "Saved!" confirmation |
| **Error messages not near fields** | ConnectionConfigPage | Move errors below respective inputs |

---

## 8. Glass-Specific Issues

| Issue | Current | Recommended |
|-------|---------|-------------|
| **Blur intensity** | 40px (too strong) | 20px for headers, 30px for panels |
| **Missing ambient blobs** | None | Add 2-3 animated blur circles for depth |
| **Border too visible** | 18% white | 8-12% white for subtlety |
| **Missing top-edge highlight** | Partial | Add `inset 0 1px 0 rgba(255,255,255,0.1)` consistently |
| **Card border-radius** | 2xl (16px) | ✓ Correct for glass style |
| **Missing glass reflection** | None | Add subtle gradient overlay on panels |

---

## 9. Pre-Delivery Checklist

### Visual Quality
- [ ] No emojis as icons ✓
- [ ] Consistent icon family (Lucide) ✓
- [ ] Pressed-state visuals don't shift layout ✓
- [ ] Semantic theme tokens used ✓

### Interaction
- [ ] All tappable elements provide pressed feedback ❌
- [ ] Touch targets >= 44px ❌ (icon buttons 28-30px)
- [ ] Micro-interaction timing 150-300ms ✓
- [ ] Disabled states visually clear ✓
- [ ] Screen reader labels descriptive ❌

### Light/Dark Mode
- [ ] Primary text contrast >= 4.5:1 ✓
- [ ] Secondary text contrast >= 3:1 ⚠️ (borderline)
- [ ] Dividers visible in both modes ✓
- [ ] Modal scrim strong enough ✓
- [ ] Both themes tested ⚠️ (light mode less tested)

---

## 10. Priority Fixes (Ordered)

### P0 — Must Fix Before Next Release
1. Add `aria-label` to all icon buttons
2. Add `prefers-reduced-motion` media query
3. Increase icon button touch targets to 32px+
4. Add `role="alert"` on error messages

### P1 — Should Fix Soon
5. Add press feedback (`active:scale`) on interactive elements
6. Add ambient light blobs for glass depth
7. Reduce blur to 20-30px range
8. Add stagger animation on list items

### P2 — Nice to Have
9. Add password show/hide toggle
10. Add inline validation on blur
11. Add skip-to-content link
12. Make sidebar resizable (EPIC 4)

---

## Appendix: Recommended CSS Additions

```css
/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Press feedback */
.mac-btn:active, .mac-icon-btn:active {
  transform: scale(0.97);
}

/* Ambient blob (add to app shell) */
.ambient-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.08;
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -20px); }
}
```

---

*Generated by ui-ux-pro-max skill*
