# NovelGrab Design Tokens Reference

Quick reference card for all design tokens used in NovelGrab.

---

## Color Tokens

### Primary Colors
```css
--primary: oklch(0.58 0.14 35);              /* Terracotta */
--primary-foreground: oklch(0.98 0.01 70);  /* Cream text on primary */

--secondary: oklch(0.88 0.06 50);           /* Sand */
--secondary-foreground: oklch(0.15 0.01 70); /* Dark text on secondary */

--accent: oklch(0.54 0.1 40);               /* Bronze */
--accent-foreground: oklch(0.98 0.01 70);  /* Cream text on accent */
```

### Neutral Colors
```css
--background: oklch(0.98 0.02 70);          /* Warm cream background */
--foreground: oklch(0.15 0.01 70);          /* Deep charcoal text */

--card: oklch(0.99 0.01 70);                /* Card backgrounds */
--card-foreground: oklch(0.15 0.01 70);    /* Text on cards */

--popover: oklch(0.99 0.01 70);             /* Popover backgrounds */
--popover-foreground: oklch(0.15 0.01 70); /* Text on popovers */
```

### Muted Colors
```css
--muted: oklch(0.88 0.04 60);               /* Muted backgrounds */
--muted-foreground: oklch(0.45 0.02 70);   /* Muted text */
```

### Functional Colors
```css
--border: oklch(0.92 0.02 70);              /* Default border color */
--input: oklch(0.95 0.02 70);               /* Input field background */
--ring: oklch(0.58 0.14 35);                /* Focus ring (= primary) */
--destructive: oklch(0.55 0.15 30);         /* Error/delete actions */
--destructive-foreground: oklch(0.55 0.15 30); /* Text on destructive */
```

### Chart Colors
```css
--chart-1: oklch(0.58 0.14 35);    /* Primary chart color */
--chart-2: oklch(0.62 0.12 50);    /* Secondary chart color */
--chart-3: oklch(0.72 0.1 60);     /* Tertiary chart color */
--chart-4: oklch(0.5 0.08 25);     /* Accent chart color 1 */
--chart-5: oklch(0.65 0.11 45);    /* Accent chart color 2 */
```

### Sidebar Colors
```css
--sidebar: oklch(0.985 0 0);                /* Sidebar background */
--sidebar-foreground: oklch(0.145 0 0);    /* Sidebar text */
--sidebar-primary: oklch(0.205 0 0);       /* Sidebar highlights */
--sidebar-primary-foreground: oklch(0.985 0 0); /* Text on primary */
--sidebar-accent: oklch(0.97 0 0);         /* Sidebar hover */
--sidebar-accent-foreground: oklch(0.205 0 0); /* Text on accent */
--sidebar-border: oklch(0.922 0 0);        /* Sidebar borders */
--sidebar-ring: oklch(0.708 0 0);          /* Sidebar focus ring */
```

---

## Spacing Tokens

### Base Unit: 4px

```css
/* Padding and Margin */
p-1 / m-1:    4px
p-2 / m-2:    8px
p-3 / m-3:    12px
p-4 / m-4:    16px    ← Common
p-5 / m-5:    20px
p-6 / m-6:    24px    ← Common
p-8 / m-8:    32px    ← Large sections
p-12 / m-12:  48px    ← Section spacing
p-16 / m-16:  64px
p-20 / m-20:  80px

/* Gap */
gap-1:   4px
gap-2:   8px
gap-3:   12px
gap-4:   16px  ← Common
gap-5:   20px
gap-6:   24px  ← Library cards
gap-8:   32px
gap-12:  48px
```

### Margin Bottom (Sections)
```css
mb-6:   24px
mb-12:  48px  ← Section spacing
mb-16:  64px  ← Large sections
mb-20:  80px
```

---

## Sizing Tokens

### Container Width
```css
--radius: 0.625rem  (Tailwind default)

/* Border Radius (via --radius) */
rounded-sm:  (--radius - 4px) = 0.25rem = 4px
rounded-md:  (--radius - 2px) = 0.5rem = 8px
rounded-lg:  var(--radius) = 0.625rem = 10px
rounded-xl:  (--radius + 4px) = 1rem = 16px  ← Cards
rounded-2xl: (--radius + 8px) = 1.5rem = 24px ← Hero
rounded-full: 50% = circle
```

### Max Width Container
```css
max-w-xs:  20rem  (320px)
max-w-sm:  24rem  (384px)
max-w-md:  28rem  (448px)
max-w-lg:  32rem  (512px)
max-w-xl:  36rem  (576px)
max-w-2xl: 42rem  (672px)
max-w-3xl: 48rem  (768px)
max-w-4xl: 56rem  (896px)
max-w-5xl: 64rem  (1024px)
max-w-6xl: 72rem  (1152px)
max-w-7xl: 80rem  (1280px) ← NovelGrab
max-w-full: 100%
```

---

## Typography Tokens

### Font Families
```css
--font-sans: 'Geist', system-ui, sans-serif
--font-mono: 'Geist Mono', monospace
--font-serif: [not used]
```

### Font Size Scale
```css
text-xs:   12px  (0.75rem)  ← Small labels
text-sm:   14px  (0.875rem) ← Helper text
text-base: 16px  (1rem)     ← Body text
text-lg:   18px  (1.125rem) ← Large text
text-xl:   20px  (1.25rem)
text-2xl:  24px  (1.5rem)   ← Headings
text-3xl:  30px  (1.875rem)
text-4xl:  36px  (2.25rem)  ← H1 mobile
text-5xl:  48px  (3rem)     ← H1 desktop
```

### Font Weight
```css
font-thin:      100
font-light:     300
font-normal:    400  ← Body
font-medium:    500
font-semibold:  600  ← Card titles
font-bold:      700  ← Headings
```

### Line Height
```css
leading-none:     1    (0px)
leading-tight:    1.25 (Headings)
leading-snug:     1.375
leading-normal:   1.5  (Body)
leading-relaxed:  1.625
leading-loose:    2
```

---

## Animation & Transition Tokens

### Duration
```css
duration-75:   75ms
duration-100:  100ms
duration-150:  150ms
duration-200:  200ms   ← Hover
duration-300:  300ms   ← Default
duration-500:  500ms
```

### Easing
```css
ease-linear:   linear
ease-in:       cubic-bezier(0.4, 0, 1, 1)
ease-out:      cubic-bezier(0, 0, 0.2, 1)
ease-in-out:   cubic-bezier(0.4, 0, 0.2, 1)  ← Default
```

### Transition
```css
transition:         all properties
transition-all:     all properties, 300ms
transition-colors:  color properties, 200ms
transition-opacity: opacity only
```

---

## Breakpoint Tokens

### Responsive Prefixes
```css
/* Mobile first */
sm:  640px   ← Small devices
md:  768px   ← Tablets
lg:  1024px  ← Large tablets / desktops
xl:  1280px  ← Desktops
2xl: 1536px  ← Large desktops

/* Usage */
grid-cols-1          /* Mobile: 1 column */
md:grid-cols-2       /* Tablet: 2 columns */
lg:grid-cols-4       /* Desktop: 4 columns */

hidden               /* Hidden by default */
md:flex              /* Show on tablet+ */
```

---

## Shadow Tokens

### Box Shadow
```css
shadow-sm:   0 1px 2px rgba(0,0,0,0.05)
shadow:      0 1px 3px rgba(0,0,0,0.1)
shadow-md:   0 4px 6px rgba(0,0,0,0.1)
shadow-lg:   0 10px 15px rgba(0,0,0,0.1) ← Cards hover
shadow-xl:   0 20px 25px rgba(0,0,0,0.1)
shadow-2xl:  0 25px 50px rgba(0,0,0,0.25)
shadow-none: none
```

---

## Opacity Tokens

### Color Opacity
```css
/5    → 5% opacity
/10   → 10% opacity  (very subtle)
/20   → 20% opacity  (subtle)
/30   → 30% opacity
/40   → 40% opacity  ← Borders on hover
/50   → 50% opacity
/60   → 60% opacity
/80   → 80% opacity  (opaque)
/90   → 90% opacity
/100  → 100% opacity (full)

/* Usage */
bg-primary/10      /* 10% primary background */
border-primary/40  /* 40% primary border */
bg-accent/5        /* 5% accent background */
```

---

## Utility Classes Reference

### Common Combinations

#### Text Styling
```css
/* Headings */
text-2xl font-bold text-foreground

/* Body Text */
text-base font-normal text-foreground

/* Muted Text */
text-sm text-muted-foreground

/* Labels */
text-sm font-semibold text-foreground
```

#### Button Styling
```css
/* Primary Button */
bg-primary text-primary-foreground px-4 py-2 rounded-lg
hover:opacity-90 transition-opacity

/* Secondary Button */
border border-border text-foreground px-4 py-2 rounded-lg
hover:bg-secondary transition-colors
```

#### Card Styling
```css
/* Default Card */
bg-card border border-border rounded-xl p-4

/* Card with Hover */
bg-card border border-border rounded-xl p-4
hover:border-primary/40 hover:shadow-lg transition-all

/* Minimal Card */
bg-card rounded-xl p-4 border border-border
hover:border-primary/40 transition-colors
```

#### Container Styling
```css
/* Page Container */
max-w-7xl mx-auto px-4 md:px-6 lg:px-8

/* Section */
mb-16

/* Section with Title */
mb-16
- h3.text-2xl.font-bold.mb-6
- Grid with gap-6
```

---

## CSS Custom Properties (var)

### In CSS Files
```css
color: var(--foreground);
background: var(--primary);
border: 1px solid var(--border);
box-shadow: 0 1px 3px var(--ring);
```

### In Tailwind Classes
```jsx
{/* Use Tailwind classes, not var() */}
className="text-foreground bg-primary border-border"

{/* With opacity */}
className="border-primary/40"
```

---

## Complete Token List Summary

| Category | Count | Examples |
|----------|-------|----------|
| Colors | 20+ | primary, accent, background, border |
| Spacing | 12+ | p-4, m-6, gap-5, mb-12 |
| Typography | 20+ | text-base, font-bold, leading-tight |
| Breakpoints | 5 | sm, md, lg, xl, 2xl |
| Shadows | 7 | shadow-sm, shadow-lg |
| Opacity | 11 | /10, /40, /80 |
| Border Radius | 6 | rounded-lg, rounded-xl, rounded-2xl |
| Transitions | 3 | transition-all, duration-300 |

---

## Using These Tokens

### ✅ DO:
```jsx
className="text-foreground bg-card border-border"
className="hover:border-primary/40"
className="transition-all duration-300"
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
```

### ❌ DON'T:
```jsx
className="text-white bg-gray-100 border-gray-300"
className="hover:border-orange-400"
className="transition-all duration-500"
className="grid-cols-1 grid-cols-2 grid-cols-4"
```

---

## Token Modification

### Change a Color Token
Edit `/app/globals.css`:
```css
:root {
  --primary: oklch(0.58 0.14 35);  /* Change this */
}
```

### Change Spacing
Use Tailwind classes directly (no token needed).

### Change Typography
Use Tailwind text-* and font-* classes (no token needed).

### Add New Token
1. Add to `:root` in globals.css:
```css
--my-custom-color: oklch(0.5 0.1 180);
```

2. Use in Tailwind via @apply or inline:
```jsx
className="[color:var(--my-custom-color)]"
```

---

## Quick Reference Card

### Colors
```
Primary:        --primary (terracotta)
Accent:         --accent (bronze)
Background:     --background (cream)
Foreground:     --foreground (charcoal)
Muted:          --muted-foreground
Border:         --border
```

### Spacing
```
Small padding:  p-2, p-3, p-4
Large padding:  p-6, p-8, p-12
Gap:            gap-4, gap-6
Margin bottom:  mb-6, mb-12, mb-16
```

### Text
```
Small:          text-xs (12px)
Body:           text-base (14px)
Heading:        text-2xl (24px)
Bold:           font-bold
Normal:         font-normal
```

### Layout
```
Container:      max-w-7xl mx-auto
Section:        mb-16
Grid:           grid grid-cols-1 md:grid-cols-4 gap-6
```

---

## Token Inheritance

Some tokens derive from others:

```
--primary → used for:
  ├── Primary button background
  ├── Progress bar fill
  ├── Icon highlights
  ├── Focus ring color
  └── Primary text accent

--accent → used for:
  ├── Gradient fills
  ├── Secondary highlights
  ├── Feature icons
  └── Book cover gradients

--border → used for:
  ├── Card borders
  ├── Dividers
  ├── Form field borders
  └── Grid separators
```

---

## Next Steps

- **Use these tokens** in all new code
- **Never hardcode colors** (use --var)
- **Reference DESIGN_SPECS.md** for pixel values
- **Check COLOR_PALETTE.md** for color meanings
- **Follow DEVELOPER_GUIDE.md** for modifications

---

*NovelGrab Design Tokens - Complete Reference*
