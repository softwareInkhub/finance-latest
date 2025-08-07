'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { RiBankLine, RiAccountPinCircleLine, RiArrowDownSLine, RiArrowRightSLine, RiFileList3Line, RiTimeLine, RiFileTextLine, RiMenuLine } from 'react-icons/ri';

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
  onBankSectionClick?: (section: string, bankId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function BanksSidebar({ 
  onSuperBankClick, 
  onBankClick, 
  onAccountClick, 
  onBankSectionClick,
  isCollapsed = false,
  onToggleCollapse
}: BanksSidebarProps) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<{ [bankId: string]: Account[] }>({});
  const [expandedBank, setExpandedBank] = useState<string | null>(null);
  const [expandedBankSections, setExpandedBankSections] = useState<{ [bankId: string]: string[] }>({});
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/bank')
      .then(res => res.json())
      .then(data => setBanks(Array.isArray(data) ? data : []));
  }, []);

  // Fetch accounts for a bank when expanded
  const handleExpand = useCallback((bankId: string) => {
    setExpandedBank(prev => prev === bankId ? null : bankId);
    const userId = typeof window !== "undefined" ? localStorage.getItem('userId') : null;
    if (!accounts[bankId] && userId) {
      fetch(`/api/account?bankId=${bankId}&userId=${userId}`)
        .then(res => res.json())
        .then(data => setAccounts(prev => ({ ...prev, [bankId]: Array.isArray(data) ? data : [] })));
    }
  }, [accounts]);

  const handleBankClick = useCallback((bank: Bank) => {
    if (onBankClick) {
      onBankClick(bank);
    }
  }, [onBankClick]);

  const handleBankSectionClick = useCallback((section: string, bankId: string) => {
    setExpandedBankSections(prev => {
      const currentSections = prev[bankId] || [];
      const isExpanded = currentSections.includes(section);
      
      if (isExpanded) {
        // Remove section from expanded list
        return {
          ...prev,
          [bankId]: currentSections.filter(s => s !== section)
        };
      } else {
        // Add section to expanded list
        return {
          ...prev,
          [bankId]: [...currentSections, section]
        };
      }
    });

    if (onBankSectionClick) {
      onBankSectionClick(section, bankId);
    }
  }, [onBankSectionClick]);

  const isSectionExpanded = useCallback((bankId: string, section: string) => {
    return (expandedBankSections[bankId] || []).includes(section);
  }, [expandedBankSections]);

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} min-h-screen bg-white border-r border-gray-200 flex flex-col py-4 px-2 transition-all duration-100 ease-out`}>
      {/* Toggle Button */}
      <div className="flex justify-end items-center mb-4">
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-100 rounded transition-colors duration-75"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <RiMenuLine className="text-gray-600" size={20} />
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-gray-400">&lt;</span>
              <RiMenuLine className="text-gray-600" size={16} />
            </div>
          )}
        </button>
      </div>

      {/* Search Bar */}
      {!isCollapsed && (
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search"
            className="w-full px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1">
        <ul className="space-y-2 text-gray-700 text-sm">
          <li>
            <button
              className={`flex items-center gap-2 px-2 py-2 rounded hover:bg-blue-50 w-full text-left ${typeof window !== 'undefined' && window.location.pathname === '/super-bank' ? 'font-bold text-blue-700' : ''}`}
              onClick={onSuperBankClick}
              title="Super Bank"
            >
              <RiBankLine /> 
              {!isCollapsed && <span>Super Bank</span>}
            </button>
          </li>
          <li>
            {!isCollapsed && <div className="px-2 py-2 text-xs text-gray-400 uppercase tracking-wider">Banks</div>}
            <ul>
              {banks.map(bank => (
                <li key={bank.id}>
                  <button
                    className={`flex items-center w-full gap-2 px-2 py-2 rounded hover:bg-blue-50 transition ${pathname.includes(`/banks/${bank.id}`) ? 'bg-blue-50 font-bold text-blue-700' : ''}`}
                    onClick={() => {
                      handleExpand(bank.id);
                      handleBankClick(bank);
                    }}
                    title={bank.bankName}
                  >
                    {!isCollapsed && (expandedBank === bank.id ? <RiArrowDownSLine /> : <RiArrowRightSLine />)}
                    <RiBankLine />
                    {!isCollapsed && <span className="flex-1 text-left">{bank.bankName}</span>}
                  </button>
                  {!isCollapsed && expandedBank === bank.id && (
                    <ul className="ml-8 mt-1 space-y-1">
                      {/* Account Section */}
                      <li>
                        <button
                          className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-100 text-xs w-full text-left ${pathname.includes(`/banks/${bank.id}/accounts`) ? 'text-blue-700 font-semibold' : ''}`}
                          onClick={() => handleBankSectionClick('accounts', bank.id)}
                        >
                          {isSectionExpanded(bank.id, 'accounts') ? <RiArrowDownSLine size={12} /> : <RiArrowRightSLine size={12} />}
                          <RiAccountPinCircleLine size={14} /> Account
                        </button>
                        {isSectionExpanded(bank.id, 'accounts') && accounts[bank.id] && (
                          <ul className="ml-6 mt-1 space-y-1">
                            {accounts[bank.id].length === 0 && (
                              <li className="text-xs text-gray-400 italic ml-4">No accounts</li>
                            )}
                            {accounts[bank.id].map(account => (
                              <li key={account.id}>
                                <button
                                  className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-100 text-xs w-full text-left ${pathname.includes(`/accounts/${account.id}`) ? 'text-blue-700 font-semibold' : ''}`}
                                  onClick={() => onAccountClick && onAccountClick(account, bank.id)}
                                >
                                  <RiAccountPinCircleLine size={12} /> {account.accountHolderName}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>

                      {/* Files Section */}
                      <li>
                        <button
                          className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-100 text-xs w-full text-left ${pathname.includes(`/banks/${bank.id}/files`) ? 'text-blue-700 font-semibold' : ''}`}
                          onClick={() => handleBankSectionClick('files', bank.id)}
                        >
                          {isSectionExpanded(bank.id, 'files') ? <RiArrowDownSLine size={12} /> : <RiArrowRightSLine size={12} />}
                          <RiFileList3Line size={14} /> Files
                        </button>
                      </li>

                      {/* Transaction Section */}
                      <li>
                        <button
                          className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-100 text-xs w-full text-left ${pathname.includes(`/banks/${bank.id}/transactions`) ? 'text-blue-700 font-semibold' : ''}`}
                          onClick={() => handleBankSectionClick('transactions', bank.id)}
                        >
                          <RiTimeLine size={14} /> Transaction
                        </button>
                      </li>

                      {/* Statement Section */}
                      <li>
                        <button
                          className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-100 text-xs w-full text-left ${pathname.includes(`/banks/${bank.id}/statements`) ? 'text-blue-700 font-semibold' : ''}`}
                          onClick={() => handleBankSectionClick('statements', bank.id)}
                        >
                          {isSectionExpanded(bank.id, 'statements') ? <RiArrowDownSLine size={12} /> : <RiArrowRightSLine size={12} />}
                          <RiFileTextLine size={14} /> Statement
                        </button>
                      </li>
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

export default React.memo(BanksSidebar);