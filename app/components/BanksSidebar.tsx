'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { RiBankLine, RiAccountPinCircleLine, RiArrowRightSLine, RiFileList3Line, RiTimeLine, RiMenuLine, RiSearchLine, RiCircleFill } from 'react-icons/ri';

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

// Helper function to get bank initials
const getBankInitials = (bankName: string): string => {
  const words = bankName.split(' ').filter(word => word.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
};

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
  const [hoveredBank, setHoveredBank] = useState<string | null>(null);
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
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-200 ease-out relative`}>
      {/* Toggle Button */}
      <div className="flex justify-end items-center p-2 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-150"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <RiMenuLine className="text-gray-600 dark:text-gray-300" size={18} />
          ) : (
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <span className="text-xs">&lt;</span>
              <RiMenuLine className="text-gray-600 dark:text-gray-300" size={14} />
            </div>
          )}
        </button>
      </div>

      {/* Search Bar */}
      {!isCollapsed && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
          <input
            type="text"
              placeholder="Search banks..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-2">
        <ul className="space-y-1 text-gray-700 dark:text-gray-300 text-sm">
          {/* Super Bank */}
          <li>
            <button
              className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/50 w-full text-left transition-all duration-150 ${
                typeof window !== 'undefined' && window.location.pathname === '/super-bank' 
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold border-l-2 border-blue-500' 
                  : 'hover:border-l-2 hover:border-blue-200 dark:hover:border-blue-600'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              onClick={onSuperBankClick}
              title="Super Bank"
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                typeof window !== 'undefined' && window.location.pathname === '/super-bank'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                <RiBankLine size={16} />
              </div>
              {!isCollapsed && <span className="text-sm font-semibold">Super Bank</span>}
            </button>
          </li>

          {/* Banks Section */}
          <li className="mt-4">
            {!isCollapsed && (
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 border-l-2 border-gray-200 dark:border-gray-600">
                Banks
              </div>
            )}
            <ul className="mt-1">
              {banks.map(bank => (
                <li key={bank.id} className="relative">
                  {/* Level 1: Bank Name (Bold) */}
                  <button
                    className={`flex items-center w-full gap-2 px-3 py-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-all duration-150 ${
                      pathname.includes(`/banks/${bank.id}`) 
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold border-l-2 border-blue-500' 
                        : 'hover:border-l-2 hover:border-blue-200 dark:hover:border-blue-600'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    onClick={() => {
                      handleExpand(bank.id);
                      handleBankClick(bank);
                    }}
                    onMouseEnter={() => setHoveredBank(bank.id)}
                    onMouseLeave={() => setHoveredBank(null)}
                    title={bank.bankName}
                  >
                    {!isCollapsed && (
                      <div className={`transition-transform duration-200 ${expandedBank === bank.id ? 'rotate-90' : ''}`}>
                        <RiArrowRightSLine size={14} className="text-gray-500" />
                      </div>
                    )}
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${
                      pathname.includes(`/banks/${bank.id}`)
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                    }`}>
                      {isCollapsed ? (
                        <span className="text-xs font-semibold">{getBankInitials(bank.bankName)}</span>
                      ) : (
                        <RiBankLine size={16} />
                      )}
                    </div>
                    {!isCollapsed && <span className="flex-1 text-left text-sm font-semibold">{bank.bankName}</span>}
                  </button>
                  
                  {/* Hover Expand Mini Drawer */}
                  {isCollapsed && hoveredBank === bank.id && (
                    <div className="absolute left-full top-0 ml-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 min-w-48 py-2">
                      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <RiBankLine size={16} className="text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{bank.bankName}</span>
                        </div>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="px-3 py-1">
                        <button
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-blue-50 dark:hover:bg-blue-900/50 text-gray-700 dark:text-gray-300"
                          onClick={() => handleBankSectionClick('accounts', bank.id)}
                        >
                          <RiAccountPinCircleLine size={13} />
                          <span>Accounts</span>
                        </button>
                        <button
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-blue-50 dark:hover:bg-blue-900/50 text-gray-700 dark:text-gray-300"
                          onClick={() => handleBankSectionClick('files', bank.id)}
                        >
                          <RiFileList3Line size={13} />
                          <span>Files</span>
                        </button>
                        <button
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-blue-50 dark:hover:bg-blue-900/50 text-gray-700 dark:text-gray-300"
                          onClick={() => handleBankSectionClick('transactions', bank.id)}
                        >
                          <RiTimeLine size={13} />
                          <span>Transactions</span>
                  </button>

                      </div>
                    </div>
                  )}
                  
                  {!isCollapsed && expandedBank === bank.id && (
                    <ul className="relative ml-3 mt-1 space-y-0.5">
                      {/* Visual connector line */}
                      <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-600"></div>
                      
                      {/* Level 2: Bank Sections (Normal weight) */}
                      <li>
                        <button
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs w-full text-left transition-all duration-150 relative ${
                            pathname.includes(`/banks/${bank.id}/accounts`) 
                              ? 'text-blue-700 dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-900/50' 
                              : 'text-gray-700 dark:text-gray-300 font-normal'
                          }`}
                          onClick={() => handleBankSectionClick('accounts', bank.id)}
                        >
                          <div className={`transition-transform duration-200 ${isSectionExpanded(bank.id, 'accounts') ? 'rotate-90' : ''}`}>
                            <RiArrowRightSLine size={12} />
                          </div>
                          <RiAccountPinCircleLine size={13} /> 
                          <span>Accounts</span>
                        </button>
                        
                        {/* Level 3: Account Items (Lighter gray, smaller font) */}
                        {isSectionExpanded(bank.id, 'accounts') && accounts[bank.id] && (
                          <ul className="relative ml-6 mt-1 space-y-0.5">
                            {/* Visual connector line for accounts */}
                            <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-600"></div>
                            
                            {accounts[bank.id].length === 0 && (
                              <li className="text-xs text-gray-400 dark:text-gray-500 italic ml-4 py-1">No accounts</li>
                            )}
                            {accounts[bank.id].map(account => (
                              <li key={account.id}>
                                <button
                                  className={`flex items-center gap-2 px-2 py-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs w-full text-left transition-all duration-150 relative ${
                                    pathname.includes(`/accounts/${account.id}`) 
                                      ? 'text-blue-700 dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-900/50' 
                                      : 'text-gray-500 dark:text-gray-400 font-normal'
                                  }`}
                                  onClick={() => onAccountClick && onAccountClick(account, bank.id)}
                                >
                                  <RiCircleFill size={8} className="text-gray-400 dark:text-gray-500" /> 
                                  <span className="truncate">{account.accountHolderName}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>

                      {/* Files Section */}
                      <li>
                        <button
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs w-full text-left transition-all duration-150 relative ${
                            pathname.includes(`/banks/${bank.id}/files`) 
                              ? 'text-blue-700 dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-900/50' 
                              : 'text-gray-700 dark:text-gray-300 font-normal'
                          }`}
                          onClick={() => handleBankSectionClick('files', bank.id)}
                        >
                          <div className={`transition-transform duration-200 ${isSectionExpanded(bank.id, 'files') ? 'rotate-90' : ''}`}>
                            <RiArrowRightSLine size={12} />
                          </div>
                          <RiFileList3Line size={13} /> 
                          <span>Files</span>
                        </button>
                      </li>

                      {/* Transaction Section */}
                      <li>
                        <button
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs w-full text-left transition-all duration-150 relative ${
                            pathname.includes(`/banks/${bank.id}/transactions`) 
                              ? 'text-blue-700 dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-900/50' 
                              : 'text-gray-700 dark:text-gray-300 font-normal'
                          }`}
                          onClick={() => handleBankSectionClick('transactions', bank.id)}
                        >
                          <RiTimeLine size={13} /> 
                          <span>Transactions</span>
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







