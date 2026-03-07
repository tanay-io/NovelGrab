"use client";

import { Header } from "@/components/Header";
import { useState } from "react";
import { Palette, HardDrive, Trash2, BookOpen, Columns } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function SettingsPage() {
  const {
    readerSettings,
    setReaderSettings,
    favorites,
    recentNovels,
    progress,
  } = useAppStore();
  const [activeTab, setActiveTab] = useState<"reader" | "storage">("reader");
  const { fontSize, fontFamily, lineHeight, backgroundColor, readingMode } =
    readerSettings;

  const tabs = [
    { id: "reader", label: "Reader Settings", icon: Palette },
    { id: "storage", label: "Data & Storage", icon: HardDrive },
  ];

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      activeTab === id
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-foreground hover:bg-secondary border-l-2 border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-semibold text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              {/* Reader Settings */}
              {activeTab === "reader" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
                      Reader Settings
                    </h2>
                    <p className="text-muted-foreground">
                      Customize your reading experience. Changes are saved
                      automatically.
                    </p>
                  </div>

                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">
                      Text Appearance
                    </h3>

                    {/* Font Size */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-foreground">
                          Font Size
                        </label>
                        <span className="text-2xl font-bold text-primary">
                          {fontSize}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="28"
                        value={fontSize}
                        onChange={(e) =>
                          setReaderSettings({
                            fontSize: parseInt(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Preview:{" "}
                        <span style={{ fontSize: `${fontSize}px` }}>
                          This is how your text looks
                        </span>
                      </p>
                    </div>

                    {/* Font Family */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Font Family
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {(["serif", "sans-serif", "mono"] as const).map(
                          (font) => (
                            <button
                              key={font}
                              onClick={() =>
                                setReaderSettings({ fontFamily: font })
                              }
                              className={`p-4 rounded-lg border-2 transition-all ${
                                fontFamily === font
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                              style={{ fontFamily: font }}
                            >
                              <p className="font-semibold text-foreground capitalize">
                                {font === "serif"
                                  ? "Serif"
                                  : font === "sans-serif"
                                    ? "Sans Serif"
                                    : "Monospace"}
                              </p>
                              <p
                                className="text-sm text-muted-foreground mt-1"
                                style={{ fontFamily: font }}
                              >
                                The quick brown fox
                              </p>
                            </button>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Line Height */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Line Height: {lineHeight}
                      </label>
                      <div className="grid grid-cols-4 gap-3">
                        {[1.4, 1.6, 1.8, 2.0].map((lh) => (
                          <button
                            key={lh}
                            onClick={() =>
                              setReaderSettings({ lineHeight: lh })
                            }
                            className={`p-3 rounded-lg border-2 transition-all text-center ${
                              lineHeight === lh
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <p className="font-semibold text-foreground">
                              {lh}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Spacing
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Background Color */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Background Color
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        {(["cream", "white", "gray"] as const).map((bg) => (
                          <button
                            key={bg}
                            onClick={() =>
                              setReaderSettings({ backgroundColor: bg })
                            }
                            className={`p-6 rounded-lg border-2 transition-all ${
                              backgroundColor === bg
                                ? "border-primary"
                                : "border-border hover:border-primary/50"
                            }`}
                            style={{
                              backgroundColor:
                                bg === "cream"
                                  ? "#F5EFE6"
                                  : bg === "white"
                                    ? "#FFFFFF"
                                    : "#F0F0F0",
                            }}
                          >
                            <p className="text-sm font-semibold text-foreground capitalize">
                              {bg}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reading Mode */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">
                      Reading Mode
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() =>
                          setReaderSettings({ readingMode: "vertical" })
                        }
                        className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          readingMode === "vertical"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        <BookOpen className="w-5 h-5" />
                        <div className="text-left">
                          <p className="font-semibold">Vertical Scroll</p>
                          <p className="text-xs text-muted-foreground">
                            Continuous scrolling
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() =>
                          setReaderSettings({ readingMode: "horizontal" })
                        }
                        className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          readingMode === "horizontal"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        <Columns className="w-5 h-5" />
                        <div className="text-left">
                          <p className="font-semibold">Horizontal Pages</p>
                          <p className="text-xs text-muted-foreground">
                            Page-by-page reading
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Storage */}
              {activeTab === "storage" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
                      Data & Storage
                    </h2>
                  </div>

                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">
                      Local Data
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-border/50">
                        <span className="text-foreground">Favorites</span>
                        <span className="text-muted-foreground">
                          {Object.keys(favorites).length} novels
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border/50">
                        <span className="text-foreground">
                          Reading Progress
                        </span>
                        <span className="text-muted-foreground">
                          {Object.keys(progress).length} novels tracked
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border/50">
                        <span className="text-foreground">Recently Viewed</span>
                        <span className="text-muted-foreground">
                          {recentNovels.length} novels
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">
                      Clear Data
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Clear your locally stored data. This cannot be undone.
                    </p>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure? This will clear all your local data including favorites, reading progress, and settings.",
                          )
                        ) {
                          localStorage.removeItem("novelgrab-store");
                          window.location.reload();
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-destructive border border-destructive/50 rounded-lg hover:bg-destructive/10 transition-colors font-semibold"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear All Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
