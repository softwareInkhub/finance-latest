'use client';
import { Suspense } from 'react';
import BanksTabsClient from './BanksTabsClient';

export default function BanksPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BanksTabsClient />
    </Suspense>
  );
} 