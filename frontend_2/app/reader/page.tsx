'use client';

import { Reader } from '@/components/Reader';
import { mockBooks, mockChapters } from '@/lib/mock-data';
import { useRouter } from 'next/navigation';

export default function ReaderPage() {
  const router = useRouter();
  const book = mockBooks[0]; // The Quantum Garden

  return (
    <Reader
      book={book}
      chapters={mockChapters}
      onClose={() => router.back()}
    />
  );
}
