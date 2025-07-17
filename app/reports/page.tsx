'use client';

import { useState, useEffect } from 'react';
import { RiFileChartLine, RiDownloadLine, RiCalendarLine, RiBankLine, RiPriceTag3Line, RiBarChartLine } from 'react-icons/ri';
import { Transaction, Tag } from '../types/transaction';

interface Bank {
  id: string;
  bankName: string;
}

// interface Account {
//   id: string;
//   accountHolderName: string;
//   bankId: string;
// }

interface ReportFilters {
  dateRange: { from: string; to: string };
  banks: string[];
  accounts: string[];
  tags: string[];
  includeUntagged: boolean;
}

interface ReportData {
  totalTransactions: number;
  totalAmount: number;
  totalCredit: number;
  totalDebit: number;
  taggedTransactions: number;
  untaggedTransactions: number;
  bankBreakdown: { [bankId: string]: { name: string; count: number; amount: number; credit: number; debit: number } };
  tagBreakdown: { [tagId: string]: { name: string; count: number; amount: number; color: string } };
  monthlyBreakdown: { [month: string]: { count: number; amount: number; credit: number; debit: number } };
}

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  // const [accounts, setAccounts] = useState<Account[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: { from: '', to: '' },
    banks: [],
    accounts: [],
    tags: [],
    includeUntagged: true
  });
  const [generatingReport, setGeneratingReport] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setError('User not authenticated');
          return;
        }

        // Fetch all data in parallel
        const [transactionsRes, banksRes, tagsRes] = await Promise.all([
          fetch(`/api/transactions/all?userId=${userId}`),
          fetch('/api/bank'),
          fetch(`/api/tags?userId=${userId}`)
        ]);

        const [transactionsData, banksData, tagsData] = await Promise.all([
          transactionsRes.json(),
          banksRes.json(),
          tagsRes.json()
        ]);

        if (Array.isArray(transactionsData)) setTransactions(transactionsData);
        if (Array.isArray(banksData)) setBanks(banksData);
        // Removed setAccounts(accountsData) since setAccounts is not defined or used
        if (Array.isArray(tagsData)) setTags(tagsData);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate report data when filters or transactions change
  useEffect(() => {
    if (transactions.length === 0) return;

    const generateReportData = (): ReportData => {
      // Apply filters
      const filteredTransactions = transactions.filter(tx => {
        // Date range filter
        if (filters.dateRange.from || filters.dateRange.to) {
          const txDate = getTransactionDate(tx);
          if (filters.dateRange.from && txDate < filters.dateRange.from) return false;
          if (filters.dateRange.to && txDate > filters.dateRange.to) return false;
        }

        // Bank filter
        if (filters.banks.length > 0 && !filters.banks.includes(tx.bankId)) return false;

        // Account filter
        if (filters.accounts.length > 0 && !filters.accounts.includes(tx.accountId)) return false;

        // Tag filter
        if (filters.tags.length > 0) {
          const txTags = Array.isArray(tx.tags) ? tx.tags : [];
          const hasMatchingTag = txTags.some(tag => 
            typeof tag === 'string' ? filters.tags.includes(tag) : filters.tags.includes(tag.id)
          );
          if (!hasMatchingTag) return false;
        }

        // Untagged filter
        if (!filters.includeUntagged) {
          const txTags = Array.isArray(tx.tags) ? tx.tags : [];
          if (txTags.length === 0) return false;
        }

        return true;
      });

      // Calculate totals
      const totalTransactions = filteredTransactions.length;
      const totalAmount = filteredTransactions.reduce((sum, tx) => {
        const amount = getTransactionAmount(tx);
        return sum + amount;
      }, 0);

      const totalCredit = filteredTransactions.reduce((sum, tx) => {
        const amount = getTransactionAmount(tx);
        const isCredit = isTransactionCredit(tx);
        return sum + (isCredit ? Math.abs(amount) : 0);
      }, 0);

      const totalDebit = filteredTransactions.reduce((sum, tx) => {
        const amount = getTransactionAmount(tx);
        const isCredit = isTransactionCredit(tx);
        return sum + (isCredit ? 0 : Math.abs(amount));
      }, 0);

      const taggedTransactions = filteredTransactions.filter(tx => {
        const txTags = Array.isArray(tx.tags) ? tx.tags : [];
        return txTags.length > 0;
      }).length;

      const untaggedTransactions = totalTransactions - taggedTransactions;

      // Bank breakdown
      const bankBreakdown: { [bankId: string]: { name: string; count: number; amount: number; credit: number; debit: number } } = {};
      filteredTransactions.forEach(tx => {
        const bank = banks.find(b => b.id === tx.bankId);
        const bankName = bank?.bankName || 'Unknown Bank';
        const amount = getTransactionAmount(tx);
        const isCredit = isTransactionCredit(tx);

        if (!bankBreakdown[tx.bankId]) {
          bankBreakdown[tx.bankId] = { name: bankName, count: 0, amount: 0, credit: 0, debit: 0 };
        }

        bankBreakdown[tx.bankId].count++;
        bankBreakdown[tx.bankId].amount += amount;
        if (isCredit) {
          bankBreakdown[tx.bankId].credit += Math.abs(amount);
        } else {
          bankBreakdown[tx.bankId].debit += Math.abs(amount);
        }
      });

      // Tag breakdown
      const tagBreakdown: { [tagId: string]: { name: string; count: number; amount: number; color: string } } = {};
      filteredTransactions.forEach(tx => {
        const txTags = Array.isArray(tx.tags) ? tx.tags : [];
        const amount = getTransactionAmount(tx);

        txTags.forEach(tag => {
          const tagId = typeof tag === 'string' ? tag : tag.id;
          const tagName = typeof tag === 'string' ? tag : tag.name;
          const tagColor = typeof tag === 'string' ? '#60a5fa' : (tag.color || '#60a5fa');

          if (!tagBreakdown[tagId]) {
            tagBreakdown[tagId] = { name: tagName, count: 0, amount: 0, color: tagColor };
          }

          tagBreakdown[tagId].count++;
          tagBreakdown[tagId].amount += amount;
        });
      });

      // Monthly breakdown
      const monthlyBreakdown: { [month: string]: { count: number; amount: number; credit: number; debit: number } } = {};
      filteredTransactions.forEach(tx => {
        const txDate = getTransactionDate(tx);
        const month = txDate.substring(0, 7); // YYYY-MM format
        const amount = getTransactionAmount(tx);
        const isCredit = isTransactionCredit(tx);

        if (!monthlyBreakdown[month]) {
          monthlyBreakdown[month] = { count: 0, amount: 0, credit: 0, debit: 0 };
        }

        monthlyBreakdown[month].count++;
        monthlyBreakdown[month].amount += amount;
        if (isCredit) {
          monthlyBreakdown[month].credit += Math.abs(amount);
        } else {
          monthlyBreakdown[month].debit += Math.abs(amount);
        }
      });

      return {
        totalTransactions,
        totalAmount,
        totalCredit,
        totalDebit,
        taggedTransactions,
        untaggedTransactions,
        bankBreakdown,
        tagBreakdown,
        monthlyBreakdown
      };
    };

    setReportData(generateReportData());
  }, [transactions, filters, banks]);

  // Helper functions
  const getTransactionDate = (tx: Transaction): string => {
    // Try to find a date field
    const dateFields = ['Date', 'Transaction Date', 'date', 'transactionDate'];
    for (const field of dateFields) {
      if (tx[field]) {
        const dateStr = String(tx[field]);
        // Convert dd/mm/yyyy to yyyy-mm-dd
        const match = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
        if (match) {
          const [, dd, mm, yyyy] = match;
          const year = yyyy.length === 2 ? '20' + yyyy : yyyy;
          return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
        return dateStr;
      }
    }
    return '1970-01-01'; // fallback
  };

  const getTransactionAmount = (tx: Transaction): number => {
    // Try to find amount fields
    const amountFields = ['Amount', 'amount', 'AmountRaw', 'Transaction Amount'];
    for (const field of amountFields) {
      if (tx[field] !== undefined) {
        const amount = Number(tx[field]);
        if (!isNaN(amount)) return amount;
      }
    }
    return 0;
  };

  const isTransactionCredit = (tx: Transaction): boolean => {
    // Try to find credit/debit indicators
    const crdrFields = ['Dr./Cr.', 'Type', 'Transaction Type', 'Credit/Debit'];
    for (const field of crdrFields) {
      if (tx[field]) {
        const value = String(tx[field]).trim().toUpperCase();
        return value === 'CR' || value === 'CREDIT' || value === 'C';
      }
    }
    return false; // default to debit
  };

  const handleFilterChange = (key: keyof ReportFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportReport = async () => {
    if (!reportData) return;
    
    setGeneratingReport(true);
    try {
      // Create CSV content
      const csvContent = generateCSVReport();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const generateCSVReport = (): string => {
    if (!reportData) return '';
    
    const lines = [
      'Financial Report',
      `Generated on: ${new Date().toLocaleDateString()}`,
      '',
      'Summary',
      `Total Transactions,${reportData.totalTransactions}`,
      `Total Amount,${reportData.totalAmount.toFixed(2)}`,
      `Total Credit,${reportData.totalCredit.toFixed(2)}`,
      `Total Debit,${reportData.totalDebit.toFixed(2)}`,
      `Tagged Transactions,${reportData.taggedTransactions}`,
      `Untagged Transactions,${reportData.untaggedTransactions}`,
      '',
      'Bank Breakdown',
      'Bank,Transactions,Amount,Credit,Debit'
    ];

    Object.values(reportData.bankBreakdown).forEach(bank => {
      lines.push(`${bank.name},${bank.count},${bank.amount.toFixed(2)},${bank.credit.toFixed(2)},${bank.debit.toFixed(2)}`);
    });

    lines.push('', 'Tag Breakdown', 'Tag,Transactions,Amount');
    Object.values(reportData.tagBreakdown).forEach(tag => {
      lines.push(`${tag.name},${tag.count},${tag.amount.toFixed(2)}`);
    });

    lines.push('', 'Monthly Breakdown', 'Month,Transactions,Amount,Credit,Debit');
    Object.entries(reportData.monthlyBreakdown)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, data]) => {
        lines.push(`${month},${data.count},${data.amount.toFixed(2)},${data.credit.toFixed(2)},${data.debit.toFixed(2)}`);
      });

    return lines.join('\n');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <p className="font-medium">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-full text-blue-600 text-2xl shadow">
            <RiFileChartLine />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Financial Reports
            </h1>
            <p className="text-gray-600">Generate comprehensive financial reports and analytics</p>
          </div>
        </div>
        <button
          onClick={handleExportReport}
          disabled={!reportData || generatingReport}
          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg shadow hover:scale-105 hover:shadow-lg transition-all font-semibold disabled:opacity-50"
        >
          <RiDownloadLine />
          {generatingReport ? 'Generating...' : 'Export Report'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-lg p-6 rounded-xl shadow-lg border border-blue-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <RiBarChartLine className="text-blue-500" />
          Report Filters
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.dateRange.from}
                onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, from: e.target.value })}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={filters.dateRange.to}
                onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, to: e.target.value })}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Banks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Banks</label>
            <select
              multiple
              value={filters.banks}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                handleFilterChange('banks', selected);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {banks.map(bank => (
                <option key={bank.id} value={bank.id}>{bank.bankName}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <select
              multiple
              value={filters.tags}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                handleFilterChange('tags', selected);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {tags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>

          {/* Include Untagged */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeUntagged"
              checked={filters.includeUntagged}
              onChange={(e) => handleFilterChange('includeUntagged', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="includeUntagged" className="ml-2 text-sm text-gray-700">
              Include untagged transactions
            </label>
          </div>
        </div>
      </div>

      {/* Report Summary */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/70 backdrop-blur-lg p-6 rounded-xl shadow-lg border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                <RiBarChartLine />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-600">{reportData.totalTransactions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-lg p-6 rounded-xl shadow-lg border border-green-100">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full text-green-600">
                <RiBankLine />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{reportData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-lg p-6 rounded-xl shadow-lg border border-cyan-100">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-100 p-2 rounded-full text-cyan-600">
                <RiPriceTag3Line />
              </div>
              <div>
                <p className="text-sm text-gray-600">Credit</p>
                <p className="text-2xl font-bold text-cyan-600">
                  ₹{reportData.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-lg p-6 rounded-xl shadow-lg border border-red-100">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full text-red-600">
                <RiCalendarLine />
              </div>
              <div>
                <p className="text-sm text-gray-600">Debit</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{reportData.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Breakdowns */}
      {reportData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bank Breakdown */}
          <div className="bg-white/70 backdrop-blur-lg p-6 rounded-xl shadow-lg border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <RiBankLine className="text-blue-500" />
              Bank Breakdown
            </h3>
            <div className="space-y-3">
              {Object.values(reportData.bankBreakdown).map((bank, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{bank.name}</p>
                    <p className="text-sm text-gray-600">{bank.count} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">
                      ₹{bank.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-600">
                      CR: ₹{bank.credit.toFixed(2)} | DR: ₹{bank.debit.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tag Breakdown */}
          <div className="bg-white/70 backdrop-blur-lg p-6 rounded-xl shadow-lg border border-purple-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <RiPriceTag3Line className="text-purple-500" />
              Tag Breakdown
            </h3>
            <div className="space-y-3">
              {Object.values(reportData.tagBreakdown).map((tag, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: tag.color }}
                    />
                    <div>
                      <p className="font-medium text-gray-800">{tag.name}</p>
                      <p className="text-sm text-gray-600">{tag.count} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">
                      ₹{tag.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Breakdown */}
      {reportData && Object.keys(reportData.monthlyBreakdown).length > 0 && (
        <div className="bg-white/70 backdrop-blur-lg p-6 rounded-xl shadow-lg border border-green-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <RiCalendarLine className="text-green-500" />
            Monthly Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Month</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Transactions</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Amount</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Credit</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Debit</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportData.monthlyBreakdown)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([month, data], index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-800">{month}</td>
                      <td className="py-2 px-3 text-right text-gray-800">{data.count}</td>
                      <td className="py-2 px-3 text-right font-medium text-gray-800">
                        ₹{data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right text-green-600">
                        ₹{data.credit.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-red-600">
                        ₹{data.debit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 