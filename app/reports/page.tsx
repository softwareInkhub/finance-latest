'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RiEdit2Line, RiBarChartLine, RiAddLine, RiArrowDownSLine, RiArrowRightSLine, RiCloseLine, RiDeleteBin6Line, RiSaveLine } from 'react-icons/ri';
import { Tag } from '../types/transaction';
import { useAppSelector } from '../store/hooks';

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
  // Get analytics data from Redux
  const reduxAnalyticsData = useAppSelector(state => state.analytics.data);
  const analyticsLoading = useAppSelector(state => state.analytics.loading);
  const analyticsError = useAppSelector(state => state.analytics.error);

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

  // Edit group and main item state variables
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{sectionId: string, groupId: string, currentName: string} | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [showEditMainItemModal, setShowEditMainItemModal] = useState(false);
  const [editingMainItem, setEditingMainItem] = useState<{sectionId: string, groupId: string, itemId: string, currentName: string} | null>(null);
  const [editMainItemName, setEditMainItemName] = useState('');

  // Sub-sub-item state variables
  const [showSubSubItemOptionModal, setShowSubSubItemOptionModal] = useState(false);
  const [pendingSubSubItemAdd, setPendingSubSubItemAdd] = useState<{sectionId: string, groupId: string, parentItemId: string, subItemId: string} | null>(null);
  const [showSubSubItemAddModal, setShowSubSubItemAddModal] = useState(false);
  const [newSubSubItemName, setNewSubSubItemName] = useState('');
  const [showSubSubItemTagsModal, setShowSubSubItemTagsModal] = useState(false);

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



  // Function to fetch tag financial data - using Redux data
  const fetchTagFinancialData = useCallback(async (tagName: string) => {
    try {
      if (!reduxAnalyticsData || !reduxAnalyticsData.transactions) {
        console.error('No transactions data available in Redux');
        return { credit: 0, debit: 0, balance: 0 };
      }

      const transactions = reduxAnalyticsData.transactions;
      console.log(`Using ${transactions.length} transactions from Redux for tag: ${tagName}`);
      
      // Use exact same logic as Super Bank
      const txs: TransactionData[] = transactions.filter((tx: TransactionData) =>
        Array.isArray(tx.tags) && tx.tags.some((t: { name: string }) => t.name === tagName)
      );
      console.log(`Found ${txs.length} transactions for tag ${tagName}`);
      
      let totalAmount = 0, totalCredit = 0, totalDebit = 0;
      
      txs.forEach((tx: TransactionData) => {
        // Get amount from AmountRaw or parse from Amount field - EXACT SAME LOGIC AS SUPER BANK
        let amount = 0;
        if (typeof tx.AmountRaw === 'number') {
          amount = tx.AmountRaw || 0;
        } else {
          // Fallback to parsing Amount field
          const amountField = tx.Amount || tx.amount || 0;
          // Simple parsing without parseIndianAmount
          if (typeof amountField === 'number') {
            amount = amountField;
          } else if (typeof amountField === 'string') {
            const cleaned = amountField.replace(/,/g, '').trim();
            const num = parseFloat(cleaned);
            amount = isNaN(num) ? 0 : num;
          } else {
            amount = 0;
          }
        }
        
        // Use Math.round to avoid floating point precision issues
        amount = Math.round(amount * 100) / 100;
        totalAmount = Math.round((totalAmount + amount) * 100) / 100;
        
        const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
        console.log(`Transaction for ${tagName}: AmountRaw=${tx.AmountRaw}, Amount=${tx.Amount}, ParsedAmount=${amount}, Dr./Cr.=${crdr}`);
        
        if (crdr === 'CR') {
          totalCredit = Math.round((totalCredit + Math.abs(amount)) * 100) / 100;
        } else if (crdr === 'DR') {
          totalDebit = Math.round((totalDebit + Math.abs(amount)) * 100) / 100;
        }
      });
      
      console.log(`Final calculation for ${tagName}: Credit=${totalCredit}, Debit=${totalDebit}, Balance=${totalCredit - totalDebit}`);
      
      return {
        credit: Math.round(totalCredit * 100) / 100,
        debit: Math.round(totalDebit * 100) / 100,
        balance: Math.round((totalCredit - totalDebit) * 100) / 100
      };
    } catch (error) {
      console.error('Error calculating tag financial data:', error);
      return { credit: 0, debit: 0, balance: 0 };
    }
  }, [reduxAnalyticsData]);

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

  // Manual refresh function to sync latest tag changes from Super Bank
  const handleRefreshTags = useCallback(async () => {
    // Prevent multiple simultaneous refresh operations
    if (isRefreshing) {
      console.log('Refresh already in progress, skipping...');
      return;
    }

    try {
      setIsRefreshing(true);
      
      if (!reduxAnalyticsData || !reduxAnalyticsData.transactions) {
        console.log('No Redux data available for refresh');
        return;
      }
      
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
      
      if (tagNames.size === 0) {
        console.log('No tag-based items found to refresh');
        return;
      }

      console.log(`Refreshing ${tagNames.size} tag-based items:`, Array.from(tagNames));

      // Compute latest CR/DR/Bal for each tag using Redux transactions
      const entries = await Promise.all(
        Array.from(tagNames).map(async (name) => {
          const data = await fetchTagFinancialData(name);
          return [name, data] as const;
        })
      );
      const tagToData = new Map(entries);

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
  }, [reduxAnalyticsData, cashFlowData, fetchTagFinancialData, saveCashFlowData, isRefreshing]);

  // Auto-refresh tag-based rows whenever analytics Redux data changes
  useEffect(() => {
    // Skip if no Redux data or if we're already processing
    if (!reduxAnalyticsData || !reduxAnalyticsData.transactions) return;
    
    // Debounce the refresh to prevent excessive calls
    const timeoutId = setTimeout(() => {
      const refreshTagItems = async () => {
        try {
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

          // Compute latest CR/DR/Bal for each tag using Redux transactions
          const entries = await Promise.all(
            Array.from(tagNames).map(async (name) => {
              const data = await fetchTagFinancialData(name);
              return [name, data] as const;
            })
          );
          const tagToData = new Map(entries);

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
        } catch (err) {
          console.error('Failed to refresh tag-based items:', err);
        }
      };

      refreshTagItems();
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [reduxAnalyticsData, saveCashFlowData, fetchTagFinancialData]);

  // Auto-refresh tags when page loads/becomes visible (additional to Redux changes)
  useEffect(() => {
    // Debounce visibility change handler to prevent excessive calls
    let visibilityTimeoutId: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (!document.hidden && reduxAnalyticsData && reduxAnalyticsData.transactions && !isRefreshing) {
        // Clear any pending timeout
        clearTimeout(visibilityTimeoutId);
        // Debounce the refresh call
        visibilityTimeoutId = setTimeout(() => {
          handleRefreshTags();
        }, 500);
      }
    };

    // Refresh on page load/focus (only once)
    if (reduxAnalyticsData && reduxAnalyticsData.transactions && !isRefreshing) {
      // Delay initial refresh to prevent blocking page load
      const initialTimeoutId = setTimeout(() => {
        handleRefreshTags();
      }, 1000);
      
      return () => {
        clearTimeout(initialTimeoutId);
        clearTimeout(visibilityTimeoutId);
      };
    }

    // Listen for page visibility changes (when user switches back to tab)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for window focus (when user switches back to window)
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearTimeout(visibilityTimeoutId);
    };
  }, [reduxAnalyticsData, handleRefreshTags, isRefreshing]); // Include isRefreshing to prevent conflicts

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

  // Function to get bank breakdown for tooltips
  const getBankBreakdown = (type: 'inflow' | 'outflow' | 'net') => {
    const bankData: { name: string; amount: number }[] = [];
    
    // Get bank data from Redux analytics data
    if (reduxAnalyticsData && reduxAnalyticsData.transactions) {
      const transactions = reduxAnalyticsData.transactions;
      
      // Create a map to store bank totals
      const bankTotals: { [bankName: string]: number } = {};
      
      transactions.forEach((tx: TransactionData) => {
        // Get bank name from transaction
        const bankName = tx.bankName || tx.bankId || 'Unknown Bank';
        
        // Get amount from transaction
        let amount = 0;
        if (typeof tx.AmountRaw === 'number') {
          amount = tx.AmountRaw || 0;
        } else {
          const amountField = tx.Amount || tx.amount || 0;
          if (typeof amountField === 'number') {
            amount = amountField;
          } else if (typeof amountField === 'string') {
            const cleaned = amountField.replace(/,/g, '').trim();
            const num = parseFloat(cleaned);
            amount = isNaN(num) ? 0 : num;
          }
        }
        
        // Determine if it's inflow or outflow based on Dr./Cr.
        const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
        let isInflow = false;
        
        if (crdr === 'CR') {
          isInflow = true;
        } else if (crdr === 'DR') {
          isInflow = false;
        } else {
          // If no Dr./Cr. specified, assume positive amounts are inflow
          isInflow = amount > 0;
        }
        
        // Add to bank totals based on type
        if (type === 'inflow' && isInflow) {
          bankTotals[bankName] = (bankTotals[bankName] || 0) + Math.abs(amount);
        } else if (type === 'outflow' && !isInflow) {
          bankTotals[bankName] = (bankTotals[bankName] || 0) + Math.abs(amount);
        } else if (type === 'net') {
          const currentTotal = bankTotals[bankName] || 0;
          bankTotals[bankName] = currentTotal + (isInflow ? amount : -amount);
        }
      });
      
      // Convert to array format
      Object.entries(bankTotals).forEach(([bankName, total]) => {
        if (Math.abs(total) > 0) {
          bankData.push({ name: bankName, amount: total });
        }
      });
    }
    
    // If no bank data available, fall back to group data
    if (bankData.length === 0) {
      if (type === 'inflow') {
        cashFlowData[0]?.groups?.forEach(group => {
          const groupTotal = group.items.reduce((sum, item) => sum + (item.amount || 0), 0);
          if (groupTotal > 0) {
            bankData.push({ name: group.title, amount: groupTotal });
          }
        });
      } else if (type === 'outflow') {
        cashFlowData[1]?.groups?.forEach(group => {
          const groupTotal = group.items.reduce((sum, item) => sum + (item.amount || 0), 0);
          if (groupTotal > 0) {
            bankData.push({ name: group.title, amount: groupTotal });
          }
        });
      } else if (type === 'net') {
        const inflowByGroup = getBankBreakdown('inflow');
        const outflowByGroup = getBankBreakdown('outflow');
        
        const allGroups = new Set([...inflowByGroup.map(b => b.name), ...outflowByGroup.map(b => b.name)]);
        
        allGroups.forEach(groupName => {
          const inflow = inflowByGroup.find(b => b.name === groupName)?.amount || 0;
          const outflow = outflowByGroup.find(b => b.name === groupName)?.amount || 0;
          const net = inflow - outflow;
          if (net !== 0) {
            bankData.push({ name: groupName, amount: net });
          }
        });
      }
    }
    
    return bankData.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  // Function to expand all groups
  const expandAllGroups = () => {
    setCashFlowData(prev => {
      const updated = prev.map(section => ({
        ...section,
        groups: section.groups.map(group => ({
          ...group,
          isExpanded: true,
          items: group.items.map(item => ({
            ...item,
            isExpanded: true,
            // keep existing subItems unchanged
            subItems: item.subItems?.map(sub => ({ ...sub })) || item.subItems
          }))
        }))
      }));
      saveCashFlowData(updated);
      return updated;
    });
  };

  // Function to collapse all groups
  const collapseAllGroups = () => {
    setCashFlowData(prev => {
      const updated = prev.map(section => ({
        ...section,
        groups: section.groups.map(group => ({
          ...group,
          isExpanded: false,
          items: group.items.map(item => ({
            ...item,
            isExpanded: false,
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

  const openAddGroupTagsModal = () => {
    setShowTagsModal(true);
    setShowGroupOptionModal(false);
    fetchTags();
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
        // Fetch tag financial data
        const tagData = await fetchTagFinancialData(tag.name);
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
        // Fetch tag financial data
        const tagData = await fetchTagFinancialData(tag.name);
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
        // Fetch tag financial data
        const tagData = await fetchTagFinancialData(tag.name);
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

  // Helper: open tag transactions modal by tag name using Redux analytics data
  const openTagTransactions = useCallback(async (tagName: string) => {
    try {
      setActiveTagName(tagName);
      if (reduxAnalyticsData && reduxAnalyticsData.transactions) {
        const txs: TransactionData[] = reduxAnalyticsData.transactions.filter((tx: TransactionData) =>
          Array.isArray(tx.tags) && tx.tags.some((t: { name: string }) => t.name === tagName)
        );
        
        // Debug: Log the first transaction to see what fields are available
        if (txs.length > 0) {
          console.log('🔍 First transaction data:', txs[0]);
          console.log('🔍 Available fields:', Object.keys(txs[0]));
          console.log('🔍 Description field value:', txs[0].Description);
          console.log('🔍 Description field type:', typeof txs[0].Description);
          console.log('🔍 All string fields:', Object.entries(txs[0]).filter(([, v]) => typeof v === 'string' && v.trim() !== '').map(([k, v]) => `${k}: "${v}"`));
        }
        
        // Fetch user account numbers for unique accountIds
        const uniqueAccountIds: string[] = Array.from(new Set(txs.map(t => t.accountId).filter((v): v is string => typeof v === 'string' && v.length > 0)));
        const entries = await Promise.all(
          uniqueAccountIds.map(async (accountId: string) => {
            try {
              const res = await fetch(`/api/account?accountId=${encodeURIComponent(accountId)}`);
              if (!res.ok) return [accountId, null] as const;
              const account = await res.json();
              const acctNo: string | null = (account?.accountNumber as string) || null;
              return [accountId, acctNo] as const;
            } catch {
              return [accountId, null] as const;
            }
          })
        );
        const idToUserAccountNo: { [id: string]: string | null } = Object.fromEntries(entries);
        const enriched: TransactionData[] = txs.map((tx) => ({
          ...tx,
          userAccountNumber:
            (tx.accountId && idToUserAccountNo[tx.accountId]) ||
            tx.accountNumber || tx.accountNo || tx.account || tx.account_id || tx.accountId || 'N/A'
        }));
        setActiveTagTransactions(enriched);
      } else {
        setActiveTagTransactions([]);
      }
      setShowTagTransactionsModal(true);
    } catch {
      setActiveTagTransactions([]);
      setShowTagTransactionsModal(true);
    }
  }, [reduxAnalyticsData]);

    return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10 px-4 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto">
      {/* Header */}
        

        {/* Analytics Summary */}
   

        {/* Loading and Error States */}
        {analyticsLoading && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">Loading analytics data from Super Bank...</p>
          </div>
        )}

        {analyticsError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">Error loading analytics: {analyticsError}</p>
          </div>
        )}

        {/* {!analyticsLoading && !analyticsError && !reduxAnalyticsData && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">No analytics data available. Please visit Super Bank first to load data.</p>
          </div>
        )} */}

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
          <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden overflow-y-auto">
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
                   <tr className="border-b-2 border-gray-300">
                     <th className="text-left py-3 px-4 font-bold text-gray-800 text-lg">PARTICULAR</th>
                     <th className="text-right py-3 px-4 font-bold text-gray-800 text-lg">AMT.</th>
                   </tr>
                 </thead>
                <tbody>
                                     {/* INFLOWS Section */}
                   <tr className="border-b-2 border-gray-400">
                     <td className="py-3 px-4 font-bold text-blue-700 text-lg bg-blue-50 flex items-center justify-between">
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
                     <td className="py-3 px-4 text-right font-bold text-blue-700 text-lg bg-blue-50">
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
                          className="border-b border-gray-300 hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleGroup(cashFlowData[0].id, group.id)}
                        >
                                                     <td className="py-2 px-4 font-semibold text-gray-800 flex items-center gap-2">
                             {group.isExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                             {group.title}
                             {isEditing && (
                               <div className="flex items-center gap-1 ml-2">
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openEditGroupModal(cashFlowData[0].id, group.id, group.title);
                                   }}
                                   className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                   title="Edit group"
                                 >
                                   <RiEdit2Line size={14} />
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openAddModal(cashFlowData[0].id, group.id);
                                   }}
                                   className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                   title="Add new item"
                                 >
                                   <RiAddLine size={14} />
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openDeleteModal(cashFlowData[0].id, group.id);
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
                        {group.isExpanded && group.items.map((item) => (
                          <React.Fragment key={item.id}>
                            {/* Main Item */}
                            <tr className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="py-2 px-8 text-gray-700 flex items-center justify-between">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    {item.subItems && item.subItems.length > 0 && (
                                      <button
                                        onClick={() => toggleItemExpansion(cashFlowData[0].id, group.id, item.id)}
                                        className="text-gray-500 hover:text-gray-700"
                                      >
                                        {item.isExpanded ? <RiArrowDownSLine size={14} /> : <RiArrowRightSLine size={14} />}
                                      </button>
                                    )}
                                    <span className="cursor-pointer hover:underline" onClick={() => item.createdByTag ? openTagTransactions(item.particular) : undefined}>{item.particular}</span>
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
                            {item.isExpanded && item.subItems && item.subItems.map((subItem) => (
                              <tr key={subItem.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-2 px-12 text-gray-600 flex items-center justify-between">
                                  <div className="flex flex-col">
                                    <span className="text-sm cursor-pointer hover:underline" onClick={() => subItem.createdByTag ? openTagTransactions(subItem.particular) : undefined}>{subItem.particular}</span>
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
                                <td className="py-2 px-4 text-right text-gray-600 text-sm">{(subItem.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
                                                   <td className="py-2 px-4 font-semibold text-gray-800 flex items-center gap-2">
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
                         {group.isExpanded && group.items.map((item) => (
                           <React.Fragment key={item.id}>
                             {/* Main Item */}
                             <tr className="border-b border-gray-200 hover:bg-gray-50">
                               <td className="py-2 px-8 text-gray-700 flex items-center justify-between">
                                 <div className="flex flex-col">
                                   <div className="flex items-center gap-2">
                                     {item.subItems && item.subItems.length > 0 && (
                                       <button
                                         onClick={() => toggleItemExpansion(cashFlowData[1].id, group.id, item.id)}
                                         className="text-gray-500 hover:text-gray-700"
                                       >
                                         {item.isExpanded ? <RiArrowDownSLine size={14} /> : <RiArrowRightSLine size={14} />}
                                       </button>
                                     )}
                                     <span className="cursor-pointer hover:underline" onClick={() => item.createdByTag ? openTagTransactions(item.particular) : undefined}>{item.particular}</span>
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
                             {item.isExpanded && item.subItems && item.subItems.map((subItem) => (
                               <tr key={subItem.id} className="border-b border-gray-100 hover:bg-gray-50">
                                 <td className="py-2 px-12 text-gray-600 flex items-center justify-between">
                                   <div className="flex flex-col">
                                     <span className="text-sm cursor-pointer hover:underline" onClick={() => subItem.createdByTag ? openTagTransactions(subItem.particular) : undefined}>{subItem.particular}</span>
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
              {/* Header */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Operations</h3>
              </div>

              {/* Edit Mode Toggle */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Statement Mode</h4>
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
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Export & Data</h4>
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
              </div>

              {/* Quick Stats */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Quick Stats</h4>
                <div className="space-y-3">
                  <div className="relative group">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                      <div className="text-blue-700 font-medium text-sm mb-1">Total Inflow</div>
                      <div className="text-2xl font-bold text-blue-800">₹{(totalInflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                    {/* Inflow Tooltip */}
                    <div className="absolute right-full top-0 mr-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none">
                       <div className="text-sm font-semibold text-gray-800 mb-3">Inflow Breakdown by Banks</div>
                      {getBankBreakdown('inflow').length > 0 ? (
                        <div className="space-y-2">
                          {getBankBreakdown('inflow').map((bank, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700 font-medium">{bank.name}</span>
                              <span className="text-blue-600 font-bold">₹{bank.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No bank data available</div>
                      )}
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-gray-800">Total</span>
                          <span className="text-blue-800">₹{(totalInflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors">
                      <div className="text-red-700 font-medium text-sm mb-1">Total Outflow</div>
                      <div className="text-2xl font-bold text-red-800">₹{(totalOutflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                    {/* Outflow Tooltip */}
                    <div className="absolute right-full top-0 mr-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none">
                       <div className="text-sm font-semibold text-gray-800 mb-3">Outflow Breakdown by Banks</div>
                      {getBankBreakdown('outflow').length > 0 ? (
                        <div className="space-y-2">
                          {getBankBreakdown('outflow').map((bank, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700 font-medium">{bank.name}</span>
                              <span className="text-red-600 font-bold">₹{bank.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No bank data available</div>
                      )}
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-gray-800">Total</span>
                          <span className="text-red-800">₹{(totalOutflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200 cursor-pointer hover:bg-green-100 transition-colors">
                      <div className="text-green-700 font-medium text-sm mb-1">Net Cash Flow</div>
                      <div className={`text-2xl font-bold ${netFlow >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  ₹{(netFlow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
          </div>
                    {/* Net Flow Tooltip */}
                    <div className="absolute right-full top-0 mr-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none">
                       <div className="text-sm font-semibold text-gray-800 mb-3">Net Cash Flow by Banks</div>
                      {getBankBreakdown('net').length > 0 ? (
                        <div className="space-y-2">
                          {getBankBreakdown('net').map((bank, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700 font-medium">{bank.name}</span>
                              <span className={`font-bold ${bank.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹{Math.abs(bank.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                {bank.amount >= 0 ? ' (Inflow)' : ' (Outflow)'}
                              </span>
        </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No bank data available</div>
                      )}
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-gray-800">Net Total</span>
                          <span className={`${netFlow >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                            ₹{(netFlow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* View Controls */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">View Controls</h4>
                <div className="space-y-2">
                  <button
                    onClick={expandAllGroups}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                    title="Expand all groups to show all items"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    EXPAND ALL
                  </button>
                  <button
                    onClick={collapseAllGroups}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                    title="Collapse all groups to show only group totals"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    COLLAPSE ALL
                  </button>
                </div>
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
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Add New Sub Group</h3>
                <button
                  onClick={closeAddModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <RiCloseLine size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub Group Name
                  </label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Enter sub group name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
              </div>
            </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
               <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold text-gray-800">Add Sub Group</h3>
                   <button
                     onClick={closeGroupOptionModal}
                     className="text-gray-400 hover:text-gray-600 transition-colors"
                   >
                     <RiCloseLine size={20} />
                   </button>
                 </div>
                 
                 <div className="space-y-4">
                   <p className="text-gray-600 mb-4">How would you like to add this sub group?</p>
                   
            <div className="space-y-3">
                     <button
                       onClick={openAddGroupNameModal}
                       className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                     >
            <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                           <RiAddLine className="text-blue-600" size={20} />
              </div>
              <div>
                           <h4 className="font-semibold text-gray-800">Add Sub Group by Name</h4>
                           <p className="text-sm text-gray-600">Create a sub group with a custom name</p>
              </div>
            </div>
                     </button>
                     
                     <button
                       onClick={openAddGroupTagsModal}
                       className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                     >
            <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                           <RiBarChartLine className="text-green-600" size={20} />
              </div>
              <div>
                           <h4 className="font-semibold text-gray-800">Add by Tags</h4>
                           <p className="text-sm text-gray-600">Create a sub group using predefined tags</p>
              </div>
            </div>
                     </button>
          </div>
        </div>

                 <div className="flex gap-3 mt-6">
                   <button
                     onClick={closeGroupOptionModal}
                     className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                     {filteredTags.map((tag) => {
                       const isAlreadyAdded = isTagAlreadyAdded(tag.name);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Transactions for Tag{activeTagName ? `: ${activeTagName}` : ''}</h3>
              <button onClick={() => setShowTagTransactionsModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <RiCloseLine size={20} />
              </button>
            </div>

            {/* Totals Summary */}
            {Array.isArray(activeTagTransactions) && activeTagTransactions.length > 0 && (
              (() => {
                let creditTotal = 0;
                let debitTotal = 0;
                activeTagTransactions.forEach((tx: TransactionData) => {
                  const raw = typeof tx.AmountRaw === 'number'
                    ? tx.AmountRaw
                    : (typeof tx.Amount === 'string'
                        ? parseFloat((tx.Amount || '0').toString().replace(/,/g, ''))
                        : (typeof tx.amount === 'number' ? tx.amount : 0));
                  const crdr = (tx['Dr./Cr.'] || '').toString().toUpperCase();
                  const isCredit = crdr === 'CR' || raw > 0;
                  const value = Math.abs(raw);
                  if (isCredit) creditTotal += value; else debitTotal += value;
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
            )}

            <div className="overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Date</th>
                    <th className="text-left px-3 py-2 border-b">Description</th>
                    <th className="text-left px-3 py-2 border-b">CR/DR</th>
                    <th className="text-right px-3 py-2 border-b">Amount</th>
                    <th className="text-left px-3 py-2 border-b">Bank</th>
                    <th className="text-left px-3 py-2 border-b">Account No.</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTagTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-600 py-6">No transactions found for this tag.</td>
                    </tr>
                  ) : (
                    activeTagTransactions.map((tx: TransactionData, idx: number) => {
                      const amountRaw = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : (typeof tx.Amount === 'string' ? parseFloat((tx.Amount || '0').toString().replace(/,/g, '')) : (typeof tx.amount === 'number' ? tx.amount : 0));
                      const bankName = tx.bankName || tx.bankId || 'Unknown Bank';
                      const crdr = (tx['Dr./Cr.'] || '').toString().toUpperCase();
                      const isCredit = crdr === 'CR' || amountRaw > 0;
                      const displayAmount = Math.abs(amountRaw);
                      const dateStr = String(tx.Date || tx.date || '');
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