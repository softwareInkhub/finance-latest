'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RiEdit2Line, RiBarChartLine, RiAddLine, RiArrowDownSLine, RiArrowRightSLine, RiCloseLine, RiDeleteBin6Line, RiSaveLine } from 'react-icons/ri';
import { Tag } from '../types/transaction';
import AnalyticsSummary from '../components/AnalyticsSummary';
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
      const saved = localStorage.getItem('cashFlowData');
      return saved ? JSON.parse(saved) : initialData;
    }
    return initialData;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [pendingAdd, setPendingAdd] = useState<{sectionId: string, groupId: string} | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{sectionId: string, groupId: string, itemId?: string} | null>(null);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [pendingAddGroup, setPendingAddGroup] = useState<string | null>(null);
  const [showGroupOptionModal, setShowGroupOptionModal] = useState(false);
  const [pendingAddGroupSection, setPendingAddGroupSection] = useState<string | null>(null);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [modalSelectedTag, setModalSelectedTag] = useState<Tag | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);



  // Function to fetch tag financial data - using Redux data
  const fetchTagFinancialData = async (tagName: string) => {
    try {
      if (!reduxAnalyticsData || !reduxAnalyticsData.transactions) {
        console.error('No transactions data available in Redux');
        return { credit: 0, debit: 0, balance: 0 };
      }

      const transactions = reduxAnalyticsData.transactions;
      console.log(`Using ${transactions.length} transactions from Redux for tag: ${tagName}`);
      
      // Use exact same logic as Super Bank
      const txs = transactions.filter((tx: any) => Array.isArray(tx.tags) && tx.tags.some((t: any) => t.name === tagName));
      console.log(`Found ${txs.length} transactions for tag ${tagName}`);
      
      let totalAmount = 0, totalCredit = 0, totalDebit = 0;
      
      txs.forEach((tx: any) => {
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
  };

      // Calculate totals with safety checks
  const totalInflow = cashFlowData[0]?.groups?.reduce((sum, group) => 
    sum + (group?.items?.reduce((groupSum, item) => groupSum + (item?.amount || 0), 0) || 0), 0
  ) || 0;
  const totalOutflow = cashFlowData[1]?.groups?.reduce((sum, group) => 
    sum + (group?.items?.reduce((groupSum, item) => groupSum + (item?.amount || 0), 0) || 0), 0
  ) || 0;
  const netFlow = totalInflow - totalOutflow;

  const handleEdit = () => {
    setIsEditing(!isEditing);
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
      localStorage.setItem('cashFlowData', JSON.stringify(updated));
      return updated;
    });
  };

  const openAddModal = (sectionId: string, groupId: string) => {
    setPendingAddGroupSection(sectionId);
    setPendingAddGroup(groupId);
    setShowGroupOptionModal(true);
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
      localStorage.setItem('cashFlowData', JSON.stringify(updated));
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

  const openDeleteModal = (sectionId: string, groupId: string, itemId?: string) => {
    setPendingDelete({ sectionId, groupId, itemId });
    setShowDeleteModal(true);
  };

  const handleDeleteItem = () => {
    if (!pendingDelete) return;

    setCashFlowData(prev => {
      const updated = prev.map(section => {
        if (section.id === pendingDelete.sectionId) {
          if (pendingDelete.itemId) {
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
      localStorage.setItem('cashFlowData', JSON.stringify(updated));
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
    
    const section = cashFlowData.find(s => s.id === pendingAddGroup);
    
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
      localStorage.setItem('cashFlowData', JSON.stringify(updated));
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
    setModalSelectedTag(tag);
  };

  const handleAddSelectedTag = async () => {
    if (!modalSelectedTag) return;
    
    setIsAddingTag(true);
    console.log('Adding tag to cashflow:', modalSelectedTag.name);
    
    try {
      // Fetch tag financial data
      const tagData = await fetchTagFinancialData(modalSelectedTag.name);
      console.log('Tag financial data:', tagData);
      
      // Create a new item with the tag name and financial data
      const newItem: CashFlowItem = {
        id: Date.now().toString(),
        particular: modalSelectedTag.name,
        amount: tagData.balance, // Use the balance as the amount
        type: pendingAddGroupSection === '1' ? 'inflow' : 'outflow',
        createdByTag: true,
        tagData: tagData
      };
      
      console.log('Created new item:', newItem);

      setCashFlowData(prev => {
        const updated = prev.map(section => {
          if (section.id === pendingAddGroupSection) {
            return {
              ...section,
              groups: section.groups.map(group => {
                if (group.id === pendingAddGroup) {
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
        localStorage.setItem('cashFlowData', JSON.stringify(updated));
        return updated;
      });

      // Close modals and reset
      setShowTagsModal(false);
      setModalSelectedTag(null);
      setPendingAddGroupSection(null);
      setPendingAddGroup(null);
    } catch (error) {
      console.error('Error adding tag:', error);
    } finally {
      setIsAddingTag(false);
    }
  };

  const closeTagsModal = () => {
    setShowTagsModal(false);
    setSelectedTag(null);
    setModalSelectedTag(null);
    setPendingAddGroupSection(null);
    setPendingAddGroup(null);
  };

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('cashFlowData', JSON.stringify(cashFlowData));
    setIsEditing(false);
    // You can add a success message or notification here
  };

    return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10 px-4 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
      {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-100 p-3 rounded-full text-blue-600 text-2xl shadow">
            <RiBarChartLine />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Financial Reports
            </h1>
            <p className="text-gray-600 mt-1">Generate and view financial statements</p>
          </div>
        </div>

        {/* Analytics Summary */}
        {!analyticsLoading && !analyticsError && reduxAnalyticsData && (
          <div className="mb-6">
            <AnalyticsSummary
              totalAmount={reduxAnalyticsData.totalAmount || 0}
              totalCredit={reduxAnalyticsData.totalCredit || 0}
              totalDebit={reduxAnalyticsData.totalDebit || 0}
              totalTransactions={reduxAnalyticsData.totalTransactions || 0}
              totalBanks={reduxAnalyticsData.totalBanks || 0}
              totalAccounts={reduxAnalyticsData.totalAccounts || 0}
              showBalance={true}
            />
          </div>
        )}

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

        {!analyticsLoading && !analyticsError && !reduxAnalyticsData && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">No analytics data available. Please visit Super Bank first to load data.</p>
          </div>
        )}

        {/* Cashflow Statement */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-h-[60vh] overflow-y-auto">
                     {/* Statement Header */}
           <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 relative">
             <div className="flex items-center justify-between">
               <h2 className="text-2xl font-bold">CASHFLOW STATEMENT</h2>
                               <div className="flex items-center gap-3">
                  {isEditing ? (
                    <>
        <button
                        onClick={handleSave}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
        >
                        <RiSaveLine size={16} />
                        SAVE
        </button>
                      <button
                        onClick={handleEdit}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
                      >
                        <RiCloseLine size={16} />
                        CANCEL
                      </button>
                    </>
                  ) : (
        <button
                      onClick={handleEdit}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
        >
                      <RiEdit2Line size={16} />
                      EDIT
        </button>
                  )}
      </div>
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
                       {totalInflow.toLocaleString()}
                     </td>
                   </tr>
                  
                  {/* Inflow Groups */}
                  {cashFlowData[0]?.groups?.map((group) => {
                    const groupTotal = group?.items?.reduce((sum, item) => sum + (item?.amount || 0), 0) || 0;
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
                                     openAddModal(cashFlowData[0].id, group.id);
                                   }}
                                   className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                   title="Add new item"
                                 >
                                   <RiAddLine size={14} />
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openDeleteModal(cashFlowData[0].id, group.id);
                                   }}
                                   className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                   title="Delete group"
                                 >
                                   <RiDeleteBin6Line size={14} />
                                 </button>
            </div>
                             )}
                           </td>
                          <td className="py-2 px-4 text-right font-semibold text-gray-800">
                            {groupTotal.toLocaleString()}
                          </td>
                        </tr>
                        
                        {/* Group Items */}
                        {group.isExpanded && group.items.map((item) => (
                          <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-2 px-8 text-gray-700 flex items-center justify-between">
                              <div className="flex flex-col">
                                <span>{item.particular}</span>
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
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAddModal(cashFlowData[0].id, group.id);
                                    }}
                                    className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                    title="Add new item"
                                  >
                                    <RiAddLine size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDeleteModal(cashFlowData[0].id, group.id, item.id);
                                    }}
                                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                    title="Delete item"
                                  >
                                    <RiDeleteBin6Line size={12} />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-4 text-right text-gray-700">{(item.amount || 0).toLocaleString()}</td>
                          </tr>
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
                      {totalOutflow.toLocaleString()}
                    </td>
                  </tr>
                  
                  {/* Outflow Groups */}
                  {cashFlowData[1]?.groups?.map((group) => {
                    const groupTotal = group?.items?.reduce((sum, item) => sum + (item?.amount || 0), 0) || 0;
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
                                     openAddModal(cashFlowData[1].id, group.id);
                                   }}
                                   className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                   title="Add new item"
                                 >
                                   <RiAddLine size={14} />
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openDeleteModal(cashFlowData[1].id, group.id);
                                   }}
                                   className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                   title="Delete group"
                                 >
                                   <RiDeleteBin6Line size={14} />
                                 </button>
          </div>
                             )}
                           </td>
                                                     <td className="py-2 px-4 text-right font-semibold text-gray-800">
                             {groupTotal.toLocaleString()}
                           </td>
                         </tr>
                         
                         {/* Group Items */}
                         {group.isExpanded && group.items.map((item) => (
                           <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                             <td className="py-2 px-8 text-gray-700 flex items-center justify-between">
                               <div className="flex flex-col">
                                 <span>{item.particular}</span>
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
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       openAddModal(cashFlowData[1].id, group.id);
                                     }}
                                     className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                     title="Add new item"
                                   >
                                     <RiAddLine size={12} />
                                   </button>
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       openDeleteModal(cashFlowData[1].id, group.id, item.id);
                                     }}
                                     className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                     title="Delete item"
                                   >
                                     <RiDeleteBin6Line size={12} />
                                   </button>
                                 </div>
                               )}
                                                         </td>
                            <td className="py-2 px-4 text-right text-gray-700">{(item.amount || 0).toLocaleString()}</td>
                          </tr>
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
                       {(netFlow || 0).toLocaleString()}
                     </td>
                   </tr>
                </tbody>
              </table>
          </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-blue-700 font-semibold mb-2">Total Inflow</h3>
                                    <p className="text-2xl font-bold text-blue-800">₹{(totalInflow || 0).toLocaleString()}</p>
          </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h3 className="text-red-700 font-semibold mb-2">Total Outflow</h3>
                                    <p className="text-2xl font-bold text-red-800">₹{(totalOutflow || 0).toLocaleString()}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="text-green-700 font-semibold mb-2">Net Cash Flow</h3>
                <p className={`text-2xl font-bold ${netFlow >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  ₹{(netFlow || 0).toLocaleString()}
                </p>
              </div>
          </div>
        </div>
        </div>
      </div>

               {/* Add Item Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Add New Item</h3>
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
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Enter item name"
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
                  Add Item
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
                   <h3 className="text-lg font-semibold text-gray-800">Add New Item</h3>
                   <button
                     onClick={closeGroupOptionModal}
                     className="text-gray-400 hover:text-gray-600 transition-colors"
                   >
                     <RiCloseLine size={20} />
                   </button>
                 </div>
                 
                 <div className="space-y-4">
                   <p className="text-gray-600 mb-4">How would you like to add this item?</p>
                   
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
                           <h4 className="font-semibold text-gray-800">Add by Name</h4>
                           <p className="text-sm text-gray-600">Create an item with a custom name</p>
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
                           <p className="text-sm text-gray-600">Create an item using predefined tags</p>
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
               <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold text-gray-800">Select a Tag</h3>
                   <button
                     onClick={closeTagsModal}
                     className="text-gray-400 hover:text-gray-600 transition-colors"
                   >
                     <RiCloseLine size={20} />
                   </button>
          </div>

                 <div className="space-y-4">
                   <p className="text-gray-600 mb-4">Choose a tag to create a new item:</p>
                   
                   {/* Selected Tag Display */}
                   {modalSelectedTag && (
                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                       <div className="flex items-center gap-3">
                         <div 
                           className="w-6 h-6 rounded-full"
                           style={{ backgroundColor: modalSelectedTag.color || '#3B82F6' }}
                    />
                    <div>
                           <h4 className="font-semibold text-blue-800">Selected Tag: {modalSelectedTag.name}</h4>
                           <p className="text-sm text-blue-600">Click "Add Tag" to add this tag to your cashflow statement</p>
                    </div>
                  </div>
                  </div>
                   )}
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                     {allTags.map((tag) => (
                       <button
                         key={tag.id}
                         onClick={() => handleTagSelect(tag)}
                         className={`p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left ${
                           modalSelectedTag?.id === tag.id 
                             ? 'border-blue-500 bg-blue-50' 
                             : 'border-gray-200'
                         }`}
                       >
                         <div className="flex items-center gap-2">
                           <div 
                             className="w-4 h-4 rounded-full"
                             style={{ backgroundColor: tag.color || '#3B82F6' }}
                           />
                           <span className="font-medium text-gray-800">{tag.name}</span>
                </div>
                       </button>
              ))}
            </div>
                   
                   {allTags.length === 0 && (
                     <div className="text-center py-8 text-gray-500">
                       <p>No tags found. Create some tags in the Super Bank first.</p>
        </div>
      )}
                 </div>
                 
                 <div className="flex gap-3 mt-6">
                   <button
                     onClick={closeTagsModal}
                     className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                   >
                     Cancel
                   </button>
                   {modalSelectedTag && (
                     <button
                       onClick={handleAddSelectedTag}
                       disabled={isAddingTag}
                       className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                     >
                       {isAddingTag ? 'Adding...' : 'Add Tag'}
                     </button>
                   )}
                 </div>
          </div>
        </div>
      )}
    </div>
  );
} 