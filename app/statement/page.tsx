'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import TransactionTable from '../components/TransactionTable';
import { Transaction } from '../types/transaction';

export default function StatementPage() {
  const searchParams = useSearchParams();
  const bankId = searchParams.get('bankId');
  
  const [bankName, setBankName] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ 
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
    to: new Date().toISOString().split('T')[0] // Today
  });
  const [transactionHeaders, setTransactionHeaders] = useState<string[]>([]);

  // Fetch bank name
  useEffect(() => {
    if (bankId) {
      fetch(`/api/bank`).then(res => res.json()).then((banks) => {
        const bank = Array.isArray(banks) ? banks.find((b) => b.id === bankId) : null;
        setBankName(bank?.bankName || "");
      });
    }
  }, [bankId]);

  // Fetch transactions for the bank within date range
  useEffect(() => {
    if (bankId && bankName && dateRange.from && dateRange.to) {
      setLoading(true);
      setError(null);
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
          let allTransactions = allTransactionsArrays.flat();
          
          // Filter transactions by date range
          allTransactions = allTransactions.filter(tx => {
            const dateField = getDateField(tx);
            if (!dateField) return false;
            
            const txDate = parseDate(dateField);
            const fromDate = parseDate(dateRange.from);
            const toDate = parseDate(dateRange.to);
            
            return txDate >= fromDate && txDate <= toDate;
          });
          
          setTransactions(allTransactions);
        })
        .catch(() => setError('Failed to fetch transactions'))
        .finally(() => setLoading(false));
    }
  }, [bankId, bankName, dateRange]);

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

  // Generate heatmap data
  const heatmapData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];
    
    const fromDate = parseDate(dateRange.from);
    const toDate = parseDate(dateRange.to);
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Group transactions by date
    const transactionsByDate: { [key: string]: Transaction[] } = {};
    transactions.forEach(tx => {
      const dateField = getDateField(tx);
      if (dateField) {
        const date = parseDate(dateField);
        const dateKey = date.toISOString().split('T')[0];
        if (!transactionsByDate[dateKey]) {
          transactionsByDate[dateKey] = [];
        }
        transactionsByDate[dateKey].push(tx);
      }
    });
    
    // Generate heatmap data
    const heatmap = [];
    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(fromDate);
      currentDate.setDate(fromDate.getDate() + i);
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayTransactions = transactionsByDate[dateKey] || [];
      
      heatmap.push({
        date: dateKey,
        count: dayTransactions.length,
        transactions: dayTransactions
      });
    }
    
    return heatmap;
  }, [transactions, dateRange]);

  // Calculate transaction statistics
  const stats = useMemo(() => {
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, tx) => {
      const amountKey = Object.keys(tx).find(k => k.toLowerCase().includes('amount'));
      if (amountKey) {
        const val = tx[amountKey];
        let num = 0;
        if (typeof val === 'string') num = parseFloat(val.replace(/,/g, '')) || 0;
        else if (typeof val === 'number') num = val;
        return sum + num;
      }
      return sum;
    }, 0);
    
    const uniqueDates = new Set(transactions.map(tx => {
      const dateField = getDateField(tx);
      return dateField ? parseDate(dateField).toISOString().split('T')[0] : null;
    }).filter(Boolean));
    
    return {
      totalTransactions,
      totalAmount: totalAmount.toLocaleString(),
      uniqueDates: uniqueDates.size,
      dateRange: `${dateRange.from} to ${dateRange.to}`
    };
  }, [transactions, dateRange]);

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
        <span className="font-semibold text-blue-700">Statements</span>
      </nav>
      
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {bankName} - Statement Analysis
            </h1>
          </div>
        </div>
        
        {/* Date Range Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Date Range</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalTransactions}</div>
            <div className="text-sm text-gray-600">Total Transactions</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">₹{stats.totalAmount}</div>
            <div className="text-sm text-gray-600">Total Amount</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.uniqueDates}</div>
            <div className="text-sm text-gray-600">Active Days</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-900">{stats.dateRange}</div>
            <div className="text-sm text-gray-600">Date Range</div>
          </div>
        </div>

        {/* Heatmap Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction Activity Heatmap</h2>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-xs text-gray-500 text-center py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {heatmapData.map((day, index) => {
                  const date = new Date(day.date);
                  const dayOfWeek = date.getDay();
                  const isFirstWeek = index < 7;
                  const isFirstDayOfWeek = dayOfWeek === 0;
                  
                  // Calculate color intensity based on transaction count
                  let bgColor = 'bg-red-100'; // Light red for no transactions
                  if (day.count > 0) {
                    if (day.count <= 2) bgColor = 'bg-green-200';
                    else if (day.count <= 5) bgColor = 'bg-green-400';
                    else if (day.count <= 10) bgColor = 'bg-green-600';
                    else bgColor = 'bg-green-800';
                  }
                  
                  return (
                    <div
                      key={day.date}
                      className={`w-8 h-8 ${bgColor} rounded-sm border border-gray-200 relative group cursor-pointer`}
                      title={`${day.date}: ${day.count} transactions`}
                    >
                      {day.count > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {day.count > 9 ? '9+' : day.count}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                <span>Less</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-100 border border-gray-200 rounded-sm"></div>
                  <div className="w-3 h-3 bg-green-200 border border-gray-200 rounded-sm"></div>
                  <div className="w-3 h-3 bg-green-400 border border-gray-200 rounded-sm"></div>
                  <div className="w-3 h-3 bg-green-600 border border-gray-200 rounded-sm"></div>
                  <div className="w-3 h-3 bg-green-800 border border-gray-200 rounded-sm"></div>
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Transactions</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">No transactions found</p>
              <p className="text-sm text-gray-500">No transactions found for the selected date range.</p>
            </div>
          ) : (
            <TransactionTable
              rows={transactions.map(tx => {
                const filtered = Object.fromEntries(Object.entries(tx).filter(([key]) => key !== 'transactionData'));
                return {
                  ...filtered,
                  tags: tx.tags || []
                };
              })}
              headers={transactionHeaders}
              selectedRows={new Set()}
              onRowSelect={() => {}}
              onSelectAll={() => {}}
              selectAll={false}
              loading={false}
              error={null}
              onReorderHeaders={() => {}}
              onRemoveTag={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
}
