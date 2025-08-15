'use client';
import { useState, useEffect } from 'react';
import AccountsClient from '../sub-pages/accounts/AccountsClient';
import StatementsPage from '../sub-pages/statements/page';
import SuperBankPage from '../super-bank/page';
import CreateBankModal from '../components/Modals/CreateBankModal';
import { RiBankLine, RiCloseLine, RiEdit2Line, RiDeleteBin6Line } from 'react-icons/ri';
import { Bank } from '../types/aws';
import { useRouter, usePathname } from 'next/navigation';
import BanksSidebar from '../components/BanksSidebar';
import { useAuth } from '../hooks/useAuth';
import BankFilesComponent from '../components/BankFilesComponent';

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
    <div className="flex h-screen bg-gray-50">
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
        <div className="bg-white border-b border-gray-200 px-6">
          <div className="flex items-center space-x-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center space-x-2 ${
                activeTab === tab.key
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
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

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                  {error.includes('AWS configuration') && (
                    <p className="text-sm mt-2">
                      Please check your .env.local file and ensure AWS credentials are properly configured.
                    </p>
                  )}
                </div>
              )}
              
              <CreateBankModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditBank(null); }}
                onCreate={handleCreateBank}
                editBank={editBank}
                onUpdate={handleUpdateBank}
              />


              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isFetching ? (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    Loading banks...
                  </div>
                ) : banks.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <RiBankLine className="text-gray-400" size={32} />
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-2">No banks added yet</p>
                    <p className="text-sm text-gray-500">Click &quot;Add Bank&quot; to get started</p>
                  </div>
                ) : isLoadingStats ? (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    Loading bank statistics...
                  </div>
                ) : (
                  banks.map((bank) => (
                    <div
                      key={bank.id}
                      onClick={() => handleBankCardClick(bank)}
                      className="cursor-pointer bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 group relative overflow-hidden"
                    >
                      {/* Background Pattern */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-transparent rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
                      
                      {/* Edit/Delete Buttons */}
                      {user?.email === adminEmail && (
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            className="p-2 bg-white hover:bg-blue-50 rounded-full shadow-sm border border-gray-200"
                            onClick={e => { e.stopPropagation(); handleEditBank(bank); }}
                            title="Edit Bank"
                          >
                            <RiEdit2Line className="text-blue-600" size={16} />
                          </button>
                          <button
                            className="p-2 bg-white hover:bg-red-50 rounded-full shadow-sm border border-gray-200"
                            onClick={e => { e.stopPropagation(); handleDeleteBank(bank.id); }}
                            title="Delete Bank"
                          >
                            <RiDeleteBin6Line className="text-red-600" size={16} />
                          </button>
                        </div>
                      )}
                      
                      {/* Bank Header */}
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                          <RiBankLine className="text-white" size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{bank.bankName}</h3>
                          <p className="text-sm text-gray-500">Financial Institution</p>
                        </div>
                      </div>
                      
                      {/* Bank Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Accounts</span>
                            <span className="text-lg font-bold text-blue-600">
                              {typeof bankStats[bank.id]?.accounts === 'number' ? bankStats[bank.id].accounts : 0}
                            </span>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Transactions</span>
                            <span className="text-lg font-bold text-green-600">
                              {typeof bankStats[bank.id]?.transactions === 'number' ? bankStats[bank.id].transactions.toLocaleString() : '0'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex space-x-2">
                        <div className="flex-1 bg-blue-100 hover:bg-blue-200 rounded-lg p-2 text-center transition-colors">
                          <span className="text-xs font-medium text-blue-700">View Accounts</span>
                        </div>
                        <div className="flex-1 bg-green-100 hover:bg-green-200 rounded-lg p-2 text-center transition-colors">
                          <span className="text-xs font-medium text-green-700">View Reports</span>
                        </div>
                      </div>
                      
                      {/* Status Indicator */}
                      <div className="absolute bottom-3 left-3">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-500">Active</span>
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
              return <AccountsClient bankId={tab.bankId} onAccountClick={account => handleAccountClick(account, tab.bankId!)} allTags={allTags} />;
            }
            if (tab?.type === 'statements' && tab.bankId) {
              return <StatementsPage />;
            }
            if (tab?.type === 'files' && tab.bankId) {
              return <BankFilesComponent bankId={tab.bankId} bankName={banks.find(b => b.id === tab.bankId)?.bankName || ''} />;
            }
            if (tab?.type === 'transactions' && tab.bankId) {
              return (
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Transactions for {banks.find(b => b.id === tab.bankId)?.bankName}</h2>
                  <p className="text-gray-600">Transactions management interface will be implemented here.</p>
                </div>
              );
            }
            if (tab?.type === 'super-bank') {
              return <SuperBankPage />;
            }
            return <div>Custom Tab Content</div>;
          })()}
        </div>
      </div>
    </div>
  );
} 