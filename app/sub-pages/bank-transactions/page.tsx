'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import TransactionFilterBar from '../../components/TransactionFilterBar';
import TagFilterPills from '../../components/TagFilterPills';
import TaggingControls from '../../components/TaggingControls';
import AnalyticsSummary from '../../components/AnalyticsSummary';
import TransactionTable from '../../components/TransactionTable';
import { Transaction, Tag } from '../../types/transaction';

export default function BankTransactionsPage() {
  const searchParams = useSearchParams();
  const bankId = searchParams.get('bankId');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [bankName, setBankName] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [tagging, setTagging] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagSuccess, setTagSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [transactionHeaders, setTransactionHeaders] = useState<string[]>([]);
  const [searchField, setSearchField] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'tagged' | 'untagged'>('desc');

  // Advanced tag creation features
  const [selection, setSelection] = useState<{ text: string; x: number; y: number; rowIdx?: number } | null>(null);
  const [tagCreateMsg, setTagCreateMsg] = useState<string | null>(null);
  const [pendingTag, setPendingTag] = useState<{ tagName: string; rowIdx: number; selectionText: string } | null>(null);
  const [applyingTagToAll, setApplyingTagToAll] = useState(false);

  // Fetch bank name
  useEffect(() => {
    if (bankId) {
      fetch(`/api/bank`).then(res => res.json()).then((banks) => {
        const bank = Array.isArray(banks) ? banks.find((b) => b.id === bankId) : null;
        setBankName(bank?.bankName || "");
      });
    }
  }, [bankId]);

  // Fetch all transactions for the bank
  useEffect(() => {
    if (bankId && bankName) {
      setLoadingTransactions(true);
      setTransactionsError(null);
      const userId = localStorage.getItem("userId") || "";
      
      // Fetch all accounts for this bank first
      fetch(`/api/account?bankId=${bankId}&userId=${userId}`)
        .then(res => res.json())
        .then(accounts => {
          if (!Array.isArray(accounts)) {
            throw new Error('Failed to fetch accounts');
          }
          
          // Fetch transactions for all accounts in this bank
          const transactionPromises = accounts.map(account => 
            fetch(`/api/transactions?accountId=${account.id}&userId=${userId}&bankName=${encodeURIComponent(bankName)}`)
              .then(res => res.json())
              .then(data => Array.isArray(data) ? data : [])
              .catch(() => [])
          );
          
          return Promise.all(transactionPromises);
        })
        .then(allTransactionsArrays => {
          // Combine all transactions from all accounts
          const allTransactions = allTransactionsArrays.flat();
          setTransactions(allTransactions);
        })
        .catch(() => setTransactionsError('Failed to fetch transactions'))
        .finally(() => setLoadingTransactions(false));
    }
  }, [bankId, bankName]);

  // Fetch tags
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    fetch('/api/tags?userId=' + userId)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAllTags(data); else setAllTags([]); });
  }, []);

  // Advanced tag creation: Text selection detection
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim()) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelection({
          text: sel.toString().trim(),
          x: rect.left,
          y: rect.bottom,
        });
      } else {
        setSelection(null);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleCreateTagFromSelection = async () => {
    if (!selection) return;
    
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not authenticated');
      
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selection.text, userId })
      });
      
      if (res.status === 409) {
        // Tag already exists - find the existing tag and use it
        const existingTagsRes = await fetch('/api/tags?userId=' + userId);
        const existingTags = await existingTagsRes.json();
        const existingTag = Array.isArray(existingTags) ? existingTags.find(t => t.name === selection.text) : null;
        if (existingTag) {
          setPendingTag({ tagName: existingTag.name, rowIdx: selection.rowIdx || 0, selectionText: selection.text });
          return;
        }
        throw new Error('Tag already exists');
      }
      
      if (!res.ok) throw new Error('Failed to create tag');
      const tag = await res.json();
      setAllTags(prev => [...prev, tag]);
      setPendingTag({ tagName: tag.name, rowIdx: selection.rowIdx || 0, selectionText: selection.text });
      setSelection(null);
      setTagCreateMsg(`Tag "${tag.name}" created successfully!`);
      setTimeout(() => setTagCreateMsg(null), 3000);
    } catch (err) {
      console.error('Error creating tag:', err);
      setTagCreateMsg(err instanceof Error ? err.message : 'Failed to create tag');
      setTimeout(() => setTagCreateMsg(null), 3000);
    }
  };

  const handleApplyTagToRow = async () => {
    if (!pendingTag) return;
    
    try {
      setTagging(true);
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not authenticated');
      
      const transaction = transactions[pendingTag.rowIdx];
      if (!transaction) throw new Error('Transaction not found');
      
      const res = await fetch('/api/transactions/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          tagName: pendingTag.tagName,
          userId
        })
      });
      
      if (!res.ok) throw new Error('Failed to apply tag');
      
      // Update the transaction with the new tag
      const updatedTransaction = await res.json();
      setTransactions(prev => prev.map(tx => 
        tx.id === transaction.id ? { ...tx, tags: updatedTransaction.tags } : tx
      ));
      
      setPendingTag(null);
      setTagSuccess(`Tag "${pendingTag.tagName}" applied successfully!`);
      setTimeout(() => setTagSuccess(null), 3000);
    } catch (err) {
      console.error('Error applying tag:', err);
      setTagError(err instanceof Error ? err.message : 'Failed to apply tag');
      setTimeout(() => setTagError(null), 3000);
    } finally {
      setTagging(false);
    }
  };

  const handleApplyTagToAll = async () => {
    if (!pendingTag) return;
    
    try {
      setApplyingTagToAll(true);
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not authenticated');
      
      // Find all transactions that contain the selection text
      const matchingTransactions = transactions.filter((tx) => {
        return Object.entries(tx).some(([key, val]) =>
          key !== 'tags' &&
          ((typeof val === 'string' && val.toLowerCase().includes(pendingTag.selectionText.toLowerCase())) ||
           (typeof val === 'number' && String(val).toLowerCase().includes(pendingTag.selectionText.toLowerCase())))
        );
      });
      
      // Apply tag to all matching transactions
      for (const transaction of matchingTransactions) {
        const res = await fetch('/api/transactions/tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: transaction.id,
            tagName: pendingTag.tagName,
            userId
          })
        });
        
        if (!res.ok) throw new Error(`Failed to apply tag to transaction ${transaction.id}`);
        
        // Update the transaction with the new tag
        const updatedTransaction = await res.json();
        setTransactions(prev => prev.map(tx => 
          tx.id === transaction.id ? { ...tx, tags: updatedTransaction.tags } : tx
        ));
      }
      
      setPendingTag(null);
      setTagSuccess(`Tag "${pendingTag.tagName}" applied to ${matchingTransactions.length} transactions!`);
      setTimeout(() => setTagSuccess(null), 3000);
    } catch (err) {
      console.error('Error applying tag to all:', err);
      setTagError(err instanceof Error ? err.message : 'Failed to apply tag to all transactions');
      setTimeout(() => setTagError(null), 3000);
    } finally {
      setApplyingTagToAll(false);
    }
  };

  const handleRowSelect = (id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(transactions.map(tx => tx.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleAddTag = async () => {
    if (!selectedTagId || selectedRows.size === 0) return;
    
    try {
      setTagging(true);
      setTagError(null);
      setTagSuccess(null);
      
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not authenticated');
      
      const tag = allTags.find(t => t.id === selectedTagId);
      if (!tag) throw new Error('Tag not found');
      
      let successCount = 0;
      for (const transactionId of selectedRows) {
        try {
          const res = await fetch('/api/transactions/tag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactionId,
              tagName: tag.name,
              userId
            })
          });
          
          if (res.ok) {
            const updatedTransaction = await res.json();
            setTransactions(prev => prev.map(tx => 
              tx.id === transactionId ? { ...tx, tags: updatedTransaction.tags } : tx
            ));
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to tag transaction ${transactionId}:`, err);
        }
      }
      
      setSelectedRows(new Set());
      setSelectAll(false);
      setSelectedTagId("");
      
      if (successCount > 0) {
        setTagSuccess(`Successfully tagged ${successCount} transaction(s) with "${tag.name}"`);
        setTimeout(() => setTagSuccess(null), 3000);
      } else {
        setTagError('Failed to tag any transactions');
        setTimeout(() => setTagError(null), 3000);
      }
    } catch (err) {
      console.error('Error adding tag:', err);
      setTagError(err instanceof Error ? err.message : 'Failed to add tag');
      setTimeout(() => setTagError(null), 3000);
    } finally {
      setTagging(false);
    }
  };

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply search filter
    if (search.trim()) {
      filtered = filtered.filter(tx => {
        if (searchField === 'all') {
          return Object.entries(tx).some(([key, val]) => {
            if (key === 'tags') return false;
            const strVal = String(val).toLowerCase();
            return strVal.includes(search.toLowerCase());
          });
        } else {
          const val = tx[searchField];
          if (val === undefined) return false;
          return String(val).toLowerCase().includes(search.toLowerCase());
        }
      });
    }

    // Apply date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(tx => {
        const dateField = getDateField(tx);
        if (!dateField) return true;
        
        const txDate = parseDate(dateField);
        if (dateRange.from) {
          const fromDate = parseDate(dateRange.from);
          if (txDate < fromDate) return false;
        }
        if (dateRange.to) {
          const toDate = parseDate(dateRange.to);
          if (txDate > toDate) return false;
        }
        return true;
      });
    }

    // Apply tag filters
    if (tagFilters.length > 0) {
      filtered = filtered.filter(tx => {
        const tags = Array.isArray(tx.tags) ? tx.tags : [];
        return tagFilters.every(tagName => 
          tags.some(tag => tag.name === tagName)
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortOrder === 'tagged') {
        const aTags = Array.isArray(a.tags) ? a.tags : [];
        const bTags = Array.isArray(b.tags) ? b.tags : [];
        if (aTags.length > 0 && bTags.length === 0) return -1;
        if (aTags.length === 0 && bTags.length > 0) return 1;
      } else if (sortOrder === 'untagged') {
        const aTags = Array.isArray(a.tags) ? a.tags : [];
        const bTags = Array.isArray(b.tags) ? b.tags : [];
        if (aTags.length === 0 && bTags.length > 0) return -1;
        if (aTags.length > 0 && bTags.length === 0) return 1;
      } else {
        const dateFieldA = getDateField(a);
        const dateFieldB = getDateField(b);
        if (dateFieldA && dateFieldB) {
          const dateA = parseDate(dateFieldA);
          const dateB = parseDate(dateFieldB);
          return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        }
      }
      return 0;
    });

    return filtered;
  }, [transactions, search, searchField, dateRange, tagFilters, sortOrder]);

  function parseDate(dateStr: string): Date {
    // Handle various date formats
    const formats = [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // DD/MM/YYYY or MM/DD/YYYY
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{1,2}-\d{1,2}-\d{4}$/, // DD-MM-YYYY
    ];
    
    for (const format of formats) {
      if (format.test(dateStr)) {
        return new Date(dateStr);
      }
    }
    
    // Try parsing as ISO string
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    
    // Fallback to current date
    return new Date();
  }

  function getDateField(obj: Record<string, unknown>) {
    const dateFields = ['Date', 'date', 'createdAt', 'transactionDate'];
    for (const field of dateFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        return obj[field] as string;
      }
    }
    return null;
  }

  const handleReorderHeaders = (newHeaders: string[]) => {
    setTransactionHeaders(newHeaders);
  };

  const handleRemoveTag = async (rowIdx: number, tagId: string) => {
    try {
      const transaction = transactions[rowIdx];
      if (!transaction) return;
      
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not authenticated');
      
      const tag = allTags.find(t => t.id === tagId);
      if (!tag) throw new Error('Tag not found');
      
      const res = await fetch('/api/transactions/untag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          tagName: tag.name,
          userId
        })
      });
      
      if (!res.ok) throw new Error('Failed to remove tag');
      
      const updatedTransaction = await res.json();
      setTransactions(prev => prev.map((tx, idx) => 
        idx === rowIdx ? { ...tx, tags: updatedTransaction.tags } : tx
      ));
    } catch (err) {
      console.error('Error removing tag:', err);
    }
  };

  const handleApplyTagToAllFromMenu = (tagName: string) => {
    if (selectedRows.size === 0) return;
    
    const tag = allTags.find(t => t.name === tagName);
    if (!tag) return;
    
    setSelectedTagId(tag.id);
    handleAddTag();
  };

  const handleTagDeleted = () => {
    // Refresh tags when a tag is deleted
    const userId = localStorage.getItem('userId');
    if (userId) {
      fetch('/api/tags?userId=' + userId)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setAllTags(data); else setAllTags([]); });
    }
  };

  // Get transaction headers from the first transaction
  useEffect(() => {
    if (transactions.length > 0) {
      const firstTx = transactions[0];
      const headers = Object.keys(firstTx).filter(key => 
        key !== 'id' && 
        key !== 'statementId' && 
        key !== 'tags' && 
        key !== 'transactionData' &&
        key !== 'createdAt' &&
        key !== 'bankId' &&
        key !== 'accountId'
      );
      setTransactionHeaders(headers);
    }
  }, [transactions]);

  // Calculate tag statistics
  const tagStats = useMemo(() => {
    const stats: Record<string, number> = {};
    
    transactions.forEach(tx => {
      const tags = Array.isArray(tx.tags) ? tx.tags : [];
      tags.forEach(tag => {
        if (!stats[tag.name]) {
          stats[tag.name] = 0;
        }
        stats[tag.name]++;
      });
    });
    
    return stats;
  }, [transactions]);

  if (!bankId) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>No bank selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <nav className="text-sm mb-4 flex items-center gap-2 text-gray-600">
        <span>Home</span>
        <span>/</span>
        <span>Banks</span>
        <span>/</span>
        <span>{bankName || 'Bank'}</span>
        <span>/</span>
        <span className="font-semibold text-blue-700">All Transactions</span>
      </nav>
      
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-row justify-between items-center gap-2 sm:gap-4 mb-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {bankName} - All Transactions
            </h1>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Transaction Filters */}
          <TransactionFilterBar
            search={search}
            onSearchChange={setSearch}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onDownload={() => {}}
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchFieldOptions={['all', ...transactionHeaders]}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            sortOrderOptions={[
              { value: 'desc', label: 'Latest First' },
              { value: 'asc', label: 'Oldest First' },
              { value: 'tagged', label: 'Tagged Only' },
              { value: 'untagged', label: 'Untagged Only' }
            ]}
          />
          
          {/* Tag Filters */}
          <TagFilterPills
            allTags={Array.isArray(allTags) ? allTags : []}
            tagFilters={tagFilters}
            onToggleTag={tagName => {
              setTagFilters(prev =>
                prev.includes(tagName)
                  ? prev.filter(t => t !== tagName)
                  : [...prev, tagName]
              );
            }}
            onClear={() => setTagFilters([])}
            tagStats={tagStats}
            onApplyTagToAll={handleApplyTagToAllFromMenu}
            onTagDeleted={handleTagDeleted}
          />
          
          {/* Tagging Controls */}
          {selectedRows.size > 0 && (
            <TaggingControls
              allTags={Array.isArray(allTags) ? allTags : []}
              selectedTagId={selectedTagId}
              onTagChange={setSelectedTagId}
              onAddTag={handleAddTag}
              selectedCount={selectedRows.size}
              tagging={tagging}
              tagError={tagError}
              tagSuccess={tagSuccess}
              onCreateTag={async (name) => {
                const userId = localStorage.getItem('userId');
                const res = await fetch('/api/tags', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name, userId })
                });
                
                if (res.status === 409) {
                  const existingTagsRes = await fetch('/api/tags?userId=' + userId);
                  const existingTags = await existingTagsRes.json();
                  const existingTag = Array.isArray(existingTags) ? existingTags.find(t => t.name === name) : null;
                  if (existingTag) {
                    setSelectedTagId(existingTag.id);
                    return existingTag.id;
                  }
                  throw new Error('Tag already exists');
                }
                
                if (!res.ok) throw new Error('Failed to create tag');
                const tag = await res.json();
                setAllTags(prev => [...prev, tag]);
                setSelectedTagId(tag.id);
                return tag.id;
              }}
            />
          )}
          
          {/* Analytics Summary */}
          {(() => {
            const amountKey = filteredAndSortedTransactions.length > 0 ? Object.keys(filteredAndSortedTransactions[0]).find(k => k.toLowerCase().includes('amount')) : undefined;
            const totalAmount = amountKey ? filteredAndSortedTransactions.reduce((sum, tx) => {
              const val = tx[amountKey];
              let num = 0;
              if (typeof val === 'string') num = parseFloat(val.replace(/,/g, '')) || 0;
              else if (typeof val === 'number') num = val;
              return sum + num;
            }, 0).toLocaleString() : undefined;
            const allBankIds = new Set(filteredAndSortedTransactions.map(tx => tx.bankId));
            const allAccountIds = new Set(filteredAndSortedTransactions.map(tx => tx.accountId));
            let tagged = 0, untagged = 0;
            filteredAndSortedTransactions.forEach(tx => {
              const tags = (tx.tags || []) as Tag[];
              if (Array.isArray(tags) && tags.length > 0) tagged++; else untagged++;
            });
            const totalTags = new Set(filteredAndSortedTransactions.flatMap(tx => (Array.isArray(tx.tags) ? tx.tags.map(t => t.name) : []))).size;
            return (
              <AnalyticsSummary
                totalTransactions={filteredAndSortedTransactions.length}
                totalAmount={totalAmount}
                totalBanks={allBankIds.size}
                totalAccounts={allAccountIds.size}
                tagged={tagged}
                untagged={untagged}
                totalTags={totalTags}
                showAmount={!!amountKey}
                showTagStats={true}
              />
            );
          })()}
          
          {/* Transaction Table */}
          <div className="overflow-x-auto relative">
            {/* Floating create tag button */}
            {selection && (
              <button
                style={{ position: 'absolute', left: selection.x, top: selection.y + 8, zIndex: 1000 }}
                className="px-3 py-1 bg-blue-600 text-white rounded shadow font-semibold text-xs hover:bg-blue-700 transition-all"
                onClick={handleCreateTagFromSelection}
              >
                + Create Tag from Selection
              </button>
            )}
            
            {/* Prompt to apply tag to transaction */}
            {pendingTag && (
              <div style={{ 
                position: 'absolute', 
                left: selection?.x, 
                top: selection?.y !== undefined ? selection.y + 8 : 48, 
                zIndex: 1001 
              }} className="bg-white border border-blue-200 rounded shadow-lg px-3 sm:px-4 py-2 sm:py-3 flex flex-col gap-2 sm:gap-3 items-center max-w-md">
                <span className="text-sm">Apply tag "{pendingTag.tagName}" to:</span>
                <div className="w-full">
                  <div className="text-xs text-gray-600 mb-2">
                    Matching transactions with "{pendingTag.selectionText}":
                  </div>
                  <div className="max-h-24 overflow-y-auto bg-gray-50 rounded p-2">
                    {transactions.filter((tx) => {
                      return Object.entries(tx).some(([key, val]) =>
                        key !== 'tags' &&
                        ((typeof val === 'string' && val.toLowerCase().includes(pendingTag.selectionText.toLowerCase())) ||
                         (typeof val === 'number' && String(val).toLowerCase().includes(pendingTag.selectionText.toLowerCase())))
                      );
                    }).slice(0, 3).map((tx) => (
                      <div key={tx.id} className="text-xs text-gray-600 py-1 border-b border-gray-200 last:border-b-0">
                        <div className="flex justify-between">
                          <span className="truncate">
                            {String(tx.Description || tx.description || tx.Reference || tx.reference || 'Transaction')}
                          </span>
                          <span className="text-gray-500 ml-2">
                            {tx.Amount ? `₹${tx.Amount}` : ''}
                          </span>
                        </div>
                        <div className="text-gray-400 text-xs">
                          {String(tx.Date || tx.date || '')}
                        </div>
                      </div>
                    ))}
                    {transactions.filter((tx) => {
                      return Object.entries(tx).some(([key, val]) =>
                        key !== 'tags' &&
                        ((typeof val === 'string' && val.toLowerCase().includes(pendingTag.selectionText.toLowerCase())) ||
                         (typeof val === 'number' && String(val).toLowerCase().includes(pendingTag.selectionText.toLowerCase())))
                      );
                    }).length > 3 && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        ... and {transactions.filter((tx) => {
                          return Object.entries(tx).some(([key, val]) =>
                            key !== 'tags' &&
                            ((typeof val === 'string' && val.toLowerCase().includes(pendingTag.selectionText.toLowerCase())) ||
                             (typeof val === 'number' && String(val).toLowerCase().includes(pendingTag.selectionText.toLowerCase())))
                          );
                        }).length - 3} more
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button className="px-3 py-1 bg-green-600 text-white rounded font-semibold text-xs hover:bg-green-700" onClick={handleApplyTagToRow} disabled={tagging}>Only this transaction</button>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded font-semibold text-xs hover:bg-blue-700" onClick={handleApplyTagToAll} disabled={applyingTagToAll}>All transactions with this text</button>
                  <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded font-semibold text-xs hover:bg-gray-300" onClick={() => setPendingTag(null)}>Cancel</button>
                </div>
                {applyingTagToAll && (
                  <div className="w-full flex flex-col items-center mt-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                    <span className="text-xs text-blue-700">Applying tag to all matching transactions...</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Success message */}
            {tagCreateMsg && (
              <div className="absolute left-1/2 top-2 -translate-x-1/2 bg-green-100 text-green-800 px-3 sm:px-4 py-2 rounded shadow text-xs sm:text-sm z-50">
                {tagCreateMsg}
              </div>
            )}
            
            <TransactionTable
              rows={filteredAndSortedTransactions.map(tx => {
                const filtered = Object.fromEntries(Object.entries(tx).filter(([key]) => key !== 'transactionData'));
                return {
                  ...filtered,
                  tags: tx.tags || []
                };
              })}
              headers={transactionHeaders}
              selectedRows={new Set(filteredAndSortedTransactions.map((tx, idx) => selectedRows.has(tx.id) ? idx : -1).filter(i => i !== -1))}
              onRowSelect={idx => {
                const tx = filteredAndSortedTransactions[idx];
                if (tx) handleRowSelect(tx.id);
              }}
              onSelectAll={handleSelectAll}
              selectAll={selectAll}
              loading={loadingTransactions}
              error={transactionsError}
              onReorderHeaders={handleReorderHeaders}
              onRemoveTag={handleRemoveTag}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 