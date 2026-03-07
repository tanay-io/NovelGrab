# NovelGrab Developer Guide

Quick reference for extending and maintaining the NovelGrab UI.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Open http://localhost:3000
```

## File Organization

```
/app
  globals.css          ← All design tokens and colors - EDIT HERE for theme changes
  layout.tsx          ← Page metadata and fonts - EDIT HERE for SEO/title
  page.tsx            ← Main page component - EDIT HERE for content

/components/ui
  button.tsx
  input.tsx
  [all shadcn components]

FRONTEND.md           ← Read this for design system details
DESIGN_SPECS.md       ← Read this for pixel-perfect specifications
README.md             ← Read this for overview
```

## Common Tasks

### Change Primary Color
1. Open `/app/globals.css`
2. Find `:root` section
3. Change `--primary: oklch(0.58 0.14 35);`
4. Use OKLCH format: `oklch(lightness chroma hue)`

Example:
```css
/* Original terracotta */
--primary: oklch(0.58 0.14 35);

/* Change to teal */
--primary: oklch(0.58 0.14 190);
```

### Add New Book to Library
1. Open `/app/page.tsx`
2. Find `SAMPLE_BOOKS` array
3. Add object:
```javascript
{
  id: 7,
  title: 'Book Title',
  author: 'Author Name',
  cover: 'linear-gradient(135deg, #color1 0%, #color2 100%)',
  progress: 50,
  lastRead: 'Today',
  isFavorite: false,
}
```

### Change Book Cover Gradient
Use 135-degree angle with 2 warm colors:
```javascript
cover: 'linear-gradient(135deg, #d4a574 0%, #c28f5c 100%)'
//     angle ----------- color1 ---- color2 -----
```

Warm color suggestions:
- Light tan: #e8d4b0, #d4c5a0, #c8b89a
- Terracotta: #d4a574, #c28f5c, #b8794a
- Brown: #a8704a, #8f5f3a, #7a4e2e
- Bronze: #9f7239, #8f6a2d, #7a5924

### Modify Section Spacing
Edit grid gap and padding in `/app/page.tsx`:

```jsx
// Current: 24px gap
<div className="grid grid-cols-4 gap-6">

// Change to 20px gap
<div className="grid grid-cols-4 gap-5">

// Or 32px gap
<div className="grid grid-cols-4 gap-8">
```

Tailwind spacing map:
- `gap-3` = 12px
- `gap-4` = 16px
- `gap-5` = 20px
- `gap-6` = 24px
- `gap-8` = 32px

### Adjust Section Width
Edit container max-width in `/app/page.tsx`:

```jsx
// Current: 1280px
<main className="max-w-7xl mx-auto px-4">

// Change to 1536px
<main className="max-w-6xl mx-auto px-4">

// Or 1024px (smaller)
<main className="max-w-5xl mx-auto px-4">
```

### Hide Components on Mobile
Use responsive classes:

```jsx
{/* Hidden on mobile, shown on tablet+ */}
<nav className="hidden md:flex">

{/* Shown on mobile, hidden on tablet+ */}
<button className="md:hidden">Menu</button>

{/* Show different layouts */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
```

### Change Button Text/Icon
Edit in `/app/page.tsx`:

```jsx
{/* Original */}
<Button variant="default" className="gap-2">
  <Download className="w-4 h-4" />
  <span className="hidden sm:inline">Get Books</span>
</Button>

{/* Modified */}
<Button variant="default" className="gap-2">
  <Zap className="w-4 h-4" />
  <span className="hidden sm:inline">Start Reading</span>
</Button>
```

Available icons from Lucide React:
- Heart, Download, Search, Zap, Book, TrendingUp
- Plus, Minus, X, Menu, Settings, User, LogOut, etc.

### Modify Typography
Typography uses Tailwind size classes:

```jsx
{/* H1 - 36px mobile, 48px desktop */}
<h1 className="text-4xl md:text-5xl font-bold">

{/* H2 - 24px */}
<h3 className="text-2xl font-bold">

{/* Body - 14px */}
<p className="text-base">

{/* Small - 12px */}
<p className="text-sm">
```

Size mapping:
- `text-sm` = 12px (small)
- `text-base` = 14px (body)
- `text-lg` = 18px (large)
- `text-xl` = 20px
- `text-2xl` = 24px (h3)
- `text-3xl` = 30px
- `text-4xl` = 36px (h1 mobile)
- `text-5xl` = 48px (h1 desktop)

### Add New Section
Template:

```jsx
{/* Your section name */}
<section className="mb-16">
  <h3 className="text-2xl font-bold text-foreground mb-6">Section Title</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {/* Content items here */}
  </div>
</section>
```

## Styling Conventions

### Always Use Design Tokens
✅ **Do this:**
```jsx
<div className="bg-card border-border text-foreground">
<button className="bg-primary text-primary-foreground">
```

❌ **Don't do this:**
```jsx
<div className="bg-white border-gray-300 text-black">
<button className="bg-orange-500">
```

### Color Classes to Use
- Backgrounds: `bg-background`, `bg-card`, `bg-primary`, `bg-accent`, `bg-secondary`
- Text: `text-foreground`, `text-muted-foreground`, `text-primary`, `text-accent`
- Borders: `border-border`, `border-primary/40`
- Hover: `hover:border-primary/40`, `hover:bg-accent/5`

### Spacing Classes
- Padding: `p-2` (8px), `p-4` (16px), `p-6` (24px), `p-8` (32px)
- Margin: `mb-6` (24px), `mb-12` (48px), `mb-16` (64px)
- Gap: `gap-4` (16px), `gap-6` (24px)

### Border Radius
- Small: `rounded-lg` (0.5rem)
- Medium: `rounded-xl` (0.75rem) - DEFAULT
- Large: `rounded-2xl` (1rem)
- Full: `rounded-full` (100%)

## Component Props Reference

### Button Component
```jsx
<Button variant="default">         {/* Primary button */}
<Button variant="outline">         {/* Secondary button */}
<Button variant="ghost">           {/* Minimal button */}
<Button disabled>Disabled</Button> {/* Disabled state */}
<Button className="gap-2">         {/* Add icon spacing */}
```

### Input Component
```jsx
<Input 
  placeholder="Search..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="h-12 text-base"
/>
```

## State Management

Current state in `/app/page.tsx`:

```javascript
// Favorite toggle state
const [favorites, setFavorites] = useState<number[]>(
  SAMPLE_BOOKS.filter(b => b.isFavorite).map(b => b.id)
);

// Search query state
const [searchQuery, setSearchQuery] = useState('');

// Toggle favorite function
const toggleFavorite = (bookId: number) => {
  setFavorites(prev => 
    prev.includes(bookId) 
      ? prev.filter(id => id !== bookId)
      : [...prev, bookId]
  );
};
```

To add new state:
```javascript
const [newState, setNewState] = useState(initialValue);
```

## Customization Recipes

### Recipe: Change Accent Color from Bronze to Green
```css
/* In /app/globals.css, find :root and change: */
--accent: oklch(0.54 0.1 40);           /* Bronze */
--accent: oklch(0.65 0.15 140);         /* Green - CHANGE TO THIS */
```

### Recipe: Make Cards More/Less Rounded
```jsx
/* In /app/page.tsx, change rounded-xl or rounded-2xl: */
className="rounded-2xl"  /* Large round (16px) */
className="rounded-xl"   /* Medium round (12px) - DEFAULT */
className="rounded-lg"   /* Small round (8px) */
```

### Recipe: Add Card Shadow on Hover
```jsx
{/* Current */}
<div className="border border-border hover:border-primary/40">

{/* Add shadow */}
<div className="border border-border hover:border-primary/40 hover:shadow-lg">
```

### Recipe: Increase Page Padding
```jsx
{/* Current: px-4 md:px-6 lg:px-8 */}
<main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

{/* More padding */}
<main className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12">
```

### Recipe: Add More Spacing Between Sections
```jsx
{/* Current: mb-16 (64px) */}
<section className="mb-16">

{/* Add more: mb-20 (80px) */}
<section className="mb-20">
```

## Testing Your Changes

1. **Visual Check**: 
   - Check mobile (< 640px) - single column
   - Check tablet (640-1024px) - 2 columns
   - Check desktop (> 1024px) - 3-4 columns

2. **Color Check**:
   - Verify all text is readable on new background
   - Check hover states are visible
   - Ensure links are obvious

3. **Spacing Check**:
   - Cards should have breathing room
   - Text shouldn't feel cramped
   - Gap between items should be consistent

4. **Interactive Check**:
   - Hover effects work smoothly
   - Buttons are clickable (44px+ target)
   - Favorites toggle works
   - Search input is usable

## Deployment

### To Vercel
```bash
# Push to GitHub (if connected)
git add .
git commit -m "Update NovelGrab design"
git push

# Or use Vercel CLI
vercel deploy
```

### To NPM/Package
Not applicable - this is a UI demo, not a package.

## Troubleshooting

### Colors look wrong
- Check `/app/globals.css` for color token definitions
- Verify OKLCH values are correct
- Clear browser cache and rebuild

### Layout is broken on mobile
- Check responsive classes: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Verify padding with `px-4 md:px-6 lg:px-8`
- Use `hidden sm:flex` to hide on mobile

### Favorites not toggling
- Check state in `/app/page.tsx`
- Verify `toggleFavorite` function is called on click
- Check browser console for JavaScript errors

### Fonts look different
- Verify `geist` font is loaded in `/app/layout.tsx`
- Check global styles in `/app/globals.css`
- May need to run `npm install` again

## Performance Tips

- Keep animations to 300ms or less
- Use CSS transitions, not JavaScript animations
- Avoid heavy component re-renders
- Use `'use client'` at top of interactive components
- Lazy load images if adding them (use Next.js Image component)

## Resources

- **Tailwind CSS**: https://tailwindcss.com/
- **Lucide Icons**: https://lucide.dev/
- **shadcn/ui**: https://ui.shadcn.com/
- **Next.js**: https://nextjs.org/
- **OKLCH Color**: https://oklch.com/

## Further Customization

For extensive changes, refer to:
1. **FRONTEND.md** - Full design documentation
2. **DESIGN_SPECS.md** - Pixel-perfect specifications
3. **README.md** - Project overview

## Questions?

This guide covers common tasks. For comprehensive design details, always check `FRONTEND.md` first - it contains complete specifications for every component.
