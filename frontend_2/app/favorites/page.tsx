"use client";

import { Header } from "@/components/Header";
import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function FavoritesPage() {
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const list = Object.values(favorites);

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-2">
              Favorites
            </h1>
            <p className="text-muted-foreground">
              {list.length} novel{list.length !== 1 ? "s" : ""} saved
            </p>
          </div>

          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <Heart className="w-16 h-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-foreground">
                  No favorites yet
                </p>
                <p className="text-muted-foreground">
                  Browse novels and tap the heart to save them here.
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {list.map((novel) => (
                <div
                  key={novel.slug}
                  className="group rounded-lg overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 flex gap-4 p-4"
                >
                  <Link
                    href={`/novel/${novel.slug}`}
                    className="flex gap-4 flex-1 min-w-0"
                  >
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
                      <p className="text-sm text-muted-foreground mb-2">
                        {novel.author}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-primary">
                          ★ {novel.rating}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {novel.chapter_count} chapters
                        </span>
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={() => toggleFavorite(novel)}
                    className="flex-shrink-0 p-2 self-start hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Heart className="w-5 h-5 fill-primary text-primary" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
