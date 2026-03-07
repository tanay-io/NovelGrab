"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  X,
  ZoomIn,
  ZoomOut,
  Type,
  Maximize,
  Minimize,
  BookOpen,
  Columns,
  Loader2,
  Book,
  Moon,
  Sun,
} from "lucide-react";
import { fetchChapterContent, lookupWord } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type {
  Chapter as ChapterMeta,
  DictionaryResult,
  ReadingMode,
} from "@/lib/types";
import dynamic from "next/dynamic";
import type { CurlDirection } from "./PageCurlEffect";

const PageCurlEffect = dynamic(
  () => import("./PageCurlEffect").then((m) => ({ default: m.PageCurlEffect })),
  { ssr: false },
);

interface ReaderProps {
  slug: string;
  novelTitle: string;
  author: string;
  chapters: ChapterMeta[];
  initialChapter?: number;
  onClose: () => void;
}

export function Reader({
  slug,
  novelTitle,
  author,
  chapters,
  initialChapter = 0,
  onClose,
}: ReaderProps) {
  const { readerSettings, setReaderSettings, setProgress } = useAppStore();
  const { fontSize, fontFamily, lineHeight, readingMode, backgroundColor } =
    readerSettings;

  const [currentChapter, setCurrentChapter] = useState(initialChapter);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChapterList, setShowChapterList] = useState(false);

  // Dictionary
  const [dictResult, setDictResult] = useState<DictionaryResult | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictPos, setDictPos] = useState({ x: 0, y: 0 });

  // Horizontal paged mode
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageWidth, setPageWidth] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Swipe gesture state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);
  const swipeThreshold = 50;

  // Page curl animation state
  const [curlActive, setCurlActive] = useState(false);
  const [curlDirection, setCurlDirection] = useState<CurlDirection>("next");
  const pendingNavigationRef = useRef<(() => void) | null>(null);

  // Theme colors
  const isDark = backgroundColor === "dark";
  const bgColors: Record<string, string> = {
    cream: "#F5EFE6",
    white: "#FFFFFF",
    gray: "#F0F0F0",
    dark: "#121212",
  };
  const textColor = isDark ? "#E0E0E0" : "rgb(21, 21, 21)";
  const mutedColor = isDark ? "#999" : undefined;

  // ── Auto-hide controls ──
  useEffect(() => {
    if (!showControls) return;
    const timer = setTimeout(() => {
      if (!showSettings && !showChapterList) setShowControls(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [showControls, showSettings, showChapterList]);

  // ── Fetch chapter content ──
  useEffect(() => {
    const chapter = chapters[currentChapter];
    if (!chapter) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setContent("");
    setCurrentPage(0);

    fetchChapterContent(chapter.url)
      .then((html) => {
        if (!cancelled) {
          setContent(html);
          setProgress(slug, currentChapter);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentChapter, chapters, slug, setProgress]);

  // ── Calculate pages for horizontal CSS-column pagination ──
  useEffect(() => {
    if (readingMode !== "horizontal" || !containerRef.current || loading)
      return;

    const calculate = () => {
      const container = containerRef.current;
      const contentEl = contentRef.current;
      if (!container || !contentEl) return;

      const cw = container.clientWidth;
      setPageWidth(cw);

      // Let CSS columns settle, then measure
      requestAnimationFrame(() => {
        const scrollW = contentEl.scrollWidth;
        const gap = 80;
        const pages = Math.max(1, Math.ceil(scrollW / (cw + gap)));
        setTotalPages(pages);
        // Clamp current page if it exceeds new total
        setCurrentPage((p) => Math.min(p, pages - 1));
      });
    };

    const timer = setTimeout(calculate, 200);
    window.addEventListener("resize", calculate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculate);
    };
  }, [content, readingMode, fontSize, lineHeight, fontFamily, loading]);

  // ── Page navigation helpers ──
  const goToChapter = useCallback(
    (idx: number) => {
      if (idx >= 0 && idx < chapters.length) {
        setCurrentChapter(idx);
        setShowChapterList(false);
        setCurrentPage(0);
        if (containerRef.current) containerRef.current.scrollTop = 0;
      }
    },
    [chapters.length],
  );

  const goToNextPage = useCallback(() => {
    if (curlActive) return;
    if (currentPage < totalPages - 1) {
      if (readingMode === "horizontal") {
        setCurlDirection("next");
        pendingNavigationRef.current = () => setCurrentPage((p) => p + 1);
        setCurlActive(true);
      } else {
        setCurrentPage((p) => p + 1);
      }
    } else if (currentChapter < chapters.length - 1) {
      goToChapter(currentChapter + 1);
    }
  }, [
    currentPage,
    totalPages,
    currentChapter,
    chapters.length,
    goToChapter,
    curlActive,
    readingMode,
  ]);

  const goToPrevPage = useCallback(() => {
    if (curlActive) return;
    if (currentPage > 0) {
      if (readingMode === "horizontal") {
        setCurlDirection("prev");
        pendingNavigationRef.current = () => setCurrentPage((p) => p - 1);
        setCurlActive(true);
      } else {
        setCurrentPage((p) => p - 1);
      }
    } else if (currentChapter > 0) {
      setCurrentChapter((prev) => prev - 1);
      setShowChapterList(false);
    }
  }, [currentPage, currentChapter, curlActive, readingMode]);

  const handleCurlComplete = useCallback(() => {
    // Navigate first while the WebGL overlay still covers the page,
    // then remove the overlay on the next frame so the new page is already rendered.
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current();
      pendingNavigationRef.current = null;
    }
    requestAnimationFrame(() => {
      setCurlActive(false);
    });
  }, []);

  // ── Keyboard navigation ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "d") {
        if (readingMode === "horizontal") goToNextPage();
      } else if (e.key === "ArrowLeft" || e.key === "a") {
        if (readingMode === "horizontal") goToPrevPage();
      } else if (e.key === "Escape") {
        if (dictResult) setDictResult(null);
        else if (showSettings) setShowSettings(false);
        else if (showChapterList) setShowChapterList(false);
        else onClose();
      } else if (e.key === "f") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    readingMode,
    totalPages,
    currentPage,
    currentChapter,
    dictResult,
    showSettings,
    showChapterList,
    onClose,
    goToNextPage,
    goToPrevPage,
  ]);

  // ── Text selection for dictionary ──
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (!text || text.includes(" ") || text.length > 30) return;

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setDictPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
      setDictLoading(true);
      setDictResult(null);

      lookupWord(text)
        .then((r) => setDictResult(r))
        .catch(() => setDictResult(null))
        .finally(() => setDictLoading(false));
    };

    document.addEventListener("mouseup", handler);
    return () => {
      document.removeEventListener("mouseup", handler);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen?.()
        .then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false));
    }
  }, []);

  // ══════════════════════════════════════════════════════════
  //  SWIPE GESTURES (touch) — Google Play Books style
  // ══════════════════════════════════════════════════════════

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (readingMode !== "horizontal") return;
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
      setIsSwiping(false);
      setSwipeOffset(0);
    },
    [readingMode],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (readingMode !== "horizontal" || !touchStartRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;

      // Only accept horizontal drags
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        setIsSwiping(true);
        // Rubber-band at edges
        const atStart = currentPage === 0 && currentChapter === 0;
        const atEnd =
          currentPage >= totalPages - 1 &&
          currentChapter >= chapters.length - 1;
        let offset = dx;
        if ((atStart && offset > 0) || (atEnd && offset < 0)) {
          offset *= 0.3;
        }
        setSwipeOffset(offset);
      }
    },
    [readingMode, currentPage, totalPages, currentChapter, chapters.length],
  );

  const handleTouchEnd = useCallback(() => {
    if (readingMode !== "horizontal" || !touchStartRef.current) return;
    const elapsed = Date.now() - touchStartRef.current.time;
    const velocity = Math.abs(swipeOffset) / Math.max(elapsed, 1);

    if (Math.abs(swipeOffset) > swipeThreshold || velocity > 0.5) {
      if (swipeOffset < 0) goToNextPage();
      else goToPrevPage();
    }

    touchStartRef.current = null;
    setIsSwiping(false);
    setSwipeOffset(0);
  }, [readingMode, swipeOffset, goToNextPage, goToPrevPage]);

  // ══════════════════════════════════════════════════════════
  //  TAP ZONES — Play Books style (30% | 40% | 30%)
  // ══════════════════════════════════════════════════════════

  const handleTapZone = useCallback(
    (e: React.MouseEvent) => {
      if (readingMode !== "horizontal") {
        if (!showSettings && !showChapterList) setShowControls(!showControls);
        return;
      }
      // Skip if user selected text
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const tapX = (e.clientX - rect.left) / rect.width;

      if (tapX < 0.3) goToPrevPage();
      else if (tapX > 0.7) goToNextPage();
      else {
        if (!showSettings && !showChapterList) setShowControls(!showControls);
      }
    },
    [
      readingMode,
      showControls,
      showSettings,
      showChapterList,
      goToNextPage,
      goToPrevPage,
    ],
  );

  // ── Horizontal transform calculation ──
  const columnGap = 80;
  const getHorizontalTransform = () => {
    if (!pageWidth) return "translateX(0)";
    const base = -(currentPage * (pageWidth + columnGap));
    const offset = isSwiping ? swipeOffset : 0;
    return `translateX(${base + offset}px)`;
  };

  const chapter = chapters[currentChapter];

  // ══════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none"
      style={{ backgroundColor: bgColors[backgroundColor] }}
    >
      {/* ────────── Top Toolbar (slides in from top) ────────── */}
      <div
        className="absolute top-0 left-0 right-0 z-20 p-4"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
          transform: showControls ? "translateY(0)" : "translateY(-100%)",
          opacity: showControls ? 1 : 0,
          transition: "transform 200ms ease-out, opacity 200ms ease-out",
          pointerEvents: showControls ? "auto" : "none",
        }}
      >
        <div className="flex items-center justify-between text-white max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h2 className="font-serif font-semibold text-sm line-clamp-1">
                {novelTitle}
              </h2>
              <p className="text-xs opacity-75">by {author}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm mr-2">
              Ch {currentChapter + 1}/{chapters.length}
              {readingMode === "horizontal" &&
                ` · Page ${currentPage + 1}/${totalPages}`}
            </span>
            <button
              onClick={() => setShowChapterList(!showChapterList)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Chapters"
            >
              <Book className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors hidden sm:block"
              title="Fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ────────── Settings Panel ────────── */}
      {showSettings && (
        <div
          className="absolute top-16 right-4 z-30 border rounded-xl shadow-2xl p-6 w-80 animate-scaleIn"
          style={{
            backgroundColor: isDark ? "#1E1E1E" : "var(--card, #fff)",
            borderColor: isDark ? "#333" : undefined,
            color: isDark ? "#E0E0E0" : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            className="font-semibold mb-4"
            style={{ color: isDark ? "#E0E0E0" : undefined }}
          >
            Reader Settings
          </h3>

          {/* Font Size */}
          <div className="mb-4">
            <label className="text-sm mb-2 block" style={{ color: mutedColor }}>
              Font Size: {fontSize}px
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setReaderSettings({ fontSize: Math.max(12, fontSize - 1) })
                }
                className="p-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: isDark ? "#2A2A2A" : undefined,
                  color: isDark ? "#E0E0E0" : undefined,
                }}
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={12}
                max={28}
                value={fontSize}
                onChange={(e) =>
                  setReaderSettings({ fontSize: parseInt(e.target.value) })
                }
                className="flex-1"
              />
              <button
                onClick={() =>
                  setReaderSettings({ fontSize: Math.min(28, fontSize + 1) })
                }
                className="p-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: isDark ? "#2A2A2A" : undefined,
                  color: isDark ? "#E0E0E0" : undefined,
                }}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Font Family */}
          <div className="mb-4">
            <label className="text-sm mb-2 block" style={{ color: mutedColor }}>
              Font
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["serif", "sans-serif", "mono"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setReaderSettings({ fontFamily: f })}
                  className={`p-2 text-sm rounded-lg border-2 transition-all capitalize ${
                    fontFamily === f
                      ? "border-primary bg-primary/10 text-primary"
                      : isDark
                        ? "border-gray-600 text-gray-300 hover:border-primary/50"
                        : "border-border text-foreground hover:border-primary/50"
                  }`}
                  style={{ fontFamily: f }}
                >
                  {f === "sans-serif"
                    ? "Sans"
                    : f === "mono"
                      ? "Mono"
                      : "Serif"}
                </button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div className="mb-4">
            <label className="text-sm mb-2 block" style={{ color: mutedColor }}>
              Line Height: {lineHeight}
            </label>
            <input
              type="range"
              min={1.2}
              max={2.4}
              step={0.2}
              value={lineHeight}
              onChange={(e) =>
                setReaderSettings({ lineHeight: parseFloat(e.target.value) })
              }
              className="w-full"
            />
          </div>

          {/* Reading Mode */}
          <div className="mb-4">
            <label className="text-sm mb-2 block" style={{ color: mutedColor }}>
              Reading Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setReaderSettings({ readingMode: "vertical" })}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border-2 transition-all ${
                  readingMode === "vertical"
                    ? "border-primary bg-primary/10 text-primary"
                    : isDark
                      ? "border-gray-600 text-gray-300 hover:border-primary/50"
                      : "border-border text-foreground hover:border-primary/50"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">Vertical</span>
              </button>
              <button
                onClick={() => setReaderSettings({ readingMode: "horizontal" })}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border-2 transition-all ${
                  readingMode === "horizontal"
                    ? "border-primary bg-primary/10 text-primary"
                    : isDark
                      ? "border-gray-600 text-gray-300 hover:border-primary/50"
                      : "border-border text-foreground hover:border-primary/50"
                }`}
              >
                <Columns className="w-4 h-4" />
                <span className="text-sm">Horizontal</span>
              </button>
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="text-sm mb-2 block" style={{ color: mutedColor }}>
              Theme
            </label>
            <div className="flex gap-3 items-center">
              {(["cream", "white", "gray", "dark"] as const).map((bg) => (
                <button
                  key={bg}
                  onClick={() => setReaderSettings({ backgroundColor: bg })}
                  className={`w-10 h-10 rounded-lg transition-transform flex items-center justify-center ${
                    backgroundColor === bg
                      ? "ring-2 ring-primary scale-110"
                      : "ring-1 ring-border"
                  }`}
                  style={{ backgroundColor: bgColors[bg] }}
                  title={bg.charAt(0).toUpperCase() + bg.slice(1)}
                >
                  {bg === "dark" && <Moon className="w-4 h-4 text-gray-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ────────── Chapter List Panel ────────── */}
      {showChapterList && (
        <div
          className="absolute top-16 right-4 z-30 border rounded-xl shadow-2xl w-80 max-h-[70vh] overflow-hidden flex flex-col animate-scaleIn"
          style={{
            backgroundColor: isDark ? "#1E1E1E" : "var(--card, #fff)",
            borderColor: isDark ? "#333" : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="p-4 border-b"
            style={{ borderColor: isDark ? "#333" : undefined }}
          >
            <h3
              className="font-semibold"
              style={{ color: isDark ? "#E0E0E0" : undefined }}
            >
              Chapters
            </h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {chapters.map((ch, idx) => (
              <button
                key={ch.index}
                onClick={() => goToChapter(idx)}
                className={`w-full text-left px-4 py-3 text-sm border-b transition-colors ${
                  idx === currentChapter
                    ? "bg-primary/10 text-primary font-semibold"
                    : isDark
                      ? "text-gray-300 hover:bg-white/5"
                      : "text-foreground hover:bg-secondary"
                }`}
                style={{ borderColor: isDark ? "#2A2A2A" : undefined }}
              >
                <span
                  className="text-xs mr-2"
                  style={{ color: isDark ? "#666" : undefined }}
                >
                  {idx + 1}.
                </span>
                {ch.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          READING CONTENT AREA
          ════════════════════════════════════════════════════════ */}
      <div
        ref={containerRef}
        onClick={handleTapZone}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex-1 ${
          readingMode === "horizontal" ? "overflow-hidden" : "overflow-y-auto"
        }`}
        style={{
          backgroundColor: bgColors[backgroundColor],
          cursor: readingMode === "horizontal" ? "default" : "pointer",
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p style={{ color: mutedColor }}>Loading chapter...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-destructive font-semibold">{error}</p>
            <button
              onClick={() => {
                setError("");
                setCurrentChapter(currentChapter);
              }}
              className="text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : readingMode === "horizontal" ? (
          /* ═══ HORIZONTAL PAGED READER (Play Books style) ═══ */
          <div
            ref={contentRef}
            className="h-full select-text"
            style={{
              columnWidth: `${pageWidth || 600}px`,
              columnGap: `${columnGap}px`,
              columnFill: "auto" as const,
              height: "100%",
              paddingTop: "72px",
              paddingBottom: "72px",
              transform: getHorizontalTransform(),
              transition: isSwiping
                ? "none"
                : "transform 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              willChange: "transform",
            }}
          >
            {/* Chapter Title */}
            <div
              className="mb-8 text-center"
              style={{
                breakAfter: "avoid" as const,
                paddingLeft: "clamp(24px, 5vw, 64px)",
                paddingRight: "clamp(24px, 5vw, 64px)",
              }}
            >
              <h1
                className="font-serif font-bold mb-2"
                style={{ fontSize: `${fontSize + 8}px`, color: textColor }}
              >
                {chapter?.title}
              </h1>
              <p className="text-sm" style={{ color: mutedColor }}>
                Chapter {currentChapter + 1}
              </p>
            </div>

            {/* Chapter Body */}
            <div
              className={`prose prose-sm max-w-none leading-relaxed ${
                fontFamily === "serif"
                  ? "font-serif"
                  : fontFamily === "mono"
                    ? "font-mono"
                    : "font-sans"
              } ${isDark ? "prose-invert" : ""}`}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                color: textColor,
                paddingLeft: "clamp(24px, 5vw, 64px)",
                paddingRight: "clamp(24px, 5vw, 64px)",
              }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        ) : (
          /* ═══ VERTICAL SCROLL READER ═══ */
          <div
            ref={contentRef}
            className="max-w-2xl mx-auto px-6 sm:px-8 py-20"
          >
            <div className="mb-10 text-center">
              <h1
                className="font-serif font-bold mb-2"
                style={{ fontSize: `${fontSize + 8}px`, color: textColor }}
              >
                {chapter?.title}
              </h1>
              <p className="text-sm" style={{ color: mutedColor }}>
                Chapter {currentChapter + 1}
              </p>
            </div>

            <div
              className={`prose prose-sm max-w-none leading-relaxed ${
                fontFamily === "serif"
                  ? "font-serif"
                  : fontFamily === "mono"
                    ? "font-mono"
                    : "font-sans"
              } ${isDark ? "prose-invert" : ""}`}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                color: textColor,
              }}
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {/* Vertical chapter navigation */}
            <div
              className="mt-16 pt-8 border-t flex items-center justify-between"
              style={{ borderColor: isDark ? "#333" : undefined }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToChapter(currentChapter - 1);
                }}
                disabled={currentChapter === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: isDark ? "#2A2A2A" : undefined,
                  color: isDark ? "#E0E0E0" : undefined,
                }}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm" style={{ color: mutedColor }}>
                {currentChapter + 1} / {chapters.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToChapter(currentChapter + 1);
                }}
                disabled={currentChapter === chapters.length - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: isDark ? "#2A2A2A" : undefined,
                  color: isDark ? "#E0E0E0" : undefined,
                }}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ────────── Bottom Toolbar (slides in from bottom) ────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 p-4"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
          transform: showControls ? "translateY(0)" : "translateY(100%)",
          opacity: showControls ? 1 : 0,
          transition: "transform 200ms ease-out, opacity 200ms ease-out",
          pointerEvents: showControls ? "auto" : "none",
        }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Horizontal page slider + arrows */}
          {readingMode === "horizontal" && !loading && totalPages > 1 && (
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevPage();
                }}
                disabled={currentPage === 0 && currentChapter === 0}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={totalPages - 1}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 accent-white"
                  style={{ cursor: "pointer" }}
                />
                <span className="text-white text-xs w-16 text-center whitespace-nowrap">
                  {currentPage + 1} / {totalPages}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextPage();
                }}
                disabled={
                  currentPage >= totalPages - 1 &&
                  currentChapter === chapters.length - 1
                }
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Quick controls row */}
          <div className="grid grid-cols-5 gap-2 text-white text-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToChapter(currentChapter - 1);
              }}
              disabled={currentChapter === 0}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-30 text-xs"
            >
              <ChevronLeft className="w-4 h-4 mx-auto mb-1" />
              Prev Ch
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReaderSettings({
                  readingMode:
                    readingMode === "vertical" ? "horizontal" : "vertical",
                });
              }}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-xs"
            >
              {readingMode === "vertical" ? (
                <Columns className="w-4 h-4 mx-auto mb-1" />
              ) : (
                <BookOpen className="w-4 h-4 mx-auto mb-1" />
              )}
              {readingMode === "vertical" ? "Horizontal" : "Vertical"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReaderSettings({
                  backgroundColor: isDark ? "cream" : "dark",
                });
              }}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-xs"
            >
              {isDark ? (
                <Sun className="w-4 h-4 mx-auto mb-1" />
              ) : (
                <Moon className="w-4 h-4 mx-auto mb-1" />
              )}
              {isDark ? "Light" : "Dark"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(!showSettings);
              }}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-xs"
            >
              <Type className="w-4 h-4 mx-auto mb-1" />
              Font
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToChapter(currentChapter + 1);
              }}
              disabled={currentChapter === chapters.length - 1}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-30 text-xs"
            >
              <ChevronRight className="w-4 h-4 mx-auto mb-1" />
              Next Ch
            </button>
          </div>
        </div>
      </div>

      {/* ────────── Dictionary Popup ────────── */}
      {(dictResult || dictLoading) && (
        <div
          className="fixed z-50 border rounded-xl shadow-2xl p-4 max-w-xs animate-scaleIn"
          style={{
            left: `${Math.min(dictPos.x, window.innerWidth - 320)}px`,
            top: `${Math.max(60, dictPos.y - 200)}px`,
            backgroundColor: isDark ? "#1E1E1E" : "var(--card, #fff)",
            borderColor: isDark ? "#333" : undefined,
            color: isDark ? "#E0E0E0" : undefined,
          }}
        >
          <button
            onClick={() => {
              setDictResult(null);
              setDictLoading(false);
            }}
            className="absolute top-2 right-2 p-1 hover:bg-secondary rounded-lg transition-colors"
          >
            <X
              className="w-3 h-3"
              style={{ color: isDark ? "#999" : undefined }}
            />
          </button>
          {dictLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm" style={{ color: mutedColor }}>
                Looking up...
              </span>
            </div>
          ) : dictResult ? (
            <div>
              <div className="mb-2">
                <span
                  className="font-serif font-bold text-lg"
                  style={{ color: isDark ? "#E0E0E0" : undefined }}
                >
                  {dictResult.word}
                </span>
                {dictResult.phonetic && (
                  <span className="text-sm ml-2" style={{ color: mutedColor }}>
                    {dictResult.phonetic}
                  </span>
                )}
              </div>
              {dictResult.meanings.map((m, i) => (
                <div key={i} className="mb-2">
                  <span className="text-xs font-semibold text-primary italic">
                    {m.partOfSpeech}
                  </span>
                  {m.definitions.map((d, j) => (
                    <div key={j} className="ml-2 mt-1">
                      <p
                        className="text-sm"
                        style={{ color: isDark ? "#E0E0E0" : undefined }}
                      >
                        {d.definition}
                      </p>
                      {d.example && (
                        <p
                          className="text-xs italic mt-0.5"
                          style={{ color: isDark ? "#777" : undefined }}
                        >
                          &ldquo;{d.example}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: mutedColor }}>
              Word not found
            </p>
          )}
        </div>
      )}

      {/* ────────── WebGL Page Curl Effect ────────── */}
      {readingMode === "horizontal" && (
        <PageCurlEffect
          sourceElement={containerRef.current}
          direction={curlDirection}
          pageColor={bgColors[backgroundColor]}
          isDark={isDark}
          onComplete={handleCurlComplete}
          active={curlActive}
          width={typeof window !== "undefined" ? window.innerWidth : 1000}
          height={typeof window !== "undefined" ? window.innerHeight : 800}
        />
      )}
    </div>
  );
}
