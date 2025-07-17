'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AccountsClient from './AccountsClient';

function AccountsPageContent() {
  const searchParams = useSearchParams();
  const bankId = searchParams.get('bankId');
  return <AccountsClient bankId={bankId} />;
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountsPageContent />
    </Suspense>
  );
} 
