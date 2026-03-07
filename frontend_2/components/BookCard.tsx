'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Heart, BookOpen } from 'lucide-react';
import { Book } from '@/lib/types';

interface BookCardProps {
  book: Book;
  variant?: 'default' | 'compact' | 'featured';
}

export function BookCard({ book, variant = 'default' }: BookCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (variant === 'compact') {
    return (
      <Link href={`/book/${book.id}`}>
        <div className="group cursor-pointer">
          <div className="relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
            <div
              className="aspect-[2/3] bg-gradient-to-br"
              style={{
                backgroundImage: `linear-gradient(135deg, ${book.gradient.from} 0%, ${book.gradient.to} 100%)`,
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-t from-black/30 to-transparent">
                <div className="text-white text-center space-y-2">
                  <h3 className="font-serif text-sm font-semibold line-clamp-2">{book.title}</h3>
                  <p className="text-xs opacity-80">{book.author}</p>
                </div>
              </div>
            </div>
          </div>
          {book.progress > 0 && (
            <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${book.progress}%` }}
              />
            </div>
          )}
        </div>
      </Link>
    );
  }

  if (variant === 'featured') {
    return (
      <Link href={`/book/${book.id}`}>
        <div
          className="group relative h-64 rounded-xl overflow-hidden cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className="absolute inset-0 bg-gradient-to-br transition-transform duration-500"
            style={{
              backgroundImage: `linear-gradient(135deg, ${book.gradient.from} 0%, ${book.gradient.to} 100%)`,
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
            <h2 className="font-serif text-2xl font-bold mb-2">{book.title}</h2>
            <p className="text-sm opacity-90 mb-4">{book.author}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold">★ {book.rating}</span>
                <span className="text-xs opacity-75">({book.reviews.toLocaleString()})</span>
              </div>
              {book.progress > 0 && (
                <span className="text-xs font-semibold bg-primary/80 px-2 py-1 rounded">
                  {book.progress}%
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Default variant
  return (
    <div
      className="group rounded-lg overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 flex flex-col cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/book/${book.id}`} className="flex-1">
        <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-br" style={{
          backgroundImage: `linear-gradient(135deg, ${book.gradient.from} 0%, ${book.gradient.to} 100%)`,
        }}>
          <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <BookOpen className="w-8 h-8 text-white" />
          </div>
        </div>
      </Link>

      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <h3 className="font-serif font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors duration-200">
            {book.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">{book.author}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">★ {book.rating}</span>
            <span className="text-xs text-muted-foreground">({(book.reviews / 1000).toFixed(1)}k)</span>
          </div>
        </div>

        {book.progress > 0 && (
          <div className="mt-3 space-y-1">
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${book.progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{book.currentPage} / {book.pages} pages</p>
          </div>
        )}

        <button
          onClick={() => setIsFavorited(!isFavorited)}
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group/btn"
        >
          <Heart
            className={`w-4 h-4 transition-colors duration-200 ${
              isFavorited ? 'fill-primary text-primary' : 'text-muted-foreground group-hover/btn:text-primary'
            }`}
          />
          <span className="text-xs font-semibold text-foreground">{isFavorited ? 'Liked' : 'Like'}</span>
        </button>
      </div>
    </div>
  );
}
