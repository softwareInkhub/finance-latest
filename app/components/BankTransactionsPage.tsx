'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { RiFileList3Line } from 'react-icons/ri';
import TransactionTable from './TransactionTable';
import TaggingControls from './TaggingControls';
import AnalyticsSummary from './AnalyticsSummary';
import TransactionFilterBar from './TransactionFilterBar';
import TagFilterPills from './TagFilterPills';
import { Toaster } from 'react-hot-toast';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Transaction {
  id: string;
  statementId: string;
  fileName?: string;
  startRow?: number;
  endRow?: number;
  createdAt?: string;
  transactionData?: Record<string, string | Tag[] | undefined>[];
  tags?: Tag[];
  bankId?: string;
  accountId?: string;
  [key: string]: string | number | Tag[] | undefined | Record<string, string | Tag[] | undefined>[];
}

interface BankTransactionsPageProps {
  bankName: string;
}

export default function BankTransactionsPage({ bankName }: BankTransactionsPageProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
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
  const [applyingBulkTag, setApplyingBulkTag] = useState(false);

  useEffect(() => {
    // Add a small delay to prevent rapid retries
    const timer = setTimeout(() => {
      setLoadingTransactions(true);
      setTransactionsError(null);
      const userId = localStorage.getItem("userId") || "";
    
    // Add error handling and timeout
    let timeoutId: NodeJS.Timeout | null = null;
    let controller: AbortController | null = null;
    
    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => {
        if (controller) {
          controller.abort();
        }
      }, 30000); // 30 second timeout
      
      fetch(`/api/transactions/bank?bankName=${encodeURIComponent(bankName)}&userId=${userId}`, {
        signal: controller.signal
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setTransactions(data);
            console.log(`Loaded ${data.length} transactions for ${bankName}`);
            if (data.length === 0) {
              setTransactionsError(`No transactions found for ${bankName}. Please upload some statements first.`);
            }
          } else {
            setTransactionsError(data.error || 'Failed to fetch transactions');
          }
        })
        .catch((error) => {
          console.error('Error fetching transactions:', error);
          if (error.name === 'AbortError') {
            setTransactionsError('Request timed out. Please try again.');
          } else if (error.message.includes('Failed to fetch')) {
            setTransactionsError('Network error. Please check your connection and try again.');
          } else {
            setTransactionsError(`Failed to fetch transactions: ${error.message}`);
          }
        })
        .finally(() => {
          // Always clear the timeout to prevent memory leaks
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          setLoadingTransactions(false);
        });
    } catch (error) {
      console.error('Error setting up fetch request:', error);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setLoadingTransactions(false);
    }
    }, 100); // 100ms delay to prevent rapid retries
    
    return () => clearTimeout(timer);
  }, [bankName]);

  useEffect(() => {
    const fetchTags = async () => {
      const userId = localStorage.getItem('userId');
      const response = await fetch('/api/tags?userId=' + userId);
      const data = await response.json();
      if (Array.isArray(data)) setAllTags(data); else setAllTags([]);
    };

    // Load tags on mount
    fetchTags();

    // Set up event listeners for tag changes
    const handleTagDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Tag deleted event received in BankTransactionsPage:', customEvent.detail);
      fetchTags(); // Refresh tags
    };

    const handleTagsBulkDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Tags bulk deleted event received in BankTransactionsPage:', customEvent.detail);
      fetchTags(); // Refresh tags
    };

    const handleTagUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Tag updated event received in BankTransactionsPage:', customEvent.detail);
      fetchTags(); // Refresh tags
    };

    // Add event listeners
    window.addEventListener('tagDeleted', handleTagDeleted);
    window.addEventListener('tagsBulkDeleted', handleTagsBulkDeleted);
    window.addEventListener('tagUpdated', handleTagUpdated);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('tagDeleted', handleTagDeleted);
      window.removeEventListener('tagsBulkDeleted', handleTagsBulkDeleted);
      window.removeEventListener('tagUpdated', handleTagUpdated);
    };
  }, []);

  const handleRowSelect = (id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // Filtered transactions for table and summary
  const filteredTransactions = transactions.filter(tx => {
    // Tag filter
    if (tagFilters.length > 0) {
      const tags = (tx.tags || []) as Tag[];
      // Use AND logic: transaction must have ALL selected tags
      if (!tagFilters.every(selectedTag => tags.some(t => t.name === selectedTag))) return false;
    }
    // Search
    if (
      search &&
      (searchField === 'all'
        ? !Object.values(tx).some(val => String(val).toLowerCase().includes(search.toLowerCase()))
        : !String(tx[searchField] || '').toLowerCase().includes(search.toLowerCase()))
    )
      return false;
    // Date range (if there is a date field)
    const dateKey = Object.keys(tx).find(k => k.toLowerCase().includes('date'));
    if (dateKey && (dateRange.from || dateRange.to)) {
      const rowDate = tx[dateKey];
      if (typeof rowDate === 'string') {
        let d = rowDate;
        if (/\d{2}\/\d{2}\/\d{4}/.test(d)) {
          const [dd, mm, yyyy] = d.split("/");
          d = `${yyyy}-${mm}-${dd}`;
        }
        if (dateRange.from && d < dateRange.from) return false;
        if (dateRange.to && d > dateRange.to) return false;
      }
    }
    return true;
  });

  const handleSelectAll = () => {
    if (selectAll) setSelectedRows(new Set());
    else setSelectedRows(new Set(filteredTransactions.map(tx => tx.id)));
    setSelectAll(!selectAll);
  };

  useEffect(() => {
    setSelectAll(
      transactions.length > 0 && transactions.every(tx => selectedRows.has(tx.id))
    );
  }, [selectedRows, transactions]);

  const handleAddTag = async () => {
    setTagging(true);
    setTagError(null);
    setTagSuccess(null);
    if (!selectedTagId) { setTagging(false); return; }
    const tagObj = allTags.find(t => t.id === selectedTagId);
    if (!tagObj) { setTagging(false); return; }
    try {
      // Prepare bulk update data
      const bulkUpdates = Array.from(selectedRows).map(id => {
        const tx = transactions.find(t => t.id === id);
        if (!tx) return null;
        const tags = Array.isArray(tx.tags) ? [...tx.tags] : [];
        if (!tags.some((t) => t.id === tagObj.id)) tags.push(tagObj);
        return {
          transactionId: tx.id,
          tags: tags.map(tag => tag.id),
          bankName: tx.bankName
        };
      }).filter(Boolean);
      // Use bulk update API
      const response = await fetch('/api/transaction/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: bulkUpdates })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk update failed');
      }
      setTagSuccess('Tag added!');
      setSelectedTagId("");
      setSelectedRows(new Set());
      setTimeout(() => setTagSuccess(null), 1500);
      setLoadingTransactions(true);
      const userId = localStorage.getItem("userId") || "";
      fetch(`/api/transactions/bank?bankName=${encodeURIComponent(bankName)}&userId=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setTransactions(data);
          else setTransactionsError(data.error || 'Failed to fetch transactions');
        })
        .catch(() => setTransactionsError('Failed to fetch transactions'))
        .finally(() => setLoadingTransactions(false));
    } catch {
      setTagError('Failed to add tag');
    } finally {
      setTagging(false);
    }
  };

  // Helper to robustly parse dd/mm/yyyy, dd/mm/yy, dd-mm-yyyy, dd-mm-yy
  function parseDate(dateStr: string): Date {
    if (!dateStr || typeof dateStr !== 'string') return new Date('1970-01-01');
    
    // Match dd/mm/yyyy, dd-mm-yyyy, dd/mm/yy, dd-mm-yy
    const match = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (match) {
      const day = match[1];
      const month = match[2];
      let year = match[3];
      if (year.length === 2) year = '20' + year;
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }
    
    // Try ISO format (yyyy-mm-dd)
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }
    
    // Try yyyy/mm/dd format
    const slashMatch = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (slashMatch) {
      const [, year, month, day] = slashMatch;
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }
    
    // Fallback for ISO or other formats
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    return new Date('1970-01-01');
  }

  // Sort filtered transactions
  const sortedAndFilteredTransactions = [...filteredTransactions].sort((a, b) => {
    // Handle tagged/untagged sorting
    if (sortOrder === 'tagged' || sortOrder === 'untagged') {
      const tagsA = Array.isArray(a.tags) ? a.tags : [];
      const tagsB = Array.isArray(b.tags) ? b.tags : [];
      const hasTagsA = tagsA.length > 0;
      const hasTagsB = tagsB.length > 0;
      
      if (sortOrder === 'tagged') {
        // Tagged transactions first
        if (hasTagsA && !hasTagsB) return -1;
        if (!hasTagsA && hasTagsB) return 1;
      } else {
        // Untagged transactions first
        if (!hasTagsA && hasTagsB) return -1;
        if (hasTagsA && !hasTagsB) return 1;
      }
      
      // If both have same tag status, sort by date (newest first)
      const dateFieldA = getDateField(a);
      const dateFieldB = getDateField(b);
      const dateA = parseDate(dateFieldA ? a[dateFieldA] as string : '');
      const dateB = parseDate(dateFieldB ? b[dateFieldB] as string : '');
      return dateB.getTime() - dateA.getTime();
    }
    
    // Date-based sorting
    function getDateField(obj: Record<string, unknown>) {
      if ('Date' in obj) return 'Date';
      if ('Transaction Date' in obj) return 'Transaction Date';
      const key = Object.keys(obj).find(k => k.toLowerCase() === 'date' || k.toLowerCase() === 'transaction date');
      if (key) return key;
      return Object.keys(obj).find(k => k.toLowerCase().includes('date'));
    }
    const dateFieldA = getDateField(a);
    const dateFieldB = getDateField(b);
    const dateA = parseDate(dateFieldA ? a[dateFieldA] as string : '');
    const dateB = parseDate(dateFieldB ? b[dateFieldB] as string : '');
    if (sortOrder === 'desc') {
      return dateB.getTime() - dateA.getTime();
    } else {
      return dateA.getTime() - dateB.getTime();
    }
  });

  useEffect(() => {
    if (filteredTransactions.length > 0) {
      const headers = Array.from(new Set(filteredTransactions.flatMap(tx => Object.keys(tx)))).filter(key => key !== 'id' && key !== 'transactionData');
      if (headers.length !== transactionHeaders.length || headers.some((h, i) => h !== transactionHeaders[i])) {
        setTransactionHeaders(headers);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTransactions.length]);

  // Handler for column reordering
  const handleReorderHeaders = (newHeaders: string[]) => {
    setTransactionHeaders(newHeaders);
  };

  // Compute tag counts for filtered transactions
  const tagStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    for (const tx of filteredTransactions) {
      if (Array.isArray(tx.tags)) {
        for (const tag of tx.tags) {
          if (tag && typeof tag.name === 'string') {
            stats[tag.name] = (stats[tag.name] || 0) + 1;
          }
        }
      }
    }
    return stats;
  }, [filteredTransactions]);

  // Handler to remove a tag from a transaction
  const handleRemoveTag = async (rowIdx: number, tagId: string) => {
    const tx = sortedAndFilteredTransactions[rowIdx];
    if (!tx || !tx.id) return;
    
    // Find the tag name for the confirmation message
    const tagToRemove = Array.isArray(tx.tags) ? tx.tags.find(t => t.id === tagId) : null;
    const tagName = tagToRemove?.name || 'this tag';
    
    // Show confirmation dialog
    const confirmed = window.confirm(`Are you sure you want to remove the tag "${tagName}" from this transaction?`);
    if (!confirmed) return;
    
    setLoadingTransactions(true);
    const tags = Array.isArray(tx.tags) ? tx.tags.filter((t) => t.id !== tagId) : [];
    await fetch('/api/transaction/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: tx.id, tags: tags.map(tag => tag.id), bankName })
    });
    // Refresh transactions
    const userId = localStorage.getItem("userId") || "";
    fetch(`/api/transactions/bank?bankName=${encodeURIComponent(bankName)}&userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTransactions(data);
        else setTransactionsError(data.error || 'Failed to fetch transactions');
      })
      .catch(() => setTransactionsError('Failed to fetch transactions'))
      .finally(() => setLoadingTransactions(false));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tagsRemovedFromTransactions', { detail: { transactionId: tx.id, tagId } }));
    }
  };

  useEffect(() => {
    // Fetch and set the header order from the bank/account when transactions tab is active
    if (bankName) {
      const userId = localStorage.getItem('userId');
      if (userId) {
        fetch(`/api/bank-header?bankName=${encodeURIComponent(bankName)}`)
          .then(res => res.json())
          .then(data => {
            const headerOrder = Array.isArray(data.header) ? data.header : [];
            // Find all keys in filtered transactions
            const allKeys = Array.from(new Set(filteredTransactions.flatMap(tx => Object.keys(tx)))).filter(key => key !== 'id' && key !== 'transactionData');
            // Append any extra fields not in the header
            const extraFields = allKeys.filter(k => !headerOrder.includes(k));
            setTransactionHeaders([...headerOrder, ...extraFields]);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankName, filteredTransactions.length]);

  // Add a handler for the tag menu action
  const handleApplyTagToAllFromMenu = async (tagName: string) => {
    try {
      const tagObj = allTags.find(t => t.name === tagName);
      if (!tagObj) return;
      const userId = localStorage.getItem('userId') || '';
      setApplyingBulkTag(true);
      const targetTxs = filteredTransactions;
      if (targetTxs.length === 0) { setApplyingBulkTag(false); return; }
      const updates = targetTxs.map(tx => {
        const existing = Array.isArray(tx.tags) ? tx.tags.map(t => t.id) : [];
        const unique = Array.from(new Set([...existing, tagObj.id]));
        return {
          transactionId: tx.id,
          tags: unique,
          bankName: String(tx.bankName || bankName),
          transactionData: { userId },
        };
      });
      const res = await fetch('/api/transaction/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to apply tag');
      }
      const refreshed = await fetch(`/api/transactions/bank?bankName=${encodeURIComponent(bankName)}&userId=${userId}`).then(r => r.json());
      if (Array.isArray(refreshed)) setTransactions(refreshed); else setTransactionsError(refreshed.error || 'Failed to fetch transactions');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tagsAppliedToTransactions', { detail: { tagName, count: targetTxs.length } }));
      }
    } catch (e) {
      console.error(e);
      setTransactionsError(e instanceof Error ? e.message : 'Failed to apply tag');
    } finally {
      setApplyingBulkTag(false);
    }
  };

  // Add a handler for tag deletion from the system
  const handleTagDeleted = () => {
    setLoadingTransactions(true);
    const userId = localStorage.getItem('userId') || '';
    // Refetch all tags
    fetch('/api/tags?userId=' + userId)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAllTags(data); else setAllTags([]); });
    // Refetch all transactions
    fetch(`/api/transactions/bank?bankName=${encodeURIComponent(bankName)}&userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTransactions(data);
        else setTransactionsError(data.error || 'Failed to fetch transactions');
      })
      .catch(() => setTransactionsError('Failed to fetch transactions'))
      .finally(() => setLoadingTransactions(false));
  };

  return (
    <div className="min-h-screen overflow-y-auto">
      <Toaster position="top-center" />
      
      <div className="py-4 sm:py-6 px-2 sm:px-4">
        <div className="max-w-full mx-auto flex flex-col">
          
          {/* Header Section */}
          <div className="flex flex-row items-center justify-between gap-2 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow">
                <RiFileList3Line className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Transactions for {bankName}</h1>
                <p className="text-sm text-gray-600">Bank Transaction Dashboard</p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="space-y-6">
            {/* Transaction Filters */}
            <TransactionFilterBar
              search={search}
              onSearchChange={setSearch}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onDownload={() => {}}
              downloadDisabled={false}
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
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('tagUpdated', { detail: { action: 'exists', tag: existingTag } }));
                      }
                      return existingTag.id;
                    }
                    throw new Error('Tag already exists');
                  }
                  
                  if (!res.ok) throw new Error('Failed to create tag');
                  const tag = await res.json();
                  setAllTags(prev => [...prev, tag]);
                  setSelectedTagId(tag.id);
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('tagUpdated', { detail: { action: 'created', tag } }));
                  }
                  return tag.id;
                }}
              />
            )}

            {/* Analytics Summary */}
            {(() => {
              let totalAmount = 0;
              let totalCredit = 0;
              let totalDebit = 0;
              const normalizeAmount = (val: unknown): number => {
                if (typeof val === 'number') return val;
                if (typeof val === 'string') return parseFloat(val.replace(/,/g, '')) || 0;
                return 0;
              };
              const extractCrDr = (tx: Record<string, unknown>): 'CR' | 'DR' | '' => {
                const primary = (tx['Dr./Cr.'] ?? tx['Dr/Cr'] ?? tx['DR/CR'] ?? tx['dr/cr'] ?? tx['Dr / Cr'] ?? '').toString().trim().toUpperCase();
                const secondary = (tx['Dr / Cr_1'] ?? tx['DR / CR_1'] ?? '').toString().trim().toUpperCase();
                const reversed = (tx['Cr./Dr.'] ?? tx['Cr/Dr'] ?? tx['CR/DR'] ?? tx['cr/dr'] ?? tx['Cr / Dr'] ?? tx['CR / DR'] ?? '').toString().trim().toUpperCase();
                const generic = (tx['Type'] ?? tx['type'] ?? '').toString().trim().toUpperCase();
                if (primary) return primary as 'CR' | 'DR';
                if (reversed) return reversed as 'CR' | 'DR';
                if (secondary) return secondary as 'CR' | 'DR';
                if (generic) return generic as 'CR' | 'DR';
                return '';
              };
              for (const tx of sortedAndFilteredTransactions as unknown as Array<Record<string, unknown>>) {
                const amountField = Object.keys(tx).find(k => k.toLowerCase().includes('amount')) as string | undefined;
                const rawCandidate = normalizeAmount(amountField ? (tx as Record<string, unknown>)[amountField as keyof typeof tx] as unknown : 0);
                const raw = typeof rawCandidate === 'number' ? rawCandidate : 0;
                
                if (!raw) {
                  const depositAmt = normalizeAmount(tx['Deposit Amt.'] ?? tx['Deposit Amt'] ?? tx['Deposit Amount']);
                  const withdrawalAmt = normalizeAmount(tx['Withdrawal Amt.'] ?? tx['Withdrawal Amt'] ?? tx['Withdrawal Amount']);
                  
                  if (depositAmt > 0 || withdrawalAmt > 0) {
                    totalCredit += Math.abs(depositAmt as number);
                    totalDebit += Math.abs(withdrawalAmt as number);
                    totalAmount += Math.abs(depositAmt as number) + Math.abs(withdrawalAmt as number);
                    continue;
                  }
                  
                  const creditCol = normalizeAmount(tx['Credit'] ?? tx['credit'] ?? tx['Cr'] ?? tx['CR'] ?? tx['Cr Amount'] ?? tx['Credit Amount']);
                  const debitCol = normalizeAmount(tx['Debit'] ?? tx['debit'] ?? tx['Dr'] ?? tx['DR'] ?? tx['Dr Amount'] ?? tx['Debit Amount']);
                  
                  if (creditCol > 0 || debitCol > 0) {
                    const signedFromCols = Math.abs(creditCol as number) - Math.abs(debitCol as number);
                    totalCredit += Math.max(0, signedFromCols);
                    totalDebit += Math.max(0, -signedFromCols);
                    totalAmount += Math.abs(creditCol as number) + Math.abs(debitCol as number);
                    continue;
                  }
                }
                
                const crdr = extractCrDr(tx as Record<string, unknown>);
                let signed = raw;
                if (crdr === 'CR') signed = Math.abs(raw);
                else if (crdr === 'DR') signed = -Math.abs(raw);
                totalCredit += signed > 0 ? signed : 0;
                totalDebit += signed < 0 ? -signed : 0;
                totalAmount += Math.abs(signed);
              }
              const allBankIds = new Set(sortedAndFilteredTransactions.map(tx => tx.bankId));
              const allAccountIds = new Set(sortedAndFilteredTransactions.map(tx => tx.accountId));
              return (
                <AnalyticsSummary
                  totalTransactions={sortedAndFilteredTransactions.length}
                  totalAmount={totalAmount}
                  totalCredit={totalCredit}
                  totalDebit={totalDebit}
                  totalBanks={allBankIds.size}
                  totalAccounts={allAccountIds.size}
                  showBalance={true}
                  transactions={sortedAndFilteredTransactions as unknown as Array<Record<string, unknown>>}
                />
              );
            })()}

            {/* Transaction Table Container - Matching Super Bank responsive design */}
            <div className="flex-1 min-h-0 max-w-[65vw]" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 400px)' }}>
              {transactionsError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Transactions</h3>
                    <p className="text-gray-600 mb-4">{transactionsError}</p>
                    <button 
                      onClick={() => {
                        setLoadingTransactions(true);
                        setTransactionsError(null);
                        const userId = localStorage.getItem("userId") || "";
                        fetch(`/api/transactions/bank?bankName=${encodeURIComponent(bankName)}&userId=${userId}`)
                          .then(res => res.json())
                          .then(data => {
                            if (Array.isArray(data)) setTransactions(data);
                            else setTransactionsError(data.error || 'Failed to fetch transactions');
                          })
                          .catch(() => setTransactionsError('Failed to fetch transactions'))
                          .finally(() => setLoadingTransactions(false));
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : transactions.length === 0 && !loadingTransactions ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="text-gray-400 text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transactions Found</h3>
                    <p className="text-gray-600 mb-4">
                      No transactions found for {bankName}. Please upload some bank statements first.
                    </p>
                    <button 
                      onClick={() => window.history.back()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto relative h-[80vh]">
                  {applyingBulkTag && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center">
                      <div className="px-4 py-2 bg-white border rounded shadow text-sm">Applying tag to all matching transactions...</div>
                    </div>
                  )}
                  <TransactionTable
                    rows={sortedAndFilteredTransactions.map(tx => {
                      const filtered = Object.fromEntries(Object.entries(tx).filter(([key]) => key !== 'transactionData'));
                      return {
                        ...filtered,
                        tags: tx.tags || []
                      };
                    })}
                    headers={transactionHeaders}
                    selectedRows={new Set(sortedAndFilteredTransactions.map((tx, idx) => selectedRows.has(tx.id) ? idx : -1).filter(i => i !== -1))}
                    onRowSelect={idx => {
                      const tx = sortedAndFilteredTransactions[idx];
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
