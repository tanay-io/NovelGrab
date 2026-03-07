"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getChapters } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Reader } from "@/components/Reader";
import type { NovelInfo } from "@/lib/types";

export default function ReadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { progress, addRecentNovel } = useAppStore();

  const [novel, setNovel] = useState<NovelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const chapterParam = searchParams.get("chapter");
  const savedProgress = progress[slug];

  useEffect(() => {
    const novelUrl = `https://novelbin.com/b/${slug}`;
    let cancelled = false;

    getChapters(novelUrl)
      .then((info) => {
        if (!cancelled) {
          setNovel(info);
          addRecentNovel({
            title: info.title,
            url: novelUrl,
            cover: info.cover || "",
            author: info.author,
            genres: info.genres || [],
            rating: 0,
            chapter_count: info.chapters.length,
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
  }, [slug, addRecentNovel]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-serif">Loading novel...</p>
      </div>
    );
  }

  if (error || !novel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <p className="text-destructive font-semibold mb-4">
          {error || "Novel not found"}
        </p>
        <button
          onClick={() => router.back()}
          className="text-primary hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Determine starting chapter
  let initialChapter = 0;
  if (chapterParam !== null) {
    initialChapter = Math.max(
      0,
      Math.min(parseInt(chapterParam) || 0, novel.chapters.length - 1),
    );
  } else if (savedProgress) {
    initialChapter = savedProgress.chapterIndex;
  }

  return (
    <Reader
      slug={slug}
      novelTitle={novel.title}
      author={novel.author}
      chapters={novel.chapters}
      initialChapter={initialChapter}
      onClose={() => router.push(`/novel/${slug}`)}
    />
  );
}
