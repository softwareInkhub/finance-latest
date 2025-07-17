'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AccountsPage from '../../sub-pages/accounts/page';
import StatementsPage from '../../sub-pages/statements/page';
import SuperBankPage from '../../sub-pages/super-bank/page';

function TabContent() {
  const searchParams = useSearchParams();
  const tabType = searchParams.get('type');
  const bankId = searchParams.get('bankId');
  const accountId = searchParams.get('accountId');

  if (tabType === 'super-bank') {
    return <SuperBankPage />;
  }

  if (tabType === 'accounts' && bankId) {
    return <AccountsPage  />;
  }

  if (tabType === 'statements' && bankId && accountId) {
    return <StatementsPage />;
  }

  return <div className="p-8 text-gray-400 text-center">Invalid tab</div>;
}

export default function TabPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TabContent />
    </Suspense>
  );
} 