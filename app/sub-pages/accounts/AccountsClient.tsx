'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '../../components/Modals/Modal';
import { RiAccountPinCircleLine, RiAddLine, RiEdit2Line, RiDeleteBin6Line } from 'react-icons/ri';
import HeaderEditor from '../../components/HeaderEditor';
import ConfirmDeleteModal from '../../components/Modals/ConfirmDeleteModal';

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
}

// Add type definitions above the component
type Condition = {
  if: { field: string; op: string; value?: string };
  then: { [key: string]: string };
};

export default function AccountsClient({ bankId, onAccountClick }: AccountsClientProps) {
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

  useEffect(() => {
    if (!bankId) {
      setError('Bank ID is required');
      setIsLoading(false);
      return;
    }
    const fetchAccounts = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setError('User ID not found');
          setIsLoading(false);
          return;
        }
        const response = await fetch(`/api/account?bankId=${bankId}&userId=${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch accounts');
        }
        const data = await response.json();
        setAccounts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, [bankId]);

  useEffect(() => {
    if (!bankId) return;
    fetch(`/api/bank`)
      .then(res => res.json())
      .then((banks: { id: string; bankName: string }[]) => {
        const bank = Array.isArray(banks) ? banks.find((b) => b.id === bankId) : null;
        setBankName(bank?.bankName || "");
      });
  }, [bankId]);

  useEffect(() => {
    if (!bankId || !bankName) return;
    setHeaderLoading(true);
    setHeaderError(null);
    setHeaderSuccess(null);
    fetch(`/api/bank-header?bankName=${encodeURIComponent(bankName)}`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.header)) {
          setBankHeader(data.header);
          setHeaderInputs(data.header);
        } else {
          setBankHeader([]);
          setHeaderInputs([]);
        }
      })
      .catch(() => setHeaderError("Failed to fetch bank header"))
      .finally(() => setHeaderLoading(false));
  }, [bankId, bankName]);

  useEffect(() => {
    fetch(`/api/bank-header?bankName=SUPER%20BANK`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.header)) setSuperHeaders(data.header);
        else setSuperHeaders([]);
      });
  }, []);

  useEffect(() => {
    if (!bankId || !bankName) return;
    fetch(`/api/bank-header?bankName=${encodeURIComponent(bankName)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.mapping) setMapping(data.mapping);
        else setMapping({});
        if (data && data.conditions && Array.isArray(data.conditions)) setConditions(data.conditions);
        else setConditions([]);
      });
  }, [bankId, bankName]);

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
      const response = await fetch(`/api/account/${accountId}`, {
        method: 'DELETE',
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
      const res = await fetch("/api/bank-header", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName, bankId, header: headerArr })
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
      // Reverse the mapping: key = super bank header, value = original field
      const reversedMapping: { [key: string]: string } = {};
      Object.entries(mapping).forEach(([originalField, superHeader]) => {
        if (superHeader) reversedMapping[superHeader] = originalField;
      });
      console.log('Saving mapping with conditions:', conditions);
      const res = await fetch('/api/bank-header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName, bankId, header: bankHeader, mapping: reversedMapping, conditions }),
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
    <div className="min-h-screen py-6 sm:py-10 px-3 sm:px-4 space-y-6 sm:space-y-8">
      <div className="mb-6 p-4 bg-blue-50 rounded-lg shadow relative">
        <h2 className="font-bold text-blue-700 mb-2">Bank Statement Header</h2>
        <div className="absolute top-4 right-4 flex gap-2">
          {!headerEditing && (
            <button
              type="button"
              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              onClick={() => setHeaderEditing(true)}
              aria-label="Edit Header"
            >
              <RiEdit2Line size={20} />
            </button>
          )}
          <button
            type="button"
            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
            onClick={() => setShowMapping(true)}
            aria-label="Map Header"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" /></svg>
          </button>
        </div>
        {headerLoading ? (
          <div className="text-gray-500">Loading header...</div>
        ) : (
          <>
            <div className="mb-2 text-sm text-gray-700">
              <span className="font-semibold">Current Header:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {bankHeader.length > 0 ? (
                  bankHeader.map((col, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full border border-blue-200 shadow text-xs font-medium"
                    >
                      {col}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">No header set</span>
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
        {showMapping && (
          <Modal isOpen={showMapping} onClose={() => setShowMapping(false)} title={`Map to Super Bank Header`}>
            <form onSubmit={handleSaveMapping} className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="font-semibold text-blue-700">Advanced Field Conditions</div>
                {conditions.map((cond, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2 py-1 border-b border-gray-200">
                    <span>If</span>
                    <select
                      value={cond.if.field}
                      onChange={e => setConditions(prev => prev.map((c, i) => i === idx ? { ...c, if: { ...c.if, field: e.target.value } } : c))}
                    >
                      <option value="">Select field</option>
                      {bankHeader.map((bh, i) => <option key={i} value={bh}>{bh}</option>)}
                    </select>
                    <select
                      value={cond.if.op}
                      onChange={e => setConditions(prev => prev.map((c, i) => i === idx ? { ...c, if: { ...c.if, op: e.target.value, value: '' } } : c))}
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
                        className="border rounded px-1 w-24"
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
                          className="border rounded px-1 w-24"
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
                <div className="flex flex-col gap-2 bg-white border border-blue-100 rounded px-2 py-1 text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span>If</span>
                    <div className="overflow-x-auto">
                      <div className="flex flex-wrap items-center gap-2 py-2 min-w-[600px]">
                        <select value={newCond.ifField} onChange={e => setNewCond(nc => ({ ...nc, ifField: e.target.value }))}>
                          <option value="">Select field</option>
                          {bankHeader.map((bh, i) => <option key={i} value={bh}>{bh}</option>)}
                        </select>
                        <select value={newCond.ifOp} onChange={e => setNewCond(nc => ({ ...nc, ifOp: e.target.value }))}>
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
                            className="border rounded px-1 w-24"
                          />
                        )}
                        <span>then</span>
                        {newCond.then.map((thenItem, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <select
                              value={thenItem.field}
                              onChange={e => updateThenField(i, 'field', e.target.value)}
                            >
                              <option value="">Select field</option>
                              {superHeaders.map((sh, idx) => <option key={idx} value={sh}>{sh}</option>)}
                            </select>
                            <span>=</span>
                            <input
                              type="text"
                              value={thenItem.value}
                              onChange={e => updateThenField(i, 'value', e.target.value)}
                              className="border rounded px-1 w-24"
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
                    <span className="min-w-[120px] px-2 py-1 bg-blue-100 rounded text-blue-700 text-xs font-medium border border-blue-200">{bh}</span>
                    <span className="text-gray-500">→</span>
                    <select
                      className="rounded border px-2 py-1 text-sm"
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
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg shadow hover:bg-gray-300 transition-all font-semibold w-fit"
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
      <div className="space-y-6 px-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Accounts</h2>
          <button
            onClick={handleAddAccount}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <RiAddLine className="text-lg" />
            Add Account
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {accounts.length === 0 ? (
            <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">
              No accounts added yet. Click &quot;Add Account&quot; to get started.
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
                className="cursor-pointer relative bg-white/70 backdrop-blur-lg p-3 sm:p-4 rounded-lg shadow border border-blue-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl group overflow-hidden min-w-[220px] max-w-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg">
                      <RiAccountPinCircleLine className="text-blue-500 text-lg" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 text-base leading-tight">{account.accountHolderName}</h3>
                      <p className="text-xs text-gray-500">Account Number: {account.accountNumber}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAccount(account);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit Account"
                    >
                      <RiEdit2Line className="text-gray-400 hover:text-gray-600 text-base" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAccount(account.id);
                      }}
                      className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete Account"
                    >
                      <RiDeleteBin6Line className="text-red-400 hover:text-red-600 text-base" />
                    </button>
                  </div>
                </div>
                {account.tags && account.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {account.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <p className="text-xs text-gray-500">IFSC: {account.ifscCode}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isEditing ? 'Edit Account' : 'Add New Account'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700">
                Account Holder Name
              </label>
              <input
                type="text"
                id="accountHolderName"
                value={formData.accountHolderName}
                onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
                Account Number
              </label>
              <input
                type="text"
                id="accountNumber"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="ifscCode" className="block text-sm font-medium text-gray-700">
                IFSC Code
              </label>
              <input
                type="text"
                id="ifscCode"
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                id="tags"
                value={formData.tags.join(', ')}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(tag => tag.trim()) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
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
      </div>
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