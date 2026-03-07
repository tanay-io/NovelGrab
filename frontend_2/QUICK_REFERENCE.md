# NovelGrab Quick Reference Card

**Last Updated**: March 2024 | **Version**: 2.0

---

## 📖 Find What You Need

### Colors
**File**: `COLOR_PALETTE.md` or `app/globals.css`
- Primary: `#A67C52` (terracotta)
- Accent: `#936843` (bronze)
- Secondary: `#E0D0B8` (sand)
- Background: `#F5EFE6` (cream)

### Components
**File**: `FRONTEND.md` → Core Components
| Component | Location | Variants | Purpose |
|-----------|----------|----------|---------|
| Header | `/components/Header.tsx` | 1 | Navigation, search, mobile menu |
| BookCard | `/components/BookCard.tsx` | 3 (default, compact, featured) | Display books |
| Reader | `/components/Reader.tsx` | 1 | Full-screen reading |
| StatCard | `/components/StatCard.tsx` | 2 (default, highlighted) | Display metrics |

### Pages
**File**: `FRONTEND.md` → All Pages & Features
| Page | Route | Location | Purpose |
|------|-------|----------|---------|
| Home | `/` | `/app/page.tsx` | Browse, trending, recommendations |
| Reader | `/reader` | `/app/reader/page.tsx` | Immersive reading |
| Library | `/library` | `/app/library/page.tsx` | Filter, sort books |
| Book Detail | `/book/[id]` | `/app/book/[id]/page.tsx` | Book info & reviews |
| Stats | `/stats` | `/app/stats/page.tsx` | Reading analytics |
| Settings | `/settings` | `/app/settings/page.tsx` | User preferences |

### Data & Types
**File**: `lib/types.ts` and `lib/mock-data.ts`
- 12 sample books
- 5 sample reviews
- User profile + reading stats
- 2 sample chapters
- All TypeScript interfaces

### Styles & Animations
**File**: `app/globals.css`
- 8 color tokens (OKLCH format)
- 40+ animation classes
- Typography scale
- Spacing system

---

## 🎨 Design System

### Color Palette (OKLCH)
```
Primary:    oklch(0.58 0.14 35)   #A67C52
Accent:     oklch(0.54 0.1 40)    #936843
Secondary:  oklch(0.88 0.06 50)   #E0D0B8
Background: oklch(0.98 0.02 70)   #F5EFE6
Foreground: oklch(0.15 0.01 70)   #2B2B2B
Border:     oklch(0.92 0.02 70)   #E8E0D0
Muted:      oklch(0.88 0.04 60)   #D4CCC0
```

### Typography
- Font: Geist (sans-serif)
- Headlines: Bold (600-700)
- Body: Regular (400)
- Line height: 1.5-1.6
- Scale: 12px → 56px

### Spacing
- Base unit: 4px
- Gap sizes: 4, 8, 12, 16, 20, 24, 32, 48, 64
- Padding: Use Tailwind scale (p-4, p-6, p-8)
- Container max-width: 1280px

### Responsive
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## 🧩 Component Quick Facts

### Header
- **Sticky**: `sticky top-0 z-40`
- **Mobile menu**: Hamburger button
- **Search**: Appears in nav (desktop) / toggle (mobile)
- **Navigation items**: Library, Stats, Favorites
- **Mobile menu items**: + Settings, Logout
- **Logo**: Gradient icon "NG" + text "NovelGrab"

### BookCard Variants
**Default**: Cover (2:3) + Title + Author + Rating + Progress bar + Like button  
**Compact**: Cover only + Progress bar below  
**Featured**: Large hero (h-64) + Text overlay + Zoom on hover

### Reader
- **Full-screen**: `fixed inset-0 z-50`
- **Controls**: Auto-hide after 5 seconds
- **Settings**: Font size, family, line height, background, scroll
- **Backgrounds**: cream (#F5EFE6), white, gray (#F0F0F0)
- **Font sizes**: 12-24px
- **Line heights**: 1.4, 1.6, 1.8, 2.0

### StatCard
- **Default**: White card with hover effect
- **Highlighted**: Gradient background (primary/10 to accent/10)
- **Trend**: Green badge (+%), red badge (%)
- **Icon**: Inside bg-primary/10 box
- **Size**: Large value (48px), label, sublabel

---

## 📄 Page Quick Reference

### Home (/)
1. Header (sticky)
2. Hero section (2-col grid, 3 metric cards, CTA button)
3. Currently Reading (3-col grid, filtered books)
4. Trending Now (5 ranked books)
5. Recommended For You (6-col compact grid)
6. Why NovelGrab (4-col feature grid)
7. CTA Footer

### Reader (/reader)
- Full-screen immersive reading
- Click to toggle controls
- 7 customizable settings
- Chapter navigation
- Auto-hide after 5 seconds

### Library (/library)
- Filter by category (dropdown)
- Sort by: Recent, Rating, Progress
- View mode: Grid or List
- Responsive grid (1-4 columns)
- Book count display

### Book Detail (/book/[id])
- 2-col grid (cover + info)
- Cover with gradient background
- Start Reading + Download buttons
- Metadata: title, author, rating, pages, category
- Reviews section (5 reviews)
- Like, Share, Download actions

### Stats (/stats)
- 4-col metric grid (highlighted: Books Read, Favorite Genre)
- Weekly reading chart
- Summary stats
- Responsive: 1→4 columns

### Settings (/settings)
- 5-tab sidebar (Profile, Reader, Notifications, Privacy, Storage)
- Profile: Name, email, join date
- Reader: Font, size, line height, background, scroll
- Notifications: 4 toggles
- Privacy: Password, visibility, history
- Storage: Usage, downloads, cache

---

## 🎬 Animations

**Common animations**:
- `fadeIn`: 300ms opacity change
- `slideInFromBottom`: 300ms slide + fade
- `slideInFromTop/Left/Right`: Directional variations
- `scaleIn`: 300ms scale + fade
- `hover-lift`: -4px transform + shadow
- `hover-scale`: 1.05x scale
- `spring-bounce`: Physics-based cubic-bezier

**Duration**: 200-500ms  
**Easing**: ease-out, cubic-bezier  
**GPU optimized**: Only transform + opacity

---

## 📊 Mock Data

### Books (12 total)
- IDs: '1' through '12'
- Ratings: 4.3-4.9 ⭐
- Reviews: 756-5023 count
- Pages: 256-684
- Progress: 0-100% (varies per book)
- Categories: 9 genres
- Gradients: Warm colors (135° angle)

### User Profile
- Name: 'Alex Reader'
- Books completed: 39 of 47
- Total reading: 1245 hours
- Current streak: 28 days
- This month: 1823 minutes
- Average rating: 4.6 ⭐

### Reviews
- 5 total reviews
- Ratings: Mix of 4-5 stars
- Helpful counts: 89-678

---

## 📁 File Structure

```
/app
  /page.tsx              # Home
  /layout.tsx            # Root layout
  /globals.css           # Styles + animations
  /reader/page.tsx       # Reader (full-screen)
  /library/page.tsx      # Library (filter, sort)
  /book/[id]/page.tsx    # Book detail
  /stats/page.tsx        # Stats dashboard
  /settings/page.tsx     # Settings (5 tabs)

/components
  /Header.tsx            # Navigation
  /BookCard.tsx          # Book display (3 variants)
  /Reader.tsx            # Reading experience
  /StatCard.tsx          # Metrics display

/lib
  /types.ts              # TypeScript interfaces
  /mock-data.ts          # 12 books + user data
  /utils.ts              # Utilities
```

---

## 🔧 Common Tasks

### Change Primary Color
1. Edit: `app/globals.css`
2. Change: `--primary: oklch(...)`
3. Update: All `from-primary to-accent` in components

### Add New Book
1. Edit: `lib/mock-data.ts`
2. Add to: `mockBooks` array
3. Include: All Book interface properties
4. Add gradient colors

### Customize Reader
1. Edit: `components/Reader.tsx`
2. Modify: `bgColors` object for backgrounds
3. Add: Font options to state
4. Update: Control panel UI

### Modify Settings Tab
1. Edit: `app/settings/page.tsx`
2. Add tab to: `tabs` array
3. Create: New conditional UI block
4. Add state: for new settings

---

## 📚 Documentation Files

| File | Purpose | Read Time |
|------|---------|-----------|
| FRONTEND.md | Complete design system | 20 min |
| AUDIT_REPORT.md | What was verified | 10 min |
| MD_UPDATE_SUMMARY.md | What changed | 10 min |
| QUICK_REFERENCE.md | This file | 5 min |
| DESIGN_SPECS.md | Technical specs | 15 min |
| COLOR_PALETTE.md | Colors & gradients | 5 min |
| DESIGN_TOKENS.md | All design tokens | 10 min |

---

## 🚀 Quick Start

1. **Read**: FRONTEND.md (20 minutes)
2. **Explore**: Run `npm run dev` and visit each page
3. **Check**: `lib/mock-data.ts` for data structure
4. **Modify**: Copy and customize any component
5. **Deploy**: `vercel deploy`

---

## ✅ Verification

All components verified:
- ✅ Header (mobile menu, responsive)
- ✅ BookCard (3 variants working)
- ✅ Reader (auto-hide, customization)
- ✅ StatCard (variants, trends)

All pages verified:
- ✅ Home (6 sections complete)
- ✅ Reader (full-screen immersive)
- ✅ Library (filter/sort functional)
- ✅ Book Detail (dynamic routing)
- ✅ Stats (charts, metrics)
- ✅ Settings (5 tabs complete)

All data verified:
- ✅ 12 books with complete data
- ✅ User profile with stats
- ✅ Reviews and chapters
- ✅ Mock data comprehensive

---

**Version**: 2.0 | **Status**: ✅ Production Ready | **Last Audit**: March 2024
