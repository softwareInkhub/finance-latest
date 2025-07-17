'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { RiBankLine, RiAccountPinCircleLine, RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';

interface Bank {
  id: string;
  bankName: string;
}

interface Account {
  id: string;
  accountHolderName: string;
}

interface BanksSidebarProps {
  onSuperBankClick?: () => void;
  onBankClick?: (bank: Bank) => void;
  onAccountClick?: (account: { id: string; accountHolderName: string }, bankId: string) => void;
}

export default function BanksSidebar({ onSuperBankClick, onBankClick, onAccountClick }: BanksSidebarProps) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<{ [bankId: string]: Account[] }>({});
  const [expandedBank, setExpandedBank] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/bank')
      .then(res => res.json())
      .then(data => setBanks(Array.isArray(data) ? data : []));
  }, []);

  // Fetch accounts for a bank when expanded
  const handleExpand = (bankId: string) => {
    setExpandedBank(expandedBank === bankId ? null : bankId);
    const userId = typeof window !== "undefined" ? localStorage.getItem('userId') : null;
    if (!accounts[bankId] && userId) {
      fetch(`/api/account?bankId=${bankId}&userId=${userId}`)
        .then(res => res.json())
        .then(data => setAccounts(prev => ({ ...prev, [bankId]: Array.isArray(data) ? data : [] })));
    }
  };

  const handleBankClick = (bank: Bank) => {
    if (onBankClick) {
      onBankClick(bank);
    }
  };

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col py-4 px-2">
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search"
          className="w-full px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <nav className="flex-1">
        <ul className="space-y-2 text-gray-700 text-sm">
          <li>
            <button
              className={`flex items-center gap-2 px-2 py-2 rounded hover:bg-blue-50 w-full text-left ${typeof window !== 'undefined' && window.location.pathname === '/super-bank' ? 'font-bold text-blue-700' : ''}`}
              onClick={onSuperBankClick}
            >
              <RiBankLine /> Super Bank
            </button>
          </li>
          <li>
            <div className="px-2 py-2 text-xs text-gray-400 uppercase tracking-wider">Banks</div>
            <ul>
              {banks.map(bank => (
                <li key={bank.id}>
                  <button
                    className={`flex items-center w-full gap-2 px-2 py-2 rounded hover:bg-blue-50 transition ${pathname.includes(`/banks/${bank.id}`) ? 'bg-blue-50 font-bold text-blue-700' : ''}`}
                    onClick={() => {
                      handleExpand(bank.id);
                      handleBankClick(bank);
                    }}
                  >
                    {expandedBank === bank.id ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                    <RiBankLine />
                    <span className="flex-1 text-left">{bank.bankName}</span>
                  </button>
                  {expandedBank === bank.id && accounts[bank.id] && (
                    <ul className="ml-8 mt-1 space-y-1">
                      {accounts[bank.id].length === 0 && (
                        <li className="text-xs text-gray-400 italic">No accounts</li>
                      )}
                      {accounts[bank.id].map(account => (
                        <li key={account.id}>
                            <button
                              className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-100 text-xs w-full text-left ${pathname.includes(`/accounts/${account.id}`) ? 'text-blue-700 font-semibold' : ''}`}
                            onClick={() => onAccountClick && onAccountClick(account, bank.id)}
                            >
                              <RiAccountPinCircleLine /> {account.accountHolderName}
                            </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </aside>
  );
} 