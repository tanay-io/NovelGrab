# NovelGrab Frontend Documentation - Complete Design System

**Version 2.0 - Fully Audited & Updated**

A comprehensive, production-accurate guide to the NovelGrab book reading application UI. This documentation reflects the actual codebase implementation with 12 sample books, 6 complete pages, 4 reusable components, and a warm organic design system.

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography & Fonts](#typography--fonts)
4. [Core Components](#core-components)
5. [All Pages & Features](#all-pages--features)
6. [Data Structures & Mock Data](#data-structures--mock-data)
7. [Animations & Micro-interactions](#animations--micro-interactions)
8. [Layout Patterns](#layout-patterns)
9. [Responsive Design](#responsive-design)
10. [Implementation Examples](#implementation-examples)
11. [File Structure](#file-structure)
12. [Customization Guide](#customization-guide)

---

## Design Philosophy

### Core Principles

NovelGrab is built on these foundational design principles:

1. **Warm & Organic Aesthetic**: Uses warm terracotta, bronze, and cream tones inspired by premium print culture. Deliberately different from cool-toned generic apps.

2. **Intentional, Hand-Crafted Feel**: Every visual decision signals care and quality. No AI-generated looking gradients, decorative elements, or over-designed features.

3. **Performance-First**: All design choices prioritize speed. Animations are GPU-accelerated, images are CSS gradients, and interactions are instant.

4. **User Control & Customization**: Power readers get complete control over reading experience - fonts, sizes, line heights, backgrounds, scroll speeds.

5. **Light Theme Only**: Deliberately excludes dark mode to maintain warm, inviting aesthetic without visual fatigue.

6. **Accessibility Standard**: WCAG AA compliant with proper contrast, semantic HTML, and keyboard navigation.

---

## Color System

### OKLCH Color Space

All colors use OKLCH (Oklch) for perceptually uniform color spacing:

```css
:root {
  /* Warm Cream Base - nearly white with warm undertones */
  --background: oklch(0.98 0.02 70);
  --foreground: oklch(0.15 0.01 70);
  
  /* Warm Terracotta Primary - for CTAs and important accents */
  --primary: oklch(0.58 0.14 35);
  --primary-foreground: oklch(0.98 0.01 70);
  
  /* Warm Sand Secondary - hover states and soft backgrounds */
  --secondary: oklch(0.88 0.06 50);
  --secondary-foreground: oklch(0.15 0.01 70);
  
  /* Warm Bronze Accent - secondary highlights */
  --accent: oklch(0.54 0.1 40);
  --accent-foreground: oklch(0.98 0.01 70);
  
  /* Muted Taupe - disabled and subtle elements */
  --muted: oklch(0.88 0.04 60);
  --muted-foreground: oklch(0.45 0.02 70);
  
  /* Borders & Inputs */
  --border: oklch(0.92 0.02 70);
  --input: oklch(0.95 0.02 70);
  
  /* Cards */
  --card: oklch(0.99 0.01 70);
  --card-foreground: oklch(0.15 0.01 70);
  
  /* Error/Destructive */
  --destructive: oklch(0.55 0.15 30);
  --destructive-foreground: oklch(0.98 0.01 70);
  
  /* Radius */
  --radius: 0.75rem;
}
```

### Color Usage

| Element | Color | Purpose |
|---------|-------|---------|
| Page backgrounds | background (#F5EFE6) | Main surface |
| Body text | foreground (#2B2B2B) | Primary text |
| CTA buttons | primary (#A67C52) | Important actions |
| Hover backgrounds | secondary (#E0D0B8) | Interactive states |
| Borders | border (#E8E0D0) | Subtle dividers |
| Accents | accent (#936843) | Secondary highlights |
| Disabled text | muted (#6B6B6B) | Inactive elements |
| Cards | card (#FAFAF8) | Content containers |

### Gradient Patterns

**Primary Gradient** (buttons, featured sections):
```css
background: linear-gradient(90deg, #A67C52 0%, #936843 100%);
```

**Book Cover Gradients** (135-degree angle):
```css
gradient: { from: '#C4956C', to: '#A67C52' }
gradient: { from: '#7A5C3D', to: '#6B4C2F' }
gradient: { from: '#8B6F47', to: '#7A5C3D' }
gradient: { from: '#A67C52', to: '#936843' }
```

---

## Typography & Fonts

### Font Stack

```css
@theme inline {
  --font-sans: 'Geist', system-ui, sans-serif;
  --font-serif: 'Geist', Georgia, serif;
  --font-mono: 'Geist Mono', monospace;
}
```

Use `font-serif` class for headings and body text. All fonts are serif to emphasize premium book reading experience.

### Type Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Display | 48-56px | 700 | 1.1 |
| H1 (Hero) | 36-44px | 700 | 1.2 |
| H2 (Section) | 28-32px | 700 | 1.2 |
| H3 (Subtitle) | 24-28px | 600 | 1.3 |
| Body | 16px | 400 | 1.5-1.6 |
| Small | 14px | 400 | 1.4 |
| Tiny | 12px | 400 | 1.4 |

### Usage

- **Headings**: `font-serif font-bold text-3xl sm:text-4xl`
- **Body**: `font-serif text-base leading-relaxed`
- **Labels**: `text-sm font-semibold`
- **Muted**: `text-xs text-muted-foreground`

---

## Core Components

### 1. Header Component

**Location**: `components/Header.tsx`

**Props**: None - static component across all pages

**Features**:
- Sticky positioning at top (`sticky top-0 z-40`)
- Backdrop blur for glass-morphism effect
- Logo: "NG" gradient icon + "NovelGrab" text (hidden on mobile)
- Desktop Navigation: Library, Stats, Favorites (hidden on mobile)
- Search Bar: Appears in desktop nav, toggle on mobile
- Mobile Menu: Hamburger icon toggles full menu with all options
- Menu includes: Library, Stats, Favorites, Settings, Logout
- Icon buttons: Search, Settings, Menu toggle

**Key Features**:
```typescript
// States
const [menuOpen, setMenuOpen] = useState(false);
const [searchActive, setSearchActive] = useState(false);

// Logo gradient: from-primary (#A67C52) to-accent (#936843)
// Search input: bg-secondary with focus:ring-2 focus:ring-primary/50
// Menu animation: animate-in fade-in slide-in-from-top-2 duration-200
```

**Responsive Behavior**:
- Desktop (md+): Full navigation visible
- Mobile: Hamburger menu, search toggle
- All navigation items (Library, Stats, Favorites, Settings) available in mobile menu

### 2. BookCard Component

**Location**: `components/BookCard.tsx`

**Props**:
```typescript
interface BookCardProps {
  book: Book;
  variant?: 'default' | 'compact' | 'featured';
}
```

**Variant 1: Default** (used on home page, library)
```
┌─────────────────────────────┐
│   Cover Gradient (2:3)      │◄─ hover: BookOpen icon overlay
│   Linear 135deg              │
├─────────────────────────────┤
│ Title (font-serif bold)     │
│ Author (muted-foreground)   │
│ ★ Rating (primary) (k)      │
├─────────────────────────────┤
│ Progress bar (0-100%)       │
│ Current / Total Pages       │
├─────────────────────────────┤
│ [❤️ Like] button            │
└─────────────────────────────┘
```

**Default Features**:
- Rounded corners: `rounded-lg`
- Border: `border border-border hover:border-primary/50`
- Favorite button with icon/text toggle
- Progress bar with gradient (primary to accent)
- Page counter below progress
- Hover: BookOpen icon appears over gradient

**Variant 2: Compact** (used in "Recommended For You")
```
┌──────────┐
│          │ 2:3 aspect
│ Gradient │ Title & author
│  Cover   │ overlaid on hover
│          │ Progress bar below
└──────────┘
```

**Compact Features**:
- Image only with text overlay
- Progress bar appears below in thin line
- Minimal spacing
- Used in 6-column grid

**Variant 3: Featured** (could be used for hero sections)
```
┌──────────────────────────┐
│                          │ h-64 height
│  Gradient Background     │ Scale 1.05 on hover
│  (135deg)                │
│                          │
│  Title (white overlay)   │
│  Author (white overlay)  │
│  Rating + Progress       │
└──────────────────────────┘
```

**Featured Features**:
- Large hero card (h-64)
- Text overlay with gradient fade (from-black/60)
- Zoom animation on hover (1.05x)
- Absolute positioning for text

### 3. Reader Component

**Location**: `components/Reader.tsx`

**Props**:
```typescript
interface ReaderProps {
  book: {
    id: string;
    title: string;
    author: string;
    pages: number;
  };
  chapters: Chapter[];
  onClose: () => void;
}
```

**Layout**: Full-screen immersive (`fixed inset-0 z-50`)

**States**:
```typescript
const [currentChapter, setCurrentChapter] = useState(0);
const [fontSize, setFontSize] = useState(16);
const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
const [lineHeight, setLineHeight] = useState(1.6);
const [backgroundColor, setBackgroundColor] = useState<'cream' | 'white' | 'gray'>('cream');
const [showControls, setShowControls] = useState(true);
const [autoScroll, setAutoScroll] = useState(false);
const [scrollSpeed, setScrollSpeed] = useState(5);
```

**Layout Structure**:
```
┌────────────────────────────────┐
│ TOP BAR (fade on timeout)       │ Black/transparent gradient
│ Close | Title | Ch# | Settings │ 5-second auto-hide timeout
├────────────────────────────────┤
│                                │
│   CHAPTER CONTENT              │ Click to toggle controls
│   Max-width: 2xl (prose)       │ Custom bg color (cream/white/gray)
│   Padding: py-16 sm:py-20      │ Font family & size customizable
│   Text: justified, serif/sans   │ Line height: 1.4-2
│                                │
├────────────────────────────────┤
│ BOTTOM BAR (fade)              │ Black/transparent gradient
│ Font Size | Font Family        │ All controls hidden after 5s
│ Line Height | Background       │ Click content to toggle
└────────────────────────────────┘
```

**Background Colors**:
- `cream`: #F5EFE6 (warm off-white)
- `white`: #FFFFFF (bright white)
- `gray`: #F0F0F0 (soft gray)

**Typography Controls**:
- Font Size: 12-24px with ZoomIn/ZoomOut buttons
- Font Family: Toggle between 'serif' and 'sans'
- Line Height: 1.4, 1.6, 1.8, 2.0
- Background: Cream, White, Soft Gray

### 4. StatCard Component

**Location**: `components/StatCard.tsx`

**Props**:
```typescript
interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: number; // percentage change
  highlighted?: boolean;
}
```

**Layout**:
```
┌────────────────────────────┐
│ [Icon] ─────────  [Trend]  │ Icon in bg-primary/10, trend badge
├────────────────────────────┤
│ Label (muted-foreground)   │ Small text, gray
│ VALUE (48px bold)          │ Large text, primary color
│ Sublabel (xs muted)        │ Optional smaller text
└────────────────────────────┘
```

**Variants**:

**Default**:
- `bg-card border-border`
- `hover:border-primary/50`
- Subtle, professional look

**Highlighted**:
- `bg-gradient-to-br from-primary/10 to-accent/10`
- `border-primary/30 shadow-md`
- Eye-catching gradient background

**Trend Indicator**:
- Green badge for positive (+X%)
- Red badge for negative (-X%)
- Always visible when trend prop provided
- Uses: `bg-green-100 text-green-700` or `bg-red-100 text-red-700`

---

## All Pages & Features

### 1. Home Page (`/app/page.tsx`)

**Complete Structure**:

#### Header
- Sticky navigation bar (see Header component)

#### Hero Section
- **Background**: `bg-gradient-to-b from-secondary/50 to-background`
- **Layout**: 2-column grid (md:grid-cols-2) on desktop, stacked on mobile
- **Left Column**:
  - Title: "Enter Any World. Instantly." (font-serif text-4xl sm:text-5xl)
  - Subtitle (text-lg muted-foreground)
  - 3-column grid with metric cards:
    - "50ms" Page Turn (primary)
    - "∞" Offline Reading (accent)
    - "100%" Customizable (primary)
  - CTA Button: "Start Reading" with ArrowRight icon
- **Right Column (desktop only)**:
  - 2×2 grid of book covers from mockBooks[0-4]
  - `aspect-[2/3]` gradients with shadow-lg
  - Hover: `shadow-xl` transition

#### Currently Reading Section (conditional)
- Filters books where `progress > 0 && progress < 100`
- Section title: "Currently Reading"
- "View All" link to `/library`
- 3-column grid (lg:grid-cols-3)
- BookCard components (default variant)
- Responsive: 1 col mobile, 2 md, 3 lg

#### Trending Now Section
- TrendingUp icon + title
- 5 trending books ranked #1-5
- Each item is a horizontal card:
  - Rank number (large, primary color)
  - 16×24px book cover
  - Title + author
  - Star rating + review count
  - Category badge
  - Progress % if reading

#### Recommended For You Section
- BookOpen icon + title
- "Based on your reading history"
- 6-column grid (lg:grid-cols-6)
- BookCard compact variant
- Responsive: 2 cols mobile, 3 md, 6 lg

#### Why NovelGrab Features Grid
- 4 feature cards (2×2 on mobile)
- Each card:
  - Icon in bg-primary/10 box
  - Title (font-serif xl)
  - Description (muted-foreground)
  - Hover: border-primary/50, bg-primary/5 gradient

**Features**:
1. Lightning Fast (Zap icon) - 50ms page turns
2. Infinite Customization (BookOpen) - Fonts, sizes, colors
3. Reading Analytics (TrendingUp) - Track reading habits
4. Community Driven (Users) - Share & discover

#### CTA Footer Section
- Centered text: "Ready to dive in?"
- Gradient button: "Explore Library"
- Background: `bg-gradient-to-b from-secondary/50 to-background`

### 2. Reader Page (`/app/reader/page.tsx`)

**Full-Screen Immersive Reading Experience**

**Layout**: `fixed inset-0 z-50`

**Content Structure**:
- Top gradient bar with controls (5s auto-hide)
  - Close button (X icon)
  - Book title + "by Author"
  - Chapter counter: "Current / Total"
  - Settings button
- Reading area (click to toggle controls)
  - Background color: cream/white/gray (customizable)
  - Max-width: `max-w-2xl` prose
  - Padding: `px-6 py-16 sm:px-8 sm:py-20`
  - Chapter title (centered, serif)
  - Paragraphs with `whitespace-pre-wrap`
  - Text justified, customizable font/size/line-height
- Bottom gradient bar with controls (5s auto-hide)
  - Font size controls with display
  - Font family toggle
  - Line height selector
  - Background color picker

**Key Features**:
- Click anywhere to toggle visibility
- 5-second auto-hide timeout (resets on click)
- Chapter navigation (prev/next buttons)
- 4 background colors: cream, white, soft-gray
- Font family: serif, sans-serif
- Font size: 12-24px range
- Line height: 1.4, 1.6, 1.8, 2.0

### 3. Library Page (`/app/library/page.tsx`)

**Features**:
- **View Mode Toggle**: Grid or List view
- **Sort Options**: Recent, Rating, or Progress
- **Filter by Category**: Dropdown with all unique categories

**Grid View** (default):
- 3-column desktop, 2 tablet, 1 mobile
- BookCard default variant
- Responsive: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Gap: 6 units

**List View** (alternative):
- Shows sorted/filtered books in list format
- Each book displayed with cover, title, author, metadata

**Controls Bar**:
- Left: Filter icon + category dropdown
- Center: Sort icon + sort dropdown (Recent/Rating/Progress)
- Right: View toggle (LayoutGrid vs List icons)

**Counts**:
- Total books: 12 (from mockBooks)
- 8 unique categories: Science Fiction, Mystery, Historical Romance, Thriller, Non-Fiction, Contemporary Fiction, Adventure, Fantasy, Poetry
- Shows: "{count} books in your collection"

### 4. Book Detail Page (`/app/book/[id]/page.tsx`)

**Dynamic Route**: `/book/[id]` with dynamic book lookup

**Layout**: 2-column grid on desktop, stacked on mobile

**Left Column (Cover Section)**:
- Book cover (2:3 aspect, `max-w-sm`)
- Shadow: `shadow-xl`
- Gradient background (book.gradient)
- Rounded corners: `rounded-lg`
- Two buttons below:
  - "Start Reading" (primary gradient)
  - "Download" (secondary bg-secondary)

**Right Column (Book Info)**:
- Category badge: `bg-primary/10 text-primary` pill
- Title: `font-serif text-4xl font-bold`
- Author: Large muted-foreground
- Star rating: `★ {book.rating}` (primary color)
- Review count: `({book.reviews.toLocaleString()})`
- Pages: "{book.pages} pages"
- Reading progress: Shown if `book.progress > 0`
- Action buttons: Like (Heart icon), Share (Share2 icon), Download (Download icon)

**Below Content**:
- "About This Book" section
  - Full description (book.description)
  - Word count, publication info

**Reviews Section**:
- 5 reviewer cards from mockReviews
- Each review:
  - Author name
  - Star rating (1-5)
  - Review text
  - "Helpful" count
  - Publication date

### 5. Stats Page (`/app/stats/page.tsx`)

**Analytics Dashboard**

**Key Metrics Grid** (4-column, responsive):
- **Books Read**: `booksCompleted` / `totalBooks` [HIGHLIGHTED]
- **Total Hours**: `totalHours`
- **Current Streak**: `currentStreak` days
- **Favorite Genre**: `favoriteGenre` [HIGHLIGHTED]

Each StatCard:
- Icon in bg-primary/10 box
- Large value (48px bold)
- Label (muted-foreground)
- Sublabel (optional)
- Trend indicator (if applicable)

**Weekly Reading Chart**:
- Bar chart showing 7 days
- Height based on minutes read that day
- Days: Mon, Tue, Wed, Thu, Fri, Sat, Sun
- Calculates from `readingHistory` array
- Max bar fills chart height

**Additional Stats**:
- This month: `thisMonthMinutes` total
- This week: `thisWeekMinutes` total
- Average rating: `averageRating` (0-5)
- Longest streak: `longestStreak` days
- All-time books: `totalBooks` in library

**Visual Design**:
- Section title: "Reading Analytics"
- Subtitle: "Track your reading journey and discover patterns"
- All cards with hover effects
- Responsive: 1 col mobile, 2 md, 4 lg

### 6. Settings Page (`/app/settings/page.tsx`)

**Layout**: 4-column layout (`lg:grid-cols-4`) with sidebar

**Sidebar Navigation** (lg:col-span-1):
- 5 tabs with icons:
  1. Profile (User icon)
  2. Reader Settings (Palette icon)
  3. Notifications (Bell icon)
  4. Privacy & Security (Lock icon)
  5. Storage (HardDrive icon)
- Active tab: `bg-primary/10 text-primary border-l-2 border-primary`
- Inactive: `text-foreground hover:bg-secondary`

**Content Area** (lg:col-span-3):

#### Profile Tab
- User avatar
- Name: Editable text field
- Email: Editable text field
- Join date: Display-only
- Save button

#### Reader Settings Tab
- **Font Size Slider**: 12-24px
  - Preview: Adjusts text size
  - Display: Shows current size
- **Font Family Toggle**: 'serif' | 'sans-serif' | 'mono'
  - 3-button group selector
- **Line Height Selector**: 1.4 | 1.6 | 1.8 | 2.0
  - 4-button group selector
- **Background Color Picker**: 'cream' | 'white' | 'soft-gray'
  - Color preview boxes
- **Auto-Scroll Toggle**: On/Off switch
- **Scroll Speed Slider**: 1-10 range

#### Notifications Tab
- 4 toggle switches with descriptions:
  1. Reading Recommendations
  2. Streak Reminders
  3. Friend Activity
  4. Review Updates

#### Privacy & Security Tab
- Change Password button
- Profile Visibility dropdown: Public/Private
- Reading History toggle: Show/Hide
- Data export link

#### Storage Tab
- Storage usage bar: (current / total)
- Download management section
- Auto-download toggle
- Clear cache button

**State Management**:
```typescript
const [activeTab, setActiveTab] = useState<
  'profile' | 'reader' | 'notifications' | 'privacy' | 'storage'
>('profile');
```

All settings states managed locally with useState hooks.

---

## Animations & Micro-interactions

**All animations defined in**: `/app/globals.css` (230+ lines of custom animations)

### Keyframe Animations

**fadeIn**: 
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
/* 300ms ease-in-out */
```

**slideInFromTop**:
```css
@keyframes slideInFromTop {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
/* 300ms ease-out */
```

**slideInFromBottom**:
```css
@keyframes slideInFromBottom {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
/* Used in mobile menu */
```

**slideInFromLeft/Right**: Similar patterns for horizontal movement

**scaleIn**:
```css
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

**shimmer**: Loading skeleton animation
```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
/* Creates flowing light effect */
```

**bounce**, **float**, **pulse**: Additional animation variants

### Component-Level Animations

**Header**:
- Mobile menu: `animate-in fade-in slide-in-from-top-2 duration-200`
- Hover effects on nav links

**BookCard (default variant)**:
```css
/* Hover effects */
hover:border-primary/50          /* Border lightens */
transition-all duration-300      /* Smooth transition */
hover:shadow-lg                  /* Box shadow appears */

/* Icon overlay */
group-hover:bg-black/20          /* Dark overlay on hover */
opacity-0 group-hover:opacity-100 /* BookOpen icon fades in */
```

**BookCard (compact variant)**:
- `hover:shadow-xl transition-shadow duration-300`
- Text overlay appears on hover

**BookCard (featured variant)**:
- Hover zoom: `transform: isHovered ? 'scale(1.05)' : 'scale(1)'`
- Transition: `duration-500`

**Reader Controls**:
```typescript
// Auto-hide with 5-second timeout
const timer = setTimeout(() => {
  setShowControls(false);
}, 5000);

// Top/bottom bars fade:
className={`transition-opacity duration-300 ${
  showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
}`}
```

**StatCard**:
- Highlighted variant: gradient background
- Default variant: `hover:border-primary/50`

**Buttons & Links**:
- All hover effects: `transition-colors duration-200`
- Links: muted-foreground → foreground
- Buttons: Scale/shadow changes

### Interactive Patterns

**Favorite Button Interaction**:
```typescript
const [isFavorited, setIsFavorited] = useState(false);

onClick={() => setIsFavorited(!isFavorited)}
// Icon color: isFavorited ? 'fill-primary text-primary' : 'text-muted-foreground'
// Animation: instant fill color change (200ms transition)
```

**Search Bar Focus**:
```css
focus:outline-none
focus:ring-2 focus:ring-primary/50
focus:bg-card
transition-all duration-200
```

**Settings Sidebar Tab Activation**:
```css
/* Active */
bg-primary/10 text-primary border-l-2 border-primary

/* Inactive */
text-foreground hover:bg-secondary border-l-2 border-transparent
transition-colors
```

### Hover Lift Effect

Applied to cards and interactive elements:
```css
.hover-lift {
  transition: all 0.3s ease-out;
}

.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
```

### Animation Utilities (globals.css)

```css
.animate-fadeIn
.animate-slideInFromTop
.animate-slideInFromBottom
.animate-slideInFromLeft
.animate-slideInFromRight
.animate-scaleIn
.animate-shimmer
.animate-float
.animate-glow
.animate-bounce
.spring-bounce              /* cubic-bezier(0.68, -0.55, 0.265, 1.55) */
.hover-lift                 /* Combines transform + shadow */
.hover-scale                /* 1.05x on hover */
.hover-glow                 /* 20px primary color shadow */
.transition-all-smooth      /* 300ms cubic-bezier */
.page-enter                 /* fadeIn + slideInFromBottom */
.skeleton                   /* Shimmer loading effect */
.text-gradient              /* Gradient text clip */
.card-hover                 /* Combines lift + glow */
.button-hover               /* Scale + smooth transition */
.scroll-smooth              /* Smooth scroll behavior */
```

### Performance Notes

- All animations use GPU-accelerated properties (transform, opacity)
- No animations on slow properties (width, height)
- Transitions typically 200-300ms for responsiveness
- Auto-hide uses setTimeout cleanup for memory efficiency
- Mobile menu uses Tailwind's built-in animation utils

---

## Layout Patterns

### Grid Systems

**Book Grid**:
```css
grid-cols-1 md:grid-cols-2 lg:grid-cols-3
gap-6
```

**Feature Grid**:
```css
grid-cols-1 md:grid-cols-2 lg:grid-cols-4
gap-6
```

**Stat Grid**:
```css
grid-cols-1 md:grid-cols-2 lg:grid-cols-4
gap-6
```

**Compact Books**:
```css
grid-cols-2 sm:grid-cols-3 lg:grid-cols-6
gap-4
```

### Container

```css
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
```
- 1280px max width
- Centered with auto margins
- Responsive padding (16px → 24px → 32px)

### Flexbox Patterns

```css
/* Sidebar + Content */
grid lg:grid-cols-4 gap-8
lg:col-span-1    /* Sidebar */
lg:col-span-3    /* Content */

/* Space Between */
flex items-center justify-between

/* Column Stack */
flex flex-col gap-4
```

### Spacing System (Tailwind 4px base)

```
p-4 = 16px
p-6 = 24px
p-8 = 32px
py-12 = 48px
py-16 = 64px
py-20 = 80px

gap-4 = 16px
gap-6 = 24px
gap-8 = 32px
```

---

## Responsive Design

### Breakpoints

```css
sm: 640px    (Mobile landscape)
md: 768px    (Tablet)
lg: 1024px   (Desktop)
xl: 1280px   (Large desktop)
2xl: 1536px  (Ultra-wide)
```

### Mobile-First Pattern

```tsx
/* Start with mobile, enhance up */
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
  {/* 1 col on mobile, 2 on tablet, 4 on desktop */}
</div>

<div className="hidden md:block">
  {/* Hidden on mobile, visible on tablet+ */}
</div>

<h1 className="text-2xl md:text-3xl lg:text-4xl">
  {/* Size grows with viewport */}
</h1>
```

### Navigation Responsiveness

```typescript
// Header.tsx
const [menuOpen, setMenuOpen] = useState(false);

return (
  <>
    {/* Desktop nav: hidden sm:flex */}
    <nav className="hidden md:flex">
    
    {/* Mobile nav: flex md:hidden */}
    <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden">
    
    {/* Mobile menu: animate-in fade-in */}
    {menuOpen && (
      <div className="md:hidden animate-in fade-in">
    )}
  </>
);
```

---

## Data Structures & Mock Data

### Types (lib/types.ts)

**Book Interface**:
```typescript
export interface Book {
  id: string;                    // Unique identifier ('1', '2', etc.)
  title: string;                 // Book title
  author: string;                // Author name
  cover: string;                 // Image path (not currently used - uses gradient)
  description: string;           // Full description text
  rating: number;                // 0-5 star rating
  reviews: number;               // Total review count
  pages: number;                 // Total page count
  category: string;              // Genre/category
  progress: number;              // 0-100 completion percentage
  currentPage: number;           // Current page being read
  addedDate: string;             // ISO date string ('2024-01-15')
  gradient: {
    from: string;                // Start hex color (#A67C52)
    to: string;                  // End hex color (#8B6F47)
  };
}
```

**Chapter Interface**:
```typescript
export interface Chapter {
  id: string;                    // Unique chapter ID
  number: number;                // Chapter number
  title: string;                 // Chapter title
  content: string;               // Full chapter text (pre-formatted)
  pageCount: number;             // Estimated pages in chapter
  duration: number;              // Estimated reading time in minutes
}
```

**Review Interface**:
```typescript
export interface Review {
  id: string;                    // Unique review ID
  author: string;                // Reviewer name
  rating: number;                // 0-5 star rating
  text: string;                  // Review text
  date: string;                  // ISO date
  helpful: number;               // Number of helpful votes
}
```

**ReadingSession Interface**:
```typescript
export interface ReadingSession {
  bookId: string;
  date: string;                  // ISO date
  duration: number;              // Minutes read in session
  pagesRead: number;             // Pages completed in session
}
```

**UserSettings Interface**:
```typescript
export interface UserSettings {
  fontSize: number;              // 12-24px range
  fontFamily: 'serif' | 'sans-serif' | 'mono';
  lineHeight: 1.4 | 1.6 | 1.8 | 2;
  backgroundColor: 'cream' | 'white' | 'soft-gray';
  theme: 'light';                // Light theme only
  autoScroll: boolean;           // Enable auto-scroll in reader
  scrollSpeed: number;           // 1-10 range
}
```

**ReadingStats Interface**:
```typescript
export interface ReadingStats {
  totalBooks: number;            // 47
  booksCompleted: number;        // 39
  totalHours: number;            // 1245
  currentStreak: number;         // Days reading consecutively
  longestStreak: number;         // 45 days
  thisWeekMinutes: number;       // 487
  thisMonthMinutes: number;      // 1823
  favoriteGenre: string;         // 'Science Fiction'
  averageRating: number;         // 4.6
}
```

**UserProfile Interface**:
```typescript
export interface UserProfile {
  id: string;
  name: string;                  // 'Alex Reader'
  email: string;
  avatar: string;                // URL to avatar image
  joinDate: string;              // ISO date
  settings: UserSettings;
  stats: ReadingStats;
  favoriteBooks: string[];       // Array of book IDs
  readingHistory: ReadingSession[];
}
```

### Mock Data (lib/mock-data.ts)

**mockBooks Array (12 total)**:
1. The Quantum Garden - Elena Miranova (Sci-Fi) - Rating 4.8 - 480 pages
2. Shadows of Tomorrow - Marcus Chen (Mystery) - Rating 4.6 - 392 pages
3. The Gardener's Daughter - Sofia Rosetti (Historical Romance) - Rating 4.9 - 528 pages
4. Echoes in the Void - James Whitmore (Sci-Fi) - Rating 4.5 - 684 pages
5. The Last Interview - David Hartley (Thriller) - Rating 4.7 - 312 pages
6. Beneath the Canopy - Dr. Rebecca Santos (Non-Fiction) - Rating 4.4 - 432 pages
7. The Midnight Library - Nora James (Contemporary) - Rating 4.8 - 368 pages
8. Crimson Tides - Isla Maritime (Adventure) - Rating 4.6 - 456 pages
9. The Memory Keeper - Thomas Whitley (Fantasy) - Rating 4.7 - 320 pages
10. Lost Frequencies - Alex Patterson (Sci-Fi) - Rating 4.5 - 398 pages
11. The Poet's Testament - Lady Catherine Holmes (Poetry) - Rating 4.6 - 256 pages
12. Tomorrow's Revolution - Professor Michael Zhang (Non-Fiction) - Rating 4.3 - 384 pages

**Each book includes**:
- Unique warm gradient (from/to hex colors)
- Full description (150+ words)
- Progress (0-100%)
- Current page
- Category (9 unique genres)

**mockReviews Array (5 reviews)**:
- 5-star: Sarah Mitchell, Elena Voss, Nina Kovalski
- 4-star: James Rivera, Marcus Webb
- Each includes helpful vote count (89-678)

**mockReadingStats Object**:
- Total books: 47
- Completed: 39
- Hours: 1245
- Current streak: 28 days
- Longest streak: 45 days
- This week: 487 minutes
- This month: 1823 minutes
- Favorite genre: Science Fiction
- Average rating: 4.6 ⭐

**mockUserProfile Object**:
- Name: 'Alex Reader'
- Email: 'alex@novelgrab.app'
- Avatar: DiceBear API (dynamic based on seed)
- Join date: '2023-08-15'
- Favorite books: ['1', '3', '7', '9']
- Reading history: 5 recent sessions

**mockChapters Array (2 chapters)**:
- Chapter 1: "The Discovery" (12 pages, 22 min)
- Chapter 2: "Quantum Resonance" (11 pages, 20 min)
- Full readable content with proper formatting

**trendingBooks Array**:
- Top 5 books from mockBooks (books #1, #3, #4, #7, #5)
- Ranked by popularity/downloads

**recommendedBooks Array**:
- 6 recommended books based on reading history
- Books: #1, #3, #7, #10, #8, #5
- Used in "Recommended For You" section on home

---

## Implementation Examples

### Creating a Book Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {books.map((book) => (
    <BookCard key={book.id} book={book} variant="default" />
  ))}
</div>
```

### Adding Responsive Padding

```tsx
<div className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
  Content here
</div>
```

### Using Color System

```tsx
/* Text */
<p className="text-foreground">Body text</p>
<p className="text-muted-foreground">Subtle text</p>

/* Background */
<div className="bg-card border border-border">Card</div>
<div className="bg-secondary">Hover background</div>

/* Buttons */
<button className="bg-primary text-primary-foreground">CTA</button>
<button className="border border-border hover:bg-secondary">Secondary</button>

/* Gradients */
<div className="bg-gradient-to-r from-primary to-accent">
  {/* Gradient button/hero */}
</div>
```

### Creating Custom Animations

```tsx
<div className="animate-fadeIn">Fades in</div>
<div className="animate-slideInFromBottom">Slides from bottom</div>
<div className="hover-lift hover-glow">Lifts and glows on hover</div>
<div className="spring-bounce">Physics-based bounce</div>
```

### Form & Input Pattern

```tsx
<div className="flex items-center gap-2">
  <label className="text-sm font-semibold text-foreground">
    Label
  </label>
  <input
    type="text"
    className="px-4 py-2 rounded-lg bg-secondary border border-border
               text-foreground focus:outline-none focus:ring-2
               focus:ring-primary/50"
    placeholder="Placeholder"
  />
</div>
```

### Responsive Typography

```tsx
<h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold">
  Title scales with viewport
</h1>

<h2 className="font-serif text-xl md:text-2xl font-bold">
  Section heading
</h2>

<p className="text-sm md:text-base leading-relaxed">
  Body text with comfortable line height
</p>
```

---

## File Structure

```
/app
  /layout.tsx                 # Root with metadata
  /page.tsx                   # Home page
  /reader
    /page.tsx                 # Full-screen reader
  /library
    /page.tsx                 # Book library with filters
  /book/[id]
    /page.tsx                 # Individual book details
  /stats
    /page.tsx                 # Reading analytics
  /settings
    /page.tsx                 # User settings
  /globals.css                # Global styles + animations

/components
  /Header.tsx                 # Sticky navigation
  /BookCard.tsx               # Book display (3 variants)
  /Reader.tsx                 # Full-screen reading
  /StatCard.tsx               # Metric display

/lib
  /types.ts                   # TypeScript interfaces
  /mock-data.ts               # Sample books & data
  /utils.ts                   # Helper functions
```

---

## Customization Guide

### Change Primary Color

Edit `globals.css`:
```css
:root {
  --primary: oklch(0.58 0.14 35);  /* Change hue (35 → another value) */
  --accent: oklch(0.54 0.1 40);
}
```

Then update all uses of `from-primary to-accent` in components.

### Add New Page

1. Create `/app/new-page/page.tsx`
2. Import Header component
3. Follow layout pattern with `max-w-7xl mx-auto`
4. Use existing color system
5. Follow typography scale

### Modify Reader Font Options

Edit `Reader.tsx`:
```typescript
const fontFamilies = ['serif', 'sans', 'mono']; // Add option
const linHeights = [1.4, 1.6, 1.8, 2, 2.2];    // Add value
const backgrounds = ['cream', 'white', 'gray', 'blue']; // Add color
```

---

## Performance Notes

1. **CSS Gradients**: All book covers use CSS, not images
2. **GPU Acceleration**: Animations use transform/opacity only
3. **No Heavy JS**: Minimal state management
4. **Lazy Load Images**: Consider for actual implementations
5. **Font Loading**: Serif font preloaded in head

---

**Version**: 2.0 - Complete App  
**Last Updated**: March 2024  
**Complete**: All 6 pages + 4 components + animations + documentation
