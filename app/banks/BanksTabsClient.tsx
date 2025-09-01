'use client';
import { useState, useEffect } from 'react';
import AccountsClient from '../sub-pages/accounts/AccountsClient';
import StatementsPage from '../sub-pages/statements/page';
import SuperBankPage from '../super-bank/page';
import ErrorBoundary from '../components/ErrorBoundary';
import CreateBankModal from '../components/Modals/CreateBankModal';
import { RiBankLine, RiCloseLine, RiEdit2Line, RiDeleteBin6Line, RiAddLine, RiAccountPinCircleLine } from 'react-icons/ri';
import { Bank } from '../types/aws';
import { useRouter, usePathname } from 'next/navigation';
import BanksSidebar from '../components/BanksSidebar';
import { useAuth } from '../hooks/useAuth';
import BankFilesComponent from '../components/BankFilesComponent';
import BankTransactionsPage from '../components/BankTransactionsPage';

// Define a type for tabs
interface Tab {
  key: string;
  label: string;
  type: 'overview' | 'accounts' | 'statements' | 'super-bank' | 'files' | 'transactions';
  bankId?: string;
  accountId?: string;
  accountName?: string;
}

export default function BanksTabsClient() {
  const [tabs, setTabs] = useState<Tab[]>([{ key: 'super-bank', label: 'Super Bank', type: 'super-bank' }]);
  const [activeTab, setActiveTab] = useState('super-bank');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editBank, setEditBank] = useState<Bank | null>(null);
  const [allTags, setAllTags] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [bankStats, setBankStats] = useState<{ [bankId: string]: { accounts: number; transactions: number } }>({});
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const adminEmail = 'nitesh.inkhub@gmail.com';

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setError(null);
        const response = await fetch('/api/bank');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch banks');
        }
        const data = await response.json();
        setBanks(data);
      } catch (error) {
        console.error('Error fetching banks:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch banks. Please check your AWS configuration.');
      } finally {
        setIsFetching(false);
      }
    };
    fetchBanks();
  }, []);

  // Fetch tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          const response = await fetch(`/api/tags?userId=${userId}`);
          if (response.ok) {
            const tags = await response.json();
            setAllTags(Array.isArray(tags) ? tags : []);
          }
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };
    fetchTags();
  }, []);

  // Fetch bank statistics
  useEffect(() => {
    const fetchBankStats = async () => {
      try {
        setIsLoadingStats(true);
        const userId = localStorage.getItem('userId');
        if (userId && banks.length > 0) {
          // Fetch all accounts and transactions in parallel
          const [accountsResponse, transactionsResponse] = await Promise.all([
            fetch(`/api/account?bankId=all&userId=${userId}`),
            fetch(`/api/transactions/all?userId=${userId}`)
          ]);

          const allAccounts = accountsResponse.ok ? await accountsResponse.json() : [];
          const allTransactions = transactionsResponse.ok ? await transactionsResponse.json() : [];

          console.log('Fetched accounts:', allAccounts);
          console.log('Fetched transactions:', allTransactions);

          // Process data efficiently
          const stats: { [bankId: string]: { accounts: number; transactions: number } } = {};
          
          banks.forEach(bank => {
            const bankAccounts = Array.isArray(allAccounts) 
              ? allAccounts.filter((acc: { bankId: string }) => acc.bankId === bank.id)
              : [];
            
            const bankTransactions = Array.isArray(allTransactions) 
              ? allTransactions.filter((tx: { bankId: string }) => tx.bankId === bank.id)
              : [];
            
            console.log(`Bank ${bank.bankName} (${bank.id}):`, {
              accounts: bankAccounts.length,
              transactions: bankTransactions.length,
              accountIds: bankAccounts.map((acc: { id: string }) => acc.id),
              transactionIds: bankTransactions.slice(0, 3).map((tx: { id: string }) => tx.id)
            });
            
            stats[bank.id] = {
              accounts: bankAccounts.length,
              transactions: bankTransactions.length
            };
          });
          
          setBankStats(stats);
        }
      } catch (error) {
        console.error('Error fetching bank stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    if (banks.length > 0) {
      fetchBankStats();
    }
  }, [banks]);

  const handleCreateBank = async (bankName: string, tags: string[]) => {
    const exists = banks.some(
      b => b.bankName.trim().toLowerCase() === bankName.trim().toLowerCase()
    );
    if (exists) {
      alert("A bank with this name already exists.");
      return;
    }
    setError(null);
    try {
      const response = await fetch('/api/bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bankName, tags }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create bank');
      }
      const newBank = await response.json();
      setBanks((prev) => [...prev, newBank]);
    } catch (error) {
      console.error('Error creating bank:', error);
      setError(error instanceof Error ? error.message : 'Failed to create bank. Please try again.');
    }
  };

  const handleUpdateBank = async (id: string, bankName: string, tags: string[]) => {
    try {
      const response = await fetch(`/api/bank/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName, tags }),
      });
      if (!response.ok) throw new Error('Failed to update bank');
      const updatedBank = await response.json();
      setBanks(prev => prev.map(b => b.id === id ? updatedBank : b));
      setEditBank(null);
      setIsModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update bank');
    }
  };

  const handleBankCardClick = (bank: Bank) => {
    const tabKey = `accounts-${bank.id}`;
    if (tabs.some(tab => tab.key === tabKey)) {
      setActiveTab(tabKey);
      router.push(`${pathname}?bankId=${bank.id}`);
      return;
    }
    setTabs([...tabs, { key: tabKey, label: bank.bankName, type: 'accounts', bankId: bank.id }]);
    setActiveTab(tabKey);
    router.push(`${pathname}?bankId=${bank.id}`);
  };

  const handleAccountClick = (account: { id: string; accountHolderName: string }, bankId: string) => {
    const tabKey = `statements-${bankId}-${account.id}`;
    if (tabs.some(tab => tab.key === tabKey)) {
      setActiveTab(tabKey);
      router.push(`${pathname}?bankId=${bankId}&accountId=${account.id}`);
      return;
    }
    setTabs([...tabs, { 
        key: tabKey,
        label: account.accountHolderName,
        type: 'statements',
        bankId,
        accountId: account.id,
      accountName: account.accountHolderName
    }]);
    setActiveTab(tabKey);
    router.push(`${pathname}?bankId=${bankId}&accountId=${account.id}`);
  };

  const handleCloseTab = (tabKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = tabs.filter(tab => tab.key !== tabKey);
    if (newTabs.length === 0) {
      setTabs([{ key: 'overview', label: 'Overview', type: 'overview' }]);
      setActiveTab('overview');
    } else {
    setTabs(newTabs);
      if (activeTab === tabKey) {
        setActiveTab(newTabs[newTabs.length - 1].key);
      }
    }
  };

  const handleEditBank = (bank: Bank) => {
    setEditBank(bank);
    setIsModalOpen(true);
  };

  const handleDeleteBank = async (bankId: string) => {
    if (!confirm('Are you sure you want to delete this bank? This will also delete all associated accounts, statements, and transactions.')) {
      return;
    }
    try {
      const response = await fetch(`/api/bank/${bankId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete bank');
      setBanks(prev => prev.filter(b => b.id !== bankId));
      const message = 'Bank deleted successfully. All associated accounts, statements, and transactions have also been deleted.';
      alert(message);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete bank');
    }
  };

  // Render tab bar and content
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <BanksSidebar 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => {
          // Prevent rapid toggles with immediate state update
          setIsSidebarCollapsed(prev => !prev);
        }}
        onSuperBankClick={() => {
          const tabKey = 'super-bank';
          if (tabs.some(tab => tab.key === tabKey)) {
            setActiveTab(tabKey);
            return;
          }
          setTabs([...tabs, { key: tabKey, label: 'Super Bank', type: 'super-bank' }]);
          setActiveTab(tabKey);
        }}
        onBankClick={(bank) => {
          const tabKey = `accounts-${bank.id}`;
          if (tabs.some(tab => tab.key === tabKey)) {
            setActiveTab(tabKey);
            router.push(`${pathname}?bankId=${bank.id}`);
            return;
          }
          setTabs([...tabs, { key: tabKey, label: bank.bankName, type: 'accounts', bankId: bank.id }]);
          setActiveTab(tabKey);
          router.push(`${pathname}?bankId=${bank.id}`);
        }}
        onAccountClick={handleAccountClick}
        onBankSectionClick={(section, bankId) => {
          const bank = banks.find(b => b.id === bankId);
          if (!bank) return;

          let tabKey: string;
          let tabLabel: string;
          let tabType: Tab['type'];

          switch (section) {
            case 'accounts':
              tabKey = `accounts-${bankId}`;
              tabLabel = `${bank.bankName} - Accounts`;
              tabType = 'accounts';
              break;
            case 'files':
              tabKey = `files-${bankId}`;
              tabLabel = `${bank.bankName} - Files`;
              tabType = 'files';
              break;
            case 'transactions':
              tabKey = `transactions-${bankId}`;
              tabLabel = `${bank.bankName} - Transactions`;
              tabType = 'transactions';
              break;
            case 'statements':
              tabKey = `statements-${bankId}`;
              tabLabel = `${bank.bankName} - Statements`;
              tabType = 'statements';
              break;
            default:
              return;
          }

          if (tabs.some(tab => tab.key === tabKey)) {
            setActiveTab(tabKey);
            return;
          }

          setTabs([...tabs, { 
            key: tabKey, 
            label: tabLabel, 
            type: tabType, 
            bankId: bankId 
          }]);
          setActiveTab(tabKey);
        }}
      />
      <div className="flex-1 flex flex-col">
       

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
          <div className="flex items-center space-x-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center space-x-2 ${
                activeTab === tab.key
                    ? 'border-blue-600 text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
                <span>{tab.label}</span>
              {tab.key !== 'overview' && (
                <RiCloseLine 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={(e) => handleCloseTab(tab.key, e)}
                />
              )}
            </button>
          ))}
        </div>
        </div>

        {/* Enhanced Main Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="p-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Error</p>
                      <p className="text-xs">{error}</p>
                      {error.includes('AWS configuration') && (
                        <p className="text-xs mt-1">
                          Please check your .env.local file and ensure AWS credentials are properly configured.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <CreateBankModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditBank(null); }}
                onCreate={handleCreateBank}
                editBank={editBank}
                onUpdate={handleUpdateBank}
              />

              {/* Compact Header Section */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold mb-1">Bank Management</h1>
                    <p className="text-blue-100 text-sm">Manage your financial institutions and accounts</p>
                  </div>
                  <div className="hidden md:block">
                    <div className="text-right">
                      <div className="text-xl font-bold">{banks.length}</div>
                      <div className="text-blue-100 text-sm">Total Banks</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Compact Bank Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {isFetching ? (
                  <div className="col-span-full text-center py-12">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Loading banks...</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Please wait while we fetch your financial data</p>
                  </div>
                ) : banks.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <RiBankLine className="text-blue-600 dark:text-blue-400" size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No banks added yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto text-sm">Get started by adding your first bank to begin managing your financial accounts and transactions.</p>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm"
                    >
                      <RiAddLine size={18} />
                      Add Your First Bank
                    </button>
                  </div>
                ) : isLoadingStats ? (
                  <div className="col-span-full text-center py-12">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Loading bank statistics...</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing your financial data</p>
                  </div>
                ) : (
                  banks.map((bank) => (
                    <div
                      key={bank.id}
                      onClick={() => handleBankCardClick(bank)}
                      className="group cursor-pointer bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden"
                    >
                      {/* Compact Background Pattern */}
                      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-blue-100 via-purple-100 to-transparent rounded-full opacity-30 transform translate-x-14 -translate-y-14 group-hover:scale-110 transition-transform duration-300"></div>
                      
                      {/* Compact Edit/Delete Buttons */}
                      {user?.email === adminEmail && (
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                          <button
                            className="p-1.5 bg-white/90 backdrop-blur-sm hover:bg-blue-50 rounded-lg shadow border border-gray-200 hover:scale-110 transition-all duration-200"
                            onClick={e => { e.stopPropagation(); handleEditBank(bank); }}
                            title="Edit Bank"
                          >
                            <RiEdit2Line className="text-blue-600" size={14} />
                          </button>
                          <button
                            className="p-1.5 bg-white/90 backdrop-blur-sm hover:bg-red-50 rounded-lg shadow border border-gray-200 hover:scale-110 transition-all duration-200"
                            onClick={e => { e.stopPropagation(); handleDeleteBank(bank.id); }}
                            title="Delete Bank"
                          >
                            <RiDeleteBin6Line className="text-red-600" size={14} />
                          </button>
                        </div>
                      )}
                      
                      {/* Compact Bank Header */}
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow">
                          <RiBankLine className="text-white" size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{bank.bankName}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Financial Institution</p>
                        </div>
                      </div>
                      
                      {/* Compact Bank Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/50 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-semibold">Accounts</span>
                              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                {typeof bankStats[bank.id]?.accounts === 'number' ? bankStats[bank.id].accounts : 0}
                              </div>
                            </div>
                            <div className="w-6 h-6 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                              <RiAccountPinCircleLine className="text-blue-600 dark:text-blue-400" size={12} />
                            </div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/50 rounded-lg p-3 border border-green-200 dark:border-green-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide font-semibold">Transactions</span>
                              <div className="text-lg font-bold text-green-700 dark:text-green-300">
                                {typeof bankStats[bank.id]?.transactions === 'number' ? bankStats[bank.id].transactions.toLocaleString() : '0'}
                              </div>
                            </div>
                            <div className="w-6 h-6 bg-green-200 dark:bg-green-800 rounded-lg flex items-center justify-center">
                              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm2 6a2 2 0 00-2 2v4a2 2 0 002 2h8a2 2 0 002-2v-4a2 2 0 00-2-2H6z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Compact Quick Actions */}
                      <div className="flex space-x-2">
                        <div className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg p-2 text-center transition-all duration-200 group-hover:shadow-lg">
                          <span className="text-xs font-semibold text-white">View Accounts</span>
                        </div>
                        <div className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg p-2 text-center transition-all duration-200 group-hover:shadow-lg">
                          <span className="text-xs font-semibold text-white">View Reports</span>
                        </div>
                      </div>
                      
                      {/* Compact Status Indicator */}
                      <div className="absolute bottom-3 left-3">
                        <div className="flex items-center space-x-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Active</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {activeTab !== 'overview' && (() => {
            const tab = tabs.find(t => t.key === activeTab);
            if (tab?.type === 'accounts' && tab.bankId) {
              return (
                <ErrorBoundary>
                  <AccountsClient bankId={tab.bankId} onAccountClick={account => handleAccountClick(account, tab.bankId!)} allTags={allTags} />
                </ErrorBoundary>
              );
            }
            if (tab?.type === 'statements' && tab.bankId) {
              return (
                <ErrorBoundary>
                  <StatementsPage />
                </ErrorBoundary>
              );
            }
            if (tab?.type === 'files' && tab.bankId) {
              return <BankFilesComponent bankId={tab.bankId} bankName={banks.find(b => b.id === tab.bankId)?.bankName || ''} />;
            }
            if (tab?.type === 'transactions' && tab.bankId) {
              const bank = banks.find(b => b.id === tab.bankId);
              if (bank) {
                return <BankTransactionsPage bankName={bank.bankName} />;
              }
              return (
                <div className="p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Transactions</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Bank not found.</p>
                  </div>
                </div>
              );
            }
            if (tab?.type === 'super-bank') {
              return (
                <ErrorBoundary>
                  <SuperBankPage />
                </ErrorBoundary>
              );
            }
            return <div>Custom Tab Content</div>;
          })()}
        </div>
      </div>
    </div>
  );
} 
