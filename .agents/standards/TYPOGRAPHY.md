# Typography Standards - CADHY

## Overview

This document defines the typography system for CADHY to ensure consistent visual hierarchy and readability across the entire application.

## Base Configuration

- **Font Family**: Noto Sans Variable (body), Chillax (headings)
- **Base Size**: 16px
- **Font Smoothing**: antialiased
- **Color System**: OKLCH via CSS variables

## Semantic Heading Hierarchy

**ALWAYS use semantic HTML elements without size overrides** to maintain consistency:

```tsx
// ✅ CORRECT - Let globals.css apply sizes
<h1>Page Title</h1>                    // text-4xl (36px) - extrabold
<h2>Major Section</h2>                 // text-3xl (30px) - semibold + border
<h3>Subsection</h3>                    // text-2xl (24px) - semibold
<h4>Minor Section</h4>                 // text-xl (20px) - semibold
<h5>Small Section</h5>                 // text-lg (18px) - semibold
<h6>Smallest Heading</h6>              // text-base (16px) - semibold

// ❌ WRONG - Don't override sizes
<h1 className="text-2xl">Title</h1>    // Breaks hierarchy
<h2 className="text-sm">Section</h2>   // Confusing semantic structure
```

### Usage Guidelines

| Element | Use Case | Notes |
|---------|----------|-------|
| `h1` | Page titles, main views | One per page/view |
| `h2` | Major sections, panel titles | Has bottom border by default |
| `h3` | Subsections, card titles | Most common heading |
| `h4` | Minor sections, groups | Use sparingly |
| `h5` | Small sections | Rare |
| `h6` | Smallest headings | Very rare |

## Standard Utility Classes

### Built-in Utilities (globals.css)

```css
.lead       // text-xl text-muted-foreground - Intro paragraphs
.large      // text-lg font-semibold - Emphasized text
.small      // text-sm font-medium leading-none - Labels
.muted      // text-sm text-muted-foreground - Secondary text
```

### Custom Typography Utilities (CADHY-specific)

```css
.section-label  // text-xs font-medium uppercase tracking-wide text-muted-foreground
.ui-label       // text-xs font-medium
.ui-text        // text-sm
.ui-caption     // text-xs text-muted-foreground
```

## Component-Specific Standards

### Dialog & Modal Titles

```tsx
// ✅ CORRECT - Use DialogTitle without size override
<DialogTitle>Create New Project</DialogTitle>

// ❌ WRONG - Don't add explicit sizes
<DialogTitle className="text-base">Title</DialogTitle>
```

### Panel Headers

```tsx
// ✅ CORRECT - Use section-label for uppercase headers
<div className="section-label">Properties</div>

// ✅ CORRECT - Use h3 for regular panel titles
<h3>Material Settings</h3>

// ❌ WRONG - Don't use arbitrary sizes
<div className="text-[10px] uppercase">HEADER</div>
```

### Section Labels (Uppercase)

```tsx
// ✅ CORRECT - Consistent uppercase labels
<label className="section-label">Dimensions</label>
<div className="section-label">Advanced Options</div>

// ❌ WRONG - Inconsistent patterns
<div className="text-xs uppercase">LABEL 1</div>
<div className="text-[10px] font-semibold uppercase">LABEL 2</div>
```

### Form Labels

```tsx
// ✅ CORRECT - Use ui-label for form fields
<label className="ui-label">Width</label>
<Label>Height</Label>  // Label component has correct defaults

// ❌ WRONG - Don't use arbitrary sizes
<label className="text-[11px]">Field</label>
```

### UI Text (Body Copy)

```tsx
// ✅ CORRECT - Use standard Tailwind sizes
<p className="text-sm">Regular UI text</p>
<span className="text-xs">Small details</span>

// ❌ WRONG - Don't use arbitrary sizes
<p className="text-[13px]">Text</p>
<span className="text-[11px]">Detail</span>
```

### Tooltips & Captions

```tsx
// ✅ CORRECT - Use ui-caption for secondary info
<span className="ui-caption">Additional information</span>
<p className="text-xs text-muted-foreground">Tooltip content</p>

// ❌ WRONG - Don't use arbitrary sizes
<span className="text-[9px]">Info</span>
```

## Font Size Scale

**ONLY use these Tailwind utilities** (NO arbitrary values):

| Class | Size | Use Case |
|-------|------|----------|
| `text-xs` | 12px | Labels, captions, tooltips |
| `text-sm` | 14px | UI text, body copy |
| `text-base` | 16px | Default text size |
| `text-lg` | 18px | Emphasized text, h5 |
| `text-xl` | 20px | Large text, h4 |
| `text-2xl` | 24px | h3, card titles |
| `text-3xl` | 30px | h2, section titles |
| `text-4xl` | 36px | h1, page titles |

### Arbitrary Sizes (BANNED)

❌ **NEVER use these**:
- `text-[8px]` - Too small, use `text-xs` (12px)
- `text-[9px]` - Too small, use `text-xs` (12px)
- `text-[10px]` - Too small, use `text-xs` (12px)
- `text-[11px]` - Use `text-xs` (12px) or `text-sm` (14px)
- `text-[12px]` - Use `text-xs`
- `text-[13px]` - Use `text-sm`
- `text-[14px]` - Use `text-sm`
- `text-[15px]` - Use `text-base` or `text-sm`

**Why?** Arbitrary sizes break the design system and create inconsistencies.

## Font Weight Guidelines

**Standard weights available**:
- `font-normal` (400) - Body text
- `font-medium` (500) - Labels, emphasis
- `font-semibold` (600) - Headings, important UI elements
- `font-bold` (700) - Strong emphasis (use sparingly)
- `font-extrabold` (800) - h1 only

### Weight Patterns

```tsx
// ✅ CORRECT - Consistent weight usage
<h2 className="font-semibold">Section</h2>      // h2-h6 default
<label className="font-medium">Field</label>    // Labels
<p className="font-normal">Text</p>             // Body copy
<span className="font-bold">Important</span>    // Strong emphasis only

// ❌ WRONG - Inconsistent weights
<h3 className="font-bold">Section</h3>          // Should be semibold
<label className="font-semibold">Field</label>  // Should be medium
```

## Line Height & Tracking

**Follow Tailwind defaults** unless specific design requirement:

- Headings: `tracking-tight` (already in globals.css)
- Uppercase labels: `tracking-wide`
- Body text: Default line-height (no override needed)

```tsx
// ✅ CORRECT - Only override when necessary
<div className="section-label tracking-wide">UPPERCASE</div>
<h2>Section Title</h2>  // tracking-tight from globals.css

// ❌ WRONG - Don't add unnecessary tracking
<p className="tracking-tight">Regular text</p>
```

## Migration Checklist

When standardizing existing components:

1. **Replace h1/h2/h3 with semantic sizes**:
   - Remove explicit `text-*` classes from heading elements
   - Let globals.css apply the correct size
   
2. **Replace arbitrary font sizes**:
   - `text-[8px]` → `text-xs`
   - `text-[10px]` → `text-xs`
   - `text-[11px]` → `text-xs` or `text-sm`
   - `text-[12px]` → `text-xs`
   - `text-[13px]` → `text-sm`
   
3. **Standardize section headers**:
   - Replace mixed patterns with `.section-label`
   - Or use semantic `<h3>` if appropriate
   
4. **Remove size overrides from component titles**:
   - DialogTitle, CardTitle, etc. should use defaults
   
5. **Use font-medium for labels, font-semibold for headings**:
   - Replace inconsistent `font-bold` usage

## Examples

### Before & After

#### Dialog Headers
```tsx
// ❌ BEFORE
<DialogTitle className="text-base font-semibold">Create Box</DialogTitle>

// ✅ AFTER
<DialogTitle>Create Box</DialogTitle>
```

#### Panel Headers
```tsx
// ❌ BEFORE
<div className="text-[10px] font-bold uppercase tracking-wider">PROPERTIES</div>

// ✅ AFTER
<div className="section-label">Properties</div>
```

#### Section Titles
```tsx
// ❌ BEFORE
<h2 className="text-lg font-bold">Settings</h2>

// ✅ AFTER
<h2>Settings</h2>  // Automatically text-3xl font-semibold
```

#### Form Labels
```tsx
// ❌ BEFORE
<label className="text-[11px] font-medium">Width</label>

// ✅ AFTER
<label className="ui-label">Width</label>  // or just <Label>Width</Label>
```

## Tools & Commands

### Find Typography Issues

```bash
# Find arbitrary font sizes
grep -rn "text-\[.*px\]" apps/desktop/src --include="*.tsx"

# Find h1/h2/h3 with size overrides
grep -rn "<h[1-3].*text-" apps/desktop/src --include="*.tsx"

# Find DialogTitle with explicit sizes
grep -rn "DialogTitle.*className.*text-" apps/desktop/src --include="*.tsx"
```

### Verify Changes

```bash
bun lint:fix      # Auto-fix linting issues
bun lint          # Check for remaining issues
bun typecheck     # Verify TypeScript
bun dev           # Visual inspection
```

## Related Documentation

- `.agents/standards/CONVENTIONS.md` - General coding conventions
- `.agents/standards/SHADCN-V2.md` - Component library guidelines
- `packages/ui/src/styles/globals.css` - Base typography definitions

---

**Last Updated**: December 2024
**Version**: 1.0.0
