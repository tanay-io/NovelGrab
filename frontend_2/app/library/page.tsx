"use client";

import { Header } from "@/components/Header";
import { useState } from "react";
import Link from "next/link";
import {
  Filter,
  SortAsc,
  LayoutGrid,
  List,
  Search,
  BookOpen,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { NovelResult } from "@/lib/types";

export default function LibraryPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterGenre, setFilterGenre] = useState("all");
  const recentNovels = useAppStore((s) => s.recentNovels);
  const favorites = useAppStore((s) => s.favorites);

  // Combine recent + favorites (deduped)
  const allNovels: NovelResult[] = [];
  const seen = new Set<string>();
  for (const n of Object.values(favorites)) {
    if (!seen.has(n.slug)) {
      allNovels.push(n);
      seen.add(n.slug);
    }
  }
  for (const n of recentNovels) {
    if (!seen.has(n.slug)) {
      allNovels.push(n);
      seen.add(n.slug);
    }
  }

  // Extract genres for filter
  const allGenres = new Set<string>();
  allNovels.forEach((n) => n.genres.forEach((g) => allGenres.add(g)));
  const genres = ["all", ...Array.from(allGenres).sort()];

  // Filter
  let filtered = allNovels;
  if (filterGenre !== "all") {
    filtered = allNovels.filter((n) => n.genres.includes(filterGenre));
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-2">
              Your Library
            </h1>
            <p className="text-muted-foreground">
              {filtered.length} novel{filtered.length !== 1 ? "s" : ""} in your
              collection
            </p>
          </div>

          {allNovels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <BookOpen className="w-16 h-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-foreground">
                  Your library is empty
                </p>
                <p className="text-muted-foreground">
                  Search for novels and they&apos;ll appear here as you browse.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300"
              >
                <Search className="w-4 h-4" />
                Search Novels
              </Link>
            </div>
          ) : (
            <>
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {/* Filter */}
                {genres.length > 2 && (
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select
                      value={filterGenre}
                      onChange={(e) => setFilterGenre(e.target.value)}
                      className="px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {genres.map((g) => (
                        <option key={g} value={g}>
                          {g === "all" ? "All Genres" : g}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* View Mode */}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "grid"
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "list"
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map((novel) => (
                    <Link key={novel.slug} href={`/novel/${novel.slug}`}>
                      <div className="group rounded-lg overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 flex gap-4 p-4 cursor-pointer h-full">
                        {novel.cover ? (
                          <img
                            src={novel.cover}
                            alt={novel.title}
                            className="w-20 h-28 object-cover rounded-md flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-28 rounded-md flex-shrink-0 bg-gradient-to-br from-primary/30 to-accent/30" />
                        )}
                        <div className="flex-1 min-w-0 flex flex-col">
                          <h3 className="font-serif font-bold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                            {novel.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {novel.author}
                          </p>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="font-semibold text-primary">
                              ★ {novel.rating}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {novel.chapter_count} chapters
                            </span>
                          </div>
                          {novel.genres.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-auto pt-2">
                              {novel.genres.slice(0, 2).map((g) => (
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
              ) : (
                <div className="space-y-4">
                  {filtered.map((novel) => (
                    <Link key={novel.slug} href={`/novel/${novel.slug}`}>
                      <div className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-secondary transition-all duration-300 flex gap-4">
                        {novel.cover ? (
                          <img
                            src={novel.cover}
                            alt={novel.title}
                            className="w-20 h-32 object-cover rounded-md flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-32 rounded-md flex-shrink-0 bg-gradient-to-br from-primary/30 to-accent/30" />
                        )}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-serif font-bold text-foreground mb-1">
                              {novel.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {novel.author}
                            </p>
                          </div>
                          {novel.genres.length > 0 && (
                            <div className="flex flex-wrap gap-1">
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
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold text-primary mb-2">
                            ★ {novel.rating}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {novel.chapter_count} chapters
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
