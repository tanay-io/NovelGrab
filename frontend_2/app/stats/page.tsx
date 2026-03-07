"use client";

import { Header } from "@/components/Header";
import { BookOpen, Heart, Clock, BarChart3 } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function StatsPage() {
  const { favorites, recentNovels, progress, recentSearches } = useAppStore();

  const favCount = Object.keys(favorites).length;
  const progressCount = Object.keys(progress).length;
  const recentCount = recentNovels.length;
  const searchCount = recentSearches.length;

  const statCards = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      label: "Novels Explored",
      value: recentCount,
      sublabel: "Recently viewed",
      color: "from-primary/10 to-accent/10",
    },
    {
      icon: <Heart className="w-6 h-6" />,
      label: "Favorites",
      value: favCount,
      sublabel: "Saved novels",
      color:
        "from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: "In Progress",
      value: progressCount,
      sublabel: "Novels with saved progress",
      color:
        "from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      label: "Searches Made",
      value: searchCount,
      sublabel: "Recent searches",
      color:
        "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12">
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-2">
              Reading Stats
            </h1>
            <p className="text-muted-foreground">
              Your reading activity at a glance
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {statCards.map((stat, i) => (
              <div
                key={i}
                className={`p-6 rounded-lg bg-gradient-to-br ${stat.color} border border-border`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-primary">{stat.icon}</div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {stat.label}
                  </h3>
                </div>
                <div className="text-4xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <p className="text-sm text-muted-foreground">{stat.sublabel}</p>
              </div>
            ))}
          </div>

          {/* Reading Progress Details */}
          {progressCount > 0 && (
            <div className="mb-12 p-8 rounded-lg bg-card border border-border">
              <h2 className="font-serif text-xl font-bold text-foreground mb-6">
                Reading Progress
              </h2>
              <div className="space-y-4">
                {Object.entries(progress).map(([pSlug, p]) => {
                  const novel = recentNovels.find((n) => n.slug === pSlug);
                  return (
                    <div
                      key={pSlug}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">
                            {novel?.title || pSlug}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Chapter {p.chapterIndex + 1} · Last read{" "}
                            {new Date(p.lastRead).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`/read/${pSlug}`}
                        className="text-sm text-primary hover:underline font-semibold"
                      >
                        Continue
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {searchCount > 0 && (
            <div className="p-8 rounded-lg bg-card border border-border">
              <h2 className="font-serif text-xl font-bold text-foreground mb-6">
                Recent Searches
              </h2>
              <div className="flex flex-wrap gap-3">
                {recentSearches.map((q, i) => (
                  <a
                    key={i}
                    href={`/results?q=${encodeURIComponent(q)}`}
                    className="px-4 py-2 rounded-full bg-secondary text-foreground hover:bg-primary/20 hover:text-primary transition-colors text-sm font-semibold"
                  >
                    {q}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {recentCount === 0 && favCount === 0 && progressCount === 0 && (
            <div className="text-center py-16">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                No Activity Yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Start exploring novels to see your stats here.
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-full font-semibold hover:shadow-lg transition-all"
              >
                Search Novels
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
