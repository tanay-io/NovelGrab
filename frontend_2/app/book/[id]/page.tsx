'use client';

import { Header } from '@/components/Header';
import { useState } from 'react';
import Link from 'next/link';
import { Heart, Share2, Download, BookOpen, Star, Users } from 'lucide-react';
import { mockBooks, mockReviews } from '@/lib/mock-data';

export default function BookDetailPage({ params }: { params: { id: string } }) {
  const book = mockBooks.find((b) => b.id === params.id) || mockBooks[0];
  const [isFavorited, setIsFavorited] = useState(false);

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Book Header */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {/* Cover */}
          <div className="flex flex-col items-start">
            <div
              className="w-full max-w-sm aspect-[2/3] rounded-lg shadow-xl bg-gradient-to-br mb-6"
              style={{
                backgroundImage: `linear-gradient(135deg, ${book.gradient.from} 0%, ${book.gradient.to} 100%)`,
              }}
            />

            <div className="space-y-3 w-full">
              <Link
                href="/reader"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300"
              >
                <BookOpen className="w-5 h-5" />
                Start Reading
              </Link>
              <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-foreground font-semibold rounded-lg hover:bg-primary/20 transition-colors">
                <Download className="w-5 h-5" />
                Download
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col justify-start">
            <div className="mb-8">
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-4">
                {book.category}
              </div>
              <h1 className="font-serif text-4xl font-bold text-foreground mb-2">{book.title}</h1>
              <p className="text-xl text-muted-foreground mb-4">{book.author}</p>

              <div className="flex flex-wrap items-center gap-4 pb-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(book.rating)
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-foreground">{book.rating}</span>
                  <span className="text-muted-foreground">({book.reviews.toLocaleString()} reviews)</span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{Math.round(book.reviews / 100)} readers</span>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pages</p>
                  <p className="font-semibold text-foreground">{book.pages}</p>
                </div>
                {book.progress > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Your Progress</p>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {book.currentPage} of {book.pages} pages
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => setIsFavorited(!isFavorited)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                    isFavorited
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-primary' : ''}`} />
                  <span className="font-semibold">{isFavorited ? 'Liked' : 'Like'}</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary/50 text-foreground font-semibold transition-colors">
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <section className="mb-16 pb-16 border-b border-border">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-4">About This Book</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">{book.description}</p>
          <p className="text-muted-foreground leading-relaxed">
            Join readers worldwide who have been captivated by this stunning work of literature. With intricate
            storytelling and unforgettable characters, this book promises an immersive reading experience that will
            stay with you long after you turn the final page.
          </p>
        </section>

        {/* Reviews */}
        <section>
          <h2 className="font-serif text-2xl font-bold text-foreground mb-6">Reader Reviews</h2>

          <div className="space-y-4">
            {mockReviews.map((review) => (
              <div key={review.id} className="p-6 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground">{review.author}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.rating ? 'fill-primary text-primary' : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                  </div>
                </div>
                <p className="text-foreground mb-3">{review.text}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <button className="hover:text-primary transition-colors">👍 Helpful ({review.helpful})</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
