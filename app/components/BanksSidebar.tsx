'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { RiBankLine, RiAccountPinCircleLine, RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';

interface Bank {
  id: string;
  bankName: string;
  tags: string[];
}

interface Account {
  id: string;
  accountHolderName: string;
}

interface BanksSidebarProps {
  onSuperBankClick?: () => void;
  onBankClick?: (bank: Bank) => void;
  onBankTransactionsClick?: (bank: Bank) => void;
  onBankStatementsClick?: (bank: Bank) => void;
  onAccountClick?: (account: { id: string; accountHolderName: string }, bankId: string) => void;
  onFileClick?: (file: any) => void;
}

export default function BanksSidebar({ onSuperBankClick, onBankClick, onBankTransactionsClick, onBankStatementsClick, onAccountClick, onFileClick }: BanksSidebarProps) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<{ [bankId: string]: Account[] }>({});
  const [expandedBank, setExpandedBank] = useState<string | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<{ [accountId: string]: boolean }>({});
  const [userAccounts, setUserAccounts] = useState<{ [accountId: string]: any[] }>({});
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/bank')
      .then(res => res.json())
      .then(data => setBanks(Array.isArray(data) ? data : []));
  }, []);



  // Fetch accounts and files for a bank when expanded
  const handleBankExpand = (bankId: string) => {
    setExpandedBank(expandedBank === bankId ? null : bankId);
    const userId = typeof window !== "undefined" ? localStorage.getItem('userId') : null;
    if (!accounts[bankId] && userId) {
      fetch(`/api/account?bankId=${bankId}&userId=${userId}`)
        .then(res => res.json())
        .then(data => setAccounts(prev => ({ ...prev, [bankId]: Array.isArray(data) ? data : [] })));
    }
  };

  // Fetch files for a bank
  const [bankFiles, setBankFiles] = useState<{ [bankId: string]: any[] }>({});
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  const handleSectionExpand = (sectionKey: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
    
    // If expanding files section, fetch files for that bank
    if (sectionKey.includes('-files') && !sectionKey.includes('expanded')) {
      const bankId = sectionKey.replace('-files', '');
      if (!bankFiles[bankId]) {
        fetchBankFiles(bankId);
      }
    }
  };

  const fetchBankFiles = (bankId: string) => {
    const userId = typeof window !== "undefined" ? localStorage.getItem('userId') : null;
    if (userId) {
      // Fetch actual files from the Files section
      fetch(`/api/files?userId=${userId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          // Filter files by bank name
          const bankName = banks.find(b => b.id === bankId)?.bankName || '';
          const bankFiles = Array.isArray(data) ? data.filter((file: any) => {
            // Check if file name contains bank name or if bank is associated
            const fileName = file.name || file.fileName || '';
            const fileBank = file.bank || file.bankName || '';
            return fileName.toLowerCase().includes(bankName.toLowerCase()) || 
                   fileBank.toLowerCase().includes(bankName.toLowerCase());
          }) : [];
          
          setBankFiles(prev => ({ ...prev, [bankId]: bankFiles }));
        })
        .catch(error => {
          console.error('Error fetching bank files:', error);
          // Show empty state instead of fallback files
          setBankFiles(prev => ({ ...prev, [bankId]: [] }));
        });
    }
  };

  const handleBankClick = (bank: Bank) => {
    if (onBankClick) {
      onBankClick(bank);
    }
  };

  const handleFileClick = (file: any) => {
    // If parent component provides a file click handler, use it
    if (onFileClick) {
      onFileClick(file);
      return;
    }
    
    // Default behavior: Create a new tab in the bank section
    if (typeof window !== 'undefined') {
      // Navigate to the bank page with the file ID as a parameter
      const bankId = file.bankId || '';
      const bankUrl = `/banks/${bankId}?fileId=${file.id}`;
      window.location.href = bankUrl;
    }
  };

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col py-4 px-2 ">
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
                      handleBankExpand(bank.id);
                      handleBankClick(bank);
                    }}
                  >
                    {expandedBank === bank.id ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                    <RiBankLine />
                    <span className="flex-1 text-left">{bank.bankName}</span>
                  </button>
                  {expandedBank === bank.id && (
                    <ul className="ml-8 mt-1 space-y-1">
                      {/* Accounts Section */}
                      <li>
                        <button
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-100 text-xs w-full text-left"
                          onClick={() => handleSectionExpand(`${bank.id}-accounts`)}
                        >
                          {expandedSections[`${bank.id}-accounts`] ? <RiArrowDownSLine size={12} /> : <RiArrowRightSLine size={12} />}
                          <RiAccountPinCircleLine /> Account
                        </button>
                        {expandedSections[`${bank.id}-accounts`] && accounts[bank.id] && (
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
                                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                  {account.accountHolderName}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>

                      {/* Files Section */}
                      <li>
                        <button
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-100 text-xs w-full text-left"
                          onClick={() => handleSectionExpand(`${bank.id}-files`)}
                        >
                          {expandedSections[`${bank.id}-files`] ? <RiArrowDownSLine size={12} /> : <RiArrowRightSLine size={12} />}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Files
                        </button>
                        {expandedSections[`${bank.id}-files`] && (
                          <ul className="ml-8 mt-1 space-y-1">
                            {!bankFiles[bank.id] && (
                              <li className="text-xs text-gray-400 italic">Loading files...</li>
                            )}
                            {bankFiles[bank.id] && bankFiles[bank.id].length === 0 && (
                              <li className="text-xs text-gray-400 italic">No files found</li>
                            )}
                            {bankFiles[bank.id] && bankFiles[bank.id].map((file: any, index: number) => (
                              <li key={index}>
                                <div 
                                  className="flex items-center gap-2 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 rounded cursor-pointer"
                                  onClick={() => handleFileClick(file)}
                                  title={`Click to open ${file.name}`}
                                >
                                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                  <span className="flex-1">{file.name}</span>
                                  <span className="text-gray-400 text-[10px] uppercase">{file.type}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>

                      {/* Transaction Section */}
                      <li>
                        <button
                          className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-100 text-xs w-full text-left ${pathname.includes(`/banks/${bank.id}`) && pathname.includes('transactions') ? 'text-blue-700 font-semibold bg-blue-50' : ''}`}
                          onClick={() => onBankTransactionsClick && onBankTransactionsClick(bank)} 
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Transaction
                        </button>
                      </li>

                      {/* Statement Section */}
                      <li>
                        <button
                          className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-100 text-xs w-full text-left ${pathname.includes(`/banks/${bank.id}`) && pathname.includes('statements') ? 'text-blue-700 font-semibold bg-blue-50' : ''}`}
                          onClick={() => onBankStatementsClick && onBankStatementsClick(bank)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Statement
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