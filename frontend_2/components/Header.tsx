"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Menu, X, Heart, Settings, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/lib/store";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const recentSearches = useAppStore((s:any) => s.recentSearches);

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
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 flex-shrink-0 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
              <span className="text-white font-bold text-sm">NG</span>
            </div>
            <span className="hidden sm:block text-lg font-bold text-foreground">
              NovelGrab
            </span>
          </Link>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-md hidden sm:flex items-center"
          >
            <div className="relative w-full">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search novels..."
                className="w-full px-4 py-2 pl-10 bg-secondary text-foreground placeholder-muted-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-card transition-all duration-200"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </form>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/library"
              className="px-3 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors duration-200"
            >
              Library
            </Link>
            <Link
              href="/stats"
              className="px-3 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors duration-200"
            >
              Stats
            </Link>
            <Link
              href="/favorites"
              className="px-3 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <Heart className="w-4 h-4" />
              <span>Favorites</span>
            </Link>
          </nav>

          {/* Theme Toggle + Settings + Menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 hover:bg-secondary rounded-lg transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-foreground" />
              ) : (
                <Moon className="w-5 h-5 text-foreground" />
              )}
            </button>
            <Link
              href="/settings"
              className="hidden sm:block p-2 hover:bg-secondary rounded-lg transition-colors duration-200"
            >
              <Settings className="w-5 h-5 text-foreground" />
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors duration-200"
            >
              {menuOpen ? (
                <X className="w-5 h-5 text-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-border mt-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Mobile search */}
            <form onSubmit={handleSearch} className="px-4 pt-2">
              <div className="relative w-full">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search novels..."
                  className="w-full px-4 py-2 pl-10 bg-secondary text-foreground placeholder-muted-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </form>
            <Link
              href="/library"
              className="block px-4 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors duration-200"
            >
              Library
            </Link>
            <Link
              href="/stats"
              className="block px-4 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors duration-200"
            >
              Stats
            </Link>
            <Link
              href="/favorites"
              className="block px-4 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <Heart className="w-4 h-4" />
              <span>Favorites</span>
            </Link>
            <Link
              href="/settings"
              className="block px-4 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
