'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { RiBankLine, RiAccountPinCircleLine, RiArrowRightSLine, RiArrowDownSLine, RiFileList3Line, RiTimeLine, RiSearchLine, RiCircleFill, RiAddLine, RiEdit2Line, RiDeleteBin6Line } from 'react-icons/ri';
import { useAuth } from '../hooks/useAuth';
import { Bank } from '../types/aws';
import ChildSidebar from './ChildSidebar';

interface Account {
  id: string;
  accountHolderName: string;
}

interface BanksSidebarProps {
  banks?: Bank[];
  onSuperBankClick?: () => void;
  onBankClick?: (bank: Bank) => void;
  onAccountClick?: (account: { id: string; accountHolderName: string }, bankId: string) => void;
  onBankSectionClick?: (section: string, bankId: string) => void;
  onAddBankClick?: () => void;
  onEditBankClick?: (bank: Bank) => void;
  onDeleteBankClick?: (bankId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
  // When rendered inside /banks, the URL stays /banks, so use the active tab type for highlighting
  activeTabType?: 'overview' | 'accounts' | 'statements' | 'super-bank' | 'files' | 'transactions' | string;
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
  banks: propBanks,
  onSuperBankClick, 
  onBankClick, 
  onAccountClick, 
  onBankSectionClick,
  onAddBankClick,
  onEditBankClick,
  onDeleteBankClick,
  isCollapsed = false,
  onToggleCollapse,
  width = 320,
  onWidthChange,
  activeTabType
}: BanksSidebarProps) {
  const [localBanks, setLocalBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<{ [bankId: string]: Account[] }>({});
  const [expandedBank, setExpandedBank] = useState<string | null>(null);
  const [expandedBankSections, setExpandedBankSections] = useState<{ [bankId: string]: string[] }>({});
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  
  // Use prop banks if provided, otherwise use local state
  const banks = propBanks || localBanks;

  // Currently selected bank from URL param, e.g. /banks?bankId=xyz
  const selectedBankId = searchParams?.get('bankId') || null;

  useEffect(() => {
    // Only fetch banks if no prop banks are provided
    if (!propBanks) {
      fetch(`/api/bank`)
        .then(res => res.json())
        .then(data => setLocalBanks(Array.isArray(data) ? data : []));
    }
  }, [propBanks]);

  // Fetch accounts for a bank when expanded
  const handleExpand = useCallback((bankId: string) => {
    const isCurrentlyExpanded = expandedBank === bankId;
    setExpandedBank(prev => prev === bankId ? null : bankId);
    
    // If expanding the bank, also expand the accounts section
    if (!isCurrentlyExpanded) {
      setExpandedBankSections(prev => ({
        ...prev,
        [bankId]: [...(prev[bankId] || []), 'accounts']
      }));
    }
    
    const userId = typeof window !== "undefined" ? localStorage.getItem('userId') : null;
    if (!accounts[bankId] && userId) {
      fetch(`/api/account?bankId=${bankId}&userId=${userId}`)
        .then(res => res.json())
        .then(data => setAccounts(prev => ({ ...prev, [bankId]: Array.isArray(data) ? data : [] })));
    }
  }, [accounts, expandedBank]);

  const handleBankClick = useCallback((bank: Bank) => {
    if (onBankClick) {
      onBankClick(bank);
    }
  }, [onBankClick]);

  const handleBankSectionClick = useCallback((section: string, bankId: string) => {
    // Toggle section expansion
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

  // Auto-expand and preload accounts for the selected bank from URL
  useEffect(() => {
    if (!selectedBankId) return;
    setExpandedBank(selectedBankId);
    const userId = typeof window !== "undefined" ? localStorage.getItem('userId') : null;
    if (!accounts[selectedBankId] && userId) {
      fetch(`/api/account?bankId=${selectedBankId}&userId=${userId}`)
        .then(res => res.json())
        .then(data => setAccounts(prev => ({ ...prev, [selectedBankId]: Array.isArray(data) ? data : [] })));
    }
  }, [selectedBankId, accounts]);

  return (
    <ChildSidebar
      title="Banks"
      subtitle="Bank management"
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse || (() => {})}
      width={width}
      onWidthChange={onWidthChange || (() => {})}
      minWidth={200}
      maxWidth={500}
    >
      {/* Search Bar */}
      {!isCollapsed && (
        <div className="mb-3">
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
              className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/50 w-full text-left transition-all duration-150 ${
                (typeof window !== 'undefined' && window.location.pathname === '/super-bank') || activeTabType === 'super-bank'
                  ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold border-l-2 border-purple-500' 
                  : 'hover:border-l-2 hover:border-purple-200 dark:hover:border-purple-600'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              onClick={onSuperBankClick}
              title="Super Bank"
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                (typeof window !== 'undefined' && window.location.pathname === '/super-bank') || activeTabType === 'super-bank'
                  ? 'bg-purple-600 text-white'
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
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Banks</h3>
                {user?.email === adminEmail && onAddBankClick && (
                  <button
                    onClick={onAddBankClick}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Add Bank"
                  >
                    <RiAddLine size={14} className="text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>
            )}

            <ul className="mt-1">
              {banks.map(bank => (
                <li key={bank.id} className="relative group">
                  <div className={`flex items-center w-full gap-2 px-3 py-2 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/50 transition-all duration-150 ${
                    (selectedBankId === bank.id || pathname.includes(`/banks/${bank.id}`)) && activeTabType !== 'super-bank'
                      ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold border-l-2 border-purple-500'
                      : 'hover:border-l-2 hover:border-purple-200 dark:hover:border-purple-600'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}>
                    <button
                      onClick={() => handleBankClick(bank)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                        (selectedBankId === bank.id || pathname.includes(`/banks/${bank.id}`)) && activeTabType !== 'super-bank'
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {isCollapsed ? (
                          <span className="text-xs font-semibold">
                            {getBankInitials(bank.bankName)}
                          </span>
                        ) : (
                          <RiBankLine size={16} />
                        )}
                      </div>
                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{bank.bankName}</div>
                        </div>
                      )}
                    </button>

                    {/* Action Buttons */}
                    {!isCollapsed && user?.email === adminEmail && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEditBankClick && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditBankClick(bank);
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                            title="Edit Bank"
                          >
                            <RiEdit2Line size={12} className="text-gray-500 dark:text-gray-400" />
                          </button>
                        )}
                        {onDeleteBankClick && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteBankClick(bank.id);
                            }}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
                            title="Delete Bank"
                          >
                            <RiDeleteBin6Line size={12} className="text-red-500" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Expand/Collapse Button */}
                    {!isCollapsed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpand(bank.id);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        title={expandedBank === bank.id ? "Collapse" : "Expand"}
                      >
                        {expandedBank === bank.id ? (
                          <RiArrowDownSLine size={14} className="text-gray-500 dark:text-gray-400" />
                        ) : (
                          <RiArrowRightSLine size={14} className="text-gray-500 dark:text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>


                  {/* Expanded Bank Content */}
                  {expandedBank === bank.id && !isCollapsed && (
                    <div className="ml-4 mt-1 space-y-1">
                      {/* Bank Sections */}
                      <div className="space-y-1">
                        {['accounts', 'files', 'transactions'].map(section => (
                          <div key={section}>
                            <button
                              onClick={() => handleBankSectionClick(section, bank.id)}
                              className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-purple-50 dark:hover:bg-purple-700/50 w-full text-left transition-colors ${
                                isSectionExpanded(bank.id, section)
                                  ? 'bg-purple-100 dark:bg-purple-700 text-purple-900 dark:text-purple-100'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {section === 'accounts' && <RiAccountPinCircleLine size={12} />}
                              {section === 'files' && <RiFileList3Line size={12} />}
                              {section === 'transactions' && <RiTimeLine size={12} />}
                              <span className="capitalize">{section}</span>
                            </button>
                            
                            {/* Show accounts under the Accounts section */}
                            {section === 'accounts' && isSectionExpanded(bank.id, 'accounts') && accounts[bank.id] && accounts[bank.id].length > 0 && (
                              <div className="ml-4 mt-1 space-y-1">
                                {accounts[bank.id].map(account => (
                                  <button
                                    key={account.id}
                                    onClick={() => onAccountClick?.(account, bank.id)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-purple-50 dark:hover:bg-purple-700/50 w-full text-left transition-colors text-gray-600 dark:text-gray-400"
                                  >
                                    <RiCircleFill size={8} className="text-gray-400" />
                                    <span className="truncate">{account.accountHolderName}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </ChildSidebar>
  );
}

export default React.memo(BanksSidebar);