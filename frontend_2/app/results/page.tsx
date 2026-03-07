"use client";

import { Header } from "@/components/Header";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { searchNovels } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { NovelResult } from "@/lib/types";

function ResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<NovelResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const addRecentSearch = useAppStore((s:any) => s.addRecentSearch);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    searchNovels(query)
      .then((r) => {
        if (!cancelled) {
          setResults(r);
          addRecentSearch(query);
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
  }, [query, addRecentSearch]);

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2">
              Search Results
            </h1>
            {query && (
              <p className="text-muted-foreground">
                Showing results for &quot;
                <span className="text-primary font-semibold">{query}</span>
                &quot;
              </p>
            )}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-muted-foreground">Searching novels...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-destructive font-semibold">{error}</p>
              <p className="text-muted-foreground text-sm">
                Try a different search term
              </p>
            </div>
          )}

          {!loading && !error && results.length === 0 && query && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Search className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No results found for &quot;{query}&quot;
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((novel) => (
                <Link key={novel.slug} href={`/novel/${novel.slug}`}>
                  <div className="group rounded-lg overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 flex gap-4 p-4 cursor-pointer h-full">
                    {novel.cover ? (
                      <img
                        src={novel.cover}
                        alt={novel.title}
                        className="w-24 h-36 object-cover rounded-md flex-shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-36 rounded-md flex-shrink-0 bg-gradient-to-br from-primary/30 to-accent/30" />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <h3 className="font-serif font-bold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {novel.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {novel.author}
                      </p>
                      <div className="flex items-center gap-3 text-sm mb-2">
                        <span className="font-semibold text-primary">
                          ★ {novel.rating}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {novel.chapter_count} chapters
                        </span>
                      </div>
                      {novel.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-auto">
                          {novel.genres.slice(0, 3).map((g) => (
                            <span
                              key={g}
                              className="text-xs px-2 py-0.5 bg-secondary rounded-full text-muted-foreground"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </main>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
