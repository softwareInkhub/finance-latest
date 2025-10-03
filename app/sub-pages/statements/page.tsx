'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RiFileList3Line } from 'react-icons/ri';
import TransactionTable from '../../components/TransactionTable';
import TaggingControls from '../../components/TaggingControls';
import AnalyticsSummary from '../../components/AnalyticsSummary';
import TransactionFilterBar from '../../components/TransactionFilterBar';
import TagFilterPills from '../../components/TagFilterPills';
import React from 'react';
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

function StatementsContent() {
  const searchParams = useSearchParams();
  const bankId = searchParams.get('bankId');
  const accountId = searchParams.get('accountId');

  const [tab] = useState<'transactions'>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true); // Start with loading true
  const [waitingForParams, setWaitingForParams] = useState(true); // Wait for URL params
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

  // Advanced tag creation features - ADDED
  const [selection, setSelection] = useState<{ text: string; x: number; y: number; rowIdx?: number; transactionId?: string } | null>(null);
  const [tagCreateMsg, setTagCreateMsg] = useState<string | null>(null);
  const [pendingTag, setPendingTag] = useState<{ tagName: string; rowIdx?: number; transactionId?: string; selectionText: string } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);



  // Add state for loading and matching preview
  const [applyingTagToAll, setApplyingTagToAll] = useState(false);



  useEffect(() => {
    if (bankId) {
      fetch(`/api/bank`).then(res => res.json()).then((banks) => {
        const bank = Array.isArray(banks) ? banks.find((b) => b.id === bankId) : null;
        setBankName(bank?.bankName || "");
      });
    }
  }, [bankId]);

  // Wait for URL parameters to be available
  useEffect(() => {
    if (bankId && accountId) {
      setWaitingForParams(false);
    } else {
      setWaitingForParams(true);
    }
  }, [bankId, accountId]);

  useEffect(() => {
    if (tab === 'transactions' && accountId && bankName) {
      console.log(`🔄 Refreshing transactions for account: ${accountId}, bank: ${bankName}`);
      setLoadingTransactions(true);
      setTransactionsError(null);
      setTransactions([]); // Clear previous transactions immediately
      
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
        }, 15000); // Reduced timeout to 15 seconds
        
        const url = `/api/transactions?accountId=${accountId}&userId=${userId}&bankName=${encodeURIComponent(bankName)}`;
        console.log(`📡 Fetching from: ${url}`);
        
        fetch(url, {
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
              console.log(`✅ Loaded ${data.length} transactions for account ${accountId}`);
              if (data.length === 0) {
                console.log(`ℹ️ No transactions found for account ${accountId}`);
              }
            } else {
              console.error('❌ Invalid response format:', data);
              setTransactionsError(data.error || 'Failed to fetch transactions');
            }
          })
          .catch((error) => {
            console.error('❌ Error fetching transactions:', error);
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
        console.error('❌ Error setting up fetch request:', error);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        setLoadingTransactions(false);
        setTransactionsError('Failed to setup request');
      }
    } else if (tab === 'transactions' && !accountId) {
      console.log('⚠️ No accountId provided, clearing transactions');
      setTransactions([]);
      setLoadingTransactions(false);
      // Only show error if we're not waiting for params
      if (!waitingForParams) {
        setTransactionsError('No account selected');
      }
    }
  }, [tab, accountId, bankName, waitingForParams]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    fetch('/api/tags?userId=' + userId)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAllTags(data); else setAllTags([]); });
  }, []);

  // Advanced tag creation: Text selection detection - ADDED
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim() && tableRef.current && tableRef.current.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = tableRef.current.getBoundingClientRect();
        // Try to find the row index and transaction ID
        let rowIdx: number | undefined = undefined;
        let transactionId: string | undefined = undefined;
        let node = sel.anchorNode as HTMLElement | null;
        while (node && node !== tableRef.current) {
          if (node instanceof HTMLTableRowElement) {
            if (node.hasAttribute('data-row-idx')) {
              rowIdx = parseInt(node.getAttribute('data-row-idx') || '', 10);
            }
            if (node.hasAttribute('data-transaction-id')) {
              transactionId = node.getAttribute('data-transaction-id') || undefined;
            }
            if (rowIdx !== undefined && transactionId) break;
          }
          node = node.parentElement;
        }
        setSelection({
          text: sel.toString().trim(),
          x: rect.left - containerRect.left,
          y: rect.bottom - containerRect.top,
          rowIdx,
          transactionId,
        });
      } else {
        setSelection(null);
      }
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Advanced tag creation: Create tag from selection - ADDED
  const handleCreateTagFromSelection = async () => {
    if (!selection?.text) return;
    setTagCreateMsg(null);
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selection.text, userId }), // color will be auto-assigned
      });
      
      if (res.status === 409) {
        // Tag already exists
        setTagCreateMsg("Tag already exists!");
        setTimeout(() => setTagCreateMsg(null), 1500);
        return;
      }
      
      if (!res.ok) throw new Error("Failed to create tag");
      
      setTagCreateMsg("Tag created!");
      setPendingTag(selection.rowIdx !== undefined ? { 
        tagName: selection.text, 
        rowIdx: selection.rowIdx, 
        transactionId: selection.transactionId,
        selectionText: selection.text 
      } : null);
      setSelection(null);
      // Refresh tags
      const tagsRes = await fetch('/api/tags?userId=' + userId);
      const tags = await tagsRes.json();
      setAllTags(Array.isArray(tags) ? tags : []);
    } catch {
      setTagCreateMsg("Failed to create tag");
      setTimeout(() => setTagCreateMsg(null), 1500);
    }
  };

  // Advanced tag creation: Apply tag to only this transaction row - ADDED
  const handleApplyTagToRow = async () => {
    if (!pendingTag) return;
    const { tagName, transactionId } = pendingTag;
    const tagObj = allTags.find(t => t.name === tagName);
    if (!tagObj) return setPendingTag(null);
    
    // Find the transaction directly by ID
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) {
      console.error('Transaction not found for ID:', transactionId);
      setTagError('Transaction not found');
      return;
    }
    const tags = Array.isArray(tx.tags) ? [...tx.tags] : [];
    if (!tags.some((t) => t.id === tagObj.id)) tags.push(tagObj);
    await fetch('/api/transaction/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: tx.id, tags: tags.map(tag => tag.id), bankName })
    });
    setPendingTag(null);
    setTagCreateMsg("Tag applied to transaction!");
    setTimeout(() => setTagCreateMsg(null), 1500);
    // Refresh transactions
    setLoadingTransactions(true);
    const userId = localStorage.getItem("userId") || "";
    fetch(`/api/transactions?accountId=${accountId}&userId=${userId}&bankName=${encodeURIComponent(bankName)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTransactions(data);
        else setTransactionsError(data.error || 'Failed to fetch transactions');
      })
      .catch(() => setTransactionsError('Failed to fetch transactions'))
      .finally(() => setLoadingTransactions(false));
  };

  // Advanced tag creation: Apply tag to all transactions where selection text is present - ADDED
  const handleApplyTagToAll = async () => {
    if (!pendingTag) return;
    setApplyingTagToAll(true);
    const { tagName, selectionText } = pendingTag;
    const tagObj = allTags.find(t => t.name === tagName);
    if (!tagObj) return setPendingTag(null);
    
    // Find all matching transactions (case-insensitive)
    let matching = transactions.filter((tx) => {
      return Object.entries(tx).some(([key, val]) =>
        key !== 'tags' &&
        ((typeof val === 'string' && val.toLowerCase().includes(selectionText.toLowerCase())) ||
         (typeof val === 'number' && String(val).toLowerCase().includes(selectionText.toLowerCase())))
      );
    });

    // Additional filtering: if the selection text contains common UPI patterns, be more specific
    if (selectionText.toLowerCase().includes('upi/') || selectionText.toLowerCase().includes('neft') || selectionText.toLowerCase().includes('imps')) {
      // For UPI/NEFT/IMPS transactions, prioritize exact matches in description field
      const exactMatches = matching.filter(tx => 
        typeof tx.description === 'string' && 
        tx.description.toLowerCase().includes(selectionText.toLowerCase())
      );
      
      if (exactMatches.length > 0) {
        // If we have exact description matches, prefer those over other field matches
        matching = exactMatches;
      }
    }

    // Sort matches to prioritize exact matches and description field matches
    matching.sort((a, b) => {
      // Check for exact case-insensitive matches first
      const aExact = Object.entries(a).some(([key, val]) => 
        key !== 'tags' && 
        typeof val === 'string' && 
        val.toLowerCase() === selectionText.toLowerCase()
      );
      const bExact = Object.entries(b).some(([key, val]) => 
        key !== 'tags' && 
        typeof val === 'string' && 
        val.toLowerCase() === selectionText.toLowerCase()
      );
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then prioritize description field matches
      const aDescMatch = typeof a.description === 'string' && a.description.toLowerCase().includes(selectionText.toLowerCase());
      const bDescMatch = typeof b.description === 'string' && b.description.toLowerCase().includes(selectionText.toLowerCase());
      
      if (aDescMatch && !bDescMatch) return -1;
      if (!aDescMatch && bDescMatch) return 1;
      
      return 0;
    });

    // If there are multiple matches, show a confirmation dialog
    if (matching.length > 1) {
      const confirmed = window.confirm(
        `Found ${matching.length} transactions containing "${selectionText}". ` +
        `This will apply the tag "${tagName}" to all of them. Continue?`
      );
      if (!confirmed) {
        setApplyingTagToAll(false);
        return;
      }
    }
    await Promise.all(matching.map(async (tx) => {
      const tags = Array.isArray(tx.tags) ? [...tx.tags] : [];
      if (!tags.some((t) => t.id === tagObj.id)) tags.push(tagObj);
      await fetch('/api/transaction/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: tx.id, tags: tags.map(tag => tag.id), bankName })
      });
    }));
    setPendingTag(null);
    setTagCreateMsg(`Tag applied to all ${matching.length} matching transactions! (Tag summary updating in background...)`);
    setTimeout(() => setTagCreateMsg(null), 3000);
    // Refresh transactions
    setLoadingTransactions(true);
    const userId = localStorage.getItem("userId") || "";
    fetch(`/api/transactions?accountId=${accountId}&userId=${userId}&bankName=${encodeURIComponent(bankName)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTransactions(data);
        else setTransactionsError(data.error || 'Failed to fetch transactions');
      })
      .catch(() => setTransactionsError('Failed to fetch transactions'))
      .finally(() => {
        setLoadingTransactions(false);
        setApplyingTagToAll(false);
      });
};

  // Auto-clear tagCreateMsg after 2 seconds - ADDED
  useEffect(() => {
    if (tagCreateMsg) {
      const timeout = setTimeout(() => setTagCreateMsg(null), 2000);
      return () => clearTimeout(timeout);
    }
  }, [tagCreateMsg]);





  const handleRowSelect = (id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

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
      fetch(`/api/transactions?accountId=${accountId}&userId=${userId}&bankName=${encodeURIComponent(bankName)}`)
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
    if (tab === 'transactions' && filteredTransactions.length > 0) {
      const headers = Array.from(new Set(filteredTransactions.flatMap(tx => Object.keys(tx)))).filter(key => key !== 'id' && key !== 'transactionData');
      if (headers.length !== transactionHeaders.length || headers.some((h, i) => h !== transactionHeaders[i])) {
        setTransactionHeaders(headers);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filteredTransactions.length]);

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
    setTagCreateMsg('Tag removed!');
    setTimeout(() => setTagCreateMsg(null), 1500);
    // Refresh transactions
    const userId = localStorage.getItem("userId") || "";
    fetch(`/api/transactions?accountId=${accountId}&userId=${userId}&bankName=${encodeURIComponent(bankName)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTransactions(data);
        else setTransactionsError(data.error || 'Failed to fetch transactions');
      })
      .catch(() => setTransactionsError('Failed to fetch transactions'))
      .finally(() => setLoadingTransactions(false));
  };

  useEffect(() => {
    // Fetch and set the header order from the bank/account when transactions tab is active
    if (tab === 'transactions' && bankName) {
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
  }, [tab, bankName, filteredTransactions.length]);

  // Add a handler for the tag menu action
  const handleApplyTagToAllFromMenu = (tagName: string) => {
    setPendingTag({ tagName, rowIdx: -1, selectionText: tagName });
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
    fetch(`/api/transactions?accountId=${accountId}&userId=${userId}&bankName=${encodeURIComponent(bankName)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTransactions(data);
        else setTransactionsError(data.error || 'Failed to fetch transactions');
      })
      .catch(() => setTransactionsError('Failed to fetch transactions'))
      .finally(() => setLoadingTransactions(false));
  };

  return (
    <div className="min-h-screen overflow-y-auto py-2 sm:py-4 lg:py-6 px-2 sm:px-4 lg:px-6 space-y-2 sm:space-y-3 lg:space-y-4">
      <Toaster position="top-center" />
     
       <div className="w-full max-w-7xl mx-auto space-y-2 sm:space-y-3 lg:space-y-4">
         {/* File Migration Banner removed */}
         
         {/* Transactions Heading - Moved up */}
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-1">
           <div className="flex items-center gap-1">
             <div className="bg-blue-100 p-2 rounded-full text-blue-500 text-lg sm:text-xl lg:text-2xl shadow">
               <RiFileList3Line />
             </div>
             <h1 className="text-lg sm:text-xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Transactions</h1>
           </div>
           <div className="flex items-center gap-2 sm:gap-4">

           </div>
         </div>



          <div className="space-y-2 sm:space-y-3">
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
                  // Example: create tag in backend and return new tag id
                  const userId = localStorage.getItem('userId');
                  const res = await fetch('/api/tags', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, userId }) // color will be auto-assigned
                  });
                  
                  if (res.status === 409) {
                    // Tag already exists - find the existing tag and use it
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
              // Compute robust totals from the visible transactions
              let totalAmount = 0;
              let totalCredit = 0;
              let totalDebit = 0;
              const normalizeAmount = (val: unknown): number => {
                if (typeof val === 'number') return val;
                if (typeof val === 'string') return parseFloat(val.replace(/,/g, '')) || 0;
                return 0;
              };
              const extractCrDr = (tx: Record<string, unknown>): 'CR' | 'DR' | '' => {
                // Prioritize primary Dr/Cr column over secondary ones
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
                // Try unified amount
                const amountField = Object.keys(tx).find(k => k.toLowerCase().includes('amount')) as string | undefined;
                const rawCandidate = normalizeAmount(amountField ? (tx as Record<string, unknown>)[amountField as keyof typeof tx] as unknown : 0);
                const raw = typeof rawCandidate === 'number' ? rawCandidate : 0;
                
                // For HDFC and similar banks that use separate Deposit/Withdrawal columns
                if (!raw) {
                  const depositAmt = normalizeAmount(tx['Deposit Amt.'] ?? tx['Deposit Amt'] ?? tx['Deposit Amount']);
                  const withdrawalAmt = normalizeAmount(tx['Withdrawal Amt.'] ?? tx['Withdrawal Amt'] ?? tx['Withdrawal Amount']);
                  
                  if (depositAmt > 0 || withdrawalAmt > 0) {
                    // HDFC-style separate columns
                    totalCredit += Math.abs(depositAmt as number);
                    totalDebit += Math.abs(withdrawalAmt as number);
                    totalAmount += Math.abs(depositAmt as number) + Math.abs(withdrawalAmt as number);
                    continue;
                  }
                  
                  // Try other credit/debit columns
                  const creditCol = normalizeAmount(tx['Credit'] ?? tx['credit'] ?? tx['Cr'] ?? tx['CR'] ?? tx['Cr Amount'] ?? tx['Credit Amount']);
                  const debitCol = normalizeAmount(tx['Debit'] ?? tx['debit'] ?? tx['Dr'] ?? tx['DR'] ?? tx['Dr Amount'] ?? tx['Debit Amount']);
                  
                  if (creditCol > 0 || debitCol > 0) {
                    // Signed from columns; totalAmount should reflect magnitude of movement
                    const signedFromCols = Math.abs(creditCol as number) - Math.abs(debitCol as number);
                    totalCredit += Math.max(0, signedFromCols);
                    totalDebit += Math.max(0, -signedFromCols);
                    totalAmount += Math.abs(creditCol as number) + Math.abs(debitCol as number);
                    continue;
                  }
                }
                
                // If we have raw amount, apply Dr/Cr sign
                const crdr = extractCrDr(tx as Record<string, unknown>);
                let signed = raw;
                if (crdr === 'CR') signed = Math.abs(raw);
                else if (crdr === 'DR') signed = -Math.abs(raw);
                // Accumulate
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

            {/* Transaction Table with Advanced Tag Creation Features - ADDED */}
            {(
              <div ref={tableRef} className="overflow-x-auto relative max-h-[50vh] sm:h-[55vh] lg:h-[60vh]">
                {/* Floating create tag button - ADDED */}
                {selection && (
                  <button
                    style={{ position: 'absolute', left: selection.x, top: selection.y + 8, zIndex: 1000 }}
                    className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded shadow font-semibold text-xs hover:bg-blue-700 transition-all"
                    onClick={handleCreateTagFromSelection}
                  >
                    + Create Tag from Selection
                  </button>
                )}
                
                {/* Prompt to apply tag to transaction - ADDED */}
                {pendingTag && (
                  <div style={{ 
                    position: 'absolute', 
                    left: selection?.x, 
                    top: selection?.y !== undefined ? selection.y + 8 : 48, 
                    zIndex: 1001 
                  }} className="bg-white border border-blue-200 rounded shadow-lg px-2 sm:px-3 lg:px-4 py-2 sm:py-3 flex flex-col gap-2 sm:gap-3 items-center max-w-xs sm:max-w-md">
                    <span className="text-xs sm:text-sm">Apply tag &quot;{pendingTag.tagName}&quot; to:</span>
                    {/* Preview of matching transactions */}
                    <div className="w-full">
                      <div className="text-xs text-gray-600 mb-2">
                        Matching transactions with &quot;{pendingTag.selectionText}&quot;:
                      </div>
                      <div className="max-h-20 sm:max-h-24 overflow-y-auto bg-gray-50 rounded p-2">
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
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                      <button className="px-2 sm:px-3 py-1 bg-green-600 text-white rounded font-semibold text-xs hover:bg-green-700" onClick={handleApplyTagToRow} disabled={tagging}>Only this transaction</button>
                      <button className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded font-semibold text-xs hover:bg-blue-700" onClick={handleApplyTagToAll} disabled={applyingTagToAll}>All transactions with this text</button>
                      <button className="px-2 sm:px-3 py-1 bg-gray-200 text-gray-700 rounded font-semibold text-xs hover:bg-gray-300" onClick={() => setPendingTag(null)}>Cancel</button>
                    </div>
                    {/* Loading indicator for bulk apply */}
                    {applyingTagToAll && (
                      <div className="w-full flex flex-col items-center mt-2">
                        <div className="animate-spin rounded-full h-4 sm:h-6 w-4 sm:w-6 border-b-2 border-blue-600 mb-2"></div>
                        <span className="text-xs text-blue-700">Applying tag to all matching transactions...</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Success message - ADDED */}
                {tagCreateMsg && (
                  <div className="absolute left-1/2 top-2 -translate-x-1/2 bg-green-100 text-green-800 px-2 sm:px-3 lg:px-4 py-2 rounded shadow text-xs sm:text-sm z-50">
                    {tagCreateMsg}
                  </div>
                )}
                
              <TransactionTable
                rows={sortedAndFilteredTransactions.map(tx => {
                  // Remove transactionData property without referencing it directly
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
                loading={loadingTransactions || waitingForParams}
                error={transactionsError}
                onReorderHeaders={handleReorderHeaders}
                  onRemoveTag={handleRemoveTag}
              />
              </div>
            )}
          </div>
      </div>

    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StatementsContent />
    </Suspense>
  );
} 