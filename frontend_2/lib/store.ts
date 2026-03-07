import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NovelResult, NovelInfo, ReadingMode } from "./types";

interface ReaderSettings {
  fontSize: number;
  fontFamily: "serif" | "sans-serif" | "mono";
  lineHeight: number;
  readingMode: ReadingMode;
  backgroundColor: "cream" | "white" | "gray" | "dark";
}

interface ReadingProgress {
  /** slug -> { chapterIndex, scrollPosition } */
  [slug: string]: {
    chapterIndex: number;
    scrollPos: number;
    lastRead: string;
  };
}

interface FavoritesMap {
  /** slug -> NovelResult */
  [slug: string]: NovelResult;
}

interface AppState {
  // Reader settings (persisted)
  readerSettings: ReaderSettings;
  setReaderSettings: (s: Partial<ReaderSettings>) => void;

  // Reading progress (persisted)
  progress: ReadingProgress;
  setProgress: (slug: string, chapterIndex: number, scrollPos?: number) => void;

  // Favorites (persisted)
  favorites: FavoritesMap;
  toggleFavorite: (novel: NovelResult) => void;
  isFavorite: (slug: string) => boolean;

  // Recent searches (persisted)
  recentSearches: string[];
  addRecentSearch: (q: string) => void;

  // Recently viewed novels (persisted)
  recentNovels: NovelResult[];
  addRecentNovel: (novel: NovelResult) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Reader
      readerSettings: {
        fontSize: 18,
        fontFamily: "serif",
        lineHeight: 1.8,
        readingMode: "vertical",
        backgroundColor: "cream",
      },
      setReaderSettings: (s) =>
        set((state) => ({
          readerSettings: { ...state.readerSettings, ...s },
        })),

      // Progress
      progress: {},
      setProgress: (slug, chapterIndex, scrollPos = 0) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [slug]: {
              chapterIndex,
              scrollPos,
              lastRead: new Date().toISOString(),
            },
          },
        })),

      // Favorites
      favorites: {},
      toggleFavorite: (novel) =>
        set((state) => {
          const f = { ...state.favorites };
          if (f[novel.slug]) {
            delete f[novel.slug];
          } else {
            f[novel.slug] = novel;
          }
          return { favorites: f };
        }),
      isFavorite: (slug) => !!get().favorites[slug],

      // Recent searches
      recentSearches: [],
      addRecentSearch: (q) =>
        set((state) => {
          const filtered = state.recentSearches.filter(
            (s) => s.toLowerCase() !== q.toLowerCase(),
          );
          return { recentSearches: [q, ...filtered].slice(0, 10) };
        }),

      // Recent novels
      recentNovels: [],
      addRecentNovel: (novel) =>
        set((state) => {
          const filtered = state.recentNovels.filter(
            (n) => n.slug !== novel.slug,
          );
          return { recentNovels: [novel, ...filtered].slice(0, 20) };
        }),
    }),
    {
      name: "novelgrab-store",
    },
  ),
);
