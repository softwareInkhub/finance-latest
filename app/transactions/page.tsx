'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RiAddLine } from 'react-icons/ri';
import EnhancedTransactionTable from '../components/EnhancedTransactionTable';
import SummaryCards from '../components/SummaryCards';
import DarkModeToggle from '../components/DarkModeToggle';
import { Transaction, TransactionRow } from '../types/transaction';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionRows, setTransactionRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Summary data
  const [summaryData, setSummaryData] = useState({
    totalTransactions: 0,
    totalCredit: 0,
    totalDebit: 0,
    balance: 0,
    totalBanks: 0,
    totalTags: 0,
  });

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      const response = await fetch(`/api/transactions/paginated?userId=${userId}&page=${currentPage}&limit=50`);
      const data = await response.json();

      if (response.ok) {
        const newTransactions = data.transactions || [];
        const newRows = newTransactions.map((tx: Transaction) => ({
          id: tx.id,
          Date: tx.Date || tx['Transaction Date'] || '',
          Description: tx.Description || tx['Transaction Description'] || tx.Narration || '',
          'Reference No.': tx['Reference No.'] || tx.Reference || tx['Cheque No.'] || '',
          'Account Name': tx.accountName || tx.accountHolderName || '',
          'Account No.': tx.accountNumber || '',
          Amount: tx.AmountRaw || 0,
          'Dr./Cr.': tx['Dr./Cr.'] || '',
          'Bank Name': tx.bankName || '',
          Tags: tx.tags || [],
        }));

        if (currentPage === 1) {
          setTransactions(newTransactions);
          setTransactionRows(newRows);
        } else {
          setTransactions(prev => [...prev, ...newTransactions]);
          setTransactionRows(prev => [...prev, ...newRows]);
        }

        setHasMore(data.pagination?.hasMore || false);
        calculateSummaryData([...transactions, ...newTransactions]);
      } else {
        setError(data.error || 'Failed to fetch transactions');
      }
    } catch (err) {
      setError('Failed to fetch transactions');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, transactions]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const calculateSummaryData = (txs: Transaction[]) => {
    let totalCredit = 0;
    let totalDebit = 0;
    const banks = new Set<string>();
    const tags = new Set<string>();

    txs.forEach(tx => {
      const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
      const drCr = (tx['Dr./Cr.'] || '').toString().toUpperCase();
      
      if (drCr === 'CR') {
        totalCredit += Math.abs(amount);
      } else if (drCr === 'DR') {
        totalDebit += Math.abs(amount);
      }

      if (tx.bankName) banks.add(String(tx.bankName));
      if (tx.tags) {
        tx.tags.forEach(tag => tags.add(tag.name));
      }
    });

    setSummaryData({
      totalTransactions: txs.length,
      totalCredit,
      totalDebit,
      balance: totalCredit - totalDebit,
      totalBanks: banks.size,
      totalTags: tags.size,
    });
  };

  const handleRowSelect = (idx: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedRows(newSelected);
    setSelectAll(newSelected.size === transactionRows.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
      setSelectAll(false);
    } else {
      const allIndices = new Set(transactionRows.map((_, idx) => idx));
      setSelectedRows(allIndices);
      setSelectAll(true);
    }
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
    
    const sortedRows = [...transactionRows].sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];
      
      if (column.toLowerCase().includes('amount')) {
        const aNum = typeof aVal === 'number' ? aVal : parseFloat(String(aVal || 0));
        const bNum = typeof bVal === 'number' ? bVal : parseFloat(String(bVal || 0));
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      if (column.toLowerCase().includes('date')) {
        const toTime = (v: unknown): number => {
          if (typeof v === 'string' || typeof v === 'number') {
            const d = new Date(v);
            return isNaN(d.getTime()) ? 0 : d.getTime();
          }
          return 0;
        };
        const aDate = toTime(aVal);
        const bDate = toTime(bVal);
        return direction === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();
      return direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    
    setTransactionRows(sortedRows);
  };

  const handleRemoveTag = (rowIdx: number, tagId: string) => {
    // Implementation for removing tags
    console.log('Remove tag:', rowIdx, tagId);
  };

  const handleAddTag = (rowIdx: number, tagName: string) => {
    // Implementation for adding tags
    console.log('Add tag:', rowIdx, tagName);
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    // Implementation for export functionality
    console.log('Export as:', format);
  };

  const handleCardClick = (cardType: string) => {
    // Handle summary card clicks
    console.log('Card clicked:', cardType);
  };

  const filteredRows = transactionRows.filter(row => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      String(row.Description || '').toLowerCase().includes(searchLower) ||
      String(row['Bank Name'] || '').toLowerCase().includes(searchLower) ||
      String(row['Account Name'] || '').toLowerCase().includes(searchLower) ||
      String(row['Reference No.'] || '').toLowerCase().includes(searchLower) ||
      String(row['Dr./Cr.'] || '').toLowerCase().includes(searchLower)
    );
  });

  const headers = [
    'Date',
    'Description', 
    'Reference No.',
    'Account Name',
    'Account No.',
    'Amount',
    'Dr./Cr.',
    'Bank Name',
    'Tags'
  ];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage and analyze your financial transactions
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <DarkModeToggle />
              <button className="btn-primary flex items-center space-x-2">
                <RiAddLine size={16} />
                <span>Add Transaction</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <SummaryCards data={summaryData} onCardClick={handleCardClick} />

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <EnhancedTransactionTable
            rows={filteredRows}
            headers={headers}
            selectedRows={selectedRows}
            selectAll={selectAll}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            loading={loading}
            error={error}
            onRemoveTag={handleRemoveTag}
            onAddTag={handleAddTag}
            onSort={handleSort}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onExport={handleExport}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Load More Button */}
        {hasMore && !loading && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="btn-outline flex items-center space-x-2 mx-auto"
            >
              <span>Load More Transactions</span>
            </button>
          </div>
        )}

        {/* Selected Actions */}
        {selectedRows.size > 0 && (
          <div className="fixed bottom-6 right-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedRows.size} transaction{selectedRows.size !== 1 ? 's' : ''} selected
              </span>
              <button className="btn-primary text-sm">
                Export Selected
              </button>
              <button className="btn-outline text-sm">
                Tag Selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

