// ── Backend API response types ──

export interface NovelResult {
  title: string;
  url: string;
  cover: string;
  author: string;
  genres: string[];
  rating: string;
  chapter_count: string;
  slug: string;
}

export interface Chapter {
  index: number;
  title: string;
  url: string;
}

export interface NovelInfo {
  title: string;
  author: string;
  cover: string;
  genres: string[];
  rating: string;
  description: string;
  chapters: Chapter[];
  total_chapters: number;
  url: string;
}

export interface ProgressEvent {
  status: "pending" | "fetching" | "building" | "complete" | "error";
  completed: number;
  total: number;
  current_chapter_title: string;
  download_url?: string;
  error?: string;
}

export interface GenerateRequest {
  novel_title: string;
  author: string;
  cover_url: string;
  chapters: { title: string; url: string }[];
}

export type ReadingMode = "vertical" | "horizontal";

export interface DictionaryDefinition {
  definition: string;
  example?: string;
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface DictionaryResult {
  word: string;
  phonetic?: string;
  meanings: DictionaryMeaning[];
}

// ── UI / local types ──

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  description: string;
  rating: number;
  reviews: number;
  pages: number;
  category: string;
  progress: number;
  currentPage: number;
  addedDate: string;
  gradient: { from: string; to: string };
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  helpful: number;
}

export interface ReadingSession {
  bookId: string;
  date: string;
  duration: number;
  pagesRead: number;
}

export interface UserSettings {
  fontSize: number;
  fontFamily: "serif" | "sans-serif" | "mono";
  lineHeight: 1.4 | 1.6 | 1.8 | 2;
  backgroundColor: "cream" | "white" | "soft-gray";
  theme: "light";
  autoScroll: boolean;
  scrollSpeed: number;
}

export interface ReadingStats {
  totalBooks: number;
  booksCompleted: number;
  totalHours: number;
  currentStreak: number;
  longestStreak: number;
  thisWeekMinutes: number;
  thisMonthMinutes: number;
  favoriteGenre: string;
  averageRating: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  joinDate: string;
  settings: UserSettings;
  stats: ReadingStats;
  favoriteBooks: string[];
  readingHistory: ReadingSession[];
}
