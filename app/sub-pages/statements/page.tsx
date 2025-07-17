'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Modal from '../../components/Modals/Modal';
import StatementPreviewModal from '../../components/Modals/StatementPreviewModal';
import { RiFileList3Line, RiUpload2Line, RiDeleteBin6Line, RiPriceTag3Line } from 'react-icons/ri';
import TransactionTable from '../../components/TransactionTable';
import TaggingControls from '../../components/TaggingControls';
import AnalyticsSummary from '../../components/AnalyticsSummary';
import TransactionFilterBar from '../../components/TransactionFilterBar';
import TagFilterPills from '../../components/TagFilterPills';
import React from 'react';
import ConfirmDeleteModal from '../../components/Modals/ConfirmDeleteModal';
import { Toaster, toast } from 'react-hot-toast';

interface Statement {
  id: string;
  bankId: string;
  accountId: string;
  s3FileUrl: string;
  transactionHeader: string[];
  tags: string[];
  fileName?: string;
}

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
  const [statements, setStatements] = useState<Statement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewStatementId, setPreviewStatementId] = useState<string | null>(null);
  const [tab, setTab] = useState<'statements' | 'transactions'>('statements');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
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
  const [uploadTags, setUploadTags] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'tagged' | 'untagged'>('desc');

  // Advanced tag creation features - ADDED
  const [selection, setSelection] = useState<{ text: string; x: number; y: number; rowIdx?: number } | null>(null);
  const [tagCreateMsg, setTagCreateMsg] = useState<string | null>(null);
  const [pendingTag, setPendingTag] = useState<{ tagName: string; rowIdx: number; selectionText: string } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    statementId?: string;
    s3FileUrl?: string;
    fileName?: string;
  }>({ open: false });
  const [deleting, setDeleting] = useState(false);

  // Add state for loading and matching preview
  const [applyingTagToAll, setApplyingTagToAll] = useState(false);

  useEffect(() => {
    const fetchStatements = async () => {
      if (!accountId) return;
      try {
        setError(null);
        const userId = localStorage.getItem("userId") || "";
        const res = await fetch(`/api/statements?accountId=${accountId}&userId=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch statements");
        const data = await res.json();
        setStatements(data);
      } catch {
        setError("Failed to fetch statements");
      }
    };
    fetchStatements();
  }, [accountId]);

  useEffect(() => {
    if (tab === 'transactions' && accountId && bankName) {
      setLoadingTransactions(true);
      setTransactionsError(null);
      const userId = localStorage.getItem("userId") || "";
      fetch(`/api/transactions?accountId=${accountId}&userId=${userId}&bankName=${encodeURIComponent(bankName)}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setTransactions(data);
          else setTransactionsError(data.error || 'Failed to fetch transactions');
        })
        .catch(() => setTransactionsError('Failed to fetch transactions'))
        .finally(() => setLoadingTransactions(false));
    }
  }, [tab, accountId, bankName]);

  useEffect(() => {
    if (bankId) {
      fetch(`/api/bank`).then(res => res.json()).then((banks) => {
        const bank = Array.isArray(banks) ? banks.find((b) => b.id === bankId) : null;
        setBankName(bank?.bankName || "");
      });
    }
    if (accountId) {
      fetch(`/api/account?accountId=${accountId}`).then(res => res.json()).then((account) => {
        setAccountName(account?.accountHolderName || "");
      });
    }
  }, [bankId, accountId]);

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
        // Try to find the row index
        let rowIdx: number | undefined = undefined;
        let node = sel.anchorNode as HTMLElement | null;
        while (node && node !== tableRef.current) {
          if (node instanceof HTMLTableRowElement && node.hasAttribute('data-row-idx')) {
            rowIdx = parseInt(node.getAttribute('data-row-idx') || '', 10);
            break;
          }
          node = node.parentElement;
        }
        setSelection({
          text: sel.toString().trim(),
          x: rect.left - containerRect.left,
          y: rect.bottom - containerRect.top,
          rowIdx,
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
        body: JSON.stringify({ name: selection.text, userId }),
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
    const { tagName, rowIdx } = pendingTag;
    const tagObj = allTags.find(t => t.name === tagName);
    if (!tagObj) return setPendingTag(null);
    const row = filteredTransactions[rowIdx];
    if (!row || !row.id) return setPendingTag(null);
    const tx = transactions.find(t => t.id === row.id);
    if (!tx) return setPendingTag(null);
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
    const matching = transactions.filter((tx) => {
      return Object.entries(tx).some(([key, val]) =>
        key !== 'tags' &&
        ((typeof val === 'string' && val.toLowerCase().includes(selectionText.toLowerCase())) ||
         (typeof val === 'number' && String(val).toLowerCase().includes(selectionText.toLowerCase())))
      );
    });
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
    setTagCreateMsg(`Tag applied to all ${matching.length} matching transactions!`);
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankId || !accountId) return;
    setIsUploading(true);
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Please select a CSV file.");
      setIsUploading(false);
      toast.error("Please select a CSV file.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bankId', bankId);
      formData.append('accountId', accountId);
      formData.append('fileName', fileName.trim() ? fileName.trim() : file.name);
      formData.append('userId', localStorage.getItem("userId") || "");
      formData.append('tags', uploadTags);
      const res = await fetch('/api/statement/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to upload statement');
        throw new Error(errorData.error || 'Failed to upload statement');
      }
      // Refresh statement list
      const newStatement = await res.json();
      setStatements(prev => [...prev, newStatement]);
      setIsModalOpen(false);
      setFileName('');
      setUploadTags('');
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success('File uploaded successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload statement');
      toast.error(err instanceof Error ? err.message : 'Failed to upload statement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteStatement = (statementId: string, s3FileUrl: string) => {
    const statement = statements.find(s => s.id === statementId);
    setDeleteModal({
      open: true,
      statementId,
      s3FileUrl,
      fileName: statement?.fileName || 'this file',
    });
  };

  const confirmDeleteStatement = async () => {
    const { statementId, s3FileUrl, fileName } = deleteModal;
    if (!statementId || !s3FileUrl) return;
    setDeleting(true);
    const userId = localStorage.getItem("userId") || "";
    let attempts = 0;
    let deleted = false;
    let lastResult = null;
    let remainingTransactions = 0;
    while (attempts < 3 && !deleted) {
      try {
        const res = await fetch('/api/statement/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            statementId, 
            s3FileUrl,
            userId,
            bankName
          }),
        });
        if (res.ok) {
          lastResult = await res.json();
          // After delete, check for remaining transactions for this statement
          const checkRes = await fetch(`/api/transactions?accountId=${accountId}&userId=${userId}&bankName=${encodeURIComponent(bankName)}`);
          let stillLeft = [];
          if (checkRes.ok) {
            const txs = await checkRes.json();
            stillLeft = Array.isArray(txs) ? txs.filter(tx => tx.statementId === statementId) : [];
          }
          remainingTransactions = stillLeft.length;
          // Show per-attempt toast (remove this, only show final toast)
          toast.success(
            `Deleted "${fileName}" successfully. Deleted ${lastResult.deletedTransactions || 0} transaction(s) in ${attempts + 1} attempt(s).`
          );
          if (remainingTransactions === 0) {
            setStatements(prev => prev.filter(s => s.id !== statementId));
            deleted = true;
          } else {
            attempts++;
            continue;
          }
        } else {
          const errorData = await res.json();
          toast.error(`Failed to delete: ${errorData.error || 'Unknown error'}`);
          break;
        }
      } catch (error) {
        if (attempts === 2) {
          toast.error(error instanceof Error ? error.message : 'Failed to delete. Please try again.');
        }
      }
      attempts++;
    }
    if (!deleted && remainingTransactions > 0) {
      toast.error(`Some transactions could not be deleted after 3 tries. Deleted ${lastResult?.deletedTransactions || 0} transaction(s) in 3 attempts. Please try again later.`);
    }
    setDeleting(false);
    setDeleteModal({ open: false });
  };

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
      if (!tags.some(t => tagFilters.includes(t.name))) return false;
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
    <div className="min-h-screen py-6 sm:py-10 px-3 sm:px-4 space-y-6 sm:space-y-8">
      <Toaster position="top-center" />
      {/* Breadcrumb Navigation */}
      <nav className="text-sm mb-4 flex items-center gap-2 text-gray-600">
        <span>Home</span>
        <span>/</span>
        <span>Banks</span>
        <span>/</span>
        <span>{bankName || 'Bank'}</span>
        <span>/</span>
        <span>{accountName || 'Account'}</span>
        <span>/</span>
        <span className="font-semibold text-blue-700">Files</span>
      </nav>
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* File Migration Banner removed */}
        
        <div className="flex flex-row justify-between items-center gap-2 sm:gap-4 mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-full text-blue-500 text-xl sm:text-2xl shadow">
              <RiFileList3Line />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Files</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Tab Switching */}
            <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
              <button
                onClick={() => setTab('statements')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === 'statements'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Files
              </button>
              <button
                onClick={() => setTab('transactions')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === 'transactions'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Transactions
              </button>
            </div>
            {tab === 'statements' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 sm:px-5 py-2 rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold w-auto"
              >
                <RiUpload2Line className="text-lg sm:text-xl" />
                <span className="hidden sm:block">Upload File</span>
              </button>
            )}
          </div>
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload File">
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">File Name (optional)</label>
              <input
                type="text"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
              <input
                type="text"
                value={uploadTags}
                onChange={e => setUploadTags(e.target.value)}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                placeholder="e.g. salary, business"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CSV File</label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                required
              />
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Upload File'}
            </button>
          </form>
        </Modal>

        {tab === 'statements' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {statements.length === 0 ? (
              <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">
                No files uploaded yet. Click &quot;Upload File&quot; to get started.
              </div>
            ) : (
              statements.map((statement) => (
                <div
                  key={statement.id}
                  className="relative bg-white/70 backdrop-blur-lg p-1 sm:p-2 rounded-md shadow border border-blue-100 transition-transform duration-200 hover:scale-[1.01] hover:shadow group overflow-hidden cursor-pointer max-w-[180px] min-w-[120px]"
                  style={{ minHeight: '60px' }}
                  onClick={() => {
                    setPreviewUrl(statement.s3FileUrl);
                    setPreviewStatementId(statement.id);
                    setPreviewOpen(true);
                  }}
                >
                  <div className="absolute top-1 right-1 opacity-5 text-blue-400 text-lg sm:text-xl pointer-events-none select-none rotate-12">
                    <RiFileList3Line />
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="bg-blue-100 p-0.5 rounded-full text-blue-500 text-sm sm:text-base shadow">
                      <RiFileList3Line />
                    </span>
                    {statement.fileName || 'File'}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-0.5 min-h-[18px]">
                    {statement.tags && statement.tags.length > 0 ? (
                      statement.tags.map((tag) => (
                      <span
                        key={tag}
                          className="flex items-center gap-0.5 px-1 py-0.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-[10px] rounded-full shadow border border-blue-200 font-medium"
                      >
                          <RiPriceTag3Line className="text-blue-400 text-xs" /> {tag}
                      </span>
                      ))
                    ) : (
                      <span className="text-gray-300 text-[10px] italic">No tags</span>
                    )}
                  </div>
                  <div className="mt-1 flex justify-end gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteStatement(statement.id, statement.s3FileUrl); }}
                      className="px-1 py-0.5 text-red-600 bg-red-50 rounded hover:bg-red-100"
                    >
                      <RiDeleteBin6Line className="text-sm" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
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
                  // Example: create tag in backend and return new tag id
                  const userId = localStorage.getItem('userId');
                  const res = await fetch('/api/tags', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, userId, color: '#60a5fa' })
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
            {tab === 'transactions' && (
              (() => {
                // Compute summary stats for AnalyticsSummary
                const amountKey = sortedAndFilteredTransactions.length > 0 ? Object.keys(sortedAndFilteredTransactions[0]).find(k => k.toLowerCase().includes('amount')) : undefined;
                const totalAmount = amountKey ? sortedAndFilteredTransactions.reduce((sum, tx) => {
                  const val = tx[amountKey];
                  let num = 0;
                  if (typeof val === 'string') num = parseFloat(val.replace(/,/g, '')) || 0;
                  else if (typeof val === 'number') num = val;
                  return sum + num;
                }, 0).toLocaleString() : undefined;
                const allBankIds = new Set(sortedAndFilteredTransactions.map(tx => tx.bankId));
                const allAccountIds = new Set(sortedAndFilteredTransactions.map(tx => tx.accountId));
                let tagged = 0, untagged = 0;
                sortedAndFilteredTransactions.forEach(tx => {
                  const tags = (tx.tags || []) as Tag[];
                  if (Array.isArray(tags) && tags.length > 0) tagged++; else untagged++;
                });
                const totalTags = new Set(sortedAndFilteredTransactions.flatMap(tx => (Array.isArray(tx.tags) ? tx.tags.map(t => t.name) : []))).size;
                return (
                  <AnalyticsSummary
                    totalTransactions={sortedAndFilteredTransactions.length}
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
              })()
            )}

            {/* Transaction Table with Advanced Tag Creation Features - ADDED */}
            {tab === 'transactions' && (
              <div ref={tableRef} className="overflow-x-auto relative">
                {/* Floating create tag button - ADDED */}
                {selection && (
                  <button
                    style={{ position: 'absolute', left: selection.x, top: selection.y + 8, zIndex: 1000 }}
                    className="px-3 py-1 bg-blue-600 text-white rounded shadow font-semibold text-xs hover:bg-blue-700 transition-all"
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
                  }} className="bg-white border border-blue-200 rounded shadow-lg px-3 sm:px-4 py-2 sm:py-3 flex flex-col gap-2 sm:gap-3 items-center max-w-md">
                    <span className="text-sm">Apply tag &quot;{pendingTag.tagName}&quot; to:</span>
                    {/* Preview of matching transactions */}
                    <div className="w-full">
                      <div className="text-xs text-gray-600 mb-2">
                        Matching transactions with &quot;{pendingTag.selectionText}&quot;:
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
                    {/* Loading indicator for bulk apply */}
                    {applyingTagToAll && (
                      <div className="w-full flex flex-col items-center mt-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                        <span className="text-xs text-blue-700">Applying tag to all matching transactions...</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Success message - ADDED */}
                {tagCreateMsg && (
                  <div className="absolute left-1/2 top-2 -translate-x-1/2 bg-green-100 text-green-800 px-3 sm:px-4 py-2 rounded shadow text-xs sm:text-sm z-50">
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
                loading={loadingTransactions}
                error={transactionsError}
                onReorderHeaders={handleReorderHeaders}
                  onRemoveTag={handleRemoveTag}
              />
              </div>
            )}
          </div>
        )}
      </div>
      <StatementPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        s3FileUrl={previewUrl}
        statementId={previewStatementId}
        bankId={bankId}
        accountId={accountId}
        fileName={statements.find(s => s.id === previewStatementId)?.fileName || ''}
      />
      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false })}
        onConfirm={confirmDeleteStatement}
        itemName={deleteModal.fileName || ''}
        itemType="file"
        description="This will also delete all related transactions imported from this file. This action cannot be undone."
        loading={deleting}
      />
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