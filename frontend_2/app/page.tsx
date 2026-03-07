"use client";

import { Header } from "@/components/Header";
import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Zap,
  BookOpen,
  TrendingUp,
  Users,
  Search,
  Clock,
  Star,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { NovelResult } from "@/lib/types";

export default function Home() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const recentNovels = useAppStore((s) => s.recentNovels);
  const recentSearches = useAppStore((s) => s.recentSearches);
  const favorites = useAppStore((s) => s.favorites);

  const favoriteList = Object.values(favorites);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;
      router.push(`/results?q=${encodeURIComponent(q)}`);
    },
    [query, router],
  );

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-secondary/50 to-background py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Enter Any World. Instantly.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Lightning-fast page turns, offline reading, and power-reader
              controls. The novel reading experience you deserve.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for novels..."
                  className="w-full px-6 py-4 pl-12 bg-card text-foreground placeholder-muted-foreground rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-lg shadow-sm transition-all duration-200"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                <span className="text-muted-foreground">Recent:</span>
                {recentSearches.slice(0, 5).map((s) => (
                  <Link
                    key={s}
                    href={`/results?q=${encodeURIComponent(s)}`}
                    className="px-3 py-1 rounded-full bg-secondary text-foreground hover:bg-primary/20 hover:text-primary transition-colors"
                  >
                    {s}
                  </Link>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-4">
              <div className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
                <div className="text-2xl font-bold text-primary mb-1">50ms</div>
                <p className="text-xs text-muted-foreground">Page Turn</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
                <div className="text-2xl font-bold text-accent mb-1">∞</div>
                <p className="text-xs text-muted-foreground">Offline Reading</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
                <div className="text-2xl font-bold text-primary mb-1">EPUB</div>
                <p className="text-xs text-muted-foreground">Download</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Viewed */}
      {recentNovels.length > 0 && (
        <section className="py-12 sm:py-16 lg:py-20 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
                    Recently Viewed
                  </h2>
                </div>
                <p className="text-muted-foreground">
                  Continue where you left off
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentNovels.slice(0, 6).map((novel) => (
                <NovelCard key={novel.slug} novel={novel} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Favorites */}
      {favoriteList.length > 0 && (
        <section className="py-12 sm:py-16 lg:py-20 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-accent" />
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
                    Your Favorites
                  </h2>
                </div>
                <p className="text-muted-foreground">
                  Novels you&apos;ve saved
                </p>
              </div>
              <Link
                href="/favorites"
                className="text-primary hover:text-accent font-semibold flex items-center gap-1 transition-colors"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {favoriteList.slice(0, 6).map((novel) => (
                <NovelCardCompact key={novel.slug} novel={novel} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why NovelGrab */}
      <section className="py-12 sm:py-16 lg:py-20 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Why Choose NovelGrab?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Designed for people who love to read. Built with power users in
              mind.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                Lightning Fast
              </h3>
              <p className="text-muted-foreground">
                50ms page turns with predictive prefetch. No lag, no waiting.
                Pure speed.
              </p>
            </div>

            <div className="p-8 rounded-lg bg-gradient-to-br from-secondary/50 to-secondary/30 border border-border">
              <div className="w-12 h-12 bg-secondary/50 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                Infinite Customization
              </h3>
              <p className="text-muted-foreground">
                Font size, font family, line height, reading mode. 100% yours.
              </p>
            </div>

            <div className="p-8 rounded-lg bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/20">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                EPUB Downloads
              </h3>
              <p className="text-muted-foreground">
                Download any novel as EPUB with chapter range selection. Read
                offline anywhere.
              </p>
            </div>

            <div className="p-8 rounded-lg bg-gradient-to-br from-secondary/50 to-secondary/30 border border-border">
              <div className="w-12 h-12 bg-secondary/50 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                Dictionary Lookup
              </h3>
              <p className="text-muted-foreground">
                Select any word while reading to get instant definitions. Never
                break your flow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-secondary/50 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to dive in?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Search for any novel and start reading in seconds.
          </p>
          <button
            onClick={() =>
              document
                .querySelector<HTMLInputElement>(
                  'input[placeholder="Search for novels..."]',
                )
                ?.focus()
            }
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            Start Searching
            <Search className="w-4 h-4" />
          </button>
        </div>
      </section>
    </main>
  );
}

function NovelCard({ novel }: { novel: NovelResult }) {
  return (
    <Link href={`/novel/${novel.slug}`}>
      <div className="group rounded-lg overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 flex gap-4 p-4 cursor-pointer">
        {novel.cover ? (
          <img
            src={novel.cover}
            alt={novel.title}
            className="w-20 h-28 object-cover rounded-md flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-28 rounded-md flex-shrink-0 bg-gradient-to-br from-primary/30 to-accent/30" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-bold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {novel.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">{novel.author}</p>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-primary">★ {novel.rating}</span>
            <span className="text-xs text-muted-foreground">
              {novel.chapter_count} chapters
            </span>
          </div>
          {novel.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
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
  );
}

function NovelCardCompact({ novel }: { novel: NovelResult }) {
  return (
    <Link href={`/novel/${novel.slug}`}>
      <div className="group cursor-pointer">
        <div className="relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
          {novel.cover ? (
            <img
              src={novel.cover}
              alt={novel.title}
              className="aspect-[2/3] w-full object-cover"
            />
          ) : (
            <div className="aspect-[2/3] bg-gradient-to-br from-primary/30 to-accent/30">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-t from-black/30 to-transparent">
                <div className="text-white text-center space-y-2">
                  <h3 className="font-serif text-sm font-semibold line-clamp-2">
                    {novel.title}
                  </h3>
                  <p className="text-xs opacity-80">{novel.author}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <p className="mt-2 text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {novel.title}
        </p>
      </div>
    </Link>
  );
}
