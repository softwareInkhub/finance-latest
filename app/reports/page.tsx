'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RiEdit2Line, RiBarChartLine, RiAddLine, RiArrowDownSLine, RiArrowRightSLine, RiCloseLine, RiDeleteBin6Line, RiSaveLine } from 'react-icons/ri';
import { FiChevronDown } from 'react-icons/fi';
import { Tag } from '../types/transaction';
import { useTheme } from '../contexts/ThemeContext';

interface CashFlowItem {
  id: string;
  particular: string;
  amount: number;
  type: 'inflow' | 'outflow';
  createdByTag?: boolean; // Track if item was created via tag selection
  tagData?: {
    credit: number;
    debit: number;
    balance: number;
  };
  subItems?: CashFlowItem[]; // Support for hierarchical structure
  isExpanded?: boolean; // Track if sub-items are expanded
}

interface TransactionData {
  AmountRaw?: number;
  Amount?: number | string;
  amount?: number | string;
  'Dr./Cr.'?: string;
  tags?: Array<{ name: string }>;
  // Optional fields that appear in analytics transactions
  bankName?: string;
  bankId?: string;
  accountId?: string;
  accountNumber?: string;
  accountNo?: string;
  account?: string;
  account_id?: string;
  Date?: string;
  date?: string;
  Description?: string;
  description?: string;
  Narration?: string;
  narration?: string;
  particulars?: string;
  Particulars?: string;
  Reference?: string;
  reference?: string;
  'Reference No.'?: string;
  'reference no.'?: string;
  remarks?: string;
  Remarks?: string;
  'Transaction Description'?: string;
  'transaction description'?: string;
  userAccountNumber?: string;
}

interface CashFlowGroup {
  id: string;
  title: string;
  items: CashFlowItem[];
  isExpanded: boolean;
}

interface CashFlowSection {
  id: string;
  title: string;
  type: 'inflow' | 'outflow' | 'net';
  groups: CashFlowGroup[];
}

export default function ReportsPage() {
  const { theme } = useTheme();

  // Initial data
  const initialData: CashFlowSection[] = [
    {
      id: '1',
      title: 'INFLOWS',
      type: 'inflow',
      groups: [
        {
          id: '1',
          title: 'SALES SETTLEMENTS',
          isExpanded: true,
          items: [
            { id: '1', particular: 'Online Sales', amount: 40000, type: 'inflow' },
            { id: '2', particular: 'Offline Sales', amount: 10000, type: 'inflow' },
          ]
        },
        {
          id: '2',
          title: 'ADDITIONAL CAPITAL',
          isExpanded: false,
          items: [
            { id: '3', particular: 'Partner Investment', amount: 15000, type: 'inflow' },
            { id: '4', particular: 'Bank Loan', amount: 5000, type: 'inflow' },
          ]
        },
        {
          id: '3',
          title: 'BANK INTEREST',
          isExpanded: false,
          items: [
            { id: '5', particular: 'Savings Interest', amount: 3000, type: 'inflow' },
            { id: '6', particular: 'FD Interest', amount: 2000, type: 'inflow' },
          ]
        },
        {
          id: '4',
          title: 'OTHER INCOME',
          isExpanded: false,
          items: [
            { id: '7', particular: 'Commission Income', amount: 1000, type: 'inflow' },
            { id: '8', particular: 'Miscellaneous', amount: 1000, type: 'inflow' },
          ]
        }
      ]
    },
    {
      id: '2',
      title: 'OUTFLOWS',
      type: 'outflow',
      groups: [
        {
          id: '5',
          title: '01. EXPENDITURES',
          isExpanded: true,
          items: [
            { id: '9', particular: 'Production & Packaging', amount: 20000, type: 'outflow' },
            { id: '10', particular: 'Marketing', amount: 15000, type: 'outflow' },
            { id: '11', particular: 'Salaries & Payments', amount: 12000, type: 'outflow' },
            { id: '12', particular: 'Logistics', amount: 8000, type: 'outflow' },
            { id: '13', particular: 'Fixed Assets', amount: 10000, type: 'outflow' },
          ]
        },
        {
          id: '6',
          title: '02. TAXATION',
          isExpanded: false,
          items: [
            { id: '14', particular: 'GST Payments', amount: 8000, type: 'outflow' },
            { id: '15', particular: 'TDS Payments', amount: 2000, type: 'outflow' },
          ]
        },
        {
          id: '7',
          title: '03. INVESTMENTS',
          isExpanded: false,
          items: [
            { id: '16', particular: 'RD', amount: 5000, type: 'outflow' },
            { id: '17', particular: 'FD', amount: 10000, type: 'outflow' },
          ]
        },
        {
          id: '8',
          title: '04. WITHDRAWALS AND OTHER PAYMENTS',
          isExpanded: false,
          items: [
            { id: '18', particular: 'Cash Withdrawals', amount: 3000, type: 'outflow' },
            { id: '19', particular: 'Other Withdrawals', amount: 2000, type: 'outflow' },
          ]
        }
      ]
    },
    {
      id: '3',
      title: 'NET CASH FLOW',
      type: 'net',
      groups: []
    }
  ];

  // Load data from localStorage or use initial data
  const [cashFlowData, setCashFlowData] = useState<CashFlowSection[]>(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('userId');
      const key = userId ? `cashFlowData_${userId}` : 'cashFlowData';
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialData;
    }
    return initialData;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [pendingAdd, setPendingAdd] = useState<{sectionId: string, groupId: string} | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{sectionId: string, groupId: string, itemId?: string, subItemId?: string} | null>(null);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [pendingAddGroup, setPendingAddGroup] = useState<string | null>(null);
  const [showGroupOptionModal, setShowGroupOptionModal] = useState(false);
  const [pendingAddGroupSection, setPendingAddGroupSection] = useState<string | null>(null);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  const [modalSelectedTags, setModalSelectedTags] = useState<Tag[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isTagsModalLoading, setIsTagsModalLoading] = useState(false);
  
  // New state variables for sub-item operations
  const [showSubItemOptionModal, setShowSubItemOptionModal] = useState(false);
  const [pendingSubItemAdd, setPendingSubItemAdd] = useState<{sectionId: string, groupId: string, parentItemId: string} | null>(null);
  const [showSubItemAddModal, setShowSubItemAddModal] = useState(false);
  const [newSubItemName, setNewSubItemName] = useState('');
  const [showSubItemTagsModal, setShowSubItemTagsModal] = useState(false);

  // Edit sub-item state variables
  const [showEditSubItemModal, setShowEditSubItemModal] = useState(false);
  const [editingSubItem, setEditingSubItem] = useState<{sectionId: string, groupId: string, parentItemId: string, subItemId: string, currentName: string} | null>(null);
  const [editSubItemName, setEditSubItemName] = useState('');

  // Drag and drop state for reordering tag-created items within their container
  type DragContext =
    | { kind: 'item'; sectionId: string; groupId: string; fromIndex: number }
    | { kind: 'subItem'; sectionId: string; groupId: string; parentItemId: string; fromIndex: number };
  const [dragContext, setDragContext] = useState<DragContext | null>(null);

  const handleDragStartItem = (
    sectionId: string,
    groupId: string,
    fromIndex: number
  ) => {
    setDragContext({ kind: 'item', sectionId, groupId, fromIndex });
  };

  const handleDragStartSubItem = (
    sectionId: string,
    groupId: string,
    parentItemId: string,
    fromIndex: number
  ) => {
    setDragContext({ kind: 'subItem', sectionId, groupId, parentItemId, fromIndex });
  };

  const handleDropItem = (
    e: React.DragEvent,
    sectionId: string,
    groupId: string,
    toIndex: number
  ) => {
    e.preventDefault();
    if (!dragContext || dragContext.kind !== 'item') return;
    if (dragContext.sectionId !== sectionId || dragContext.groupId !== groupId) return; // constrain to same group

    const isTagCreated = (obj: { createdByTag?: boolean }): boolean => Boolean(obj && obj.createdByTag);

    setCashFlowData(prev =>
      prev.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          groups: section.groups.map(group => {
            if (group.id !== groupId) return group;
            // Only allow reordering among items created by tag
            const tagIndices = group.items
              .map((it, idx) => (isTagCreated(it as unknown as { createdByTag?: boolean }) ? idx : -1))
              .filter(idx => idx !== -1);
            const fromRealIndex = tagIndices[dragContext.fromIndex];
            const toRealIndex = tagIndices[toIndex];
            if (fromRealIndex === undefined || toRealIndex === undefined) return group;
            const newItems = group.items.slice();
            const [moved] = newItems.splice(fromRealIndex, 1);
            newItems.splice(toRealIndex, 0, moved);
            return { ...group, items: newItems } as typeof group;
          })
        };
      })
    );
    setDragContext(null);
  };

  const handleDropSubItem = (
    e: React.DragEvent,
    sectionId: string,
    groupId: string,
    parentItemId: string,
    toIndex: number
  ) => {
    e.preventDefault();
    if (!dragContext || dragContext.kind !== 'subItem') return;
    if (
      dragContext.sectionId !== sectionId ||
      dragContext.groupId !== groupId ||
      dragContext.parentItemId !== parentItemId
    )
      return; // constrain to same parent

    const isTagCreated = (obj: { createdByTag?: boolean }): boolean => Boolean(obj && obj.createdByTag);

    setCashFlowData(prev =>
      prev.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          groups: section.groups.map(group => {
            if (group.id !== groupId) return group;
            const items = group.items.map(item => {
              if (item.id !== parentItemId) return item;
              const tagSubIndices = (item.subItems || [])
                .map((si, idx) => (isTagCreated(si as unknown as { createdByTag?: boolean }) ? idx : -1))
                .filter(idx => idx !== -1);
              const fromRealIndex = tagSubIndices[dragContext.fromIndex];
              const toRealIndex = tagSubIndices[toIndex];
              if (
                fromRealIndex === undefined ||
                toRealIndex === undefined ||
                !item.subItems
              )
                return item;
              const newSub = item.subItems.slice();
              const [moved] = newSub.splice(fromRealIndex, 1);
              newSub.splice(toRealIndex, 0, moved);
              return { ...item, subItems: newSub } as typeof item;
            });
            return { ...group, items } as typeof group;
          })
        };
      })
    );
    setDragContext(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Edit group and main item state variables
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{sectionId: string, groupId: string, currentName: string} | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [showEditMainItemModal, setShowEditMainItemModal] = useState(false);
  const [editingMainItem, setEditingMainItem] = useState<{sectionId: string, groupId: string, itemId: string, currentName: string} | null>(null);
  const [editMainItemName, setEditMainItemName] = useState('');

  // State to track if all groups are expanded
  const [allExpanded, setAllExpanded] = useState(false);

  // Sub-sub-item state variables
  const [showSubSubItemOptionModal, setShowSubSubItemOptionModal] = useState(false);
  const [pendingSubSubItemAdd, setPendingSubSubItemAdd] = useState<{sectionId: string, groupId: string, parentItemId: string, subItemId: string} | null>(null);
  const [showSubSubItemAddModal, setShowSubSubItemAddModal] = useState(false);
  const [newSubSubItemName, setNewSubSubItemName] = useState('');
  const [showSubSubItemTagsModal, setShowSubSubItemTagsModal] = useState(false);

  // Backend tags summary state (persisted in brmh-fintech-user-reports)
  const [tagsSummary, setTagsSummary] = useState<{
    id?: string;
    type?: string;
    userId?: string;
    updatedAt?: string;
    createdAt?: string;
    tags: Array<{
      tagId: string;
      tagName: string;
      credit: number;
      debit: number;
      balance: number;
      transactionCount: number;
      statementIds: string[];
    }>;
  } | null>(null);

  const tagsSummaryMap = useMemo(() => {
    const map = new Map<string, { credit: number; debit: number; balance: number }>();
    const list = tagsSummary?.tags || [];
    for (const t of list) {
      map.set(t.tagName.toLowerCase(), { credit: t.credit, debit: t.debit, balance: t.balance });
    }
    return map;
  }, [tagsSummary]);

  // Debounced backend persist handle
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePersistToBackend = useCallback((data: CashFlowSection[]) => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(async () => {
      try {
        if (typeof window === 'undefined') return;
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        await fetch('/api/reports/cashflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, cashFlowData: data })
        });
      } catch (err) {
        console.error('Autosave to backend failed:', err);
      }
    }, 800);
  }, []);

  // Helper function to save cashflow data with user-specific key and optionally persist to backend
  const saveCashFlowData = useCallback((data: CashFlowSection[], persistToBackend: boolean = true) => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('userId');
      const key = userId ? `cashFlowData_${userId}` : 'cashFlowData';
      localStorage.setItem(key, JSON.stringify(data));
      if (persistToBackend && userId) {
        schedulePersistToBackend(data);
      }
    }
  }, [schedulePersistToBackend]);

  // Load from backend on mount for cross-device persistence
  useEffect(() => {
    const fetchRemote = async () => {
      try {
        if (typeof window === 'undefined') return;
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        const res = await fetch(`/api/reports/cashflow?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) return;
        const remoteData: CashFlowSection[] | null = await res.json();
        if (remoteData && Array.isArray(remoteData)) {
          console.log('Loaded cashFlowData from backend:', remoteData);
          setCashFlowData(remoteData);
          // Save locally but avoid immediate re-persist to backend to prevent loops
          saveCashFlowData(remoteData, false);
        }
      } catch (err) {
        console.error('Failed to fetch cashflow from backend:', err);
      }
    };
    fetchRemote();
  }, [saveCashFlowData]);

  // Load tags summary from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        if (typeof window === 'undefined') return;
        const userId = localStorage.getItem('userId');
        console.log('Loading tags summary for userId:', userId);
        if (!userId) {
          console.log('No userId found in localStorage');
          return;
        }
        const res = await fetch(`/api/reports/tags-summary?userId=${encodeURIComponent(userId)}`);
        console.log('Tags summary response status:', res.status);
        if (!res.ok) {
          console.log('Tags summary response not ok:', res.statusText);
          return;
        }
        const summary = await res.json();
        console.log('Tags summary loaded:', summary);
        if (summary) setTagsSummary(summary);
      } catch (err) {
        console.error('Failed to load tags summary:', err);
      }
    };
    load();
  }, []);

  // Recompute tags summary on backend and reload
  const recomputeAndLoadTagsSummary = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return null;
      const userId = localStorage.getItem('userId');
      console.log('Recomputing tags summary for userId:', userId);
      if (!userId) {
        console.log('No userId found for recompute');
        return null;
      }
      
      console.log('Sending POST to recompute tags summary...');
      const postRes = await fetch('/api/reports/tags-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      console.log('POST response status:', postRes.status);
      
      if (!postRes.ok) {
        console.log('POST failed:', postRes.statusText);
        return null;
      }
      
      console.log('Fetching updated tags summary...');
      const res = await fetch(`/api/reports/tags-summary?userId=${encodeURIComponent(userId)}`);
      console.log('GET response status:', res.status);
      
      if (!res.ok) {
        console.log('GET failed:', res.statusText);
        return null;
      }
      
      const summary = await res.json();
      console.log('Updated summary received:', summary);
      setTagsSummary(summary);
      return summary as typeof tagsSummary;
    } catch (err) {
      console.error('Failed to recompute/load tags summary:', err);
      return null;
    }
  }, []);

  // Function to fetch tag financial data - using backend summary
  const fetchTagFinancialData = useCallback(async (tagName: string, ensureFresh: boolean = false) => {
    // Only recompute if explicitly requested and not during modal operations
    if (ensureFresh) {
      await recomputeAndLoadTagsSummary();
    }
    const rec = tagsSummaryMap.get(tagName.toLowerCase());
    if (rec) return { credit: rec.credit, debit: rec.debit, balance: rec.balance };
      return { credit: 0, debit: 0, balance: 0 };
  }, [tagsSummaryMap, recomputeAndLoadTagsSummary]);

  // Keep a ref of latest cashFlowData to avoid effect dependency loops
  const cashFlowDataRef = useRef<CashFlowSection[]>(cashFlowData);
  useEffect(() => {
    cashFlowDataRef.current = cashFlowData;
  }, [cashFlowData]);

  // Loading state for refresh operations
  const [isRefreshing, setIsRefreshing] = useState(false);
     const [isOperationsPanelOpen, setIsOperationsPanelOpen] = useState(true);
  // New: modal to display transactions for a tag
  const [showTagTransactionsModal, setShowTagTransactionsModal] = useState(false);
  const [activeTagName, setActiveTagName] = useState<string | null>(null);
  const [activeTagTransactions, setActiveTagTransactions] = useState<TransactionData[]>([]);
  const [isTagModalLoading, setIsTagModalLoading] = useState(false);

  // Filter states for tag transactions table
  const [dateFilter, setDateFilter] = useState<string>('');
  const [drCrFilter, setDrCrFilter] = useState<'DR' | 'CR' | ''>('');
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [sortDropdownOpen, setSortDropdownOpen] = useState<string | null>(null);
  const [dateSortOrder, setDateSortOrder] = useState<'newest' | 'oldest' | ''>('');

  // Filter handlers for tag transactions table
  // const handleDateFilter = (date: string | 'clear') => {
  //   if (date === 'clear') {
  //     setDateFilter('');
  //   } else {
  //     setDateFilter(date);
  //   }
  // };

  const handleDateSort = (order: 'newest' | 'oldest' | 'clear') => {
    if (order === 'clear') {
      setDateSortOrder('');
    } else {
      setDateSortOrder(order);
    }
  };

  const handleDrCrFilter = (type: 'DR' | 'CR' | 'clear') => {
    if (type === 'clear') {
      setDrCrFilter('');
    } else {
      setDrCrFilter(type);
    }
  };

  const handleAccountFilter = (accountNumber: string | 'clear') => {
    if (accountNumber === 'clear') {
      setAccountFilter('');
    } else {
      setAccountFilter(accountNumber);
    }
  };

  const handleSortDropdownToggle = (column: string) => {
    setSortDropdownOpen(sortDropdownOpen === column ? null : column);
  };

  // Function to get dropdown positioning class based on column
  const getDropdownPositionClass = (column: string) => {
    // For the Account No. column (rightmost), position from right to prevent overflow
    if (column === 'Account No.') {
      return 'absolute top-full right-0 mt-1 z-[9999]';
    }
    // For other columns, use left alignment
    return 'absolute top-full left-0 mt-1 z-[9999]';
  };

  // Function to format date consistently
  const formatDate = (date: string | number | undefined): string => {
    if (!date || date === 'N/A') return 'N/A';
    

    
    try {
      // Handle different date formats
      let dateObj: Date | undefined;
      
      if (typeof date === 'string') {
        // Normalize IDFC dd-MMM-yyyy (e.g., 28-Feb-2025)
        if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(date)) {
          const [dd, mon, yyyy] = date.split('-');
          const months: { [k: string]: number } = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
          const m = months[mon.toLowerCase()];
          if (m !== undefined) {
            dateObj = new Date(parseInt(yyyy), m, parseInt(dd));
          }
        } else if (date.match(/^\d{2}-\d{2}-\d{4}$/)) {
          // If it's already in dd-mm-yyyy format, convert it properly
          const [dd, mm, yyyy] = date.split('-');
          dateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
        } else if (date.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
          const [dd, mm, yy] = date.split('/');
          // Convert 2-digit year to 4-digit year
          const yyyy = parseInt(yy) < 50 ? 2000 + parseInt(yy) : 1900 + parseInt(yy);
          dateObj = new Date(yyyy, parseInt(mm) - 1, parseInt(dd));
        } else if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          // If it's already in dd/mm/yyyy format
          const [dd, mm, yyyy] = date.split('/');
          dateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
        } else {
          // Try standard Date constructor
          dateObj = new Date(date);
        }
      } else {
        dateObj = new Date(date);
      }
      
      if (dateObj && !isNaN(dateObj.getTime())) {
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yyyy = dateObj.getFullYear();
        const formatted = `${dd}/${mm}/${yyyy}`;
        return formatted;
      }
    } catch {
      // Date parsing failed
    }
    
    return String(date);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.sort-dropdown')) {
        setSortDropdownOpen(null);
      }
    };

    if (sortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sortDropdownOpen]);

  // Get available accounts for filtering
  const availableAccounts = useMemo(() => {
    if (!activeTagTransactions || activeTagTransactions.length === 0) return [];
    
    const accountMap = new Map<string, { bankName: string; accountNumber: string; count: number }>();
    
    activeTagTransactions.forEach(tx => {
      const accountNo = tx.userAccountNumber || tx.accountNumber || tx.accountNo || tx.account || tx.account_id || tx.accountId || 'N/A';
      const bankName = tx.bankName || tx.bankId || 'Unknown Bank';
      
      if (accountNo && typeof accountNo === 'string') {
        const key = `${bankName}-${accountNo}`;
        if (accountMap.has(key)) {
          accountMap.get(key)!.count++;
        } else {
          accountMap.set(key, {
            bankName,
            accountNumber: accountNo,
            count: 1
          });
        }
      }
    });
    
    return Array.from(accountMap.values()).sort((a, b) => {
      if (a.bankName !== b.bankName) {
        return a.bankName.localeCompare(b.bankName);
      }
      return a.accountNumber.localeCompare(b.accountNumber);
    });
  }, [activeTagTransactions]);

  // Normalize amounts and CR/DR across various bank schemas for the tag modal
  const extractAmountAndTypeFromTx = (
    tx: TransactionData
  ): { amountAbs: number; crdr: 'CR' | 'DR' | '' } => {
    const toNumber = (val: unknown): number => {
      if (typeof val === 'number' && !isNaN(val)) return val;
      if (typeof val === 'string') {
        const match = val.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
        if (match) return parseFloat(match[0]);
      }
      return 0;
    };

    const txAny = tx as Record<string, unknown>;
    const unified =
      tx?.AmountRaw ??
      tx?.Amount ??
      tx?.amount ??
      txAny?.['Transaction Amount'] ??
      txAny?.['transaction amount'] ??
      txAny?.['Transaction Amount(INR)'];

    // Try to find CR/DR field with more comprehensive field name matching
    let crdrField = '';
    const possibleCrdrFields = [
      tx?.['Dr./Cr.'],
      txAny?.['Dr/Cr'],
      txAny?.['DR/CR'],
      txAny?.['dr/cr'],
      txAny?.['Type'],
      txAny?.['type'],
      // Add the exact field names from Kotak bank
      txAny?.['Dr / Cr'],
      txAny?.['Dr / Cr_1'],
      txAny?.['DR / CR'],
      txAny?.['DR / CR_1'],
      // Add ICICI specific field names
      txAny?.['Cr/Dr'],
      txAny?.['Cr / Dr'],
      txAny?.['CR/DR'],
      txAny?.['CR / DR'],
      // Add more variations
      txAny?.['Transaction Type'],
      txAny?.['transaction type'],
      txAny?.['Txn Type'],
      txAny?.['txn type'],
      txAny?.['Debit/Credit'],
      txAny?.['debit/credit'],
      txAny?.['Debit Credit'],
      txAny?.['debit credit']
    ];

    for (const field of possibleCrdrFields) {
      if (field && typeof field === 'string' && field.trim()) {
        crdrField = field.toString().trim().toUpperCase();
        break;
      }
    }

    if (unified !== undefined && unified !== null) {
      const num = toNumber(unified);
      const abs = Math.abs(num);
      if (crdrField === 'CR' || crdrField === 'DR') {
        console.log('🔍 Found explicit CR/DR field:', { crdrField, amount: num, description: tx.Description || tx.description });
        return { amountAbs: abs, crdr: crdrField as 'CR' | 'DR' };
      }
      if (num > 0) {
        console.log('🔍 Inferring CR from positive amount:', { amount: num, description: tx.Description || tx.description });
        return { amountAbs: abs, crdr: 'CR' };
      }
      if (num < 0) {
        console.log('🔍 Inferring DR from negative amount:', { amount: num, description: tx.Description || tx.description });
        return { amountAbs: abs, crdr: 'DR' };
      }
    }

    let credit = 0;
    let debit = 0;
    for (const [rawKey, value] of Object.entries(tx || {})) {
      const key = rawKey.toLowerCase();
      const n = toNumber(value);
      if (!n) continue;
      if (
        key.includes('credit') ||
        key.includes('deposit') ||
        key.includes('cr amount') ||
        /(^|\W)cr(\W|$)/.test(key)
      ) {
        credit += Math.abs(n);
      }
      if (
        key.includes('debit') ||
        key.includes('withdraw') ||
        key.includes('dr amount') ||
        /(^|\W)dr(\W|$)/.test(key)
      ) {
        debit += Math.abs(n);
      }
    }
    if (credit > 0 && debit === 0)
      return { amountAbs: Math.round(credit * 100) / 100, crdr: 'CR' };
    if (debit > 0 && credit === 0)
      return { amountAbs: Math.round(debit * 100) / 100, crdr: 'DR' };
    return {
      amountAbs: 0,
      crdr: crdrField === 'CR' || crdrField === 'DR' ? (crdrField as 'CR' | 'DR') : ''
    };
  };

      // Filter transactions based on selected filters
    const filteredTagTransactions = useMemo(() => {
      if (!activeTagTransactions || activeTagTransactions.length === 0) return [];
      
      const filtered = activeTagTransactions.filter(tx => {
      // Date filter
      if (dateFilter) {
        const txDate = tx.Date || tx.date || (tx as Record<string, unknown>)['Transaction Date'] || (tx as Record<string, unknown>)['Value Date'];
        if (!txDate || String(txDate) !== dateFilter) {
          return false;
        }
      }
      
      // CR/DR filter
      if (drCrFilter) {
        const { crdr } = extractAmountAndTypeFromTx(tx);

        // Only filter if we have a valid CR/DR value, skip transactions with empty CR/DR
        if (crdr && crdr !== drCrFilter) {
          return false;
        }
        // If crdr is empty, we can't determine the type, so exclude from filtering
        if (!crdr) {
          return false;
        }
      }
      
      // Account filter
      if (accountFilter) {
        const txAccount = tx.userAccountNumber || tx.accountNumber || tx.accountNo || tx.account || tx.account_id || tx.accountId || 'N/A';
        if (txAccount !== accountFilter) {
          return false;
        }
      }
      
      return true;
    });

    // Apply date sorting
    if (dateSortOrder) {
      filtered.sort((a, b) => {
        // Use the same date parsing logic as the formatDate function
        const getDateValue = (dateStr: string | number | undefined): Date => {
          if (!dateStr || dateStr === 'N/A') return new Date(0);
          
          try {
            if (typeof dateStr === 'string') {
              // Normalize IDFC dd-MMM-yyyy (e.g., 28-Feb-2025)
              if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) {
                const [dd, mon, yyyy] = dateStr.split('-');
                const months: { [k: string]: number } = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
                const m = months[mon.toLowerCase()];
                if (m !== undefined) {
                  return new Date(parseInt(yyyy), m, parseInt(dd));
                }
              } else if (dateStr.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
                // If it's already in dd/mm/yy format, convert it properly
                const [dd, mm, yy] = dateStr.split('/');
                const yyyy = parseInt(yy) < 50 ? 2000 + parseInt(yy) : 1900 + parseInt(yy);
                return new Date(yyyy, parseInt(mm) - 1, parseInt(dd));
              } else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                // If it's already in dd/mm/yyyy format
                const [dd, mm, yyyy] = dateStr.split('/');
                return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
              } else if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
                // If it's in dd-mm-yyyy format
                const [dd, mm, yyyy] = dateStr.split('-');
                return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
              }
            }
            return new Date(dateStr);
          } catch {
            return new Date(0);
          }
        };
        
        const dateA = getDateValue(a.Date || a.date || ((a as Record<string, unknown>)['Transaction Date'] as string | number | undefined) || ((a as Record<string, unknown>)['Value Date'] as string | number | undefined));
        const dateB = getDateValue(b.Date || b.date || ((b as Record<string, unknown>)['Transaction Date'] as string | number | undefined) || ((b as Record<string, unknown>)['Value Date'] as string | number | undefined));
        

        
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
          return 0; // Keep original order if dates are invalid
        }
        
        if (dateSortOrder === 'newest') {
          return dateB.getTime() - dateA.getTime(); // Newest first
        } else {
          return dateA.getTime() - dateB.getTime(); // Oldest first
        }
      });
    }

    return filtered;
  }, [activeTagTransactions, dateFilter, drCrFilter, accountFilter, dateSortOrder]);

  // Recompute tags summary once on mount and refresh tag-based amounts in cashflow
  const hasRecomputedOnMountRef = useRef(false);
  useEffect(() => {
    if (hasRecomputedOnMountRef.current) return;
    hasRecomputedOnMountRef.current = true;
    (async () => {
      await recomputeAndLoadTagsSummary();
      // Don't call handleRefreshTags here as it will be triggered by the tags summary change
    })();
  }, [recomputeAndLoadTagsSummary]);

  // Manual refresh function to sync latest tag changes from Super Bank
  const handleRefreshTags = useCallback(async () => {
    // Prevent multiple simultaneous refresh operations
    if (isRefreshing) {
      console.log('Refresh already in progress, skipping...');
      return;
    }

    try {
      console.log('Starting tag refresh...');
      setIsRefreshing(true);
      
      // Collect unique tag names present in the current cashflow that were created from tags
      const tagNames = new Set<string>();
      cashFlowData.forEach(section => {
        section.groups.forEach(group => {
          group.items.forEach(item => {
            if (item.createdByTag) tagNames.add(item.particular);
            item.subItems?.forEach(sub => {
              if (sub.createdByTag) tagNames.add(sub.particular);
              sub.subItems?.forEach(ss => {
                if (ss.createdByTag) tagNames.add(ss.particular);
              });
            });
          });
        });
      });
      
      console.log('Found tag-based items:', Array.from(tagNames));
      
      if (tagNames.size === 0) {
        console.log('No tag-based items found to refresh');
        return;
      }

      console.log(`Refreshing ${tagNames.size} tag-based items:`, Array.from(tagNames));

      // Recompute backend summary and build lookup
      const summary = await recomputeAndLoadTagsSummary();
      console.log('Recomputed summary:', summary);
      
      if (!summary) {
        console.log('Failed to recompute summary');
        return;
      }
      
      const lookup = new Map<string, { credit: number; debit: number; balance: number }>(
        (summary?.tags || []).map((t: Record<string, unknown>) => [t.tagName as string, { credit: t.credit as number, debit: t.debit as number, balance: t.balance as number }])
      );
      const tagToData = new Map(
        Array.from(tagNames).map((name) => {
          const rec = lookup.get(name.toLowerCase());
          console.log(`Tag ${name}:`, rec);
          return [name, rec || { credit: 0, debit: 0, balance: 0 }] as const;
        })
      );

      // Update all tag-created items with fresh balances
      setCashFlowData(prev => {
        const updated = prev.map(section => ({
          ...section,
          groups: section.groups.map(group => ({
            ...group,
            items: group.items.map(item => {
              const updateItem = (node: CashFlowItem): CashFlowItem => {
                let next: CashFlowItem = { ...node };
                if (node.createdByTag) {
                  const data = tagToData.get(node.particular);
                  if (data) {
                    console.log(`Updating ${node.particular} with data:`, data);
                    next = { ...next, amount: data.balance, tagData: data };
                  }
                }
                if (node.subItems && node.subItems.length > 0) {
                  next = {
                    ...next,
                    subItems: node.subItems.map(updateItem)
                  };
                }
                return next;
              };
              return updateItem(item);
            })
          }))
        }));

        // Persist updates (debounced) and local cache
        saveCashFlowData(updated);
        return updated;
      });

      console.log('Tag refresh completed successfully');
    } catch (error) {
      console.error('Error refreshing tags:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [cashFlowData, recomputeAndLoadTagsSummary, saveCashFlowData, isRefreshing]);

  // Function to clear all tag-based items from cashflow
  // const handleClearAllTagItems = useCallback(async () => {
  //   if (isRefreshing) {
  //     console.log('Operation already in progress, skipping...');
  //     return;
  //   }

  //   try {
  //     console.log('Starting to clear all tag-based items...');
  //     setIsRefreshing(true);
      
  //     // Get userId from localStorage
  //     const userId = localStorage.getItem('userId');
  //     if (!userId) {
  //       console.error('No userId found');
  //       return;
  //     }
      
  //     // Call the API to clear all tag-based items
  //     const response = await fetch('/api/tags', {
  //       method: 'DELETE',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ 
  //         clearAllTagItems: userId 
  //       })
  //     });
      
  //     if (response.ok) {
  //       console.log('Successfully cleared all tag-based items');
  //       // Reload the cashflow data to reflect changes
  //       const res = await fetch(`/api/reports/cashflow?userId=${encodeURIComponent(userId)}`);
  //       if (res.ok) {
  //         const remoteData: CashFlowSection[] | null = await res.json();
  //         if (remoteData && Array.isArray(remoteData)) {
  //           console.log('Reloaded cashFlowData after clearing tags:', remoteData);
  //           setCashFlowData(remoteData);
  //           saveCashFlowData(remoteData, false);
  //           }
  //         }
  //       } else {
  //         console.error('Failed to clear tag-based items');
  //       }
  //     } catch (error) {
  //       console.error('Error clearing tag-based items:', error);
  //     } finally {
  //       setIsRefreshing(false);
  //     }
  //   }, [isRefreshing, saveCashFlowData]);

  // When backend tags summary changes, refresh tag-based rows from it
  useEffect(() => {
          // Collect unique tag names present in the current cashflow that were created from tags
          const tagNames = new Set<string>();
          const scanData = cashFlowDataRef.current || [];
          scanData.forEach(section => {
            section.groups.forEach(group => {
              group.items.forEach(item => {
                if (item.createdByTag) tagNames.add(item.particular);
                item.subItems?.forEach(sub => {
                  if (sub.createdByTag) tagNames.add(sub.particular);
                  sub.subItems?.forEach(ss => {
                    if (ss.createdByTag) tagNames.add(ss.particular);
                  });
                });
              });
            });
          });
          if (tagNames.size === 0) return;

    const tagToData = new Map(
      Array.from(tagNames).map((name) => {
        const rec = tagsSummaryMap.get(name.toLowerCase());
        return [name, rec ? { credit: rec.credit, debit: rec.debit, balance: rec.balance } : { credit: 0, debit: 0, balance: 0 }];
      })
    );

          setCashFlowData(prev => {
            const updated = prev.map(section => ({
              ...section,
              groups: section.groups.map(group => ({
                ...group,
                items: group.items.map(item => {
                  const updateItem = (node: CashFlowItem): CashFlowItem => {
                    let next: CashFlowItem = { ...node };
                    if (node.createdByTag) {
                      const data = tagToData.get(node.particular);
                      if (data) {
                        next = { ...next, amount: data.balance, tagData: data };
                      }
                    }
                    if (node.subItems && node.subItems.length > 0) {
                      next = {
                        ...next,
                        subItems: node.subItems.map(updateItem)
                      };
                    }
                    return next;
                  };
                  return updateItem(item);
                })
              }))
            }));

            // Persist updates (debounced) and local cache
            saveCashFlowData(updated);
            return updated;
          });
  }, [tagsSummaryMap, saveCashFlowData]);

  // Auto-refresh tags when page loads/becomes visible (backend-driven)
  useEffect(() => {
    let visibilityTimeoutId: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (!document.hidden && !isRefreshing) {
        clearTimeout(visibilityTimeoutId);
        visibilityTimeoutId = setTimeout(() => {
          // Only refresh if we have tag-based items
          const hasTagItems = cashFlowData.some(section => 
            section.groups.some(group => 
              group.items.some(item => item.createdByTag || 
                item.subItems?.some(sub => sub.createdByTag) ||
                item.subItems?.some(sub => sub.subItems?.some(ss => ss.createdByTag))
              )
            )
          );
          if (hasTagItems) {
          handleRefreshTags();
          }
        }, 500);
      }
    };

    // Don't do initial refresh here - it's already handled by the mount effect
    // Only refresh when page becomes visible

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearTimeout(visibilityTimeoutId);
    };
  }, [handleRefreshTags, isRefreshing, cashFlowData]);

  // Listen for tag updates from the tags page
  useEffect(() => {
    const handleTagUpdated = (event: CustomEvent) => {
      console.log('Tag updated event received:', event.detail);
      // Trigger a refresh after a short delay to allow backend updates to complete
      setTimeout(() => {
        handleRefreshTags();
      }, 1000);
    };

    window.addEventListener('tagUpdated', handleTagUpdated as EventListener);

    return () => {
      window.removeEventListener('tagUpdated', handleTagUpdated as EventListener);
    };
  }, [handleRefreshTags]);

      // Helper function to calculate item total including sub-items
  const calculateItemTotal = useCallback((item: CashFlowItem): number => {
    const itemAmount = item.amount || 0;
    const subItemsTotal = item.subItems?.reduce((sum, subItem) => sum + calculateItemTotal(subItem), 0) || 0;
    return itemAmount + subItemsTotal;
  }, []);

  // Helper function to calculate group total including sub-items
  const calculateGroupTotal = useCallback((group: CashFlowGroup): number => {
    return group.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  }, [calculateItemTotal]);

  // Memoize totals calculation to prevent unnecessary re-computations
  const { totalInflow, totalOutflow, netFlow } = useMemo(() => {
    const inflow = cashFlowData[0]?.groups?.reduce((sum, group) => 
      sum + calculateGroupTotal(group), 0
    ) || 0;
    const outflow = cashFlowData[1]?.groups?.reduce((sum, group) => 
      sum + calculateGroupTotal(group), 0
    ) || 0;
    // Net flow = Inflows - Outflows (outflows are already negative, so we add them)
    const net = inflow + outflow;
    
    return { totalInflow: inflow, totalOutflow: outflow, netFlow: net };
  }, [cashFlowData, calculateGroupTotal]);

    // Function to get bank breakdown using tags summary data, aligned with cashFlowData groups
  const getBankBreakdown = (type: 'inflow' | 'outflow' | 'net') => {
    const bankTotals = new Map<string, { amount: number; accounts: Set<string> }>();
    const processedTagNames = new Set<string>();
    const bankData: { name: string; amount: number; accounts: string[] }[] = [];

    // Determine which cashFlowData section to use for group titles
    const cashFlowGroups = type === 'inflow' ? cashFlowData[0]?.groups : cashFlowData[1]?.groups;
    
    console.log(`getBankBreakdown(${type}) - cashFlowData sections:`, {
      inflow: cashFlowData[0]?.groups?.length || 0,
      outflow: cashFlowData[1]?.groups?.length || 0,
      selectedGroups: cashFlowGroups?.length || 0
    });

    cashFlowGroups?.forEach(group => {
      const groupTitle = group.title;
      console.log(`Processing group "${groupTitle}" for ${type}`);
      
      // Process each sub-item (actual tag) within the group
      group.items?.forEach(item => {
        const tagName = item.particular; // This is the actual tag name like "Boo"
        if (!tagName || processedTagNames.has(tagName)) return; // Skip if no tag name or already processed
        processedTagNames.add(tagName);

        console.log(`Processing sub-item "${tagName}" in group "${groupTitle}"`);
        const tagInfo = tagsSummary?.tags.find((tag: Record<string, unknown>) => tag.tagName === tagName);
        console.log(`Found tagInfo for "${tagName}":`, tagInfo);
        console.log(`Tag "${tagName}" bankBreakdown:`, (tagInfo as Record<string, unknown>)?.bankBreakdown);

                if (tagInfo && (tagInfo as Record<string, unknown>).bankBreakdown) {
          const bankBreakdown = (tagInfo as Record<string, unknown>).bankBreakdown as Record<string, Record<string, unknown>>;
          Object.entries(bankBreakdown).forEach(([bankName, bankEntryDetails]) => {
        if (type === 'inflow') {
              // For inflow, only use credit amounts (positive inflows)
              const credit = (bankEntryDetails.credit as number) || 0;
              const debit = (bankEntryDetails.debit as number) || 0;
              const amount = credit; // Only credit amounts for inflow
              
              // Debug logging for inflow calculation
              console.log(`Inflow calculation for ${bankName}: credit=${credit}, debit=${debit}, amount=${amount}`);
              
              // Only include banks with positive credit amounts for inflow
              if (amount <= 0) return;
              
              const accounts = (bankEntryDetails.accounts as string[]) || [];
              
              if (accounts.length > 0) {
                // Show individual accounts
                accounts.forEach((account: string) => {
                  const accountKey = `${bankName} - ${account}`;
                  if (!bankTotals.has(accountKey)) {
                    bankTotals.set(accountKey, { amount: 0, accounts: new Set<string>() });
                  }
                  const accountTotal = bankTotals.get(accountKey)!;
                  accountTotal.amount += amount / accounts.length; // Distribute amount equally
                  accountTotal.accounts.add(account);
                });
              } else {
                // No accounts, show bank total
                if (!bankTotals.has(bankName)) {
                  bankTotals.set(bankName, { amount: 0, accounts: new Set<string>() });
                }
                const bankTotal = bankTotals.get(bankName)!;
                bankTotal.amount += amount;
              }
            } else if (type === 'outflow' && (bankEntryDetails.debit as number) > 0) {
              const debit = bankEntryDetails.debit as number;
              const accounts = (bankEntryDetails.accounts as string[]) || [];
              
              if (accounts.length > 0) {
                // Show individual accounts
                accounts.forEach((account: string) => {
                  const accountKey = `${bankName} - ${account}`;
                  if (!bankTotals.has(accountKey)) {
                    bankTotals.set(accountKey, { amount: 0, accounts: new Set<string>() });
                  }
                  const accountTotal = bankTotals.get(accountKey)!;
                  accountTotal.amount += debit / accounts.length; // Distribute amount equally
                  accountTotal.accounts.add(account);
                });
              } else {
                // No accounts, show bank total
                if (!bankTotals.has(bankName)) {
                  bankTotals.set(bankName, { amount: 0, accounts: new Set<string>() });
                }
                const bankTotal = bankTotals.get(bankName)!;
                bankTotal.amount += debit;
              }
            }
          });
        } else {
          // Fallback: if no bank breakdown for the tag, use the item's amount
          const itemAmount = item.amount || 0;
          if (type === 'inflow' && itemAmount > 0) {
            // For fallback, we don't know the bank, so we'll use a generic name
            const fallbackBankName = 'Unknown Bank';
            if (!bankTotals.has(fallbackBankName)) {
              bankTotals.set(fallbackBankName, { amount: 0, accounts: new Set<string>() });
            }
            const bankTotal = bankTotals.get(fallbackBankName)!;
            bankTotal.amount += itemAmount;
          } else if (type === 'outflow' && itemAmount !== 0) {
            const fallbackBankName = 'Unknown Bank';
            if (!bankTotals.has(fallbackBankName)) {
              bankTotals.set(fallbackBankName, { amount: 0, accounts: new Set<string>() });
            }
            const bankTotal = bankTotals.get(fallbackBankName)!;
            bankTotal.amount += Math.abs(itemAmount);
          }
        }
        
        // Debug: Log what we found for this tag
        console.log(`Tag "${tagName}" processing complete:`, {
          hasBankBreakdown: !!(tagInfo && (tagInfo as Record<string, unknown>).bankBreakdown),
          bankBreakdownKeys: tagInfo && (tagInfo as Record<string, unknown>).bankBreakdown ? Object.keys((tagInfo as Record<string, unknown>).bankBreakdown as Record<string, unknown>) : [],
          bankTotalsSize: bankTotals.size
        });
      });
    });

    // For 'net', we need to aggregate all tags' net balances per bank
    if (type === 'net') {
      const netBankTotals = new Map<string, { amount: number; accounts: Set<string> }>();
      tagsSummary?.tags.forEach((tag: Record<string, unknown>) => {
        if ((tag as Record<string, unknown>).bankBreakdown) {
          const bankBreakdown = (tag as Record<string, unknown>).bankBreakdown as Record<string, Record<string, unknown>>;
          Object.entries(bankBreakdown).forEach(([bankName, bankEntryDetails]) => {
            if (!netBankTotals.has(bankName)) {
              netBankTotals.set(bankName, { amount: 0, accounts: new Set<string>() });
            }
            const current = netBankTotals.get(bankName)!;
            const credit = (bankEntryDetails.credit as number) || 0;
            const debit = (bankEntryDetails.debit as number) || 0;
            current.amount += credit - debit;
            const accounts = (bankEntryDetails.accounts as string[]) || [];
            accounts.forEach((acc: string) => current.accounts.add(acc));
          });
        }
      });
      netBankTotals.forEach((value, key) => {
        if (value.amount !== 0) {
          bankData.push({ name: key, amount: value.amount, accounts: Array.from(value.accounts) });
        }
      });
    }

    // Convert bankTotals back to bankData format
    bankTotals.forEach((value, bankName) => {
      bankData.push({
        name: bankName,
        amount: value.amount,
        accounts: Array.from(value.accounts)
      });
    });

    // If no data found using cashFlowData approach, fallback to tagsSummary approach
    if (bankData.length === 0 && tagsSummary?.tags) {
      console.log(`No data found using cashFlowData for ${type}, falling back to tagsSummary approach`);
      
      // For outflow, show all tags that have any debit amounts, regardless of balance
      if (type === 'outflow') {
        tagsSummary.tags.forEach((tag: Record<string, unknown>) => {
          if ((tag as Record<string, unknown>).bankBreakdown) {
            const bankBreakdown = (tag as Record<string, unknown>).bankBreakdown as Record<string, Record<string, unknown>>;
            Object.entries(bankBreakdown).forEach(([bankName, bankEntryDetails]) => {
              if ((bankEntryDetails.debit as number) > 0) {
                bankData.push({
                  name: bankName, // Just show bank name, not tag-bank
                  amount: bankEntryDetails.debit as number,
                  accounts: (bankEntryDetails.accounts as string[]) || []
                });
              }
            });
          }
        });
      } else if (type === 'inflow') {
        tagsSummary.tags.forEach((tag: Record<string, unknown>) => {
          const tagBalance = (tag.balance as number) || 0;
          
          if (tagBalance > 0) {
            if ((tag as Record<string, unknown>).bankBreakdown) {
              const bankBreakdown = (tag as Record<string, unknown>).bankBreakdown as Record<string, Record<string, unknown>>;
              Object.entries(bankBreakdown).forEach(([bankName, bankEntryDetails]) => {
                if ((bankEntryDetails.credit as number) > 0) {
                  bankData.push({
                    name: bankName, // Just show bank name, not tag-bank
                    amount: bankEntryDetails.credit as number,
                    accounts: (bankEntryDetails.accounts as string[]) || []
                  });
                }
              });
            }
          }
        });
      }
    }

    console.log(`getBankBreakdown(${type}) result:`, bankData);
    return bankData.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  // Function to toggle all groups expand/collapse
  const toggleAllGroups = () => {
    setAllExpanded(!allExpanded);
    setCashFlowData(prev => {
      const updated = prev.map(section => ({
        ...section,
        groups: section.groups.map(group => ({
          ...group,
          isExpanded: !allExpanded,
          items: group.items.map(item => ({
            ...item,
            isExpanded: !allExpanded,
            // keep existing subItems unchanged
            subItems: item.subItems?.map(sub => ({ ...sub })) || item.subItems
          }))
        }))
      }));
      saveCashFlowData(updated);
      return updated;
    });
  };

  const toggleGroup = (sectionId: string, groupId: string) => {
    setCashFlowData(prev => {
      const updated = prev.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            groups: section.groups.map(group => {
              if (group.id === groupId) {
                return { ...group, isExpanded: !group.isExpanded };
              }
              return group;
            })
          };
        }
        return section;
      });

      // Save to localStorage
      saveCashFlowData(updated);
      return updated;
    });
  };

  const toggleItemExpansion = (sectionId: string, groupId: string, itemId: string) => {
    setCashFlowData(prev => {
      const updated = prev.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            groups: section.groups.map(group => {
              if (group.id === groupId) {
                return {
                  ...group,
                  items: group.items.map(item => {
                    if (item.id === itemId) {
                      return { ...item, isExpanded: !item.isExpanded };
                    }
                    return item;
                  })
                };
              }
              return group;
            })
          };
        }
        return section;
      });

      // Save to localStorage
      saveCashFlowData(updated);
      return updated;
    });
  };

  const openAddModal = (sectionId: string, groupId: string) => {
    setPendingAddGroupSection(sectionId);
    setPendingAddGroup(groupId);
    setShowGroupOptionModal(true);
  };

  const openSubItemAddModal = (sectionId: string, groupId: string, parentItemId: string) => {
    setPendingSubItemAdd({ sectionId, groupId, parentItemId });
    setShowSubItemOptionModal(true);
  };

  const handleAddItem = () => {
    if (!pendingAdd || !newItemName.trim()) return;
    
    const section = cashFlowData.find(s => s.id === pendingAdd.sectionId);
    
    const newItem: CashFlowItem = {
      id: Date.now().toString(),
      particular: newItemName.trim(),
      amount: 0,
      type: section?.type === 'inflow' ? 'inflow' : 'outflow'
    };

    setCashFlowData(prev => {
      const updated = prev.map(section => {
        if (section.id === pendingAdd.sectionId) {
          return {
            ...section,
            groups: section.groups.map(group => {
              if (group.id === pendingAdd.groupId) {
                return {
                  ...group,
                  items: [...group.items, newItem]
                };
              }
              return group;
            })
          };
        }
        return section;
      });

      // Save to localStorage
      saveCashFlowData(updated);
      return updated;
    });

    // Close modal and reset
    setShowAddModal(false);
    setPendingAdd(null);
    setNewItemName('');
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setPendingAdd(null);
    setNewItemName('');
  };

  // Sub-item add functions
  const handleAddSubItem = () => {
    if (!pendingSubItemAdd || !newSubItemName.trim()) return;
    
    const section = cashFlowData.find(s => s.id === pendingSubItemAdd.sectionId);
    
    const newSubItem: CashFlowItem = {
      id: Date.now().toString(),
      particular: newSubItemName.trim(),
      amount: 0,
      type: section?.type === 'inflow' ? 'inflow' : 'outflow'
    };

    setCashFlowData(prev => {
      const updated = prev.map(section => {
        if (section.id === pendingSubItemAdd.sectionId) {
          return {
            ...section,
            groups: section.groups.map(group => {
              if (group.id === pendingSubItemAdd.groupId) {
                return {
                  ...group,
                  items: group.items.map(item => {
                    if (item.id === pendingSubItemAdd.parentItemId) {
                      return {
                        ...item,
                        subItems: [...(item.subItems || []), newSubItem]
                      };
                    }
                    return item;
                  })
                };
              }
              return group;
            })
          };
        }
        return section;
      });

      // Save to localStorage
      saveCashFlowData(updated);
      return updated;
    });

    // Close modal and reset
    setShowSubItemAddModal(false);
    setPendingSubItemAdd(null);
    setNewSubItemName('');
  };

  const closeSubItemAddModal = () => {
    setShowSubItemAddModal(false);
    setPendingSubItemAdd(null);
    setNewSubItemName('');
  };



  const openSubItemAddTagsModal = () => {
    setShowSubItemTagsModal(true);
    setShowSubItemOptionModal(false);
    fetchTags();
  };

  const openDeleteModal = (sectionId: string, groupId: string, itemId?: string, subItemId?: string) => {
    setPendingDelete({ sectionId, groupId, itemId, subItemId });
    setShowDeleteModal(true);
  };

  const handleDeleteItem = () => {
    if (!pendingDelete) return;

    setCashFlowData(prev => {
      const updated = prev.map(section => {
        if (section.id === pendingDelete.sectionId) {
          if (pendingDelete.subItemId && pendingDelete.itemId) {
            // Delete specific sub-item
            return {
              ...section,
              groups: section.groups.map(group => {
                if (group.id === pendingDelete.groupId) {
                  return {
                    ...group,
                    items: group.items.map(item => {
                      if (item.id === pendingDelete.itemId) {
                        return {
                          ...item,
                          subItems: item.subItems?.filter(subItem => subItem.id !== pendingDelete.subItemId) || []
                        };
                      }
                      return item;
                    })
                  };
                }
                return group;
              })
            };
          } else if (pendingDelete.itemId) {
            // Delete specific item
            return {
              ...section,
              groups: section.groups.map(group => {
                if (group.id === pendingDelete.groupId) {
                  return {
                    ...group,
                    items: group.items.filter(item => item.id !== pendingDelete.itemId)
                  };
                }
                return group;
              })
            };
          } else {
            // Delete entire group
            return {
              ...section,
              groups: section.groups.filter(group => group.id !== pendingDelete.groupId)
            };
          }
        }
        return section;
      });

      // Save to localStorage
      saveCashFlowData(updated);
      return updated;
    });

    // Close modal and reset
    setShowDeleteModal(false);
    setPendingDelete(null);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPendingDelete(null);
  };

  const openAddGroupModal = (sectionId: string) => {
    setPendingAddGroup(sectionId);
    setShowAddGroupModal(true);
    setNewGroupName('');
  };

  const handleAddGroup = () => {
    if (!pendingAddGroup || !newGroupName.trim()) return;
    
    const newGroup: CashFlowGroup = {
      id: Date.now().toString(),
      title: newGroupName.trim(),
      items: [],
      isExpanded: true
    };

    setCashFlowData(prev => {
      const updated = prev.map(section => {
        if (section.id === pendingAddGroup) {
          return {
            ...section,
            groups: [...section.groups, newGroup]
          };
        }
        return section;
      });

      // Save to localStorage
      saveCashFlowData(updated);
      return updated;
    });

    // Close modal and reset
    setShowAddGroupModal(false);
    setPendingAddGroup(null);
    setNewGroupName('');
  };

  const closeAddGroupModal = () => {
    setShowAddGroupModal(false);
    setPendingAddGroup(null);
    setNewGroupName('');
  };

  const closeGroupOptionModal = () => {
    setShowGroupOptionModal(false);
    setPendingAddGroupSection(null);
    setPendingAddGroup(null);
  };

  const openAddGroupNameModal = () => {
    setPendingAdd({ sectionId: pendingAddGroupSection!, groupId: pendingAddGroup! });
    setShowAddModal(true);
    setNewItemName('');
    setShowGroupOptionModal(false);
  };

  const openAddGroupTagsModal = async () => {
    // Don't recompute tags summary on modal open - use existing data
    // This was causing the slow performance
    setIsTagsModalLoading(true);
    setShowTagsModal(true);
    setShowGroupOptionModal(false);
    
    try {
      await fetchTags();
    } finally {
      setIsTagsModalLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.error('No user ID found');
        return;
      }
      
      const response = await fetch(`/api/tags?userId=${userId}`);
      if (response.ok) {
        const tags = await response.json();
        setAllTags(tags);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleTagSelect = (tag: Tag) => {
    setModalSelectedTags(prev => {
      const isSelected = prev.some(t => t.id === tag.id);
      if (isSelected) {
        // Remove tag if already selected
        return prev.filter(t => t.id !== tag.id);
      } else {
        // Add tag if not selected
        return [...prev, tag];
      }
    });
  };

  // Filter tags based on search query
  const filteredTags = allTags.filter(tag =>
    tag.name && tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  // Function to check if a tag already exists anywhere in the cashflow data
  const isTagAlreadyAdded = (tagName: string): boolean => {
    for (const section of cashFlowData) {
      for (const group of section.groups) {
        for (const item of group.items) {
          if (item.particular === tagName && item.createdByTag) {
            return true;
          }
          // Check sub-items too
          if (item.subItems) {
            for (const subItem of item.subItems) {
              if (subItem.particular === tagName && subItem.createdByTag) {
                return true;
              }
              // Check sub-sub-items too
              if (subItem.subItems) {
                for (const subSubItem of subItem.subItems) {
                  if (subSubItem.particular === tagName && subSubItem.createdByTag) {
                    return true;
                  }
                }
              }
            }
          }
        }
      }
    }
    return false;
  };

  const handleAddSelectedTags = async () => {
    if (modalSelectedTags.length === 0) return;
    
    // Check if any tags are already added anywhere in the cashflow
    const alreadyAddedTags = modalSelectedTags.filter(tag => isTagAlreadyAdded(tag.name));
    if (alreadyAddedTags.length > 0) {
      const tagNames = alreadyAddedTags.map(tag => `"${tag.name}"`).join(', ');
      alert(`The following tags are already added to the cashflow statement: ${tagNames}`);
      return;
    }
    
    setIsAddingTag(true);
    console.log('Adding tags to cashflow:', modalSelectedTags.map(t => t.name));
    
    try {
      // Process each selected tag
      const newItems: CashFlowItem[] = [];
      
      for (const tag of modalSelectedTags) {
        // Fetch tag financial data (use cached data, don't recompute)
        const tagData = await fetchTagFinancialData(tag.name, false);
        console.log('Tag financial data for', tag.name, ':', tagData);
        
        // Create a new item with the tag name and financial data
        const newItem: CashFlowItem = {
          id: Date.now().toString() + '-' + tag.id,
          particular: tag.name,
          amount: tagData.balance, // Use the balance as the amount
          type: pendingAddGroupSection === '1' ? 'inflow' : 'outflow',
          createdByTag: true,
          tagData: tagData
        };
        
        newItems.push(newItem);
      }
      
      console.log('Created new items:', newItems);

      setCashFlowData(prev => {
        const updated = prev.map(section => {
          if (section.id === pendingAddGroupSection) {
            return {
              ...section,
              groups: section.groups.map(group => {
                if (group.id === pendingAddGroup) {
                  return {
                    ...group,
                    items: [...group.items, ...newItems]
                  };
                }
                return group;
              })
            };
          }
          return section;
        });

        // Save to localStorage
        saveCashFlowData(updated);
        return updated;
      });

      // Close modals and reset
      setShowTagsModal(false);
      setModalSelectedTags([]);
      setPendingAddGroupSection(null);
      setPendingAddGroup(null);
    } catch (error) {
      console.error('Error adding tags:', error);
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleAddSelectedSubItemTags = async () => {
    if (modalSelectedTags.length === 0 || !pendingSubItemAdd) return;
    
    // Check if any tags are already added anywhere in the cashflow
    const alreadyAddedTags = modalSelectedTags.filter(tag => isTagAlreadyAdded(tag.name));
    if (alreadyAddedTags.length > 0) {
      const tagNames = alreadyAddedTags.map(tag => `"${tag.name}"`).join(', ');
      alert(`The following tags are already added to the cashflow statement: ${tagNames}`);
      return;
    }
    
    setIsAddingTag(true);
    console.log('Adding tags as sub-items:', modalSelectedTags.map(t => t.name));
    
    try {
      // Process each selected tag
      const newSubItems: CashFlowItem[] = [];
      
      for (const tag of modalSelectedTags) {
        // Fetch tag financial data (use cached data, don't recompute)
        const tagData = await fetchTagFinancialData(tag.name, false);
        console.log('Tag financial data for', tag.name, ':', tagData);
        
        // Create a new sub-item with the tag name and financial data
        const newSubItem: CashFlowItem = {
          id: Date.now().toString() + '-' + tag.id,
          particular: tag.name,
          amount: tagData.balance, // Use the balance as the amount
          type: pendingSubItemAdd.sectionId === '1' ? 'inflow' : 'outflow',
          createdByTag: true,
          tagData: tagData
        };
        
        newSubItems.push(newSubItem);
      }
      
      console.log('Created new sub-items:', newSubItems);

      setCashFlowData(prev => {
        const updated = prev.map(section => {
          if (section.id === pendingSubItemAdd.sectionId) {
            return {
              ...section,
              groups: section.groups.map(group => {
                if (group.id === pendingSubItemAdd.groupId) {
                  return {
                    ...group,
                    items: group.items.map(item => {
                      if (item.id === pendingSubItemAdd.parentItemId) {
                        return {
                          ...item,
                          subItems: [...(item.subItems || []), ...newSubItems]
                        };
                      }
                      return item;
                    })
                  };
                }
                return group;
              })
            };
          }
          return section;
        });

        // Save to localStorage
        saveCashFlowData(updated);
        return updated;
      });

      // Close modals and reset
      setShowSubItemTagsModal(false);
      setModalSelectedTags([]);
      setPendingSubItemAdd(null);
    } catch (error) {
      console.error('Error adding sub-item tags:', error);
    } finally {
      setIsAddingTag(false);
    }
  };

  const closeTagsModal = () => {
    setShowTagsModal(false);
    setModalSelectedTags([]);
    setPendingAddGroupSection(null);
    setPendingAddGroup(null);
    setTagSearchQuery(''); // Clear search when modal is closed
  };

  const handleSave = async () => {
    saveCashFlowData(cashFlowData);
    setIsEditing(false);
  };

  const handleDownloadCSV = () => {
    // Create CSV data
    const csvData = [];
    
    // Add header
    csvData.push(['PARTICULAR', 'AMOUNT']);
    
    // Add INFLOWS section
    csvData.push([cashFlowData[0].title, totalInflow.toLocaleString()]);
    
    // Add inflow groups and items
    cashFlowData[0].groups.forEach(group => {
      const groupTotal = calculateGroupTotal(group);
      csvData.push([`  ${group.title}`, groupTotal.toLocaleString()]);
      
      if (group.isExpanded) {
        group.items.forEach(item => {
          const itemTotal = calculateItemTotal(item);
          csvData.push([`    ${item.particular}`, itemTotal.toLocaleString()]);
          
          // Add sub-items (always include them in CSV)
          if (item.subItems) {
            item.subItems.forEach(subItem => {
              csvData.push([`      ${subItem.particular}`, (subItem.amount || 0).toLocaleString()]);
            });
          }
        });
      }
    });
    
    // Add OUTFLOWS section
    csvData.push([cashFlowData[1].title, totalOutflow.toLocaleString()]);
    
    // Add outflow groups and items
    cashFlowData[1].groups.forEach(group => {
      const groupTotal = calculateGroupTotal(group);
      csvData.push([`  ${group.title}`, groupTotal.toLocaleString()]);
      
      if (group.isExpanded) {
        group.items.forEach(item => {
          const itemTotal = calculateItemTotal(item);
          csvData.push([`    ${item.particular}`, itemTotal.toLocaleString()]);
          
          // Add sub-items (always include them in CSV)
          if (item.subItems) {
            item.subItems.forEach(subItem => {
              csvData.push([`      ${subItem.particular}`, (subItem.amount || 0).toLocaleString()]);
            });
          }
        });
      }
    });
    
    // Add NET CASH FLOW
    csvData.push([cashFlowData[2].title, netFlow.toLocaleString()]);
    
    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cashflow-statement-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Edit sub-item functions
  const openEditSubItemModal = (sectionId: string, groupId: string, parentItemId: string, subItemId: string, currentName: string) => {
    setEditingSubItem({ sectionId, groupId, parentItemId, subItemId, currentName });
    setEditSubItemName(currentName);
    setShowEditSubItemModal(true);
  };

  const handleEditSubItem = () => {
    if (!editingSubItem || !editSubItemName.trim()) return;

    setCashFlowData(prev => {
      const updated = prev.map(section => {
        if (section.id === editingSubItem.sectionId) {
          return {
            ...section,
            groups: section.groups.map(group => {
              if (group.id === editingSubItem.groupId) {
                return {
                  ...group,
                  items: group.items.map(item => {
                    if (item.id === editingSubItem.parentItemId) {
                      return {
                        ...item,
                        subItems: item.subItems?.map(subItem => {
                          if (subItem.id === editingSubItem.subItemId) {
                            return {
                              ...subItem,
                              particular: editSubItemName.trim()
                            };
                          }
                          return subItem;
                        }) || []
                      };
                    }
                    return item;
                  })
                };
              }
              return group;
            })
          };
        }
        return section;
      });

      // Save to localStorage
      saveCashFlowData(updated);
      return updated;
    });

    // Close modal and reset
    setShowEditSubItemModal(false);
    setEditingSubItem(null);
    setEditSubItemName('');
  };

  const closeEditSubItemModal = () => {
    setShowEditSubItemModal(false);
    setEditingSubItem(null);
    setEditSubItemName('');
  };

  // Edit group functions
  const openEditGroupModal = (sectionId: string, groupId: string, currentName: string) => {
    setEditingGroup({ sectionId, groupId, currentName });
    setEditGroupName(currentName);
    setShowEditGroupModal(true);
  };

  const handleEditGroup = () => {
    if (!editingGroup || !editGroupName.trim()) return;

    setCashFlowData(prev => {
      const updated = prev.map(section => {
        if (section.id === editingGroup.sectionId) {
          return {
            ...section,
            groups: section.groups.map(group => {
              if (group.id === editingGroup.groupId) {
                return {
                  ...group,
                  title: editGroupName.trim()
                };
              }
              return group;
            })
          };
        }
        return section;
      });

      // Save to localStorage
      saveCashFlowData(updated);
      return updated;
    });

    // Close modal and reset
    setShowEditGroupModal(false);
    setEditingGroup(null);
    setEditGroupName('');
  };

  const closeEditGroupModal = () => {
    setShowEditGroupModal(false);
    setEditingGroup(null);
    setEditGroupName('');
  };

  // Edit main item functions
  const openEditMainItemModal = (sectionId: string, groupId: string, itemId: string, currentName: string) => {
    setEditingMainItem({ sectionId, groupId, itemId, currentName });
    setEditMainItemName(currentName);
    setShowEditMainItemModal(true);
  };

  const handleEditMainItem = () => {
    if (!editingMainItem || !editMainItemName.trim()) return;

    setCashFlowData(prev => {
      const updated = prev.map(section => {
        if (section.id === editingMainItem.sectionId) {
          return {
            ...section,
            groups: section.groups.map(group => {
              if (group.id === editingMainItem.groupId) {
                return {
                  ...group,
                  items: group.items.map(item => {
                    if (item.id === editingMainItem.itemId) {
                      return {
                        ...item,
                        particular: editMainItemName.trim()
                      };
                    }
                    return item;
                  })
                };
              }
              return group;
            })
          };
        }
        return section;
      });

      // Save to localStorage
      saveCashFlowData(updated);
      return updated;
    });

    // Close modal and reset
    setShowEditMainItemModal(false);
    setEditingMainItem(null);
    setEditMainItemName('');
  };

  const closeEditMainItemModal = () => {
    setShowEditMainItemModal(false);
    setEditingMainItem(null);
    setEditMainItemName('');
  };

  // Sub-sub-item functions
  const openSubSubItemAddModal = (sectionId: string, groupId: string, parentItemId: string, subItemId: string) => {
    setPendingSubSubItemAdd({ sectionId, groupId, parentItemId, subItemId });
    setShowSubSubItemOptionModal(true);
  };

  const openSubSubItemAddNameModal = () => {
    setShowSubSubItemAddModal(true);
    setNewSubSubItemName('');
    setShowSubSubItemOptionModal(false);
  };

  const openSubSubItemAddTagsModal = () => {
    setShowSubSubItemTagsModal(true);
    setShowSubSubItemOptionModal(false);
    fetchTags();
  };

  const handleAddSubSubItem = () => {
    if (!pendingSubSubItemAdd || !newSubSubItemName.trim()) return;
    
    const section = cashFlowData.find(s => s.id === pendingSubSubItemAdd.sectionId);
    
    const newSubSubItem: CashFlowItem = {
      id: Date.now().toString(),
      particular: newSubSubItemName.trim(),
      amount: 0,
      type: section?.type === 'inflow' ? 'inflow' : 'outflow'
    };

    setCashFlowData(prev => {
      const updated = prev.map(section => {
        if (section.id === pendingSubSubItemAdd.sectionId) {
          return {
            ...section,
            groups: section.groups.map(group => {
              if (group.id === pendingSubSubItemAdd.groupId) {
                return {
                  ...group,
                  items: group.items.map(item => {
                    if (item.id === pendingSubSubItemAdd.parentItemId) {
                      return {
                        ...item,
                        subItems: item.subItems?.map(subItem => {
                          if (subItem.id === pendingSubSubItemAdd.subItemId) {
                            return {
                              ...subItem,
                              subItems: [...(subItem.subItems || []), newSubSubItem]
                            };
                          }
                          return subItem;
                        }) || []
                      };
                    }
                    return item;
                  })
                };
              }
              return group;
            })
          };
        }
        return section;
      });

      // Save to localStorage
      saveCashFlowData(updated);
      return updated;
    });

    // Close modal and reset
    setShowSubSubItemAddModal(false);
    setPendingSubSubItemAdd(null);
    setNewSubSubItemName('');
  };

  const closeSubSubItemAddModal = () => {
    setShowSubSubItemAddModal(false);
    setPendingSubSubItemAdd(null);
    setNewSubSubItemName('');
  };

  const handleAddSelectedSubSubItemTags = async () => {
    if (modalSelectedTags.length === 0 || !pendingSubSubItemAdd) return;
    
    // Check if any tags are already added anywhere in the cashflow
    const alreadyAddedTags = modalSelectedTags.filter(tag => isTagAlreadyAdded(tag.name));
    if (alreadyAddedTags.length > 0) {
      const tagNames = alreadyAddedTags.map(tag => `"${tag.name}"`).join(', ');
      alert(`The following tags are already added to the cashflow statement: ${tagNames}`);
      return;
    }
    
    setIsAddingTag(true);
    console.log('Adding tags as sub-sub-items:', modalSelectedTags.map(t => t.name));
    
    try {
      // Process each selected tag
      const newSubSubItems: CashFlowItem[] = [];
      
      for (const tag of modalSelectedTags) {
        // Fetch tag financial data (use cached data, don't recompute)
        const tagData = await fetchTagFinancialData(tag.name, false);
        console.log('Tag financial data for', tag.name, ':', tagData);
        
        // Create a new sub-sub-item with the tag name and financial data
        const newSubSubItem: CashFlowItem = {
          id: Date.now().toString() + '-' + tag.id,
          particular: tag.name,
          amount: tagData.balance, // Use the balance as the amount
          type: pendingSubSubItemAdd.sectionId === '1' ? 'inflow' : 'outflow',
          createdByTag: true,
          tagData: tagData
        };
        
        newSubSubItems.push(newSubSubItem);
      }
      
      console.log('Created new sub-sub-items:', newSubSubItems);

      setCashFlowData(prev => {
        const updated = prev.map(section => {
          if (section.id === pendingSubSubItemAdd.sectionId) {
            return {
              ...section,
              groups: section.groups.map(group => {
                if (group.id === pendingSubSubItemAdd.groupId) {
                  return {
                    ...group,
                    items: group.items.map(item => {
                      if (item.id === pendingSubSubItemAdd.parentItemId) {
                        return {
                          ...item,
                          subItems: item.subItems?.map(subItem => {
                            if (subItem.id === pendingSubSubItemAdd.subItemId) {
                              return {
                                ...subItem,
                                subItems: [...(subItem.subItems || []), ...newSubSubItems]
                              };
                            }
                            return subItem;
                          }) || []
                        };
                      }
                      return item;
                    })
                  };
                }
                return group;
              })
            };
          }
          return section;
        });

        // Save to localStorage
        saveCashFlowData(updated);
        return updated;
      });

      // Close modals and reset
      setShowSubSubItemTagsModal(false);
      setModalSelectedTags([]);
      setPendingSubSubItemAdd(null);
    } catch (error) {
      console.error('Error adding sub-sub-item tags:', error);
    } finally {
      setIsAddingTag(false);
    }
  };

      // Helper: open tag transactions modal by tag name – fetch from backend per-bank tables
  const openTagTransactions = useCallback(async (tagName: string) => {
    try {
      setActiveTagName(tagName);
      setActiveTagTransactions([]);
      setIsTagModalLoading(true);
      setShowTagTransactionsModal(true); // open immediately
      // Fetch all transactions for user across banks from backend, then filter client-side by tag name for the modal
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      const res = await fetch(userId ? `/api/transactions/all?userId=${encodeURIComponent(userId)}` : `/api/transactions/all`);
      let txs: TransactionData[] = [];
      if (res.ok) {
        const allTx = await res.json();
        txs = Array.isArray(allTx) ? allTx.filter((tx: Record<string, unknown>) => Array.isArray(tx.tags) && tx.tags.some((t: Record<string, unknown>) => t?.name === tagName)) : [];
      }
        // Fetch user account numbers for unique accountIds
      const uniqueAccountIds: string[] = Array.from(new Set(txs.map((t: TransactionData) => t.accountId as string).filter((v): v is string => typeof v === 'string' && v.length > 0)));
        const entries = await Promise.all(
          uniqueAccountIds.map(async (accountId: string) => {
            try {
            const r = await fetch(`/api/account?accountId=${encodeURIComponent(accountId)}`);
            if (!r.ok) return [accountId, null] as const;
            const account = await r.json();
              const acctNo: string | null = (account?.accountNumber as string) || null;
              return [accountId, acctNo] as const;
            } catch {
              return [accountId, null] as const;
            }
          })
        );
        const idToUserAccountNo: { [id: string]: string | null } = Object.fromEntries(entries);
      const enriched: TransactionData[] = txs.map((tx: TransactionData) => ({
          ...tx,
          userAccountNumber:
            (tx.accountId && idToUserAccountNo[tx.accountId]) ||
            tx.accountNumber || tx.accountNo || tx.account || tx.account_id || tx.accountId || 'N/A'
        }));
        setActiveTagTransactions(enriched);
    } catch {
      setActiveTagTransactions([]);
    } finally {
      setIsTagModalLoading(false);
    }
  }, []);

  // Function to get transaction counts by bank (unused - kept for potential future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTransactionCountsByBank = () => {
    const bankCounts = new Map<string, { count: number; accounts: Set<string> }>();
    
    if (!tagsSummary?.tags) return [];
    
    tagsSummary.tags.forEach((tag: Record<string, unknown>) => {
      if ((tag as Record<string, unknown>).bankBreakdown) {
        const bankBreakdown = (tag as Record<string, unknown>).bankBreakdown as Record<string, Record<string, unknown>>;
        Object.entries(bankBreakdown).forEach(([bankName, bankEntryDetails]) => {
          if (!bankCounts.has(bankName)) {
            bankCounts.set(bankName, { count: 0, accounts: new Set<string>() });
          }
          const bankCount = bankCounts.get(bankName)!;
          bankCount.count += (bankEntryDetails.transactionCount as number) || 0;
          const accounts = (bankEntryDetails.accounts as string[]) || [];
          accounts.forEach((acc: string) => bankCount.accounts.add(acc));
        });
      }
    });
    
    return Array.from(bankCounts.entries()).map(([bankName, data]) => ({
      name: bankName,
      count: data.count,
      accounts: Array.from(data.accounts)
    })).sort((a, b) => b.count - a.count);
  };

    return (
    <div className={`min-h-screen py-10 px-4 overflow-y-auto ${
      theme === 'dark' 
        ? 'bg-gray-900 text-gray-100' 
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'
    }`}>
      <div className="max-w-7xl mx-auto">
      {/* Header */}
        

        {/* Analytics Summary */}
   



                 {/* Main Content - Two Column Layout */}
         <div className="flex flex-col lg:flex-row gap-6 max-h-[90vh]">
           {/* Mobile Toggle Buttons */}
           <div className="lg:hidden flex gap-2">
        <button
               onClick={() => setIsOperationsPanelOpen(!isOperationsPanelOpen)}
               className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
             >
               <svg className={`w-4 h-4 transition-transform ${isOperationsPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
               {isOperationsPanelOpen ? 'Hide Operations' : 'Show Operations'}
                      </button>
      </div>

          {/* Cashflow Statement (Center) */}
          <div className={`flex-1 rounded-xl shadow-lg overflow-hidden overflow-y-auto ${
            theme === 'dark' 
              ? 'bg-gray-800 border border-gray-700' 
              : 'bg-white border border-gray-200'
          }`}>
                       {/* Statement Header */}
             <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 relative sticky top-0 z-10">
               <div className="flex items-center justify-center">
                 <h2 className="text-2xl font-bold">CASHFLOW STATEMENT</h2>
            </div>
      </div>

          {/* Statement Table */}
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                                 <thead>
                                       <tr className={`border-b-2 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
                      <th className={`text-left py-3 px-4 font-bold text-lg ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>PARTICULAR</th>
                      <th className={`text-right py-3 px-4 font-bold text-lg ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>AMT.</th>
                    </tr>
                 </thead>
                <tbody>
                                     {/* INFLOWS Section */}
                                       <tr className={`border-b-2 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-400'}`}>
                      <td className={`py-3 px-4 font-bold text-lg flex items-center justify-between ${
                        theme === 'dark' 
                          ? 'text-blue-300 bg-blue-900/30' 
                          : 'text-blue-700 bg-blue-50'
                      }`}>
                       <span>{cashFlowData[0].title}</span>
                       {isEditing && (
                         <button
                           onClick={() => openAddGroupModal(cashFlowData[0].id)}
                           className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                           title="Add new group"
                         >
                           <RiAddLine size={16} />
                         </button>
                       )}
                     </td>
                                           <td className={`py-3 px-4 text-right font-bold text-lg ${
                        theme === 'dark' 
                          ? 'text-blue-300 bg-blue-900/30' 
                          : 'text-blue-700 bg-blue-50'
                      }`}>
                       {totalInflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                     </td>
                   </tr>
                  
                  {/* Inflow Groups */}
                  {cashFlowData[0]?.groups?.map((group) => {
                    const groupTotal = calculateGroupTotal(group);
                    return (
                      <React.Fragment key={group.id}>
                        {/* Group Header */}
                                                  <tr 
                            className={`border-b cursor-pointer ${
                              theme === 'dark' 
                                ? 'border-gray-600 hover:bg-gray-700' 
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => toggleGroup(cashFlowData[0].id, group.id)}
                          >
                                                     <td className={`py-2 pl-4 pr-4 font-semibold flex items-center gap-2 ${
                                                       theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                                                     }`}>
                             {group.isExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                             {group.title}
                             {isEditing && (
                               <div className="flex items-center gap-1 ml-2">
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openEditGroupModal(cashFlowData[0].id, group.id, group.title);
                                   }}
                                   className={`p-1 rounded transition-colors ${
                                     theme === 'dark' 
                                       ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/30' 
                                       : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                   }`}
                                   title="Edit group"
                                 >
                                   <RiEdit2Line size={14} />
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openAddModal(cashFlowData[0].id, group.id);
                                   }}
                                   className={`p-1 rounded transition-colors ${
                                     theme === 'dark' 
                                       ? 'text-gray-400 hover:text-green-400 hover:bg-green-900/30' 
                                       : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                                   }`}
                                   title="Add new item"
                                 >
                                   <RiAddLine size={14} />
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openDeleteModal(cashFlowData[0].id, group.id);
                                   }}
                                   className={`p-1 rounded transition-colors ${
                                     theme === 'dark' 
                                       ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' 
                                       : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                                   }`}
                                   title="Delete group"
                                 >
                                   <RiDeleteBin6Line size={14} />
                                 </button>
            </div>
                             )}
                           </td>
                                                     <td className={`py-2 px-4 text-right font-semibold ${
                             theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                           }`}>
                            {groupTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        
                        {/* Group Items */}
                        {group.isExpanded && group.items.map((item, itemIndex) => (
                          <React.Fragment key={item.id}>
                            {/* Main Item */}
                            <tr
                              className={`border-b ${item.createdByTag ? 'cursor-pointer' : ''} ${
                                theme === 'dark' 
                                  ? 'border-gray-600 hover:bg-gray-700' 
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                              onClick={() => item.createdByTag ? openTagTransactions(item.particular) : undefined}
                              draggable={Boolean((item as unknown as { createdByTag?: boolean }).createdByTag)}
                              onDragStart={() => handleDragStartItem(cashFlowData[0].id, group.id, itemIndex)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDropItem(e, cashFlowData[0].id, group.id, itemIndex)}
                            >
                              <td className={`py-2 pl-16 pr-4 flex items-center justify-between ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    {item.subItems && item.subItems.length > 0 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleItemExpansion(cashFlowData[0].id, group.id, item.id);
                                        }}
                                        className="text-gray-500 hover:text-gray-700"
                                      >
                                        {item.isExpanded ? <RiArrowDownSLine size={14} /> : <RiArrowRightSLine size={14} />}
                                      </button>
                                    )}
                                    <span className={`${item.createdByTag ? 'text-blue-600 hover:text-blue-800 font-medium' : ''}`}>{item.particular}</span>
                                  </div>
                                  {item.createdByTag && item.tagData && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      CR: ₹{(item.tagData.credit || 0).toLocaleString('en-IN')} | 
                                      DR: ₹{(item.tagData.debit || 0).toLocaleString('en-IN')} | 
                                      Bal: ₹{(item.tagData.balance || 0).toLocaleString('en-IN')}
                                    </div>
                                  )}
                                </div>
                                 {isEditing && (
                                    <div className="flex items-center gap-1">
                                      {/* Only show edit button for main items that were created by name (not by tags) */}
                                      {!item.createdByTag && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openEditMainItemModal(cashFlowData[0].id, group.id, item.id, item.particular);
                                          }}
                                          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                          title="Edit item"
                                        >
                                          <RiEdit2Line size={14} />
                                        </button>
                                      )}
                                      {!item.createdByTag && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openSubItemAddModal(cashFlowData[0].id, group.id, item.id);
                                          }}
                                          className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                          title="Add sub-item"
                                        >
                                          <RiAddLine size={14} />
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openDeleteModal(cashFlowData[0].id, group.id, item.id);
                                        }}
                                        className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Delete item"
                                      >
                                        <RiDeleteBin6Line size={14} />
                                      </button>
                                    </div>
                                  )}
                             </td>
                             <td className="py-2 px-4 text-right text-gray-700">{calculateItemTotal(item).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                           </tr>
                           
                           {/* Sub-Items */}
                           {item.isExpanded && item.subItems && item.subItems.map((subItem, subIndex) => (
                             <tr
                               key={subItem.id}
                               className={`border-b border-dotted ${subItem.createdByTag ? 'cursor-pointer' : ''} ${
                                 theme === 'dark' 
                                   ? 'border-gray-600 hover:bg-gray-700' 
                                   : 'border-gray-300 hover:bg-gray-50'
                               }`}
                               onClick={() => subItem.createdByTag ? openTagTransactions(subItem.particular) : undefined}
                               draggable={Boolean((subItem as unknown as { createdByTag?: boolean }).createdByTag)}
                               onDragStart={() => handleDragStartSubItem(cashFlowData[0].id, group.id, item.id, subIndex)}
                               onDragOver={handleDragOver}
                               onDrop={(e) => handleDropSubItem(e, cashFlowData[0].id, group.id, item.id, subIndex)}
                             >
                               <td className={`py-2 pl-24 pr-4 flex items-center justify-between ${
                                 theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                               }`}>
                                 <div className="flex flex-col">
                                   <span className={`text-sm ${subItem.createdByTag ? 'text-blue-600 hover:text-blue-800 font-medium' : ''}`}>{subItem.particular}</span>
                                   {subItem.createdByTag && subItem.tagData && (
                                     <div className="text-xs text-gray-500 mt-1">
                                       CR: ₹{(subItem.tagData.credit || 0).toLocaleString('en-IN')} | 
                                       DR: ₹{(subItem.tagData.debit || 0).toLocaleString('en-IN')} | 
                                       Bal: ₹{(subItem.tagData.balance || 0).toLocaleString('en-IN')}
                                     </div>
                                   )}
                                 </div>
                                  {isEditing && (
                                     <div className="flex items-center gap-1">
                                       {/* Only show add button for sub-items that were created by name (not by tags) */}
                                       {!subItem.createdByTag && (
                                         <></>
                                       )}
                                       {/* Only show edit button for sub-items that were created by name (not by tags) */}
                                       {!subItem.createdByTag && (
                                         <button
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             openEditSubItemModal(cashFlowData[0].id, group.id, item.id, subItem.id, subItem.particular);
                                           }}
                                           className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                           title="Edit sub-item"
                                         >
                                           <RiEdit2Line size={14} />
                                         </button>
                                       )}
                                       <button
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           openDeleteModal(cashFlowData[0].id, group.id, item.id, subItem.id);
                                         }}
                                         className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                         title="Delete sub-item"
                                       >
                                         <RiDeleteBin6Line size={14} />
                                       </button>
                                     </div>
                                   )}
                               </td>
                               <td className="py-2 px-4 text-right text-gray-400 text-sm">{(subItem.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                             </tr>
                           ))}
                         </React.Fragment>
                        ))}
                      </React.Fragment>
                    );
                  })}

                  {/* OUTFLOWS Section */}
                  <tr className="border-b-2 border-gray-400">
                    <td className="py-3 px-4 font-bold text-red-700 text-lg bg-red-50 flex items-center justify-between">
                      <span>{cashFlowData[1].title}</span>
                      {isEditing && (
                        <button
                          onClick={() => openAddGroupModal(cashFlowData[1].id)}
                          className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          title="Add new group"
                        >
                          <RiAddLine size={16} />
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-red-700 text-lg bg-red-50">
                      {totalOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  
                  {/* Outflow Groups */}
                  {cashFlowData[1]?.groups?.map((group) => {
                    const groupTotal = calculateGroupTotal(group);
                    return (
                      <React.Fragment key={group.id}>
                        {/* Group Header */}
                        <tr 
                          className="border-b border-gray-300 hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleGroup(cashFlowData[1].id, group.id)}
                        >
                                                   <td className="py-2 pl-4 pr-4 font-semibold text-gray-800 flex items-center gap-2">
                             {group.isExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                             {group.title}
                             {isEditing && (
                               <div className="flex items-center gap-1 ml-2">
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openEditGroupModal(cashFlowData[1].id, group.id, group.title);
                                   }}
                                   className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                   title="Edit group"
                                 >
                                   <RiEdit2Line size={14} />
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openAddModal(cashFlowData[1].id, group.id);
                                   }}
                                   className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                   title="Add new item"
                                 >
                                   <RiAddLine size={14} />
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openDeleteModal(cashFlowData[1].id, group.id);
                                   }}
                                   className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                   title="Delete group"
                                 >
                                   <RiDeleteBin6Line size={14} />
                                 </button>
          </div>
                             )}
                           </td>
                                                   <td className="py-2 px-4 text-right font-semibold text-gray-800">
                             {groupTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                           </td>
                         </tr>
                         
                         {/* Group Items */}
                         {group.isExpanded && group.items.map((item, itemIndex) => (
                           <React.Fragment key={item.id}>
                             {/* Main Item */}
                             <tr
                               className={`border-b border-gray-200 hover:bg-gray-50 ${item.createdByTag ? 'cursor-pointer' : ''}`}
                               onClick={() => item.createdByTag ? openTagTransactions(item.particular) : undefined}
                               draggable={Boolean((item as unknown as { createdByTag?: boolean }).createdByTag)}
                               onDragStart={() => handleDragStartItem(cashFlowData[1].id, group.id, itemIndex)}
                               onDragOver={handleDragOver}
                               onDrop={(e) => handleDropItem(e, cashFlowData[1].id, group.id, itemIndex)}
                             >
                               <td className="py-2 pl-16 pr-4 text-gray-700 flex items-center justify-between">
                                 <div className="flex flex-col">
                                   <div className="flex items-center gap-2">
                                     {item.subItems && item.subItems.length > 0 && (
                                       <button
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           toggleItemExpansion(cashFlowData[1].id, group.id, item.id);
                                         }}
                                         className="text-gray-500 hover:text-gray-700"
                                       >
                                         {item.isExpanded ? <RiArrowDownSLine size={14} /> : <RiArrowRightSLine size={14} />}
                                       </button>
                                     )}
                                     <span className={`${item.createdByTag ? 'text-blue-600 hover:text-blue-800 font-medium' : ''}`}>{item.particular}</span>
                                   </div>
                                   {item.createdByTag && item.tagData && (
                                     <div className="text-xs text-gray-500 mt-1">
                                       CR: ₹{(item.tagData.credit || 0).toLocaleString('en-IN')} | 
                                       DR: ₹{(item.tagData.debit || 0).toLocaleString('en-IN')} | 
                                       Bal: ₹{(item.tagData.balance || 0).toLocaleString('en-IN')}
                                     </div>
                                   )}
                                 </div>
                                 {isEditing && (
                                   <div className="flex items-center gap-1">
                                     {/* Only show edit button for main items that were created by name (not by tags) */}
                                     {!item.createdByTag && (
                                       <button
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           openEditMainItemModal(cashFlowData[1].id, group.id, item.id, item.particular);
                                         }}
                                         className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                         title="Edit item"
                                       >
                                         <RiEdit2Line size={14} />
                                       </button>
                                     )}
                                     {!item.createdByTag && (
                                       <button
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           openSubItemAddModal(cashFlowData[1].id, group.id, item.id);
                                         }}
                                         className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                         title="Add sub-item"
                                       >
                                         <RiAddLine size={14} />
                                       </button>
                                     )}
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         openDeleteModal(cashFlowData[1].id, group.id, item.id);
                                       }}
                                       className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                       title="Delete item"
                                     >
                                       <RiDeleteBin6Line size={14} />
                                     </button>
                                   </div>
                                 )}
                               </td>
                               <td className="py-2 px-4 text-right text-gray-700">{calculateItemTotal(item).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                             </tr>
                             
                             {/* Sub-Items */}
                             {item.isExpanded && item.subItems && item.subItems.map((subItem, subIndex) => (
                               <tr
                                 key={subItem.id}
                                 className={`border-b border-gray-100 hover:bg-gray-50 ${subItem.createdByTag ? 'cursor-pointer' : ''}`}
                                 onClick={() => subItem.createdByTag ? openTagTransactions(subItem.particular) : undefined}
                                 draggable={Boolean((subItem as unknown as { createdByTag?: boolean }).createdByTag)}
                                 onDragStart={() => handleDragStartSubItem(cashFlowData[1].id, group.id, item.id, subIndex)}
                                 onDragOver={handleDragOver}
                                 onDrop={(e) => handleDropSubItem(e, cashFlowData[1].id, group.id, item.id, subIndex)}
                               >
                                 <td className="py-2 pl-24 pr-4 text-gray-600 flex items-center justify-between">
                                   <div className="flex flex-col">
                                     <span className={`text-sm ${subItem.createdByTag ? 'text-blue-600 hover:text-blue-800 font-medium' : ''}`}>{subItem.particular}</span>
                                     {subItem.createdByTag && subItem.tagData && (
                                       <div className="text-xs text-gray-500 mt-1">
                                         CR: ₹{(subItem.tagData.credit || 0).toLocaleString('en-IN')} | 
                                         DR: ₹{(subItem.tagData.debit || 0).toLocaleString('en-IN')} | 
                                         Bal: ₹{(subItem.tagData.balance || 0).toLocaleString('en-IN')}
                                       </div>
                                     )}
                                   </div>
                                   {isEditing && (
                                     <div className="flex items-center gap-1">
                                       {/* Only show add button for sub-items that were created by name (not by tags) */}
                                       {!subItem.createdByTag && (
                                         <button
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             openSubSubItemAddModal(cashFlowData[1].id, group.id, item.id, subItem.id);
                                           }}
                                           className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                           title="Add sub-sub-item"
                                         >
                                           <RiAddLine size={14} />
                                         </button>
                                       )}
                                       {/* Only show edit button for sub-items that were created by name (not by tags) */}
                                       {!subItem.createdByTag && (
                                         <button
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             openEditSubItemModal(cashFlowData[1].id, group.id, item.id, subItem.id, subItem.particular);
                                           }}
                                           className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                           title="Edit sub-item"
                                         >
                                           <RiEdit2Line size={14} />
                                         </button>
                                       )}
                                       <button
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           openDeleteModal(cashFlowData[1].id, group.id, item.id, subItem.id);
                                         }}
                                         className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                         title="Delete sub-item"
                                       >
                                         <RiDeleteBin6Line size={14} />
                                       </button>
                                     </div>
                                   )}
                                 </td>
                                 <td className="py-2 px-4 text-right text-gray-600 text-sm">{(subItem.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                               </tr>
                             ))}
                           </React.Fragment>
                         ))}
                      </React.Fragment>
                    );
                  })}

                                     {/* NET CASH FLOW Section */}
                   <tr className="border-b-2 border-gray-400">
                     <td className="py-3 px-4 font-bold text-green-700 text-lg bg-green-50">
                       {cashFlowData[2].title}
                     </td>
                     <td className="py-3 px-4 text-right font-bold text-green-700 text-lg bg-green-50">
                       {(netFlow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                     </td>
                   </tr>
                </tbody>
              </table>
          </div>


          </div>
              </div>

                            {/* Operations Panel */}
                  <div className={`lg:w-80 w-full bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-all duration-300 ${
                    isOperationsPanelOpen ? 'block' : 'hidden lg:block'
                  }`}>
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="space-y-3">
                <div className="space-y-3">
                  <div className="relative group">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                      <div className="text-blue-700 font-medium text-sm mb-1">Total Inflow</div>
                      <div className="text-2xl font-bold text-blue-800">₹{(totalInflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                    {/* Inflow Tooltip */}
                    {(() => {
                      const inflowBreakdown = getBankBreakdown('inflow');
                      const inflowTotal = inflowBreakdown.reduce((sum, bank) => sum + bank.amount, 0);
                      return (
                        <div className="absolute right-full top-0 mr-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none">
                          <div className="text-sm font-semibold text-gray-800 mb-3">Inflow Breakdown by Banks</div>
                          {inflowBreakdown.length > 0 ? (
                            <div className="space-y-2">
                              {inflowBreakdown.map((bank, index) => (
                                <div key={index} className="text-sm mb-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-700 font-medium">{bank.name}</span>
                                    <span className="text-blue-600 font-bold">₹{bank.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  {bank.accounts && bank.accounts.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1 ml-2">
                                      Accounts: {bank.accounts.join(', ')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">No bank data available</div>
                          )}
                          <div className="mt-3 pt-2 border-t border-gray-200">
                            <div className="flex justify-between items-center text-sm font-semibold">
                              <span className="text-gray-800">Total</span>
                              <span className="text-blue-800">₹{inflowTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="relative group">
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors">
                      <div className="text-red-700 font-medium text-sm mb-1">Total Outflow</div>
                      <div className="text-2xl font-bold text-red-800">₹{(totalOutflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                    {/* Outflow Tooltip */}
                    {(() => {
                      const outflowBreakdown = getBankBreakdown('outflow');
                      const outflowTotal = outflowBreakdown.reduce((sum, bank) => sum + bank.amount, 0);
                      return (
                        <div className="absolute right-full top-0 mr-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none">
                          <div className="text-sm font-semibold text-gray-800 mb-3">Outflow Breakdown by Banks</div>
                          {outflowBreakdown.length > 0 ? (
                            <div className="space-y-2">
                              {outflowBreakdown.map((bank, index) => (
                                <div key={index} className="text-sm mb-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-700 font-medium">{bank.name}</span>
                                    <span className="text-red-600 font-bold">₹{bank.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  {bank.accounts && bank.accounts.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1 ml-2">
                                      Accounts: {bank.accounts.join(', ')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">No bank data available</div>
                          )}
                          <div className="mt-3 pt-2 border-t border-gray-200">
                            <div className="flex justify-between items-center text-sm font-semibold">
                              <span className="text-gray-800">Total</span>
                              <span className="text-red-800">₹{outflowTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="relative group">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200 cursor-pointer hover:bg-green-100 transition-colors">
                      <div className="text-green-700 font-medium text-sm mb-1">Net Cash Flow</div>
                      <div className={`text-2xl font-bold ${netFlow >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  ₹{(netFlow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
          </div>
                    {/* Net Flow Tooltip */}
                    {(() => {
                      const netBreakdown = getBankBreakdown('net');
                      const netTotal = netBreakdown.reduce((sum, bank) => sum + bank.amount, 0);
                      return (
                        <div className="absolute right-full top-0 mr-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none">
                          <div className="text-sm font-semibold text-gray-800 mb-3">Net Cash Flow by Banks</div>
                          {netBreakdown.length > 0 ? (
                            <div className="space-y-2">
                              {netBreakdown.map((bank, index) => (
                                <div key={index} className="text-sm mb-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-700 font-medium">{bank.name}</span>
                                    <span className={`font-bold ${bank.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ₹{Math.abs(bank.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      {bank.amount >= 0 ? ' (Inflow)' : ' (Outflow)'}
                                    </span>
                                  </div>
                                  {bank.accounts && bank.accounts.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1 ml-2">
                                      Accounts: {bank.accounts.join(', ')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">No bank data available</div>
                          )}
                          <div className="mt-3 pt-2 border-t border-gray-200">
                            <div className="flex justify-between items-center text-sm font-semibold">
                              <span className="text-gray-800">Net Total</span>
                              <span className={`${netTotal >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                                ₹{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Operations Title */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Operations</h3>
              </div>

              {/* Edit Mode Toggle */}
              <div className="space-y-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <button
                      onClick={handleSave}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <RiSaveLine size={16} />
                      SAVE CHANGES
                    </button>
                    <button
                      onClick={handleEdit}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <RiCloseLine size={16} />
                      CANCEL EDIT
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <RiEdit2Line size={16} />
                    EDIT MODE
                  </button>
                )}
              </div>

              {/* Export & Data Operations */}
              <div className="space-y-2">
                <button
                  onClick={handleDownloadCSV}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                  title="Download as CSV"
                >
                  <svg className="w-2 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  DOWNLOAD CSV
                </button>
                <button
                  onClick={handleRefreshTags}
                  disabled={isRefreshing}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh tag balances from Super Bank"
                >
                  <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                   </svg>
                   {isRefreshing ? 'REFRESHING...' : 'REFRESH TAGS'}
                </button>

              </div>

              {/* View Controls */}
                <div className="space-y-2">
                  <button
                    onClick={toggleAllGroups}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      allExpanded 
                        ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                    }`}
                    title={allExpanded ? "Collapse all groups to show only group totals" : "Expand all groups to show all items"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {allExpanded ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      )}
                    </svg>
                    {allExpanded ? 'COLLAPSE ALL' : 'EXPAND ALL'}
                  </button>
              </div>

              {/* Editing Tools */}
              {/* {isEditing && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Editing Tools</h4>
                  <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="font-medium mb-2">Editing Mode Active</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Click group titles to expand/collapse</li>
                      <li>• Use + buttons to add items</li>
                      <li>• Use edit/delete buttons on items</li>
                      <li>• Click "Add by Tags" to import from Super Bank</li>
                    </ul>
                  </div>
                </div>
              )} */}

              {/* Information */}
              {/* <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Information</h4>
                <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="font-medium mb-2">Cashflow Statement</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Tracks money in and out of business</li>
                    <li>• Groups transactions by category</li>
                    <li>• Shows net cash position</li>
                    <li>• Data syncs with Super Bank</li>
                  </ul>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </div>

               {/* Add Item Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Add New Sub Group</h3>
                <button
                  onClick={closeAddModal}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <RiCloseLine size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sub Group Name
                  </label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Enter sub group name"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    autoFocus
                  />
              </div>
            </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={!newItemName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Sub Group
                </button>
          </div>
            </div>
          </div>
      )}

                 {/* Delete Item Modal */}
         {showDeleteModal && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold text-gray-800">
                   {pendingDelete?.itemId ? "Delete Item" : "Delete Group"}
            </h3>
                 <button
                   onClick={closeDeleteModal}
                   className="text-gray-400 hover:text-gray-600 transition-colors"
                 >
                   <RiCloseLine size={20} />
                 </button>
              </div>

               <div className="space-y-4">
                 <p className="text-gray-600">
                   {pendingDelete?.itemId 
                     ? "Are you sure you want to delete this item? This action cannot be undone."
                     : "Are you sure you want to delete this entire group and all its items? This action cannot be undone."
                   }
                </p>
              </div>
               
               <div className="flex gap-3 mt-6">
                 <button
                   onClick={closeDeleteModal}
                   className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleDeleteItem}
                   className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                 >
                   {pendingDelete?.itemId ? "Delete Item" : "Delete Group"}
                 </button>
            </div>
          </div>
        </div>
      )}

                   {/* Add Group Modal */}
          {showAddGroupModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Add New Group</h3>
                  <button
                    onClick={closeAddGroupModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <RiCloseLine size={20} />
                  </button>
              </div>
                
                <div className="space-y-4">
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter group name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
              </div>
            </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={closeAddGroupModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddGroup}
                    disabled={!newGroupName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Group
                  </button>
          </div>
          </div>
        </div>
      )}

                     {/* Group Option Modal */}
           {showGroupOptionModal && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
               <div className="bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4 border border-gray-700">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold text-white">Add Sub Group</h3>
                   <button
                     onClick={closeGroupOptionModal}
                     className="text-gray-400 hover:text-gray-300 transition-colors"
                   >
                     <RiCloseLine size={20} />
                   </button>
                 </div>
                 
                 <div className="space-y-4">
                   <p className="text-gray-400 mb-4">How would you like to add this sub group?</p>
                   
            <div className="space-y-3">
                     <button
                       onClick={openAddGroupNameModal}
                       className="w-full p-4 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-left"
                     >
            <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center">
                           <RiAddLine className="text-blue-400" size={20} />
              </div>
              <div>
                           <h4 className="font-semibold text-gray-200">Add Sub Group by Name</h4>
                           <p className="text-sm text-gray-400">Create a sub group with a custom name</p>
              </div>
            </div>
                     </button>
                     
                     <button
                       onClick={openAddGroupTagsModal}
                       className="w-full p-4 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-left"
                     >
            <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center">
                           <RiBarChartLine className="text-green-400" size={20} />
              </div>
              <div>
                           <h4 className="font-semibold text-gray-200">Add by Tags</h4>
                           <p className="text-sm text-gray-400">Create a sub group using predefined tags</p>
              </div>
            </div>
                     </button>
          </div>
        </div>

                 <div className="flex gap-3 mt-6">
                   <button
                     onClick={closeGroupOptionModal}
                     className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                   >
                     Cancel
                   </button>
                  </div>
                  </div>
                </div>
      )}

                 {/* Tags Modal */}
      {showTagsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold text-gray-800">Select a Tag</h3>
                   <button
                     onClick={closeTagsModal}
                     className="text-gray-400 hover:text-gray-600 transition-colors"
                   >
                     <RiCloseLine size={20} />
                   </button>
          </div>

                 <div className="space-y-4 flex-1 overflow-y-auto">
                   <p className="text-gray-600 mb-4">Choose a tag to create a new item:</p>
                   
                   {/* Loading State */}
                   {isTagsModalLoading && (
                     <div className="flex items-center justify-center py-8">
                       <div className="flex items-center space-x-2 text-blue-600">
                         <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                         <span>Loading tags...</span>
                       </div>
                     </div>
                   )}
                   
                   {/* Search Bar */}
                   <div className="relative">
                     <input
                       type="text"
                       placeholder="Search tags..."
                       className="w-full border border-gray-200 px-4 py-2 pl-10 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                       value={tagSearchQuery}
                       onChange={e => setTagSearchQuery(e.target.value)}
                     />
                     <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                       </svg>
                     </div>
                     {tagSearchQuery && (
                       <button
                         onClick={() => setTagSearchQuery('')}
                         className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                       >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                         </svg>
                       </button>
                     )}
                   </div>
                   {tagSearchQuery && (
                     <div className="text-sm text-gray-600">
                       Found {filteredTags.length} tag(s) matching &quot;{tagSearchQuery}&quot;
                     </div>
                   )}
                   
                   {/* Selected Tags Display */}
                   {modalSelectedTags.length > 0 && (
                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                       <div className="space-y-3">
                         <h4 className="font-semibold text-blue-800">
                           Selected Tags ({modalSelectedTags.length}):
                         </h4>
                         <div className="flex flex-wrap gap-2">
                           {modalSelectedTags.map((tag) => (
                             <div key={tag.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-blue-200">
                               <div 
                                 className="w-4 h-4 rounded-full"
                                 style={{ backgroundColor: tag.color || '#3B82F6' }}
                               />
                               <span className="text-sm font-medium text-blue-800">{tag.name}</span>
                               <button
                                 onClick={() => handleTagSelect(tag)}
                                 className="text-red-500 hover:text-red-700 text-sm font-bold"
                               >
                                 ×
                               </button>
                             </div>
                           ))}
                         </div>
                         <p className="text-sm text-blue-600">
                           Click &quot;Add Tags&quot; to add these tags to your cashflow statement
                         </p>
                       </div>
                     </div>
                   )}
                   
                   {!isTagsModalLoading && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                     {filteredTags.map((tag) => {
                       const isAlreadyAdded = isTagAlreadyAdded(tag.name);
                       const rec = tagsSummaryMap.get((tag.name || '').toLowerCase());
                       return (
                         <button
                           key={tag.id}
                           onClick={() => !isAlreadyAdded && handleTagSelect(tag)}
                           disabled={isAlreadyAdded}
                           className={`p-3 border rounded-lg transition-colors text-left ${
                             isAlreadyAdded
                               ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
                               : modalSelectedTags.some(t => t.id === tag.id)
                                 ? 'border-blue-500 bg-blue-50 hover:bg-blue-100' 
                                 : 'border-gray-200 hover:bg-gray-50'
                           }`}
                         >
                           <div className="flex items-center gap-2">
                             <div 
                               className="w-4 h-4 rounded-full"
                               style={{ backgroundColor: tag.color || '#3B82F6' }}
                             />
                             <span className={`font-medium ${isAlreadyAdded ? 'text-gray-500' : 'text-gray-800'}`}>
                               {tag.name}
                             </span>
                             {isAlreadyAdded && (
                               <span className="text-xs text-gray-500 ml-auto">✓ Added</span>
                             )}
                           </div>
                           <div className="text-xs text-gray-500 mt-1">
                             {rec
                               ? <>CR: ₹{(rec.credit || 0).toLocaleString('en-IN')} | DR: ₹{(rec.debit || 0).toLocaleString('en-IN')} | Bal: ₹{(rec.balance || 0).toLocaleString('en-IN')}</>
                               : 'CR: ₹0 | DR: ₹0 | Bal: ₹0'}
                           </div>
                         </button>
                       );
                     })}
                   </div>
                   )}
                   
                   {filteredTags.length === 0 && !isTagsModalLoading && (
                     <div className="text-center py-8 text-gray-500">
                       <p>
                         {tagSearchQuery 
                           ? `No tags found matching &quot;${tagSearchQuery}&quot;. Try a different search term.`
                           : 'No tags found. Create some tags in the Super Bank first.'
                         }
                       </p>
                     </div>
                   )}
                 </div>
                 
                                   <div className="flex gap-3 mt-6">
                    <button
                      onClick={closeTagsModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handleAddSelectedTags}
                      disabled={isAddingTag || modalSelectedTags.length === 0}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                    >
                      {isAddingTag ? 'Adding...' : 'SAVE'}
                    </button>
                  </div>
          </div>
        </div>
      )}

      {/* Sub-Item Option Modal */}
      {showSubItemOptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Add Sub-Item</h3>
              <button
                onClick={() => setShowSubItemOptionModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RiCloseLine size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">How would you like to add this sub-item?</p>
              
              <div className="space-y-3">
                <button
                  onClick={openSubItemAddTagsModal}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <RiBarChartLine className="text-green-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Add by Tags</h4>
                      <p className="text-sm text-gray-600">Create a sub-item using predefined tags</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSubItemOptionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Item Add Modal */}
      {showSubItemAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Add New Sub-Item</h3>
              <button
                onClick={closeSubItemAddModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RiCloseLine size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub-Item Name
                </label>
                <input
                  type="text"
                  value={newSubItemName}
                  onChange={(e) => setNewSubItemName(e.target.value)}
                  placeholder="Enter sub-item name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeSubItemAddModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubItem}
                disabled={!newSubItemName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Sub-Item
              </button>
            </div>
          </div>
        </div>
      )}

                   {/* Sub-Item Tags Modal */}
      {showSubItemTagsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Select a Tag for Sub-Item</h3>
              <button
                onClick={() => {
                  setShowSubItemTagsModal(false);
                  setModalSelectedTags([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RiCloseLine size={20} />
              </button>
            </div>

                         <div className="space-y-4 flex-1 overflow-y-auto">
               <p className="text-gray-600 mb-4">Choose a tag to create a new sub-item:</p>
               
               {/* Search Bar */}
               <div className="relative">
                 <input
                   type="text"
                   placeholder="Search tags..."
                   className="w-full border border-gray-200 px-4 py-2 pl-10 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                   value={tagSearchQuery}
                   onChange={e => setTagSearchQuery(e.target.value)}
                 />
                 <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                   </svg>
                 </div>
                 {tagSearchQuery && (
                   <button
                     onClick={() => setTagSearchQuery('')}
                     className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                 )}
               </div>
               {tagSearchQuery && (
                 <div className="text-sm text-gray-600">
                   Found {filteredTags.length} tag(s) matching &quot;{tagSearchQuery}&quot;
                 </div>
               )}
              
              {/* Selected Tags Display */}
              {modalSelectedTags.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-blue-800">
                      Selected Tags ({modalSelectedTags.length}):
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {modalSelectedTags.map((tag) => (
                        <div key={tag.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-blue-200">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: tag.color || '#3B82F6' }}
                          />
                          <span className="text-sm font-medium text-blue-800">{tag.name}</span>
                          <button
                            onClick={() => handleTagSelect(tag)}
                            className="text-red-500 hover:text-red-700 text-sm font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-blue-600">
                      Click &quot;Add Tags&quot; to add these tags as sub-items
                    </p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {filteredTags.map((tag) => {
                  const isAlreadyAdded = isTagAlreadyAdded(tag.name);
                  const rec = tagsSummaryMap.get((tag.name || '').toLowerCase());
                  return (
                    <button
                      key={tag.id}
                      onClick={() => !isAlreadyAdded && handleTagSelect(tag)}
                      disabled={isAlreadyAdded}
                      className={`p-3 border rounded-lg transition-colors text-left ${
                        isAlreadyAdded
                          ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
                          : modalSelectedTags.some(t => t.id === tag.id)
                            ? 'border-blue-500 bg-blue-50 hover:bg-blue-100' 
                            : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color || '#3B82F6' }}
                        />
                        <span className={`font-medium ${isAlreadyAdded ? 'text-gray-500' : 'text-gray-800'}`}>
                          {tag.name}
                        </span>
                        {isAlreadyAdded && (
                          <span className="text-xs text-gray-500 ml-auto">✓ Added</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {rec
                          ? <>CR: ₹{(rec.credit || 0).toLocaleString('en-IN')} | DR: ₹{(rec.debit || 0).toLocaleString('en-IN')} | Bal: ₹{(rec.balance || 0).toLocaleString('en-IN')}</>
                          : 'CR: ₹0 | DR: ₹0 | Bal: ₹0'}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {filteredTags.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>
                    {tagSearchQuery 
                      ? `No tags found matching &quot;${tagSearchQuery}&quot;. Try a different search term.`
                      : 'No tags found. Create some tags in the Super Bank first.'
                    }
                  </p>
                </div>
              )}
            </div>
            
                         <div className="flex gap-3 mt-6">
               <button
                 onClick={() => {
                   setShowSubItemTagsModal(false);
                   setModalSelectedTags([]);
                 }}
                 className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
               >
                 Cancel
               </button>
                               <button
                  onClick={handleAddSelectedSubItemTags}
                  disabled={isAddingTag || modalSelectedTags.length === 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {isAddingTag ? 'Adding...' : 'SAVE'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Sub-Sub-Item Option Modal */}
      {showSubSubItemOptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Add Sub-Sub-Item</h3>
              <button
                onClick={() => setShowSubSubItemOptionModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RiCloseLine size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">How would you like to add this sub-sub-item?</p>
              
              <div className="space-y-3">
                <button
                  onClick={openSubSubItemAddNameModal}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <RiAddLine className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Add by Name</h4>
                      <p className="text-sm text-gray-600">Create a sub-sub-item with a custom name</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={openSubSubItemAddTagsModal}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <RiBarChartLine className="text-green-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Add by Tags</h4>
                      <p className="text-sm text-gray-600">Create a sub-sub-item using predefined tags</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSubSubItemOptionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Sub-Item Add Modal */}
      {showSubSubItemAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Add New Sub-Sub-Item</h3>
              <button
                onClick={closeSubSubItemAddModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RiCloseLine size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub-Sub-Item Name
                </label>
                <input
                  type="text"
                  value={newSubSubItemName}
                  onChange={(e) => setNewSubSubItemName(e.target.value)}
                  placeholder="Enter sub-sub-item name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeSubSubItemAddModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubSubItem}
                disabled={!newSubSubItemName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Sub-Sub-Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Sub-Item Tags Modal */}
      {showSubSubItemTagsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Select a Tag for Sub-Sub-Item</h3>
              <button
                onClick={() => {
                  setShowSubSubItemTagsModal(false);
                  setModalSelectedTags([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RiCloseLine size={20} />
              </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto">
              <p className="text-gray-600 mb-4">Choose a tag to create a new sub-sub-item:</p>
              
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tags..."
                  className="w-full border border-gray-200 px-4 py-2 pl-10 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  value={tagSearchQuery}
                  onChange={e => setTagSearchQuery(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {tagSearchQuery && (
                  <button
                    onClick={() => setTagSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {tagSearchQuery && (
                <div className="text-sm text-gray-600">
                  Found {filteredTags.length} tag(s) matching &quot;{tagSearchQuery}&quot;
                </div>
              )}
              
              {/* Selected Tags Display */}
              {modalSelectedTags.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-blue-800">
                      Selected Tags ({modalSelectedTags.length}):
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {modalSelectedTags.map((tag) => (
                        <div key={tag.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-blue-200">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: tag.color || '#3B82F6' }}
                          />
                          <span className="text-sm font-medium text-blue-800">{tag.name}</span>
                          <button
                            onClick={() => handleTagSelect(tag)}
                            className="text-red-500 hover:text-red-700 text-sm font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-blue-600">
                      Click &quot;Add Tags&quot; to add these tags as sub-sub-items
                    </p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {filteredTags.map((tag) => {
                  const isAlreadyAdded = isTagAlreadyAdded(tag.name);
                  const rec = tagsSummaryMap.get((tag.name || '').toLowerCase());
                  return (
                    <button
                      key={tag.id}
                      onClick={() => !isAlreadyAdded && handleTagSelect(tag)}
                      disabled={isAlreadyAdded}
                      className={`p-3 border rounded-lg transition-colors text-left ${
                        isAlreadyAdded
                          ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
                          : modalSelectedTags.some(t => t.id === tag.id)
                            ? 'border-blue-500 bg-blue-50 hover:bg-blue-100' 
                            : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color || '#3B82F6' }}
                        />
                        <span className={`font-medium ${isAlreadyAdded ? 'text-gray-500' : 'text-gray-800'}`}>
                          {tag.name}
                        </span>
                        {isAlreadyAdded && (
                          <span className="text-xs text-gray-500 ml-auto">✓ Added</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {rec
                          ? <>CR: ₹{(rec.credit || 0).toLocaleString('en-IN')} | DR: ₹{(rec.debit || 0).toLocaleString('en-IN')} | Bal: ₹{(rec.balance || 0).toLocaleString('en-IN')}</>
                          : 'CR: ₹0 | DR: ₹0 | Bal: ₹0'}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {filteredTags.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>
                    {tagSearchQuery 
                      ? `No tags found matching &quot;${tagSearchQuery}&quot;. Try a different search term.`
                      : 'No tags found. Create some tags in the Super Bank first.'
                    }
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSubSubItemTagsModal(false);
                  setModalSelectedTags([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelectedSubSubItemTags}
                disabled={isAddingTag || modalSelectedTags.length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {isAddingTag ? 'Adding...' : 'SAVE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Edit Group</h3>
              <button
                onClick={closeEditGroupModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RiCloseLine size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditGroupModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditGroup}
                disabled={!editGroupName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Main Item Modal */}
      {showEditMainItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Edit Item</h3>
              <button
                onClick={closeEditMainItemModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RiCloseLine size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name
                </label>
                <input
                  type="text"
                  value={editMainItemName}
                  onChange={(e) => setEditMainItemName(e.target.value)}
                  placeholder="Enter item name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditMainItemModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditMainItem}
                disabled={!editMainItemName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sub-Item Modal */}
      {showEditSubItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Edit Sub-Item</h3>
              <button
                onClick={closeEditSubItemModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RiCloseLine size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub-Item Name
                </label>
                <input
                  type="text"
                  value={editSubItemName}
                  onChange={(e) => setEditSubItemName(e.target.value)}
                  placeholder="Enter sub-item name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditSubItemModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubItem}
                disabled={!editSubItemName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Transactions Modal */}
      {showTagTransactionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-7xl mx-4 max-h-[95vh] flex flex-col relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Transactions for Tag{activeTagName ? `: ${activeTagName}` : ''}</h3>
              <button onClick={() => setShowTagTransactionsModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <RiCloseLine size={20} />
              </button>
            </div>

            {/* Totals Summary */}
            {isTagModalLoading ? (
              <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 animate-pulse h-16" />
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 animate-pulse h-16" />
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 animate-pulse h-16" />
              </div>
            ) : Array.isArray(filteredTagTransactions) && filteredTagTransactions.length > 0 ? (
              (() => {
                let creditTotal = 0;
                let debitTotal = 0;
                filteredTagTransactions.forEach((tx: TransactionData) => {
                  const { amountAbs, crdr } = extractAmountAndTypeFromTx(tx);
                  if (crdr === 'CR') creditTotal += amountAbs;
                  else if (crdr === 'DR') debitTotal += amountAbs;
                });
                const balance = creditTotal - debitTotal;
                return (
                  <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-xs text-green-700 font-medium">Total Credit</div>
                      <div className="text-lg font-bold text-green-800">₹{creditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-xs text-red-700 font-medium">Total Debit</div>
                      <div className="text-lg font-bold text-red-800">₹{debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs text-blue-700 font-medium">Balance</div>
                      <div className={`text-lg font-bold ${balance >= 0 ? 'text-green-800' : 'text-red-800'}`}>₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                );
              })()
            ) : null}

            {/* Active Filters Display */}
            {(dateFilter || drCrFilter || accountFilter || dateSortOrder) && (
              <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                <span className="text-gray-500">Active filters:</span>
                {dateFilter && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    Date: {dateFilter}
                  </span>
                )}
                {dateSortOrder && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    Sort: {dateSortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                  </span>
                )}
                {drCrFilter && (
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                    Type: {drCrFilter}
                  </span>
                )}
                {accountFilter && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                    Account: {accountFilter}
                  </span>
                )}
                <button
                  onClick={() => {
                    setDateFilter('');
                    setDrCrFilter('');
                    setAccountFilter('');
                    setDateSortOrder('');
                  }}
                  className="text-red-600 hover:text-red-800 text-xs underline"
                >
                  Clear all filters
                </button>
              </div>
            )}

            <div className="overflow-y-auto border rounded-lg relative flex-1 min-h-[200px] max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 border-b relative">
                      <div className="flex items-center justify-between">
                        <span>Date</span>
                        <div className="relative sort-dropdown">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSortDropdownToggle('Date');
                            }}
                            className="sort-button p-1 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
                            title="Filter by date"
                          >
                            <FiChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                          
                          {sortDropdownOpen === 'Date' && (
                            <div className={`sort-dropdown ${getDropdownPositionClass('Date')} bg-white border border-gray-300 rounded shadow-lg min-w-[200px] max-h-64 overflow-y-auto`}>
                              {/* Date Sorting Options */}
                              <div className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 border-b">
                                Sort by Date
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDateSort('newest');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              >
                                <span>Newest to Oldest</span>
                                {dateSortOrder === 'newest' && (
                                  <span className="text-blue-600">✓</span>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDateSort('oldest');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              >
                                <span>Oldest to Newest</span>
                                {dateSortOrder === 'oldest' && (
                                  <span className="text-blue-600">✓</span>
                                )}
                              </button>
                              
                              <div className="border-t border-gray-200 my-1"></div>
                              
                              {/* Clear Options */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDateSort('clear');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 text-gray-500"
                              >
                                Clear sort
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                    <th className="text-left px-3 py-2 border-b">Description</th>
                    <th className="text-left px-3 py-2 border-b relative">
                      <div className="flex items-center justify-between">
                        <span>CR/DR</span>
                        <div className="relative sort-dropdown">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSortDropdownToggle('CR/DR');
                            }}
                            className="sort-button p-1 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
                            title="Filter by transaction type"
                          >
                            <FiChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                          
                          {sortDropdownOpen === 'CR/DR' && (
                            <div className={`sort-dropdown ${getDropdownPositionClass('CR/DR')} bg-white border border-gray-300 rounded shadow-lg min-w-[100px] max-h-48 overflow-y-auto`}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDrCrFilter('CR');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100"
                              >
                                CR
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDrCrFilter('DR');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100"
                              >
                                DR
                              </button>
                              <div className="border-t border-gray-200 my-1"></div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDrCrFilter('clear');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 text-gray-500"
                              >
                                Clear filter
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                    <th className="text-right px-3 py-2 border-b">Amount</th>
                    <th className="text-left px-3 py-2 border-b">Bank</th>
                    <th className="text-left px-3 py-2 border-b relative">
                      <div className="flex items-center justify-between">
                        <span>Account No.</span>
                        <div className="relative sort-dropdown">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSortDropdownToggle('Account No.');
                            }}
                            className="sort-button p-1 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
                            title="Filter by account number"
                          >
                            <FiChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                          
                          {sortDropdownOpen === 'Account No.' && (
                            <div className={`sort-dropdown ${getDropdownPositionClass('Account No.')} bg-white border border-gray-300 rounded shadow-lg min-w-[200px] max-h-48 overflow-y-auto`}>
                              {availableAccounts.map((account) => (
                                <button
                                  key={`${account.bankName}-${account.accountNumber}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAccountFilter(account.accountNumber);
                                    setSortDropdownOpen(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                                >
                                  <span className="truncate">{account.accountNumber}</span>
                                  <span className="text-gray-400 text-xs ml-1">- {account.bankName}</span>
                                </button>
                              ))}
                              <div className="border-t border-gray-200 my-1"></div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleAccountFilter('clear');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 text-gray-500"
                              >
                                Clear filter
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isTagModalLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-600 py-6">Loading transactions…</td>
                    </tr>
                  ) : filteredTagTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-600 py-6">No transactions found for this tag.</td>
                    </tr>
                  ) : (
                    filteredTagTransactions.map((tx: TransactionData, idx: number) => {
                      const { amountAbs, crdr } = extractAmountAndTypeFromTx(tx);
                      const bankName = tx.bankName || tx.bankId || 'Unknown Bank';
                      const isCredit = crdr === 'CR';
                      const displayAmount = amountAbs;
                      const dateStr = formatDate(tx.Date || tx.date || ((tx as Record<string, unknown>)['Transaction Date'] as string | number | undefined) || ((tx as Record<string, unknown>)['Value Date'] as string | number | undefined));
                                             // Try multiple possible description fields
                       const desc = String(
                         tx.Description || 
                         tx.description || 
                         tx.Narration || 
                         tx.narration ||
                         tx['Transaction Description'] ||
                         tx['transaction description'] ||
                         tx.Particulars ||
                         tx.particulars ||
                         tx.Reference ||
                         tx.reference ||
                         tx['Reference No.'] ||
                         tx['reference no.'] ||
                         tx.Remarks ||
                         tx.remarks ||
                         ''
                       );
                      const accountNo = (tx.userAccountNumber || tx.accountNumber || tx.accountNo || tx.account || tx.account_id || tx.accountId || 'N/A') as string;
                      return (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2">{dateStr}</td>
                          <td className="px-3 py-2">{desc}</td>
                          <td className="px-3 py-2">{crdr || (isCredit ? 'CR' : 'DR')}</td>
                          <td className={`px-3 py-2 text-right ${isCredit ? 'text-green-700' : 'text-red-700'}`}>₹{displayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2">{bankName}</td>
                          <td className="px-3 py-2 font-mono text-xs">{accountNo}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <button onClick={() => setShowTagTransactionsModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 