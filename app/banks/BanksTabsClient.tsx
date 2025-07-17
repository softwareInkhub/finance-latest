'use client';
import { useState, useEffect } from 'react';
import AccountsClient from '../sub-pages/accounts/AccountsClient';
import StatementsPage from '../sub-pages/statements/page';
import SuperBankPage from '../sub-pages/super-bank/page';
import CreateBankModal from '../components/Modals/CreateBankModal';
import { RiBankLine, RiAddLine, RiPriceTag3Line, RiCloseLine, RiEdit2Line, RiDeleteBin6Line } from 'react-icons/ri';
import { Bank } from '../types/aws';
import { useRouter, usePathname } from 'next/navigation';
import BanksSidebar from '../components/BanksSidebar';

// Define a type for tabs
interface Tab {
  key: string;
  label: string;
  type: 'overview' | 'accounts' | 'statements' | 'super-bank';
  bankId?: string;
  accountId?: string;
  accountName?: string;
}

export default function BanksTabsClient() {
  const [tabs, setTabs] = useState<Tab[]>([{ key: 'overview', label: 'Overview', type: 'overview' }]);
  const [activeTab, setActiveTab] = useState('overview');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editBank, setEditBank] = useState<Bank | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      fetch(`/api/users?id=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.email) setUserEmail(data.email);
        })
        .catch(() => setUserEmail(null));
    }
  }, []);

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
    const tabKey = `statements-${account.id}`;
    if (tabs.some(tab => tab.key === tabKey)) {
      setActiveTab(tabKey);
      router.push(`${pathname}?bankId=${bankId}&accountId=${account.id}`);
      return;
    }
    setTabs([
      ...tabs,
      {
        key: tabKey,
        label: account.accountHolderName,
        type: 'statements',
        bankId,
        accountId: account.id,
        accountName: account.accountHolderName,
      },
    ]);
    setActiveTab(tabKey);
    router.push(`${pathname}?bankId=${bankId}&accountId=${account.id}`);
  };

  // const handleSuperBankClick = () => {
  //   const tabKey = 'super-bank';
  //   if (tabs.some(tab => tab.key === tabKey)) {
  //     setActiveTab(tabKey);
  //     return;
  //   }
  //   setTabs([...tabs, { key: tabKey, label: 'Super Bank', type: 'super-bank' }]);
  //   setActiveTab(tabKey);
  // };

  const handleCloseTab = (tabKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabKey === 'overview') return;
    const newTabs = tabs.filter(tab => tab.key !== tabKey);
    setTabs(newTabs);
    if (activeTab === tabKey) setActiveTab('overview');
  };

  const handleEditBank = (bank: Bank) => {
    setEditBank(bank);
    setIsModalOpen(true);
  };

  const handleDeleteBank = async (bankId: string) => {
    const bank = banks.find(b => b.id === bankId);
    const bankName = bank?.bankName || 'this bank';
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${bankName}"?\n\n` +
      `⚠️  WARNING: This will also delete:\n` +
      `• ALL accounts under this bank\n` +
      `• ALL statement files uploaded for this bank\n` +
      `• ALL transactions from this bank\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      const response = await fetch(`/api/bank/${bankId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete bank');
      }
      
      const result = await response.json();
      setBanks(prev => prev.filter(b => b.id !== bankId));
      
      // Show success message with deletion counts
      let message = `Successfully deleted "${bankName}".`;
      if (result.deletedAccounts > 0 || result.deletedStatements > 0 || result.deletedTransactions > 0) {
        message += `\n\nAlso deleted:`;
        if (result.deletedAccounts > 0) {
          message += `\n• ${result.deletedAccounts} account(s)`;
        }
        if (result.deletedStatements > 0) {
          message += `\n• ${result.deletedStatements} statement file(s)`;
        }
        if (result.deletedTransactions > 0) {
          message += `\n• ${result.deletedTransactions} transaction(s)`;
        }
      }
      alert(message);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete bank');
    }
  };

  // Render tab bar and content
  return (
    <div className="flex h-screen">
      <BanksSidebar 
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
      />
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`px-5 py-2 rounded-t-lg text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                  : 'border-transparent text-gray-500 bg-transparent hover:text-blue-600'
              }`}
              style={{
                marginBottom: activeTab === tab.key ? '-2px' : '0',
                boxShadow: activeTab === tab.key ? '0 2px 8px 0 rgba(0,0,0,0.03)' : undefined,
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.key !== 'overview' && (
                <RiCloseLine 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={(e) => handleCloseTab(tab.key, e)}
                />
              )}
            </button>
          ))}
        </div>
        <div>
          {activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6 px-5">
              <div className="flex flex-row justify-between items-center gap-2 sm:gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-full text-blue-500 text-xl sm:text-2xl shadow">
                    <RiBankLine />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Banks</h1>
                </div>
                {userEmail === "nitesh.inkhub@gmail.com" && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 sm:px-5 py-2 rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold w-auto"
                  >
                    <RiAddLine className="text-lg sm:text-xl" />
                    <span className="block sm:hidden">Add</span>
                    <span className="hidden sm:block">Add Bank</span>
                  </button>
                )}
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded-lg">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {isFetching ? (
                  <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">
                    Loading banks...
                  </div>
                ) : banks.length === 0 ? (
                  <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">
                    No banks added yet. Click &quot;Add Bank&quot; to get started.
                  </div>
                ) : (
                  banks.map((bank) => (
                    <div
                      key={bank.id}
                      onClick={() => handleBankCardClick(bank)}
                      className="cursor-pointer relative bg-white/70 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-blue-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl group overflow-hidden"
                    >
                      {userEmail === "nitesh.inkhub@gmail.com" && (
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            className="p-1 bg-blue-100 hover:bg-blue-200 rounded-full"
                            onClick={e => { e.stopPropagation(); handleEditBank(bank); }}
                            title="Edit Bank"
                          >
                            <RiEdit2Line className="text-blue-600" />
                          </button>
                          <button
                            className="p-1 bg-red-100 hover:bg-red-200 rounded-full"
                            onClick={e => { e.stopPropagation(); handleDeleteBank(bank.id); }}
                            title="Delete Bank"
                          >
                            <RiDeleteBin6Line className="text-red-600" />
                          </button>
                        </div>
                      )}
                      <div className="absolute top-4 right-4 opacity-5 text-blue-500 text-4xl sm:text-5xl pointer-events-none select-none rotate-12">
                        <RiBankLine />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <span className="bg-blue-100 p-2 rounded-full text-blue-500 text-lg sm:text-xl shadow">
                          <RiBankLine />
                        </span>
                        {bank.bankName}
                      </h3>
                      <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                        {bank.tags.map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-xs rounded-full shadow border border-blue-200 font-medium"
                          >
                            <RiPriceTag3Line className="text-blue-400" /> {tag}
                          </span>
                        ))}
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
              return <AccountsClient bankId={tab.bankId} onAccountClick={account => handleAccountClick(account, tab.bankId!)} />;
            }
            if (tab?.type === 'statements' && tab.bankId && tab.accountId) {
              return <StatementsPage />;
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