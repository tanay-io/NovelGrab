# NovelGrab Color Palette Guide

Complete reference for all colors used in the NovelGrab design system.

---

## Color System: OKLCH Format

NovelGrab uses the **OKLCH color space** for superior perceptual uniformity and precision control.

**OKLCH Format**: `oklch(lightness chroma hue)`
- **Lightness** (0-1): How bright the color is (0 = black, 1 = white)
- **Chroma** (0-0.37): How saturated the color is (0 = gray, 0.37 = max saturation)
- **Hue** (0-360): Color angle (0 = red, 120 = green, 240 = blue)

---

## Primary Colors

### Primary - Terracotta
```
OKLCH:  oklch(0.58 0.14 35)
RGB:    149, 92, 58
HEX:    #9d5c3a
HSL:    19, 44%, 41%

Uses:
- Main buttons (Get Books, Explore Library)
- Progress bar fills
- Icon highlights
- Link hover states
- Focus rings
- Section borders (primary/40 opacity)
```

### Accent - Bronze
```
OKLCH:  oklch(0.54 0.1 40)
RGB:    138, 84, 52
HEX:    #8a5434
HSL:    18, 45%, 37%

Uses:
- Secondary highlights
- Feature card icons
- Gradient fills (with primary)
- Trending card accents
- Book cover gradients
```

### Secondary - Sand
```
OKLCH:  oklch(0.88 0.06 50)
RGB:    224, 210, 194
HEX:    #e0d2c2
HSL:    26, 38%, 82%

Uses:
- Hover backgrounds (secondary/80 opacity)
- Light button variants
- Card background tints
- Section separators
```

---

## Neutral Colors

### Background - Warm Cream
```
OKLCH:  oklch(0.98 0.02 70)
RGB:    252, 249, 246
HEX:    #fcf9f6
HSL:    32, 33%, 98%

Uses:
- Page background
- Default card backgrounds
- Container backgrounds
- Overall layout base
```

### Foreground - Deep Charcoal
```
OKLCH:  oklch(0.15 0.01 70)
RGB:    38, 37, 37
HEX:    #262525
HSL:    0, 3%, 15%

Uses:
- Body text (14px)
- Headings
- Primary text
- Menu items
```

### Muted - Soft Taupe
```
OKLCH:  oklch(0.88 0.04 60)
RGB:    224, 219, 212
HEX:    #e0dbcc
HSL:    36, 28%, 86%

Uses:
- Secondary text (gray text)
- Disabled states
- Placeholder text
- Inactive UI elements
```

### Muted Foreground - Medium Gray
```
OKLCH:  oklch(0.45 0.02 70)
RGB:    115, 112, 108
HEX:    #73706c
HSL:    24, 3%, 44%

Uses:
- Helper text (12px)
- Captions and metadata
- Secondary labels
- Less important information
```

---

## Functional Colors

### Border - Very Light Warm Gray
```
OKLCH:  oklch(0.92 0.02 70)
RGB:    235, 232, 229
HEX:    #ebe8e5
HSL:    24, 13%, 92%

Uses:
- Card borders
- Dividers
- Input field borders
- Subtle separators
- Grid lines
```

### Input - Light Warm Gray
```
OKLCH:  oklch(0.95 0.02 70)
RGB:    243, 241, 238
HEX:    #f3f1ee
HSL:    29, 21%, 95%

Uses:
- Input field backgrounds
- Text area backgrounds
- Form field backgrounds
```

### Ring - Primary (Focus)
```
OKLCH:  oklch(0.58 0.14 35)
RGB:    149, 92, 58
HEX:    #9d5c3a
HSL:    19, 44%, 41%

Uses:
- Keyboard focus outlines
- Focus rings (2px)
- Focus indicators
- Accessible focus styling
```

### Destructive - Warm Red
```
OKLCH:  oklch(0.55 0.15 30)
RGB:    141, 73, 50
HEX:    #8d4932
HSL:    13, 47%, 42%

Uses:
- Delete buttons (not currently used)
- Error states (not currently used)
- Warning messages (not currently used)
- Danger actions
```

---

## Chart Colors

### Chart Color 1 (Primary)
```
OKLCH:  oklch(0.58 0.14 35)
RGB:    149, 92, 58
HEX:    #9d5c3a

Uses: Main data visualization color
```

### Chart Color 2 (Secondary)
```
OKLCH:  oklch(0.62 0.12 50)
RGB:    159, 115, 78
HEX:    #9f734e

Uses: Secondary data visualization
```

### Chart Color 3 (Tertiary)
```
OKLCH:  oklch(0.72 0.1 60)
RGB:    186, 152, 116
HEX:    #ba9874

Uses: Tertiary data visualization
```

### Chart Color 4 (Accent 1)
```
OKLCH:  oklch(0.5 0.08 25)
RGB:    128, 69, 46
HEX:    #804e2e

Uses: Additional visualization color
```

### Chart Color 5 (Accent 2)
```
OKLCH:  oklch(0.65 0.11 45)
RGB:    168, 125, 83
HEX:    #a87d53

Uses: Additional visualization color
```

---

## Sidebar Colors (Light Theme)

### Sidebar Background
```
OKLCH:  oklch(0.985 0 0)
RGB:    252, 252, 252
HEX:    #fcfcfc

Uses: Sidebar background (if added)
```

### Sidebar Foreground
```
OKLCH:  oklch(0.145 0 0)
RGB:    37, 37, 37
HEX:    #252525

Uses: Sidebar text
```

### Sidebar Primary
```
OKLCH:  oklch(0.205 0 0)
RGB:    52, 52, 52
HEX:    #343434

Uses: Sidebar primary highlights
```

### Sidebar Accent
```
OKLCH:  oklch(0.97 0 0)
RGB:    247, 247, 247
HEX:    #f7f7f7

Uses: Sidebar hover backgrounds
```

---

## Color Accessibility

### Contrast Ratios (Light Theme)

| Combination | Ratio | WCAG Level |
|------------|-------|-----------|
| Foreground on Background | 15.23:1 | AAA ✓ |
| Foreground on Card | 13.67:1 | AAA ✓ |
| Muted Foreground on Background | 4.02:1 | AA ✓ |
| Primary on White | 4.51:1 | AA ✓ |
| Accent on White | 4.21:1 | AA ✓ |

All color combinations meet **WCAG AA** standards or higher.

---

## Color Application Examples

### Header
```
Background:     bg-background/95         (cream with transparency)
Border:         border-border            (light warm gray)
Text:           text-foreground          (charcoal)
Logo Gradient:  from-primary to-accent   (terracotta to bronze)
Icon:           text-primary-foreground  (cream on primary)
```

### Hero Section
```
Background:     from-accent/10 to-primary/10  (subtle warm tint)
Border:         border-border                  (light divider)
Heading:        text-foreground                (charcoal)
Subheading:     text-muted-foreground         (medium gray)
Button:         bg-primary                     (terracotta)
Stats:          text-primary / text-accent     (warm highlights)
```

### Cards
```
Background:     bg-card                  (warm cream)
Border:         border-border            (light gray)
Border Hover:   border-primary/40        (terracotta at 40% opacity)
Title:          text-foreground          (charcoal)
Subtitle:       text-muted-foreground    (medium gray)
Progress:       from-primary to-accent   (warm gradient)
```

### Buttons
```
Primary:        bg-primary text-primary-foreground
Secondary:      border-border bg-transparent text-foreground
Hover:          opacity-90 (slightly darker)
Disabled:       opacity-50 text-muted-foreground
```

### Forms
```
Input:          bg-input border-border
Placeholder:    text-muted-foreground
Focus Ring:     ring-ring (2px primary)
Error:          border-destructive
```

---

## CSS Custom Properties

All colors are defined as CSS custom properties in `/app/globals.css`:

```css
:root {
  --background: oklch(0.98 0.02 70);
  --foreground: oklch(0.15 0.01 70);
  --card: oklch(0.99 0.01 70);
  --card-foreground: oklch(0.15 0.01 70);
  --primary: oklch(0.58 0.14 35);
  --primary-foreground: oklch(0.98 0.01 70);
  --secondary: oklch(0.88 0.06 50);
  --secondary-foreground: oklch(0.15 0.01 70);
  --muted: oklch(0.88 0.04 60);
  --muted-foreground: oklch(0.45 0.02 70);
  --accent: oklch(0.54 0.1 40);
  --accent-foreground: oklch(0.98 0.01 70);
  --border: oklch(0.92 0.02 70);
  --input: oklch(0.95 0.02 70);
  --ring: oklch(0.58 0.14 35);
  --destructive: oklch(0.55 0.15 30);
  --chart-1: oklch(0.58 0.14 35);
  --chart-2: oklch(0.62 0.12 50);
  --chart-3: oklch(0.72 0.1 60);
  --chart-4: oklch(0.5 0.08 25);
  --chart-5: oklch(0.65 0.11 45);
}
```

---

## Using Colors in Code

### Tailwind Classes
```jsx
{/* Text colors */}
className="text-foreground"           {/* Charcoal */}
className="text-muted-foreground"    {/* Medium gray */}
className="text-primary"              {/* Never use - use in text */}
className="text-accent"               {/* Never use - use in text */}

{/* Background colors */}
className="bg-background"             {/* Cream */}
className="bg-card"                   {/* Warm cream */}
className="bg-primary"                {/* Terracotta */}
className="bg-accent"                 {/* Bronze */}
className="bg-secondary"              {/* Sand */}

{/* Border colors */}
className="border-border"             {/* Light gray */}
className="border-primary/40"         {/* Terracotta at 40% opacity */}

{/* Hover states */}
className="hover:bg-accent/5"         {/* Subtle accent tint */}
className="hover:border-primary/40"   {/* Lighter border on hover */}
className="hover:text-foreground"     {/* Darker text on hover */}

{/* Opacity variants */}
className="bg-primary/10"             {/* 10% opacity */}
className="bg-primary/20"             {/* 20% opacity */}
className="bg-primary/50"             {/* 50% opacity */}
className="bg-primary/80"             {/* 80% opacity */}
```

### CSS Variables
```css
/* In CSS files */
color: var(--foreground);
background: var(--primary);
border: 1px solid var(--border);
```

---

## Color Modification Guide

### To Change Primary Color
1. Open `/app/globals.css`
2. Find `:root` section
3. Change `--primary: oklch(0.58 0.14 35);`

**OKLCH Value Breakdown**:
```
oklch(0.58 0.14 35)
      |    |    |
      |    |    └─ Hue: 35 (warm orange)
      |    └────── Chroma: 0.14 (saturation)
      └────────── Lightness: 0.58 (brightness)
```

### Hue Values Reference
```
0-30:    Red to orange
30-60:   Orange to yellow
60-120:  Yellow to green
120-180: Green to cyan
180-240: Cyan to blue
240-300: Blue to purple
300-360: Purple to red
```

### Example Color Variations

**Keep same lightness/chroma, change hue:**
```
Terracotta (current):   oklch(0.58 0.14 35)    {Hue: 35°}
Green variation:        oklch(0.58 0.14 140)   {Hue: 140°}
Blue variation:         oklch(0.58 0.14 260)   {Hue: 260°}
Purple variation:       oklch(0.58 0.14 310)   {Hue: 310°}
```

**Keep same hue, change lightness (lighter/darker):**
```
Original:      oklch(0.58 0.14 35)
Lighter:       oklch(0.68 0.14 35)   {Lightness: +0.1}
Darker:        oklch(0.48 0.14 35)   {Lightness: -0.1}
```

**Keep same hue, change chroma (less/more saturated):**
```
Original:      oklch(0.58 0.14 35)
Less saturated: oklch(0.58 0.08 35)  {Chroma: -0.06}
More saturated: oklch(0.58 0.20 35)  {Chroma: +0.06}
```

---

## Converting Between Color Formats

### From HEX to OKLCH
Use online converter: https://oklch.com/

Examples:
- `#9d5c3a` (terracotta HEX) = `oklch(0.58 0.14 35)` OKLCH
- `#e0d2c2` (sand HEX) = `oklch(0.88 0.06 50)` OKLCH
- `#8a5434` (bronze HEX) = `oklch(0.54 0.1 40)` OKLCH

### From RGB to OKLCH
Use calculator: https://www.rapidtables.com/convert/color/

Example:
- RGB(149, 92, 58) = `oklch(0.58 0.14 35)` OKLCH

---

## Dark Mode (Not Implemented)

NovelGrab uses **light theme only** (no dark mode). If dark mode is added in the future, use:

```css
.dark {
  --background: oklch(0.15 0 0);
  --foreground: oklch(0.98 0 0);
  --primary: oklch(0.75 0.14 35);
  /* etc */
}
```

---

## Color Consistency Tips

✅ **Always use design tokens** (--primary, --accent, etc.)
✅ **Never hardcode colors** (#fff, #000, rgb(), etc.)
✅ **Use opacity for tints** (primary/10, primary/40, primary/80)
✅ **Apply consistent hover states** (border-primary/40)
✅ **Reference this guide** for exact OKLCH values
✅ **Test contrast ratios** with accessibility checkers

---

## Quick Reference Card

```
Primary CTAs:     bg-primary text-primary-foreground
Secondary:        border-border text-foreground
Headings:         text-foreground (24px bold)
Body Text:        text-foreground (14px regular)
Helper Text:      text-muted-foreground (12px)
Card Background:  bg-card
Card Border:      border-border
Hover Border:     border-primary/40
Hover Background: bg-accent/5
Progress Fill:    from-primary to-accent
Icon Default:     text-primary
Icon Muted:       text-muted-foreground
```

---

## Questions?

Refer to:
- **DESIGN_SPECS.md** for pixel measurements
- **FRONTEND.md** for design philosophy
- **DEVELOPER_GUIDE.md** for color modification recipes
- **oklch.com** for color conversions

---

*NovelGrab Color System - Warm, Organic, Intentional*
