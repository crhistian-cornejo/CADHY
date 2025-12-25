# CADHY Spacing Standard

> **Purpose**: Define consistent spacing patterns for UI components.

## Spacing Scale

Use Tailwind's default spacing scale based on 4px increments:

| Token | Value | Usage |
|-------|-------|-------|
| `0.5` | 2px | Micro spacing (icon gaps) |
| `1` | 4px | Tight spacing (inline elements) |
| `1.5` | 6px | Small spacing (compact UIs) |
| `2` | 8px | **Default component spacing** |
| `3` | 12px | Section padding |
| `4` | 16px | Panel padding, card gaps |
| `6` | 24px | Large section spacing |
| `8` | 32px | Page-level spacing |

## Component Patterns

### Property Panels

```tsx
// PropertySection
<div className="px-3 py-2">     // Header: 12px horizontal, 8px vertical
  {/* header content */}
</div>
<div className="px-3 pb-3 pt-1 space-y-2">  // Content: consistent horizontal, 8px between items
  {/* section content */}
</div>

// PropertyRow
<div className="flex items-center gap-2">   // 8px gap between label and value
  <Label className="w-20">{label}</Label>
  <div className="flex-1">{children}</div>
</div>
```

### Buttons and Controls

```tsx
// Icon buttons
<Button size="icon-xs" className="size-6">   // 24px touch target minimum
<Button size="icon-sm" className="size-7">   // 28px for toolbars
<Button size="icon" className="size-8">      // 32px standard

// Button groups
<div className="flex gap-1">     // 4px gap for tight button groups
<div className="flex gap-2">     // 8px gap for standard button groups
```

### Cards and Panels

```tsx
// Standard card
<Card className="p-3">           // 12px padding all around
<Card className="p-4">           // 16px for larger cards

// Panel headers
<div className="px-2 py-1">      // Compact panel header (8px x 4px)
<div className="px-3 py-2">      // Standard panel header (12px x 8px)

// Content spacing
<div className="space-y-2">      // 8px vertical gap between items
<div className="space-y-4">      // 16px for section separations
```

### Forms

```tsx
// Form fields
<div className="space-y-3">      // 12px between form fields

// Input with label
<div className="space-y-1.5">    // 6px between label and input
  <Label>{label}</Label>
  <Input />
</div>

// Form sections
<div className="space-y-6">      // 24px between form sections
```

### Dialogs and Modals

```tsx
// Dialog content
<DialogContent className="p-6">   // 24px padding

// Dialog sections
<div className="space-y-4">       // 16px between sections

// Dialog footer
<DialogFooter className="gap-2">  // 8px between buttons
```

## Recommended Patterns

### DO

```tsx
// Consistent gap usage
<div className="flex gap-2">
<div className="space-y-2">

// Symmetric padding
<div className="p-3">
<div className="px-4 py-2">

// Standard panel structure
<div className="px-3 py-2">  {/* header */}
<div className="px-3 pb-3 pt-1 space-y-2">  {/* content */}
```

### DON'T

```tsx
// Avoid arbitrary margins
<div className="mt-1 mb-4">  // Inconsistent
<div className="ml-3 mr-2">  // Asymmetric without reason

// Avoid mixing margin and gap
<div className="flex gap-2">
  <Item className="mr-2" />  // Redundant
</div>

// Avoid magic numbers
<div className="p-[13px]">   // Use scale values
```

## Special Cases

### Tight UIs (Toolbars, Menus)
- Use `gap-1` (4px) between items
- Use `px-2 py-1` (8px x 4px) for padding

### Spacious UIs (Onboarding, Marketing)
- Use `gap-6` or `gap-8` between sections
- Use `p-8` or larger for container padding

### SVG and Icons
- Icons: `size-3.5` (14px) for inline, `size-4` (16px) standard
- Icon gaps: `gap-1.5` (6px) or `gap-2` (8px)

---

**Last Updated**: 2025-12-24
