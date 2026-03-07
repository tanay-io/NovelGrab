"use client";

import { Header } from "@/components/Header";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  Download,
  BookOpen,
  Star,
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from "lucide-react";
import { getChapters, generateEpub, getProgressUrl } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { NovelInfo, Chapter, ProgressEvent } from "@/lib/types";

export default function NovelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [novel, setNovel] = useState<NovelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllChapters, setShowAllChapters] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const addRecentNovel = useAppStore((s) => s.addRecentNovel);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const isFavorite = useAppStore((s) => s.isFavorite);
  const progress = useAppStore((s) => s.progress);

  const novelUrl = `https://novelbin.com/b/${slug}`;
  const isFav = isFavorite(slug);
  const readProgress = progress[slug];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    getChapters(novelUrl)
      .then((info) => {
        if (!cancelled) {
          setNovel(info);
          // Add to recent
          addRecentNovel({
            title: info.title,
            url: info.url,
            cover: info.cover,
            author: info.author,
            genres: info.genres,
            rating: info.rating,
            chapter_count: String(info.total_chapters),
            slug,
          });
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
  }, [novelUrl, slug, addRecentNovel]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading novel info...</p>
        </div>
      </main>
    );
  }

  if (error || !novel) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-destructive font-semibold">
            {error || "Novel not found"}
          </p>
          <button
            onClick={() => router.back()}
            className="text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </main>
    );
  }

  const visibleChapters = showAllChapters
    ? novel.chapters
    : novel.chapters.slice(0, 30);

  const startChapterIndex = readProgress?.chapterIndex ?? 0;

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Novel Header */}
        <div className="grid md:grid-cols-3 gap-12 mb-16">
          {/* Cover */}
          <div className="flex flex-col items-center md:items-start">
            {novel.cover ? (
              <img
                src={novel.cover}
                alt={novel.title}
                className="w-full max-w-xs rounded-lg shadow-xl mb-6"
              />
            ) : (
              <div className="w-full max-w-xs aspect-[2/3] rounded-lg shadow-xl mb-6 bg-gradient-to-br from-primary/30 to-accent/30" />
            )}

            <div className="space-y-3 w-full max-w-xs">
              <Link
                href={`/read/${slug}?chapter=${startChapterIndex}`}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300"
              >
                <BookOpen className="w-5 h-5" />
                {readProgress ? "Continue Reading" : "Start Reading"}
              </Link>
              <button
                onClick={() => setShowDownloadModal(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-foreground font-semibold rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download EPUB
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="md:col-span-2 flex flex-col justify-start">
            <div className="mb-8">
              {novel.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {novel.genres.map((g) => (
                    <span
                      key={g}
                      className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
              <h1 className="font-serif text-4xl font-bold text-foreground mb-2">
                {novel.title}
              </h1>
              <p className="text-xl text-muted-foreground mb-4">
                {novel.author}
              </p>

              <div className="flex flex-wrap items-center gap-4 pb-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(parseFloat(novel.rating))
                            ? "fill-primary text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-foreground">
                    {novel.rating}
                  </span>
                </div>

                <div className="text-sm text-muted-foreground">
                  {novel.total_chapters} chapters
                </div>
              </div>

              {/* Description */}
              {novel.description && (
                <div className="mt-6">
                  <h2 className="font-serif text-xl font-bold text-foreground mb-3">
                    About This Novel
                  </h2>
                  <div
                    className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: novel.description }}
                  />
                </div>
              )}

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() =>
                    toggleFavorite({
                      title: novel.title,
                      url: novel.url,
                      cover: novel.cover,
                      author: novel.author,
                      genres: novel.genres,
                      rating: novel.rating,
                      chapter_count: String(novel.total_chapters),
                      slug,
                    })
                  }
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                    isFav
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFav ? "fill-primary" : ""}`} />
                  <span className="font-semibold">
                    {isFav ? "Favorited" : "Favorite"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chapters List */}
        <section>
          <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
            Chapters ({novel.total_chapters})
          </h2>
          <div className="space-y-2">
            {visibleChapters.map((ch) => (
              <Link
                key={ch.index}
                href={`/read/${slug}?chapter=${ch.index}`}
                className="block"
              >
                <div
                  className={`group p-4 rounded-lg border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                    readProgress?.chapterIndex === ch.index
                      ? "bg-primary/10 border-primary/30"
                      : "bg-card border-border hover:border-primary/50 hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground w-10 text-right">
                      {ch.index + 1}
                    </span>
                    <span className="text-foreground group-hover:text-primary transition-colors">
                      {ch.title}
                    </span>
                  </div>
                  {readProgress?.chapterIndex === ch.index && (
                    <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded font-semibold">
                      Last read
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {novel.chapters.length > 30 && !showAllChapters && (
            <button
              onClick={() => setShowAllChapters(true)}
              className="mt-4 flex items-center gap-2 text-primary hover:text-accent font-semibold transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
              Show all {novel.chapters.length} chapters
            </button>
          )}
          {showAllChapters && novel.chapters.length > 30 && (
            <button
              onClick={() => setShowAllChapters(false)}
              className="mt-4 flex items-center gap-2 text-primary hover:text-accent font-semibold transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
              Show less
            </button>
          )}
        </section>
      </div>

      {/* Download Modal */}
      {showDownloadModal && novel && (
        <DownloadModal
          novel={novel}
          onClose={() => setShowDownloadModal(false)}
        />
      )}
    </main>
  );
}

/* ─── Download Modal ─── */

function DownloadModal({
  novel,
  onClose,
}: {
  novel: NovelInfo;
  onClose: () => void;
}) {
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(Math.min(novel.total_chapters, 50));
  const [jobId, setJobId] = useState("");
  const [progressData, setProgressData] = useState<ProgressEvent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const startGeneration = useCallback(async () => {
    setGenerating(true);
    setDownloadError("");
    setProgressData(null);

    try {
      const chapters = novel.chapters
        .slice(rangeStart - 1, rangeEnd)
        .map((ch) => ({ title: ch.title, url: ch.url }));

      const { job_id } = await generateEpub({
        novel_title: novel.title,
        author: novel.author,
        cover_url: novel.cover,
        chapters,
      });
      setJobId(job_id);

      // Listen to SSE
      const evtSource = new EventSource(getProgressUrl(job_id));
      evtSource.onmessage = (e) => {
        try {
          const data: ProgressEvent = JSON.parse(e.data);
          setProgressData(data);

          if (data.status === "complete" || data.status === "error") {
            evtSource.close();
            if (data.status === "complete" && data.download_url) {
              window.open(
                `http://localhost:8000${data.download_url}`,
                "_blank",
              );
            }
            if (data.status === "error") {
              setDownloadError(data.error || "Generation failed");
            }
            setGenerating(false);
          }
        } catch {
          // skip
        }
      };
      evtSource.onerror = () => {
        evtSource.close();
        setDownloadError("Connection lost");
        setGenerating(false);
      };
    } catch (err: any) {
      setDownloadError(err.message || "Failed to start generation");
      setGenerating(false);
    }
  }, [novel, rangeStart, rangeEnd]);

  const pct = progressData
    ? Math.round((progressData.completed / progressData.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl border border-border shadow-2xl max-w-lg w-full p-6 animate-scaleIn">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl font-bold text-foreground">
            Download EPUB
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Select chapter range for <strong>{novel.title}</strong>
        </p>

        {/* Range Selector */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              From Chapter
            </label>
            <input
              type="number"
              min={1}
              max={novel.total_chapters}
              value={rangeStart}
              onChange={(e) =>
                setRangeStart(
                  Math.max(
                    1,
                    Math.min(parseInt(e.target.value) || 1, rangeEnd),
                  ),
                )
              }
              className="w-full px-4 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              To Chapter
            </label>
            <input
              type="number"
              min={1}
              max={novel.total_chapters}
              value={rangeEnd}
              onChange={(e) =>
                setRangeEnd(
                  Math.max(
                    rangeStart,
                    Math.min(
                      parseInt(e.target.value) || novel.total_chapters,
                      novel.total_chapters,
                    ),
                  ),
                )
              }
              className="w-full px-4 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-6">
          {rangeEnd - rangeStart + 1} chapters selected
        </p>

        {/* Progress */}
        {progressData && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {progressData.status === "building"
                  ? "Compiling EPUB..."
                  : progressData.current_chapter_title || "Preparing..."}
              </span>
              <span className="text-sm font-semibold text-primary">{pct}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {downloadError && (
          <p className="text-destructive text-sm mb-4">{downloadError}</p>
        )}

        {progressData?.status === "complete" && (
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <Check className="w-5 h-5" />
            <span className="font-semibold text-sm">Download started!</span>
          </div>
        )}

        <button
          onClick={startGeneration}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Generate &amp; Download
            </>
          )}
        </button>
      </div>
    </div>
  );
}
