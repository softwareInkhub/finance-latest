'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '../../components/Modals/Modal';
import { RiAccountPinCircleLine, RiAddLine, RiEdit2Line, RiDeleteBin6Line } from 'react-icons/ri';
import HeaderEditor from '../../components/HeaderEditor';
import ConfirmDeleteModal from '../../components/Modals/ConfirmDeleteModal';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';

interface Account {
  id: string;
  bankId: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  tags: string[];
}

interface AccountsClientProps {
  bankId: string | null;
  onAccountClick?: (account: Account) => void;
  allTags?: Array<{ id: string; name: string; color?: string }>;
}

// Add type definitions above the component
type Condition = {
  if: { field: string; op: string; value?: string };
  then: { [key: string]: string };
};

export default function AccountsClient({ bankId, onAccountClick, allTags = [] }: AccountsClientProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    tags: [] as string[],
  });
  const [bankName, setBankName] = useState<string>("");
  const [bankHeader, setBankHeader] = useState<string[]>([]);
  const [headerInputs, setHeaderInputs] = useState<string[]>([]);
  const [headerLoading, setHeaderLoading] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [headerSuccess, setHeaderSuccess] = useState<string | null>(null);
  const [headerEditing, setHeaderEditing] = useState(false);
  const [showMapping, setShowMapping] = useState(false);
  const [superHeaders, setSuperHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [mappingSuccess, setMappingSuccess] = useState<string | null>(null);
  const [newCond, setNewCond] = useState({ ifField: '', ifOp: '', ifValue: '', then: [{ field: '', value: '' }] });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; account: Account | null; loading: boolean }>({ open: false, account: null, loading: false });

  const isAbortError = (err: unknown): boolean => {
    // Robustly detect AbortError across browsers
    if (!err || typeof err !== 'object') return false;
    const anyErr = err as { name?: string; code?: number };
    return anyErr.name === 'AbortError' || anyErr.code === 20; // 20 = Legacy ABORT_ERR
  };

  useEffect(() => {
    if (!bankId) {
      setError('Bank ID is required');
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const fetchAccounts = async () => {
      try {
        console.log('Fetching accounts for bankId:', bankId);
        const userId = localStorage.getItem('userId');
        if (!userId) {
          if (isMounted) {
            setError('User ID not found');
            setIsLoading(false);
          }
          return;
        }
        
        // Set timeout for the request
        timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            controller.abort();
          }
        }, 30000); // 30 second timeout
        
        const response = await fetch(`/api/account?bankId=${bankId}&userId=${userId}`, {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Only update state if component is still mounted
        if (isMounted) {
          console.log('Accounts fetched successfully:', data);
          setAccounts(data);
          setError(null);
        }
      } catch (err) {
        // Silently handle expected aborts to avoid noisy console overlays in dev
        if (isAbortError(err)) {
          if (isMounted) {
            // Keep a debug log in development but don't emit a console.error
            console.debug('Accounts request aborted');
          }
          return;
        }
        console.error('Error fetching accounts:', err);
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'An error occurred while fetching accounts';
          if (message.includes('Failed to fetch')) {
            setError('Network error. Please check your connection and try again.');
          } else {
            setError(message);
          }
        }
      } finally {
        // Always clear the timeout to prevent memory leaks
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAccounts();

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Only abort if not already aborted to prevent unnecessary abort calls
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };
  }, [bankId]);

  useEffect(() => {
    if (!bankId) return;

    const controller = new AbortController();
    let isMounted = true;

    const fetchBankData = async () => {
      try {
        console.log('Fetching bank data for bankId:', bankId);
        const userId = localStorage.getItem('userId');
        if (!userId) {
          throw new Error('User ID not found');
        }
        
        const response = await fetch(`/api/bank?userId=${userId}`, {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const banks: { id: string; bankName: string }[] = await response.json();
        
        if (isMounted) {
          console.log('Bank data fetched successfully:', banks);
          const bank = Array.isArray(banks) ? banks.find((b) => b.id === bankId) : null;
          setBankName(bank?.bankName || "");
        }
      } catch (err) {
        if (isMounted && isAbortError(err)) {
          console.debug('Bank data request aborted - component unmounted or new request started');
          return; // Exit early for AbortError
        }
        if (isMounted) {
          console.error('Error fetching bank data:', err);
          setBankName("");
        }
      }
    };

    fetchBankData();

    return () => {
      isMounted = false;
      // Only abort if not already aborted to prevent unnecessary abort calls
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };
  }, [bankId]);

  useEffect(() => {
    if (!bankId || !bankName) return;

    const controller = new AbortController();
    let isMounted = true;

    const fetchBankHeader = async () => {
      if (isMounted) {
        setHeaderLoading(true);
        setHeaderError(null);
        setHeaderSuccess(null);
      }

      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          throw new Error('User ID not found');
        }
        
        const response = await fetch(`/api/bank-header?bankName=${encodeURIComponent(bankName)}`, {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (isMounted) {
          if (data && Array.isArray(data.header)) {
            setBankHeader(data.header);
            setHeaderInputs(data.header);
          } else {
            setBankHeader([]);
            setHeaderInputs([]);
          }
        }
      } catch (err) {
        if (isMounted && isAbortError(err)) {
          console.debug('Bank header request aborted');
          return; // Exit early for AbortError
        }
        console.error('Error fetching bank header:', err);
        if (isMounted) {
          setHeaderError("Failed to fetch bank header");
        }
      } finally {
        if (isMounted) {
          setHeaderLoading(false);
        }
      }
    };

    fetchBankHeader();

    return () => {
      isMounted = false;
      // Only abort if not already aborted to prevent unnecessary abort calls
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };
  }, [bankId, bankName]);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const fetchSuperBankHeader = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          throw new Error('User ID not found');
        }
        
        const response = await fetch(`/api/bank-header?bankName=SUPER%20BANK&userId=${userId}`, {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (isMounted) {
          if (data && Array.isArray(data.header)) {
            setSuperHeaders(data.header);
          } else {
            setSuperHeaders([]);
          }
        }
      } catch (err) {
        if (isMounted && isAbortError(err)) {
          console.debug('Super bank header request aborted');
          return; // Exit early for AbortError
        }
        if (isMounted) {
          console.error('Error fetching super bank header:', err);
          setSuperHeaders([]);
        }
      }
    };

    fetchSuperBankHeader();

    return () => {
      isMounted = false;
      // Only abort if not already aborted to prevent unnecessary abort calls
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };
  }, [bankId, bankName]);

  useEffect(() => {
    if (!bankId || !bankName) return;

    const controller = new AbortController();
    let isMounted = true;

    const fetchBankMapping = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          throw new Error('User ID not found');
        }
        
        const response = await fetch(`/api/bank-header?bankName=${encodeURIComponent(bankName)}`, {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (isMounted) {
          if (data && data.mapping) {
            setMapping(data.mapping);
          } else {
            setMapping({});
          }
          if (data && data.conditions && Array.isArray(data.conditions)) {
            setConditions(data.conditions);
          } else {
            setConditions([]);
          }
        }
      } catch (err) {
        if (isMounted && isAbortError(err)) {
          console.debug('Bank mapping request aborted');
          return; // Exit early for AbortError
        }
        console.error('Error fetching bank mapping:', err);
        if (isMounted) {
          setMapping({});
          setConditions([]);
        }
      }
    };

    fetchBankMapping();

    return () => {
      isMounted = false;
      // Only abort if not already aborted to prevent unnecessary abort calls
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };
  }, [bankId, bankName]);

  // Reload mapping data when modal opens
  useEffect(() => {
    if (showMapping && bankId && bankName) {
      const controller = new AbortController();
      let isMounted = true;

      const fetchBankMapping = async (retryCount = 0) => {
        try {
          const userId = localStorage.getItem('userId');
          if (!userId) {
            throw new Error('User ID not found');
          }
          
          // Add a small delay to ensure data is persisted
          if (retryCount === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          const response = await fetch(`/api/bank-header?bankName=${encodeURIComponent(bankName)}`, {
            signal: controller.signal
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (isMounted) {
            if (data && data.mapping && typeof data.mapping === 'object') {
              setMapping(data.mapping);
            } else {
              // Don't reset mapping if data exists but mapping is null/undefined
              // Only reset if there's no data at all
              if (!data) {
                setMapping({});
              }
            }
            if (data && data.conditions && Array.isArray(data.conditions)) {
              setConditions(data.conditions);
            } else {
              // Don't reset conditions if data exists but conditions is null/undefined
              // Only reset if there's no data at all
              if (!data) {
                setConditions([]);
              }
            }
          }
        } catch (err) {
          if (isMounted && isAbortError(err)) {
            console.debug('Bank mapping request aborted');
            return;
          }
          console.error('Error fetching bank mapping:', err);
          if (isMounted) {
            setMapping({});
            setConditions([]);
          }
        }
      };

      fetchBankMapping();

      return () => {
        isMounted = false;
        if (!controller.signal.aborted) {
          controller.abort();
        }
      };
    }
  }, [showMapping, bankId, bankName]);

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setIsEditing(false);
    setFormData({
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      tags: [],
    });
    setIsModalOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setIsEditing(true);
    setFormData({
      accountHolderName: account.accountHolderName,
      accountNumber: account.accountNumber,
      ifscCode: account.ifscCode,
      tags: account.tags,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankId) return;

    const userId = localStorage.getItem('userId');
    if (!userId) {
      setError('User ID not found');
      return;
    }

    const accountData = {
      ...formData,
      bankId,
      userId,
    };

    try {
      const url = selectedAccount
        ? `/api/account/${selectedAccount.id}`
        : '/api/account';
      const method = selectedAccount ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      });

      if (!response.ok) {
        throw new Error('Failed to save account');
      }

      const updatedAccount = await response.json();
      if (selectedAccount) {
        setAccounts(accounts.map(acc =>
          acc.id === selectedAccount.id ? updatedAccount : acc
        ));
      } else {
        setAccounts([...accounts, updatedAccount]);
      }

      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    setDeleteModal({ open: true, account, loading: false });
  };

  const confirmDeleteAccount = async () => {
    if (!deleteModal.account) return;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    const accountId = deleteModal.account.id;
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        alert('User not logged in');
        return;
      }
      
      const response = await fetch(`/api/account/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }
      setAccounts(accounts.filter(acc => acc.id !== accountId));
      setDeleteModal({ open: false, account: null, loading: false });
      // Optionally show a toast here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleHeaderInputChange = (idx: number, value: string) => {
    setHeaderInputs(inputs => inputs.map((h, i) => i === idx ? value : h));
  };

  const handleAddHeaderInput = () => {
    setHeaderInputs(inputs => [...inputs, ""]);
  };

  const handleRemoveHeaderInput = (idx: number) => {
    setHeaderInputs(inputs => inputs.filter((_, i) => i !== idx));
  };

  const handleHeaderSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setHeaderLoading(true);
    setHeaderError(null);
    setHeaderSuccess(null);
    const headerArr = headerInputs.map(h => h.trim()).filter(Boolean);
    if (!headerArr.length) {
      setHeaderError("Header cannot be empty");
      setHeaderLoading(false);
      return;
    }
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setHeaderError('User not logged in');
        setHeaderLoading(false);
        return;
      }
      
      const res = await fetch("/api/bank-header", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName, bankId, header: headerArr, userId, userEmail: user?.email })
      });
      if (!res.ok) throw new Error("Failed to save header");
      setBankHeader(headerArr);
      setHeaderSuccess("Header saved!");
      setHeaderEditing(false);
    } catch {
      setHeaderError("Failed to save header");
    } finally {
      setHeaderLoading(false);
    }
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    setMappingLoading(true);
    setMappingError(null);
    setMappingSuccess(null);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setMappingError('User not logged in');
        setMappingLoading(false);
        return;
      }
      
      // Reverse the mapping: key = super bank header, value = original field
      const reversedMapping: { [key: string]: string } = {};
      Object.entries(mapping).forEach(([originalField, superHeader]) => {
        if (superHeader) reversedMapping[superHeader] = originalField;
      });
      console.log('Saving mapping with conditions:', conditions);
      const res = await fetch('/api/bank-header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName, bankId, header: bankHeader, mapping: reversedMapping, conditions, userId, userEmail: user?.email }),
      });
      if (!res.ok) throw new Error('Failed to save mapping');
      console.log('Mapping and conditions saved successfully!');
      setMappingSuccess('Mapping saved!');
      setShowMapping(false);
    } catch {
      setMappingError('Failed to save mapping');
    } finally {
      setMappingLoading(false);
    }
  };

  const addCondition = () => {
    if (
      newCond.ifField &&
      newCond.ifOp &&
      (['present', 'not_present'].includes(newCond.ifOp) || newCond.ifValue) &&
      newCond.then.length > 0 &&
      newCond.then.every(t => t.field && t.value)
    ) {
      setConditions(prev => [
        ...prev,
        {
          if: {
            field: newCond.ifField,
            op: newCond.ifOp,
            ...(newCond.ifValue && !['present', 'not_present'].includes(newCond.ifOp) ? { value: newCond.ifValue } : {})
          },
          then: Object.fromEntries(newCond.then.map(t => [t.field, t.value]))
        }
      ]);
      setNewCond({ ifField: '', ifOp: '', ifValue: '', then: [{ field: '', value: '' }] });
    }
  };

  const removeCondition = (idx: number) => {
    setConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const addThenField = () => {
    setNewCond(nc => ({
      ...nc,
      then: [...nc.then, { field: '', value: '' }]
    }));
  };

  const removeThenField = (idx: number) => {
    setNewCond(nc => ({
      ...nc,
      then: nc.then.filter((_, i) => i !== idx)
    }));
  };

  const updateThenField = (idx: number, key: 'field' | 'value', value: string) => {
    setNewCond(nc => ({
      ...nc,
      then: nc.then.map((item, i) => i === idx ? { ...item, [key]: value } : item)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-4 px-4 space-y-4 ${
      theme === 'dark' 
        ? 'bg-gray-900' 
        : 'bg-gradient-to-br from-gray-50 to-blue-50'
    }`}>
      {/* Compact Bank Statement Header Section */}
      <div className={`rounded-xl shadow-sm border p-4 relative overflow-hidden ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-transparent rounded-full opacity-30 transform translate-x-12 -translate-y-12"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-lg font-bold flex items-center gap-2 ${
              theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
            }`}>
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 00-2 2v4a2 2 0 002 2h8a2 2 0 002-2v-4a2 2 0 00-2-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              Bank Statement Header
            </h2>
            <div className="flex gap-2">
              {!headerEditing && (
                <button
                  type="button"
                  className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 hover:scale-105"
                  onClick={() => setHeaderEditing(true)}
                  aria-label="Edit Header"
                >
                  <RiEdit2Line size={16} />
                </button>
              )}
              <button
                type="button"
                className="p-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-green-400 transition-all duration-200 hover:scale-105"
                onClick={() => setShowMapping(true)}
                aria-label="Map Header"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" />
                </svg>
              </button>
            </div>
          </div>
          
          {headerLoading ? (
            <div className={`flex items-center gap-2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Loading header...
            </div>
          ) : (
            <>
              <div className="mb-3">
                <span className={`text-sm font-semibold mb-2 block ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Current Header:</span>
                <div className="flex flex-wrap gap-1">
                  {bankHeader.length > 0 ? (
                    bankHeader.map((col, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-lg border border-blue-200 shadow-sm text-xs font-medium hover:shadow-md transition-shadow duration-200"
                      >
                        {col}
                      </span>
                    ))
                  ) : (
                    <div className={`flex items-center gap-1 rounded-lg px-2 py-1 ${
                      theme === 'dark' 
                        ? 'text-gray-400 bg-gray-700' 
                        : 'text-gray-400 bg-gray-50'
                    }`}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs">No header set</span>
                    </div>
                  )}
                </div>
              </div>
              {headerEditing && (
                <HeaderEditor
                  headerInputs={headerInputs}
                  onHeaderInputChange={handleHeaderInputChange}
                  onAddHeaderInput={handleAddHeaderInput}
                  onRemoveHeaderInput={handleRemoveHeaderInput}
                  onSave={handleHeaderSave}
                  onCancel={() => setHeaderEditing(false)}
                  loading={headerLoading}
                  error={headerError}
                  success={headerSuccess}
                />
              )}
            </>
          )}
        </div>
        
        {showMapping && (
          <Modal isOpen={showMapping} onClose={() => setShowMapping(false)} title={`Map to Super Bank Header`}>
            <form onSubmit={handleSaveMapping} className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className={`font-semibold ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                }`}>Advanced Field Conditions</div>
                {conditions.map((cond, idx) => (
                  <div key={idx} className={`flex flex-wrap items-center gap-2 py-1 border-b ${
                    theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                  }`}>
                    <span>If</span>
                    <select
                      value={cond.if.field}
                      onChange={e => setConditions(prev => prev.map((c, i) => i === idx ? { ...c, if: { ...c.if, field: e.target.value } } : c))}
                      className={`${
                        theme === 'dark' 
                          ? 'border-gray-600 bg-gray-700 text-gray-100' 
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select field</option>
                      {bankHeader.map((bh, i) => <option key={i} value={bh}>{bh}</option>)}
                    </select>
                    <select
                      value={cond.if.op}
                      onChange={e => setConditions(prev => prev.map((c, i) => i === idx ? { ...c, if: { ...c.if, op: e.target.value, value: '' } } : c))}
                      className={`${
                        theme === 'dark' 
                          ? 'border-gray-600 bg-gray-700 text-gray-100' 
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select operator</option>
                      <option value="present">is present</option>
                      <option value="not_present">is not present</option>
                      <option value="==">==</option>
                      <option value="!=">!=</option>
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                    </select>
                    {!['present', 'not_present'].includes(cond.if.op) && (
                      <input
                        type="text"
                        value={cond.if.value || ''}
                        onChange={e => setConditions(prev => prev.map((c, i) => i === idx ? { ...c, if: { ...c.if, value: e.target.value } } : c))}
                        placeholder="Comparison val"
                        className={`border rounded px-1 w-24 ${
                          theme === 'dark' 
                            ? 'border-gray-600 bg-gray-700 text-gray-100' 
                            : 'border-gray-300'
                        }`}
                      />
                    )}
                    <span>then</span>
                    {Object.entries(cond.then).map(([field, value], tIdx) => (
                      <span key={tIdx} className="flex items-center gap-1">
                        <select
                          value={field}
                          onChange={e => {
                            const newField = e.target.value;
                            setConditions(prev => prev.map((c, i) => {
                              if (i !== idx) return c;
                              const newThen = { ...c.then };
                              delete newThen[field];
                              newThen[newField] = value;
                              return { ...c, then: newThen };
                            }));
                          }}
                          className={`${
                            theme === 'dark' 
                              ? 'border-gray-600 bg-gray-700 text-gray-100' 
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select field</option>
                          {superHeaders.map((sh, i) => <option key={i} value={sh}>{sh}</option>)}
                        </select>
                        <span>=</span>
                        <input
                          type="text"
                          value={value}
                          onChange={e => {
                            const newValue = e.target.value;
                            setConditions(prev => prev.map((c, i) => {
                              if (i !== idx) return c;
                              return { ...c, then: { ...c.then, [field]: newValue } };
                            }));
                          }}
                          className={`border rounded px-1 w-24 ${
                            theme === 'dark' 
                              ? 'border-gray-600 bg-gray-700 text-gray-100' 
                              : 'border-gray-300'
                          }`}
                          placeholder="Value or field ref"
                        />
                        <button type="button" onClick={() => {
                          setConditions(prev => prev.map((c, i) => {
                            if (i !== idx) return c;
                            const newThen = { ...c.then };
                            delete newThen[field];
                            return { ...c, then: newThen };
                          }));
                        }} className="text-red-500">✕</button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setConditions(prev => prev.map((c, i) => {
                          if (i !== idx) return c;
                          return { ...c, then: { ...c.then, '': '' } };
                        }));
                      }}
                      className="ml-2 px-2 py-1 bg-blue-500 text-white rounded"
                    >
                      Add field
                    </button>
                    <button type="button" onClick={() => removeCondition(idx)} className="text-red-500 ml-2">&times;</button>
                  </div>
                ))}
                <div className={`flex flex-col gap-2 border rounded px-2 py-1 text-xs mb-2 ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-blue-900' 
                    : 'bg-white border-blue-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <span>If</span>
                    <div className="overflow-x-auto">
                      <div className="flex flex-wrap items-center gap-2 py-2 min-w-[600px]">
                        <select value={newCond.ifField} onChange={e => setNewCond(nc => ({ ...nc, ifField: e.target.value }))}
                          className={`${
                            theme === 'dark' 
                              ? 'border-gray-600 bg-gray-700 text-gray-100' 
                              : 'border-gray-300'
                          }`}>
                          <option value="">Select field</option>
                          {bankHeader.map((bh, i) => <option key={i} value={bh}>{bh}</option>)}
                        </select>
                        <select value={newCond.ifOp} onChange={e => setNewCond(nc => ({ ...nc, ifOp: e.target.value }))}
                          className={`${
                            theme === 'dark' 
                              ? 'border-gray-600 bg-gray-700 text-gray-100' 
                              : 'border-gray-300'
                          }`}>
                          <option value="">Select operator</option>
                          <option value="present">is present</option>
                          <option value="not_present">is not present</option>
                          <option value="==">==</option>
                          <option value="!=">!=</option>
                          <option value=">=">&gt;=</option>
                          <option value="<=">&lt;=</option>
                          <option value=">">&gt;</option>
                          <option value="<">&lt;</option>
                        </select>
                        {!['present', 'not_present'].includes(newCond.ifOp) && (
                          <input
                            type="text"
                            value={newCond.ifValue}
                            onChange={e => setNewCond(nc => ({ ...nc, ifValue: e.target.value }))}
                            placeholder="Comparison value"
                            className={`border rounded px-1 w-24 ${
                              theme === 'dark' 
                                ? 'border-gray-600 bg-gray-700 text-gray-100' 
                                : 'border-gray-300'
                            }`}
                          />
                        )}
                        <span>then</span>
                        {newCond.then.map((thenItem, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <select
                              value={thenItem.field}
                              onChange={e => updateThenField(i, 'field', e.target.value)}
                              className={`${
                                theme === 'dark' 
                                  ? 'border-gray-600 bg-gray-700 text-gray-100' 
                                  : 'border-gray-300'
                              }`}
                            >
                              <option value="">Select field</option>
                              {superHeaders.map((sh, idx) => <option key={idx} value={sh}>{sh}</option>)}
                            </select>
                            <span>=</span>
                            <input
                              type="text"
                              value={thenItem.value}
                              onChange={e => updateThenField(i, 'value', e.target.value)}
                              className={`border rounded px-1 w-24 ${
                                theme === 'dark' 
                                  ? 'border-gray-600 bg-gray-700 text-gray-100' 
                                  : 'border-gray-300'
                              }`}
                              placeholder="Value or field ref"
                            />
                            <button type="button" onClick={() => removeThenField(i)} className="text-red-500">✕</button>
                          </span>
                        ))}
                        <button type="button" onClick={addThenField} className="ml-2 px-2 py-1 bg-blue-500 text-white rounded">Add field</button>
                        <button
                          type="button"
                          onClick={addCondition}
                          className="ml-2 px-2 py-1 bg-green-500 text-white rounded"
                          disabled={
                            !newCond.ifField ||
                            !newCond.ifOp ||
                            newCond.then.length === 0 ||
                            !newCond.then.every(t => t.field && t.value)
                          }
                        >
                          Add Condition
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 mt-2">
                {bankHeader.map((bh, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className={`min-w-[120px] px-2 py-1 rounded text-xs font-medium border ${
                      theme === 'dark' 
                        ? 'bg-blue-900 text-blue-300 border-blue-700' 
                        : 'bg-blue-100 text-blue-700 border-blue-200'
                    }`}>{bh}</span>
                    <span className={`${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>→</span>
                    <select
                      className={`rounded border px-2 py-1 text-sm ${
                        theme === 'dark' 
                          ? 'border-gray-600 bg-gray-700 text-gray-100' 
                          : 'border-gray-300'
                      }`}
                      value={mapping[bh] || ''}
                      onChange={e => setMapping(m => ({ ...m, [bh]: e.target.value }))}
                    >
                      <option value="">Ignore</option>
                      {superHeaders.map((sh, i) => (
                        <option key={i} value={sh}>{sh}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold disabled:opacity-50"
                  disabled={mappingLoading}
                >
                  {mappingLoading ? 'Saving...' : 'Save Mapping'}
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg shadow transition-all font-semibold w-fit ${
                    theme === 'dark' 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setShowMapping(false)}
                  disabled={mappingLoading}
                >
                  Cancel
                </button>
              </div>
              {mappingError && <div className="text-red-600 mt-2">{mappingError}</div>}
              {mappingSuccess && <div className="text-green-600 mt-2">{mappingSuccess}</div>}
            </form>
          </Modal>
        )}
      </div>
      
      {/* Compact Accounts Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <RiAccountPinCircleLine className="text-white" size={18} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}>Accounts</h2>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Manage your bank accounts and holders</p>
            </div>
          </div>
          <button
            onClick={handleAddAccount}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-semibold text-sm"
          >
            <RiAddLine className="text-base" />
            Add Account
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {accounts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RiAccountPinCircleLine className="text-blue-600" size={32} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}>No accounts added yet</h3>
              <p className={`mb-4 max-w-md mx-auto text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Get started by adding your first account to begin managing your financial data.</p>
              <button
                onClick={handleAddAccount}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm"
              >
                <RiAddLine size={16} />
                Add Your First Account
              </button>
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                onClick={() => {
                  if (onAccountClick) {
                    onAccountClick(account);
                  } else {
                    router.push(
                      `/banks/statements?type=statements&bankId=${account.bankId}&accountId=${account.id}&accountName=${encodeURIComponent(account.accountHolderName)}`
                    );
                  }
                }}
                className={`group cursor-pointer relative rounded-xl shadow-sm border p-4 transition-all duration-300 hover:shadow-lg hover:scale-105 overflow-hidden ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100 via-purple-100 to-transparent rounded-full opacity-20 transform translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-300"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow">
                        <RiAccountPinCircleLine className="text-white text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-sm leading-tight truncate ${
                          theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                        }`}>{account.accountHolderName}</h3>
                        <p className={`text-xs mt-0.5 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>Account: {account.accountNumber}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAccount(account);
                        }}
                        className="p-1.5 bg-white/90 backdrop-blur-sm hover:bg-blue-50 rounded-lg shadow border border-gray-200 hover:scale-110 transition-all duration-200"
                        title="Edit Account"
                      >
                        <RiEdit2Line className="text-blue-600 text-xs" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAccount(account.id);
                        }}
                        className="p-1.5 bg-white/90 backdrop-blur-sm hover:bg-red-50 rounded-lg shadow border border-gray-200 hover:scale-110 transition-all duration-200"
                        title="Delete Account"
                      >
                        <RiDeleteBin6Line className="text-red-600 text-xs" />
                      </button>
                    </div>
                  </div>
                  
                  {account.tags && account.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {account.tags.map((tagName, index) => {
                        const tagObj = allTags.find(t => t.name === tagName);
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shadow-sm"
                            style={{
                              backgroundColor: tagObj?.color || '#3B82F6',
                              color: '#ffffff',
                              borderColor: tagObj?.color || '#3B82F6'
                            }}
                          >
                            {tagName}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className={`rounded-lg p-3 border ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-gradient-to-br from-gray-50 to-blue-50 border-gray-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs uppercase tracking-wide font-semibold ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>IFSC Code</p>
                        <p className={`text-xs font-medium ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        }`}>{account.ifscCode}</p>
                      </div>
                      <div className="w-6 h-6 bg-blue-200 rounded-lg flex items-center justify-center">
                        <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Account' : 'Add New Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="accountHolderName" className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Account Holder Name
            </label>
            <input
              type="text"
              id="accountHolderName"
              value={formData.accountHolderName}
              onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
              className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                theme === 'dark' 
                  ? 'border-gray-600 bg-gray-700 text-gray-100' 
                  : 'border-gray-300'
              }`}
              required
            />
          </div>

          <div>
            <label htmlFor="accountNumber" className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Account Number
            </label>
            <input
              type="text"
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                theme === 'dark' 
                  ? 'border-gray-600 bg-gray-700 text-gray-100' 
                  : 'border-gray-300'
              }`}
              required
            />
          </div>

          <div>
            <label htmlFor="ifscCode" className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              IFSC Code
            </label>
            <input
              type="text"
              id="ifscCode"
              value={formData.ifscCode}
              onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
              className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                theme === 'dark' 
                  ? 'border-gray-600 bg-gray-700 text-gray-100' 
                  : 'border-gray-300'
              }`}
              required
            />
          </div>

          <div>
            <label htmlFor="tags" className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              value={formData.tags.join(', ')}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(tag => tag.trim()) })}
              className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                theme === 'dark' 
                  ? 'border-gray-600 bg-gray-700 text-gray-100' 
                  : 'border-gray-300'
              }`}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                theme === 'dark' 
                  ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' 
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
            >
              {isEditing ? 'Update' : 'Add'} Account
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, account: null, loading: false })}
        onConfirm={confirmDeleteAccount}
        itemName={deleteModal.account?.accountHolderName || ''}
        itemType="account"
        confirmLabel="Delete Account"
        description={
          'WARNING: This will also delete:\n' +
          '• ALL related transactions from this account\n' +
          '• ALL statement files uploaded for this account\n\n' +
          'This action cannot be undone.'
        }
        loading={deleteModal.loading}
      />
    </div>
  );
} 
