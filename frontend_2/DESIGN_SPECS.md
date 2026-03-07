# NovelGrab Design Specifications

## Executive Summary
NovelGrab is a premium book reading application UI with a deliberately warm, organic aesthetic that differentiates from generic platforms. This document provides pixel-perfect specifications for implementation and recreation.

---

## 1. Color System (OKLCH Format)

### Primary Colors
```
Primary (Terracotta):
  oklch(0.58 0.14 35)
  RGB: ~149, 92, 58
  Usage: Main CTA buttons, progress bars, highlights, icons
  
Accent (Bronze):  
  oklch(0.54 0.1 40)
  RGB: ~138, 84, 52
  Usage: Secondary accents, feature icons, gradient fills
  
Secondary (Sand):
  oklch(0.88 0.06 50)
  RGB: ~224, 210, 194
  Usage: Hover backgrounds, secondary buttons
```

### Neutral Colors
```
Background (Warm Cream):
  oklch(0.98 0.02 70)
  RGB: ~252, 249, 246
  Usage: Page background, card backgrounds
  
Foreground (Deep Charcoal):
  oklch(0.15 0.01 70)
  RGB: ~38, 37, 37
  Usage: Body text, headings, primary text
  
Muted (Soft Taupe):
  oklch(0.88 0.04 60)
  RGB: ~224, 219, 212
  Usage: Secondary text, disabled states
  
Muted Foreground:
  oklch(0.45 0.02 70)
  RGB: ~115, 112, 108
  Usage: Helper text, captions, muted labels
```

### Functional Colors
```
Border (Warm Gray):
  oklch(0.92 0.02 70)
  RGB: ~235, 232, 229
  Usage: Dividers, card borders, form field borders
  
Input:
  oklch(0.95 0.02 70)
  RGB: ~243, 241, 238
  Usage: Input field backgrounds, text areas
  
Ring (Focus):
  oklch(0.58 0.14 35) [Primary color]
  Usage: Focus outlines, keyboard navigation
  
Destructive:
  oklch(0.55 0.15 30)
  RGB: ~141, 73, 50
  Usage: Delete buttons, error states
```

---

## 2. Typography System

### Font Stack
```css
font-family: 'Geist', system-ui, sans-serif;
font-family-mono: 'Geist Mono', monospace;
```

### Type Scale
```
Display (Hero Title):
  Size: 48px (desktop) / 36px (mobile)
  Weight: 700
  Line Height: 1.1 (tight)
  Letter Spacing: -0.02em
  Example: "Read Without Limits"

Section Heading (H2):
  Size: 24px
  Weight: 700
  Line Height: 1.2 (tight)
  Letter Spacing: -0.01em
  Example: "Currently Reading"

Subheading (H3):
  Size: 16px
  Weight: 600
  Line Height: 1.3
  Letter Spacing: 0
  Example: Card titles

Body Text:
  Size: 14px
  Weight: 400
  Line Height: 1.5 (relaxed)
  Letter Spacing: 0
  Example: Descriptions, paragraphs

Small/Caption:
  Size: 12px
  Weight: 400
  Line Height: 1.4
  Letter Spacing: 0
  Example: Labels, metadata

Label:
  Size: 14px
  Weight: 600
  Line Height: 1.4
  Letter Spacing: 0
  Example: Form labels, tags
```

---

## 3. Spacing System

### Base Unit: 4px (Tailwind default)

### Spacing Scale
```
xs:    4px  (p-1, gap-1)
sm:    8px  (p-2, gap-2)
md:   12px  (p-3, gap-3)
base: 16px  (p-4, gap-4)
lg:   20px  (p-5, gap-5)
xl:   24px  (p-6, gap-6)
2xl:  32px  (p-8, gap-8)
3xl:  48px  (p-12, gap-12)
4xl:  64px  (p-16, gap-16)
5xl:  80px  (p-20)
```

### Applied Spacing
```
Page Horizontal Padding:  16px (sm) / 24px (md) / 32px (lg)
Section Margin Bottom:    48px (mb-12) / 64px (mb-16)
Card Padding:             16px (p-4)
Button Padding:           10px h, 8px v (px-4 py-2)
Input Padding:            12px (h-12 gives 48px total height)
Border Radius:            12px (rounded-xl) / 16px (rounded-2xl)
Max Width Container:      1280px (max-w-7xl)
Gap Between Grid Items:   20px (gap-5) / 24px (gap-6)
```

---

## 4. Component Specifications

### Header Component
```
Height: 60px (py-4 approx)
Position: sticky top-0 z-50
Background: bg-background/95 backdrop-blur-sm
Border: border-b border-border

Layout: Flex items-center justify-between

Logo Section:
  - Icon: 40px square, rounded-lg, gradient bg
  - Icon inside: 20px
  - Text: 24px font-bold
  - Gap: 12px between icon and text

Navigation (hidden < 640px):
  - Font size: 14px
  - Gap: 32px between links
  - Colors: text-muted-foreground hover:text-foreground

CTA Button:
  - Variant: default (primary background)
  - Height: 40px (h-10)
  - Padding: 16px (px-4)
  - Icon size: 16px (w-4 h-4)
  - Icon + text gap: 8px
  - Hidden on mobile: hidden sm:inline
```

### Search Bar
```
Container: 
  - Width: 100%
  - Margin bottom: 48px (mb-12)
  - Position: relative

Input:
  - Height: 48px (h-12)
  - Font size: 16px (text-base)
  - Padding left: 48px (pl-12)
  - Background: bg-card
  - Border: border border-border
  - Border radius: 0.75rem (default)

Icon:
  - Position: absolute left-4 top-1/2 -translate-y-1/2
  - Size: 20px (w-5 h-5)
  - Color: text-muted-foreground
```

### Hero Section
```
Container:
  - Background: gradient to-br from-accent/10 to-primary/10
  - Padding: 32px (p-8 md:p-12)
  - Border radius: rounded-2xl
  - Border: border-border
  - Margin bottom: 64px (mb-16)
  - Max width: 42rem

Heading:
  - Size: 36px mobile / 48px desktop
  - Font weight: 700
  - Line height: tight
  - Margin bottom: 16px (mb-4)

Subheading:
  - Size: 18px (text-lg)
  - Color: text-muted-foreground
  - Margin bottom: 24px (mb-6)

Button Group:
  - Flex with gap-3
  - Flex-wrap on small screens
  - Primary button + outline button

Stats Grid (below divider):
  - Border top: pt-8 border-t border-border
  - Margin top: 32px (mt-8)
  - Grid: 1 column / 3 columns (md:)
  - Gap: 16px (gap-4)
  
  Stat item:
    - Number: 24px (text-2xl) font-bold, color-primary or color-accent
    - Label: 12px (text-sm) text-muted-foreground
```

### Book Card (Large, Currently Reading)
```
Container:
  - Border radius: rounded-2xl
  - Border: border-border
  - Hover: border-primary/40 shadow-lg
  - Transition: duration-300
  - Grid: 3 columns (lg), 2 columns (md), 1 column (sm)
  - Gap: 24px (gap-6)

Cover Area:
  - Aspect ratio: 3/4
  - Background: linear-gradient using book.cover
  - Overlay: Dark gradient at bottom, opacity 0→100 on hover
  
  Heart Button:
    - Position: absolute
    - Bottom: last item in cover (bottom flex positioning)
    - Right: margin-left auto (ml-auto)
    - Margin bottom: 8px (mb-2)
    - Background: bg-white/90 hover:bg-white
    - Padding: 8px (p-2)
    - Border radius: rounded-full
    - Size: 20px (w-5 h-5)
    - Color default: text-gray-400
    - Color favorite: fill-red-500 text-red-500

Card Body:
  - Padding: 16px (p-4)
  
  Title:
    - Font weight: 600 (semibold)
    - Line clamp: 2 (line-clamp-2)
  
  Author:
    - Size: 14px (text-sm)
    - Color: text-muted-foreground
    - Margin bottom: 12px (mb-3)
  
  Progress Bar Container:
    - Flex items-center gap-2
    - Margin bottom: 12px (mb-3)
    
    Bar:
      - Height: 8px (h-2)
      - Background: bg-border
      - Border radius: rounded-full
      - Overflow: hidden
      
      Fill:
        - Background: gradient from-primary to-accent
        - Width: percentage (book.progress)
    
    Percentage:
      - Size: 12px (text-xs)
      - Font weight: 600 (font-medium)
      - Color: text-muted-foreground
      - Min width: fit-content
  
  Last Read:
    - Size: 12px (text-xs)
    - Color: text-muted-foreground
```

### Compact Book Card (Your Library)
```
Container:
  - Border radius: rounded-xl
  - Border: border-border
  - Hover: border-primary/40
  - Transition: duration-300
  - Grid: 4 columns (lg), 2 columns (md), 1 column (sm)
  - Gap: 20px (gap-5)

Cover Area:
  - Aspect ratio: 2/3
  - Background: linear-gradient using book.cover
  - Position: relative
  
  Heart Button:
    - Position: absolute top-2 right-2
    - Padding: 6px (p-1.5)
    - Background: bg-white/80 hover:bg-white
    - Border radius: rounded-lg
    - Size: 16px (w-4 h-4)
  
  Overlay (on hover):
    - Position: absolute bottom-0 left-0 right-0
    - Background: gradient from-black/40 to-transparent
    - Padding: 8px (p-2)
    - Opacity: 0→100 on hover
    - Content: progress percentage in white text

No text below cover - minimalist design
```

### Trending Card
```
Container:
  - Flex items-center gap-4
  - Padding: 16px (p-4)
  - Border: border-border
  - Border radius: rounded-xl
  - Hover: border-primary/30 bg-accent/5
  - Transition: duration-300
  - Grid: 3 columns (md), 1 column (sm)
  - Gap: 16px (gap-4)

Rank Section (right-aligned, min-w-fit):
  - Flex flex-col items-start
  
  Number:
    - Size: 48px (text-3xl)
    - Font weight: 700 (bold)
    - Color: text-primary
  
  Download Count:
    - Size: 12px (text-xs)
    - Color: text-muted-foreground
    - Margin top: 4px (mt-1)

Info Section (flex-1):
  - Title: font-semibold text-foreground
  - Author: text-sm text-muted-foreground
```

### Feature Card
```
Container:
  - Padding: 24px (p-6)
  - Border radius: rounded-xl
  - Border: border-border
  - Background: bg-card
  - Hover: border-primary/40 bg-primary/5
  - Transition: duration-300
  - Grid: 4 columns (lg), 2 columns (md), 1 column (sm)
  - Gap: 24px (gap-6)

Icon Box:
  - Width/Height: 48px (w-12 h-12)
  - Border radius: rounded-lg
  - Background: gradient from-primary/20 to-accent/20
  - Color: text-primary
  - Margin bottom: 16px (mb-4)

Title:
  - Font weight: 600 (semibold)
  - Size: 16px
  - Color: text-foreground
  - Margin bottom: 8px (mb-2)

Description:
  - Size: 14px (text-sm)
  - Color: text-muted-foreground
```

---

## 5. Layout Grid System

### Container Constraints
```
Mobile (< 640px):     Full width - 32px padding = available width
Tablet (640-1024px):  Full width - 48px padding = available width  
Desktop (> 1024px):   1280px max-width centered with 32-48px padding
```

### Grid Patterns
```
6-column grid:
  - Desktop: 4 columns + 1 margin = 5 visible / 1 gap = 6 units
  - Tablet: 2 columns
  - Mobile: 1 column

3-column grid:
  - Desktop: 3 columns
  - Tablet: 2 columns
  - Mobile: 1 column

2-column grid:
  - Desktop: 2 columns
  - Tablet: 2 columns
  - Mobile: 1 column
```

---

## 6. Interactive States

### Button States
```
Default:
  - Background: bg-primary
  - Text: text-primary-foreground
  - Border: none
  - Cursor: pointer

Hover:
  - Background: darker shade (automatic via Tailwind)
  - Transition: duration-200

Active:
  - Opacity: 95%
  - Scale: 98%

Focus:
  - Outline: 2px solid ring color
  - Outline offset: 2px
```

### Card Hover States
```
Book Cards:
  - Border color: border-border → border-primary/40
  - Shadow: none → lg shadow
  - Transition: duration-300

Trending Cards:
  - Border color: border-border → border-primary/30
  - Background: transparent → bg-accent/5
  - Transition: duration-300

Feature Cards:
  - Border color: border-border → border-primary/40
  - Background: bg-card → bg-primary/5
  - Transition: duration-300
```

### Link States
```
Default:
  - Color: text-muted-foreground

Hover:
  - Color: text-foreground
  - Transition: transition-colors (200ms default)
```

### Icon Button (Favorite) States
```
Default:
  - Icon color: text-gray-400
  - Heart fill: none
  - Background: bg-white/90

Hovered:
  - Background: bg-white

Favorited:
  - Icon color: text-red-500
  - Heart fill: fill-red-500
  - Smooth fill animation (CSS transition)

Click animation:
  - Instant color change (no delay)
```

---

## 7. Responsive Behavior

### Breakpoints (Tailwind Standard)
```
sm:  640px   (small devices)
md:  768px   (tablets)
lg:  1024px  (large tablets/small desktops)
xl:  1280px  (desktops)
2xl: 1536px  (large desktops)
```

### Grid Responsiveness
```
Book Cards (Currently Reading):
  sm: grid-cols-1
  md: grid-cols-2
  lg: grid-cols-3

Library Books:
  sm: grid-cols-1
  md: grid-cols-2
  lg: grid-cols-4

Features:
  sm: grid-cols-1
  md: grid-cols-2
  lg: grid-cols-4

Trending:
  sm: grid-cols-1
  md: grid-cols-3
  lg: grid-cols-3
```

### Text Responsiveness
```
Hero Heading:
  sm: text-4xl (36px)
  md: text-5xl (48px)

Navigation:
  sm: hidden
  md: flex
```

---

## 8. Animation & Transitions

### CSS Transitions
```
Duration: 200-300ms
Easing: ease-in-out (default)
Classes: 
  - transition-all
  - transition-colors
  - transition-opacity
```

### Specific Animations
```
Card Hover:
  - Border color shift: 300ms
  - Shadow add: 300ms
  - Combined: transition-all duration-300

Link Hover:
  - Color shift: 200ms
  - Ease: ease-out

No page transitions
No scroll animations
No entrance animations
```

---

## 9. Accessibility Standards

### Color Contrast
```
All text: WCAG AA minimum (4.5:1 for normal text)
Foreground on Background: 15:1 contrast
Foreground on Card: 13:1 contrast
```

### Focus States
```
Visible focus ring on all interactive elements
Color: ring color (primary)
Width: 2px
Offset: 2px from element
```

### Touch Targets
```
Minimum size: 44px × 44px (mobile)
Padding around smaller elements: 8px minimum
```

---

## 10. Performance Guidelines

### No Performance-Impacting Features
```
- No heavy animations or keyframes
- No blur effects beyond backdrop-blur-sm
- No complex gradients or multi-layer effects
- All gradients are CSS (not images)
- Icons are SVG via Lucide
```

### Load Optimization
```
- Book covers use CSS gradients (no image files)
- No large image assets
- Font: Single weight variation per font
- CSS-only styling, minimal JavaScript
```

---

## 11. File Structure Reference

```
/app
  /globals.css          ← Design tokens, color system
  /layout.tsx           ← Page wrapper, metadata
  /page.tsx             ← Main home page
  
/public
  /novelgrab-hero.jpg   ← Preview image
  
/FRONTEND.md           ← Full component documentation
/DESIGN_SPECS.md       ← This file (technical reference)
/README.md             ← User-facing documentation
```

---

## 12. Color Token Usage Reference

### By Component
```
Header:
  - Background: bg-background/95
  - Text: text-foreground
  - Logo gradient: from-primary to-accent
  - Border: border-border

Search Input:
  - Background: bg-card
  - Border: border-border
  - Icon: text-muted-foreground

Hero Section:
  - Background: from-accent/10 to-primary/10
  - Border: border-border
  - Title: text-foreground
  - Subtitle: text-muted-foreground
  - Stat numbers: text-primary or text-accent
  - Stats label: text-muted-foreground

Cards:
  - Background: bg-card
  - Title: text-foreground
  - Author: text-muted-foreground
  - Border: border-border
  - Hover: border-primary/40

Buttons:
  - Primary: bg-primary text-primary-foreground
  - Secondary: border-border text-foreground
  
Footer:
  - Background: bg-card
  - Heading: text-foreground
  - Links: text-muted-foreground hover:text-foreground
  - Border: border-border
```

---

## Summary

This specification document provides complete technical details for implementing or recreating NovelGrab's UI. Use this in conjunction with `FRONTEND.md` for design philosophy and component descriptions.

**Key Principles:**
- Warm, organic color system (not corporate cool)
- Generous spacing signals premium quality
- All colors via CSS custom properties
- All spacing via Tailwind scale
- Responsive mobile-first design
- Smooth, intentional interactions
- Performance-optimized styling
