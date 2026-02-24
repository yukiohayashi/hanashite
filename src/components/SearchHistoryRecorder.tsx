'use client';

import { useEffect } from 'react';
import { recordSearchHistory } from '@/lib/api';

interface SearchHistoryRecorderProps {
  userId: string | null;
  searchQuery: string;
  resultCount: number;
}

export default function SearchHistoryRecorder({ userId, searchQuery, resultCount }: SearchHistoryRecorderProps) {
  useEffect(() => {
    if (userId && searchQuery) {
      recordSearchHistory(userId, searchQuery, 'keyword', resultCount);
    }
  }, [userId, searchQuery, resultCount]);

  return null;
}
