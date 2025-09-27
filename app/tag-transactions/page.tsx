'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatDateForCSV } from '../utils/dateUtils';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface Transaction {
  id: string;
  bankId: string;
  accountId: string;
  accountName?: string;
  accountNumber?: string;
  AmountRaw?: number;
  'Dr./Cr.'?: string;
  Date?: string;
  Description?: string;
  'Reference No.'?: string;
  tags?: Tag[];
  [key: string]: string | number | Tag[] | undefined;
}

export default function TagTransactionsPage() {
  const searchParams = useSearchParams();
  const tagName = searchParams.get('tag');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bankIdNameMap, setBankIdNameMap] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!tagName) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setError('User not authenticated');
          return;
        }

        // Fetch all transactions
        const transactionsRes = await fetch(`/api/transactions/all?userId=${userId}`);
        const transactionsData = await transactionsRes.json();
        
        if (!Array.isArray(transactionsData)) {
          setError('Failed to fetch transactions');
          return;
        }

        // Filter transactions for the specific tag
        const tagTransactions = transactionsData.filter((tx: Transaction) => {
          const tags = Array.isArray(tx.tags) ? tx.tags : [];
          return tags.some(tag => tag.name === tagName);
        });

        setTransactions(tagTransactions);

        // Fetch bank names
        if (!userId) {
          console.error('User ID not found');
          return;
        }
        
        const banksRes = await fetch(`/api/bank?userId=${userId}`);
        const banksData = await banksRes.json();
        
        if (Array.isArray(banksData)) {
          const bankMap: { [id: string]: string } = {};
          banksData.forEach((bank: { id: string; bankName: string }) => {
            bankMap[bank.id] = bank.bankName;
          });
          setBankIdNameMap(bankMap);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tagName]);

  if (!tagName) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Tag Specified</h1>
          <p className="text-gray-600">Please provide a tag name in the URL.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transactions for tag &quot;{tagName}&quot;...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-4">Error</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Group transactions by bank and account
  const groupedTransactions: { [bankId: string]: { [accountId: string]: Transaction[] } } = {};
  transactions.forEach(tx => {
    const bankId = tx.bankId;
    const accountId = tx.accountId;
    if (!groupedTransactions[bankId]) groupedTransactions[bankId] = {};
    if (!groupedTransactions[bankId][accountId]) groupedTransactions[bankId][accountId] = [];
    groupedTransactions[bankId][accountId].push(tx);
  });

  // Calculate summary statistics
  let totalCredit = 0, totalDebit = 0;
  transactions.forEach(tx => {
    const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
    const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
    if (crdr === 'CR') totalCredit += Math.abs(amount);
    else if (crdr === 'DR') totalDebit += Math.abs(amount);
  });
  const balance = totalCredit - totalDebit;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
                              <h1 className="text-2xl font-bold text-gray-900">
                Transactions for Tag: <span className="text-blue-600">&quot;{tagName}&quot;</span>
              </h1>
            </div>
            <div className="flex gap-2">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all text-sm flex items-center gap-2"
                onClick={() => {
                  // Download CSV functionality
                  const csvData = [
                    ['Tag Transactions Report'],
                    ['Tag', tagName],
                    ['Total Transactions', transactions.length],
                    ['Total Credit', totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })],
                    ['Total Debit', totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })],
                    ['Balance', balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })],
                    [],
                    ['Date', 'Description', 'Reference', 'Account Name', 'Account No.', 'Amount', 'Type', 'Bank']
                  ];

                  transactions.forEach(tx => {
                    const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
                    const description = (tx.Description || tx['Transaction Description'] || tx['Narration'] || 'N/A') as string;
                    const reference = (tx['Reference No.'] || tx['Reference'] || tx['Cheque No.'] || 'N/A') as string;
                    const date = formatDateForCSV(String(tx.Date || tx['Transaction Date'] || 'N/A'));
                    const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
                    const accountName = (tx.accountName || tx.accountHolderName || 'N/A') as string;
                    const accountNumber = (tx.accountNumber || 'N/A') as string;
                    const bankName = bankIdNameMap[tx.bankId] || tx.bankId;

                    csvData.push([
                      date,
                      description,
                      reference,
                      accountName,
                      accountNumber,
                      amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                      crdr,
                      bankName
                    ]);
                  });

                  const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `tag-transactions-${tagName}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary for Tag: &quot;{tagName}&quot;</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Total Transactions</div>
              <div className="text-2xl font-bold text-blue-700">{transactions.length}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Total Credit</div>
              <div className="text-2xl font-bold text-green-700">
                ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Total Debit</div>
              <div className="text-2xl font-bold text-red-700">
                ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Balance</div>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Transactions by Bank and Account */}
        {Object.entries(groupedTransactions).map(([bankId, accounts]) => (
          <div key={bankId} className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                {bankIdNameMap[bankId] || bankId}
              </h3>
            </div>
            {Object.entries(accounts).map(([accountId, accountTransactions]) => (
              <div key={accountId} className="border-b last:border-b-0">
                <div className="px-6 py-3 bg-blue-50">
                  <h4 className="text-sm font-medium text-blue-800">
                    Account: {accountId}
                  </h4>
                  <p className="text-xs text-blue-600">
                    {accountTransactions.length} transactions
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account No.</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {accountTransactions.map((tx, idx) => {
                        const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
                        const tags = Array.isArray(tx.tags) ? tx.tags : [];
                        const description = (tx.Description || tx['Transaction Description'] || tx['Narration'] || 'N/A') as string;
                        const reference = (tx['Reference No.'] || tx['Reference'] || tx['Cheque No.'] || 'N/A') as string;
                        const date = (tx.Date || tx['Transaction Date'] || 'N/A') as string;
                        const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
                        const accountName = (tx.accountName || tx.accountHolderName || 'N/A') as string;
                        const accountNumber = (tx.accountNumber || 'N/A') as string;

                        // Determine row background color based on Dr./Cr. field
                        const rowBackgroundClass = crdr === 'CR' 
                          ? 'bg-green-200 hover:bg-green-300' 
                          : crdr === 'DR' 
                          ? 'bg-red-200 hover:bg-red-300' 
                          : 'hover:bg-gray-50';

                        return (
                          <tr key={idx} className={`${rowBackgroundClass} transition-colors duration-150`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{date}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reference}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{accountName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{accountNumber}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                              crdr === 'CR' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{crdr}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {tags.map(tag => (
                                <span 
                                  key={tag.id} 
                                  className="inline-block px-2 py-1 text-xs rounded-full mr-1 mb-1 text-gray-900 dark:text-gray-100"
                                  style={{
                                    backgroundColor: `${tag.color || '#6366F1'}15`,
                                    border: `1px solid ${tag.color || '#6366F1'}`
                                  }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))}

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No transactions found for tag &quot;{tagName}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
} 