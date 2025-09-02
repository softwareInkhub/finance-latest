"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { RiEdit2Line } from 'react-icons/ri';

import type { JSX } from 'react';
import React from 'react';

import AnalyticsSummary from '../components/AnalyticsSummary';
import TransactionFilterBar from '../components/TransactionFilterBar';
import TagFilterPills from '../components/TagFilterPills';

import TransactionTable from '../components/TransactionTable';
import { Transaction, TransactionRow, Tag } from '../types/transaction';
import Modal from '../components/Modals/Modal';
import { convertToISOFormat, parseDate, formatDateForCSV } from '../utils/dateUtils';


// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CompactAnalytics({ 
  transactions, 
  totalAmount, 
  totalCredit, 
  totalDebit, 
  selectedTagData,
  onClearSelection
}: { 
  transactions: (Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string })[];
  totalAmount: number;
  totalCredit: number;
  totalDebit: number;
  selectedTagData?: {
    tagName: string;
    bankId: string;
    accountId: string;
    transactions: (Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string })[];
  };
  onClearSelection?: () => void;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = 3;

  const balance = totalCredit - totalDebit;

  // Memoized calculations for performance
  const analyticsData = useMemo(() => {
    const monthlyStats = transactions.reduce((acc, tx) => {
      const dateStr = String(tx.Date || tx.createdAt || '');
      const date = new Date(dateStr);
      const month = date.toLocaleString('default', { month: 'short' });
      if (!acc[month]) {
        acc[month] = { credit: 0, debit: 0, count: 0 };
      }
      const amount = parseFloat(String(tx.Amount || 0));
      if (tx['Dr./Cr.'] === 'Cr') {
        acc[month].credit += amount;
      } else {
        acc[month].debit += amount;
      }
      acc[month].count += 1;
      return acc;
    }, {} as { [key: string]: { credit: number; debit: number; count: number } });

    const topCategories = transactions.reduce((acc, tx) => {
      const description = String(tx.Description || '');
      const category = description.split(' ')[0] || 'Other';
      if (!acc[category]) {
        acc[category] = { amount: 0, count: 0 };
      }
      acc[category].amount += parseFloat(String(tx.Amount || 0));
      acc[category].count += 1;
      return acc;
    }, {} as { [key: string]: { amount: number; count: number } });

    const avgTransaction = totalAmount / transactions.length;
    const largestTransaction = Math.max(...transactions.map(tx => parseFloat(String(tx.Amount || 0))));
    const smallestTransaction = Math.min(...transactions.map(tx => parseFloat(String(tx.Amount || 0))));

    return {
      monthlyStats,
      topCategories: Object.entries(topCategories)
        .sort(([,a], [,b]) => (b as { amount: number }).amount - (a as { amount: number }).amount)
        .slice(0, 5),
      avgTransaction,
      largestTransaction,
      smallestTransaction
    };
  }, [transactions, totalAmount]);

  const renderPage1 = () => {
    if (selectedTagData) {
      // Show selected tag transactions
      const tagTransactions = selectedTagData.transactions;

      // Calculate summary stats for the selected tag
      const totalCredit = tagTransactions.reduce((sum, tx) => {
        const amount = parseFloat(String(tx.Amount || 0));
        const drCr = String(tx['Dr./Cr.'] || '').toUpperCase();
        return drCr === 'CR' ? sum + Math.abs(amount) : sum;
      }, 0);
      
      const totalDebit = tagTransactions.reduce((sum, tx) => {
        const amount = parseFloat(String(tx.Amount || 0));
        const drCr = String(tx['Dr./Cr.'] || '').toUpperCase();
        return drCr === 'DR' ? sum + Math.abs(amount) : sum;
      }, 0);
      
      const balance = totalCredit - totalDebit;

      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-700">
              📊 {selectedTagData.tagName} Transactions
              <div className="text-xs text-gray-500 font-normal">
                {selectedTagData.bankId} - {selectedTagData.accountId}
              </div>
            </div>
            <button
              onClick={onClearSelection}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
            >
              ✕ Clear
            </button>
          </div>
          
          {/* Summary Box */}
          <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
            <div className="text-xs font-semibold text-green-800 mb-1">
              Summary for Tag: {selectedTagData.tagName}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-green-600">Total Credit: ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className="text-red-600">Total Debit: ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className={`${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Balance: ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-blue-600">Total Transactions: {tagTransactions.length}</div>
            </div>
          </div>
          <div className="overflow-y-auto overflow-x-auto w-full max-w-full" style={{ maxHeight: '180px' }}>
            {tagTransactions.length > 0 ? (
              <table className="w-full text-xs min-w-0 compact-table">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr>
                    <th className="px-1 py-1 text-left text-xs">Date</th>
                    <th className="px-1 py-1 text-left text-xs">Description</th>
                    <th className="px-1 py-1 text-right text-xs">Amount</th>
                    <th className="px-1 py-1 text-center text-xs">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {tagTransactions.map((tx, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-1 py-1 truncate text-xs">
                        {String(tx.Date || tx.createdAt || 'N/A').substring(0, 10)}
                      </td>
                      <td className="px-1 py-1 truncate text-xs max-w-24">
                        {String(tx.Description || 'N/A').substring(0, 25)}
                      </td>
                      <td className={`px-1 py-1 text-right text-xs font-medium ${
                        parseFloat(String(tx.Amount || 0)) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₹{parseFloat(String(tx.Amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-1 py-1 text-center text-xs">
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          String(tx['Dr./Cr.'] || '').toUpperCase() === 'CR' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {String(tx['Dr./Cr.'] || 'DR')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <div className="text-lg mb-2">📊</div>
                  <div className="text-xs">No transactions found for this tag</div>
                  <div className="text-xs text-gray-400 mt-1">Try selecting a different tag</div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Show general analytics
    return (
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-700 mb-2">Monthly Overview</div>
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-xs min-w-0 compact-table">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-1 py-1 text-left w-1/3 text-xs">Month</th>
                <th className="px-1 py-1 text-right w-1/3 text-xs">Txns</th>
                <th className="px-1 py-1 text-right w-1/3 text-xs">Credit</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(analyticsData.monthlyStats)
                .sort(([a], [b]) => {
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  return months.indexOf(a) - months.indexOf(b);
                })
                .map(([month, stats]) => (
                <tr key={month} className="border-b border-gray-100">
                  <td className="px-1 py-1 truncate text-xs">{month}</td>
                  <td className="px-1 py-1 text-right text-xs">{(stats as { count: number }).count}</td>
                  <td className="px-1 py-1 text-right text-xs text-green-600">
                    ₹{(stats as { credit: number }).credit.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPage2 = () => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-gray-700 mb-2">Top Categories</div>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-1 text-left">Category</th>
              <th className="px-2 py-1 text-right">Txns</th>
              <th className="px-2 py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {analyticsData.topCategories.map(([category, stats]) => (
              <tr key={category} className="border-b border-gray-100">
                <td className="px-2 py-1 truncate max-w-20">{category}</td>
                <td className="px-2 py-1 text-right">{(stats as { count: number }).count}</td>
                <td className="px-2 py-1 text-right">
                  ₹{(stats as { amount: number }).amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPage3 = () => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-gray-700 mb-2">Transaction Stats</div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Average Transaction:</span>
          <span className="font-semibold">₹{analyticsData.avgTransaction.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Largest Transaction:</span>
          <span className="font-semibold text-green-600">₹{analyticsData.largestTransaction.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Smallest Transaction:</span>
          <span className="font-semibold text-red-600">₹{analyticsData.smallestTransaction.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Total Balance:</span>
          <span className={`font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Credit Ratio:</span>
          <span className="font-semibold">{((totalCredit / totalAmount) * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Debit Ratio:</span>
          <span className="font-semibold">{((totalDebit / totalAmount) * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );

  const getPageContent = () => {
    switch (currentPage) {
      case 0: return renderPage1();
      case 1: return renderPage2();
      case 2: return renderPage3();
      default: return renderPage1();
    }
  };

  return (
    <div className="w-full h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            ◀
          </button>
          <span className="text-xs text-gray-500">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage === totalPages - 1}
            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="overflow-y-auto overflow-x-auto" style={{ height: 'calc(100% - 60px)', maxHeight: '150px' }}>
        {getPageContent()}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CompactReports({ 
  transactions, 
  bankIdNameMap, 
  onTagClick
}: { 
  transactions: (Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string })[];
  bankIdNameMap: { [id: string]: string };
  onTagClick?: (tagName: string, bankId: string, accountId: string) => void;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = 3;

  // Calculate per-bank statistics
  const bankStats = useMemo(() => {
    const stats: { [bankId: string]: {
      bankName: string;
      totalTransactions: number;
      totalAmount: number;
      totalCredit: number;
      totalDebit: number;
      tagged: number;
      untagged: number;
    } } = {};

    transactions.forEach(tx => {
      const bankId = tx.bankId;
      if (!stats[bankId]) {
        stats[bankId] = {
          bankName: bankIdNameMap[bankId] || bankId,
          totalTransactions: 0,
          totalAmount: 0,
          totalCredit: 0,
          totalDebit: 0,
          tagged: 0,
          untagged: 0
        };
      }

      const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
      const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
      
      stats[bankId].totalTransactions++;
      stats[bankId].totalAmount += amount;
      
      if (crdr === 'CR') {
        stats[bankId].totalCredit += Math.abs(amount);
      } else if (crdr === 'DR') {
        stats[bankId].totalDebit += Math.abs(amount);
      }

      const tags = Array.isArray(tx.tags) ? tx.tags : [];
      if (tags.length > 0) {
        stats[bankId].tagged++;
      } else {
        stats[bankId].untagged++;
      }
    });

    return stats;
  }, [transactions, bankIdNameMap]);

  // Calculate per-bank per-account breakdown
  const accountBreakdown = useMemo(() => {
    const breakdown: { [bankId: string]: { [accountId: string]: {
      accountId: string;
      totalTransactions: number;
      totalAmount: number;
      totalCredit: number;
      totalDebit: number;
      tags: { [tagName: string]: number };
    } } } = {};

    transactions.forEach(tx => {
      const bankId = tx.bankId;
      const accountId = tx.accountId;
      
      if (!breakdown[bankId]) breakdown[bankId] = {};
      if (!breakdown[bankId][accountId]) {
        breakdown[bankId][accountId] = {
          accountId,
          totalTransactions: 0,
          totalAmount: 0,
          totalCredit: 0,
          totalDebit: 0,
          tags: {}
        };
      }

      const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
      const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
      
      breakdown[bankId][accountId].totalTransactions++;
      breakdown[bankId][accountId].totalAmount += amount;
      
      if (crdr === 'CR') {
        breakdown[bankId][accountId].totalCredit += Math.abs(amount);
      } else if (crdr === 'DR') {
        breakdown[bankId][accountId].totalDebit += Math.abs(amount);
      }

      // Count tags
      const tags = Array.isArray(tx.tags) ? tx.tags : [];
      tags.forEach((tag: Tag) => {
        if (tag && tag.name) {
          breakdown[bankId][accountId].tags[tag.name] = 
            (breakdown[bankId][accountId].tags[tag.name] || 0) + 1;
        }
      });
    });

    return breakdown;
  }, [transactions]);

  // Calculate tag statistics with bank and account breakdown
  const tagStatsWithBreakdown = useMemo(() => {
    const breakdown: { [bankId: string]: { [accountId: string]: { [tagName: string]: {
      totalTransactions: number;
      totalAmount: number;
      totalCredit: number;
      totalDebit: number;
    } } } } = {};

    transactions.forEach(tx => {
      const bankId = tx.bankId;
      const accountId = tx.accountId;
      const tags = Array.isArray(tx.tags) ? tx.tags : [];
      const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
      const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();

      if (!breakdown[bankId]) breakdown[bankId] = {};
      if (!breakdown[bankId][accountId]) breakdown[bankId][accountId] = {};

      tags.forEach((tag: Tag) => {
        if (tag && tag.name) {
          if (!breakdown[bankId][accountId][tag.name]) {
            breakdown[bankId][accountId][tag.name] = {
              totalTransactions: 0,
              totalAmount: 0,
              totalCredit: 0,
              totalDebit: 0
            };
          }

          breakdown[bankId][accountId][tag.name].totalTransactions++;
          breakdown[bankId][accountId][tag.name].totalAmount += amount;
          
          if (crdr === 'CR') {
            breakdown[bankId][accountId][tag.name].totalCredit += Math.abs(amount);
          } else if (crdr === 'DR') {
            breakdown[bankId][accountId][tag.name].totalDebit += Math.abs(amount);
          }
        }
      });
    });

    return breakdown;
  }, [transactions]);

  // Calculate overall tag statistics (for backward compatibility)
  // Note: tagStats was calculated but not used in the component

  const renderPage1 = () => (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-1 text-left font-medium text-gray-700">Bank</th>
            <th className="px-2 py-1 text-center font-medium text-gray-700">Txns</th>
            <th className="px-2 py-1 text-right font-medium text-gray-700">Amount</th>
            <th className="px-2 py-1 text-right font-medium text-gray-700">Cr</th>
            <th className="px-2 py-1 text-right font-medium text-gray-700">Dr</th>
            <th className="px-2 py-1 text-right font-medium text-gray-700">Balance</th>
            <th className="px-2 py-1 text-center font-medium text-gray-700">Tagged</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(bankStats).map(([bankId, stats]) => (
            <tr key={bankId} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-2 py-1 text-gray-900 font-medium truncate max-w-20">{stats.bankName}</td>
              <td className="px-2 py-1 text-center text-gray-600">{stats.totalTransactions}</td>
              <td className="px-2 py-1 text-right text-gray-600">
                ₹{stats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-1 text-right text-green-600 font-medium">
                ₹{stats.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-1 text-right text-red-600 font-medium">
                ₹{stats.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className={`px-2 py-1 text-right font-medium ${
                stats.totalCredit > stats.totalDebit ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.totalCredit - stats.totalDebit > 0 ? '+' : ''}
                ₹{(stats.totalCredit - stats.totalDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-1 text-center text-blue-600">{stats.tagged}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPage2 = () => (
    <div className="space-y-1">
      {Object.entries(accountBreakdown).map(([bankId, accounts]) => (
        <div key={bankId} className="border border-gray-200 rounded">
          <div className="bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
            {bankIdNameMap[bankId] || bankId}
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 text-left font-medium text-gray-700">Account</th>
                  <th className="px-2 py-1 text-center font-medium text-gray-700">Txns</th>
                  <th className="px-2 py-1 text-right font-medium text-gray-700">Amount</th>
                  <th className="px-2 py-1 text-right font-medium text-gray-700">Cr</th>
                  <th className="px-2 py-1 text-right font-medium text-gray-700">Dr</th>
                  <th className="px-2 py-1 text-right font-medium text-gray-700">Balance</th>
                  <th className="px-2 py-1 text-center font-medium text-gray-700">Tags</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(accounts).map(([accountId, stats]) => (
                  <tr key={accountId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-2 py-1 text-gray-900 font-mono text-xs truncate max-w-16">{accountId}</td>
                    <td className="px-2 py-1 text-center text-gray-600">{stats.totalTransactions}</td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      ₹{stats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-1 text-right text-green-600 font-medium">
                      ₹{stats.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-1 text-right text-red-600 font-medium">
                      ₹{stats.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-2 py-1 text-right font-medium ${
                      stats.totalCredit > stats.totalDebit ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stats.totalCredit - stats.totalDebit > 0 ? '+' : ''}
                      ₹{(stats.totalCredit - stats.totalDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-1 text-center text-blue-600">
                      {Object.keys(stats.tags).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );

  const renderPage3 = () => (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-xs compact-table">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-1 py-1 text-left font-medium text-gray-700 text-xs">Bank/Account/Tag</th>
            <th className="px-1 py-1 text-center font-medium text-gray-700 text-xs">Txns</th>
            <th className="px-1 py-1 text-right font-medium text-gray-700 text-xs">Amount</th>
            <th className="px-1 py-1 text-right font-medium text-gray-700 text-xs">Cr</th>
            <th className="px-1 py-1 text-right font-medium text-gray-700 text-xs">Dr</th>
            <th className="px-1 py-1 text-right font-medium text-gray-700 text-xs">Balance</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(tagStatsWithBreakdown).map(([bankId, accounts]) => (
            <React.Fragment key={bankId}>
              {/* Bank Header Row */}
              <tr className="border-b border-gray-200 bg-blue-50">
                <td className="px-1 py-1 text-blue-800 font-semibold text-xs" colSpan={6}>
                  {bankIdNameMap[bankId] || bankId}
                </td>
              </tr>
              {Object.entries(accounts).map(([accountId, tags]) => (
                <React.Fragment key={accountId}>
                  {/* Account Row */}
                  <tr className="border-b border-gray-150 bg-gray-50">
                    <td className="px-1 py-1 text-gray-700 font-medium text-xs pl-4">
                      {(() => {
                        const sampleTx = transactions.find(t => t.bankId === bankId && t.accountId === accountId);
                        const displayAccount = sampleTx && (sampleTx.accountNumber as unknown as string | undefined);
                        return `Account: ${displayAccount || accountId}`;
                      })()}
                    </td>
                    <td className="px-1 py-1 text-center text-gray-600 text-xs">
                      {Object.values(tags).reduce((sum, tag) => sum + tag.totalTransactions, 0)}
                    </td>
                    <td className="px-1 py-1 text-right text-gray-600 text-xs">
                      ₹{Object.values(tags).reduce((sum, tag) => sum + tag.totalAmount, 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-1 py-1 text-right text-green-600 font-medium text-xs">
                      ₹{Object.values(tags).reduce((sum, tag) => sum + tag.totalCredit, 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-1 py-1 text-right text-red-600 font-medium text-xs">
                      ₹{Object.values(tags).reduce((sum, tag) => sum + tag.totalDebit, 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-1 py-1 text-right text-gray-600 text-xs">
                      ₹{Object.values(tags).reduce((sum, tag) => sum + (tag.totalCredit - tag.totalDebit), 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </td>
                  </tr>
                  {/* Tag Rows */}
                  {Object.entries(tags).map(([tagName, stats]) => (
                    <tr 
                      key={`${bankId}-${accountId}-${tagName}`} 
                      className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
                      onClick={() => {
                        console.log('Tag row clicked:', { tagName, bankId, accountId });
                        onTagClick?.(tagName, bankId, accountId);
                      }}
                    >
                      <td className="px-1 py-1 text-gray-600 text-xs pl-8">
                        🏷️ {tagName}
                      </td>
                      <td className="px-1 py-1 text-center text-gray-600 text-xs">
                        {stats.totalTransactions}
                      </td>
                      <td className="px-1 py-1 text-right text-gray-600 text-xs">
                        ₹{stats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-1 py-1 text-right text-green-600 font-medium text-xs">
                        ₹{stats.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-1 py-1 text-right text-red-600 font-medium text-xs">
                        ₹{stats.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      <td className={`px-1 py-1 text-right font-medium text-xs ${
                        stats.totalCredit > stats.totalDebit ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stats.totalCredit - stats.totalDebit > 0 ? '+' : ''}
                        ₹{(stats.totalCredit - stats.totalDebit).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  const getPageContent = () => {
    switch (currentPage) {
      case 0:
        return renderPage1();
      case 1:
        return renderPage2();
      case 2:
        return renderPage3();
      default:
        return renderPage1();
    }
  };

  // Note: getPageTitle function was defined but not used in the component

  return (
    <div className="w-full h-full">
      <div className="flex items-center justify-end mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Page {currentPage + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              ◀
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              ▶
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-y-auto overflow-x-auto" style={{ height: 'calc(100% - 60px)', maxHeight: '150px' }}>
        {getPageContent()}
      </div>
    </div>
  );
}

interface Condition {
  if: {
    field: string;
    op: 'present' | 'not_present' | '==' | '!=' | '>=' | '<=' | '>';
    value?: string;
  };
  then: {
    [key: string]: string;
  };
}

interface BankHeaderMapping {
  id: string;
  bankId: string;
  header: string[];
  mapping?: { [key: string]: string };
  conditions?: Condition[];
}

function SuperBankReportModal({ isOpen, onClose, transactions, bankIdNameMap, tagFilters }: {
  isOpen: boolean;
  onClose: () => void;
  transactions: (Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string })[];
  bankIdNameMap: { [id: string]: string };
  tagFilters: string[];
}) {
  // Selection state for tag rows
  const [selectedTagRows, setSelectedTagRows] = useState<Set<string>>(new Set());
  // State for selected tags in summary table
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  // State for 4th page (tag transactions)
  const [selectedTagForPage4, setSelectedTagForPage4] = useState<{
    tagName: string;
    transactions: (Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string })[];
    groupedTransactions: { [bankId: string]: { [accountId: string]: (Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string })[] } };
  } | null>(null);
  // Move all hooks to the top, before any early return
  const A4_HEIGHT_PX = 1122; // 297mm at 96dpi
  const A4_WIDTH_PX = 1200;   // Increased width for better table display
  const [page, setPage] = useState(0);
  const [exportingAllPages, setExportingAllPages] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const allPagesRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tag Summary UI state: search and sort (keep hooks near top to satisfy rules-of-hooks)
  const [tagSummarySearch, setTagSummarySearch] = useState('');
  const [tagSummarySort, setTagSummarySort] = useState<'az' | 'za' | ''>('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Compute per-tag stats (moved up to be available for useMemo)
  type Stat = {
    label: string;
    totalTransactions: number;
    totalAmount: number;
    totalCredit: number;
    totalDebit: number;
    tagged: number;
    untagged: number;
  };
  
  // Get all unique tags from transactions
  const allTags = new Set<string>();
  transactions.forEach(tx => {
    if (Array.isArray(tx.tags)) {
      tx.tags.forEach(tag => allTags.add(tag.name));
    }
  });
  
  // Group by tag
  const statsArr: Stat[] = Array.from(allTags).map(tagName => {
    const txs = transactions.filter(tx => Array.isArray(tx.tags) && tx.tags.some(t => t.name === tagName));
    let totalAmount = 0, totalCredit = 0, totalDebit = 0, tagged = 0, untagged = 0;
    txs.forEach(tx => {
      // Get amount from AmountRaw or parse from Amount field
      let amount = 0;
      if (typeof (tx as Transaction & { AmountRaw?: number }).AmountRaw === 'number') {
        amount = (tx as Transaction & { AmountRaw?: number }).AmountRaw || 0;
      } else {
        // Fallback to parsing Amount field
        const amountField = (tx as Transaction & { Amount?: string; amount?: string }).Amount || (tx as Transaction & { Amount?: string; amount?: string }).amount || 0;
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
      
      const crdr = ((tx as Transaction & { 'Dr./Cr.'?: string })['Dr./Cr.'] || '').toString().trim().toUpperCase();
      if (crdr === 'CR') {
        totalCredit = Math.round((totalCredit + Math.abs(amount)) * 100) / 100;
      } else if (crdr === 'DR') {
        totalDebit = Math.round((totalDebit + Math.abs(amount)) * 100) / 100;
      }
      
      const tags = (tx as Transaction).tags;
      if (Array.isArray(tags) && tags.length > 0) tagged++;
      else untagged++;
    });
    return {
      label: tagName,
      totalTransactions: txs.length,
      totalAmount,
      totalCredit,
      totalDebit,
      tagged,
      untagged,
    };
  });

  const filteredAndSortedStats = useMemo(() => {
    let arr = statsArr.filter(s => !tagSummarySearch || s.label.toLowerCase().includes(tagSummarySearch.toLowerCase()));
    if (tagSummarySort === 'az') arr = arr.slice().sort((a, b) => a.label.localeCompare(b.label));
    if (tagSummarySort === 'za') arr = arr.slice().sort((a, b) => b.label.localeCompare(a.label));
    return arr;
  }, [statsArr, tagSummarySearch, tagSummarySort]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDownloadDropdown(false);
      }
    };

    if (showDownloadDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadDropdown]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.sort-dropdown-container')) {
        setShowSortDropdown(false);
      }
    };

    if (showSortDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortDropdown]);



  // Handle tag row click from Per-Bank, Per-Account Report
  const handleTagRowClick = (tagName: string) => {
    // Find all transactions for this tag across ALL banks and accounts
    const tagTransactions = transactions.filter(tx => {
      const tags = Array.isArray(tx.tags) ? tx.tags : [];
      return tags.some((tag: Tag) => tag.name === tagName);
    });

    // Group transactions by bank and account for display
    const groupedTransactions: { [bankId: string]: { [accountId: string]: (Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string })[] } } = {};
    tagTransactions.forEach(tx => {
      const txBankId = tx.bankId;
      const txAccountId = tx.accountId;
      if (!groupedTransactions[txBankId]) groupedTransactions[txBankId] = {};
      if (!groupedTransactions[txBankId][txAccountId]) groupedTransactions[txBankId][txAccountId] = [];
      groupedTransactions[txBankId][txAccountId].push(tx);
    });

    // Sort transactions by date (oldest to newest) for each account
    Object.keys(groupedTransactions).forEach(bankId => {
      Object.keys(groupedTransactions[bankId]).forEach(accountId => {
        groupedTransactions[bankId][accountId].sort((a, b) => {
          const getDateValue = (tx: Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string }) => {
            const dateField = tx.Date || tx['Transaction Date'];
            if (typeof dateField === 'string') return dateField;
            if (typeof dateField === 'number') return String(dateField);
            return '';
          };
          const dateA = getDateValue(a);
          const dateB = getDateValue(b);
          if (!dateA || !dateB) return 0;
          return new Date(dateA).getTime() - new Date(dateB).getTime(); // Oldest first
        });
      });
    });

    // Set the selected tag for page 2 and navigate to it
    setSelectedTagForPage4({
      tagName,
      transactions: tagTransactions,
      groupedTransactions
    });
    setPage(1); // Navigate to 2nd page (index 1)
  };



  // Download functions for tag transactions (4th page)
  const handleDownloadTagTransactionsCSV = () => {
    if (!selectedTagForPage4) return;
    
    const csvData = [];
    
    // Add header
    csvData.push(['Tag Transactions Report']);
    csvData.push(['Tag', selectedTagForPage4.tagName]);
    csvData.push(['Total Transactions', selectedTagForPage4.transactions.length]);
    
    // Calculate totals
    let totalCredit = 0, totalDebit = 0;
    selectedTagForPage4.transactions.forEach((tx: Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string }) => {
      const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
      const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
      if (crdr === 'CR') totalCredit += Math.abs(amount);
      else if (crdr === 'DR') totalDebit += Math.abs(amount);
    });
    const balance = totalCredit - totalDebit;
    
    csvData.push(['Total Credit', totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })]);
    csvData.push(['Total Debit', totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })]);
    csvData.push(['Balance', balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })]);
    csvData.push([]); // Empty row
    
    // Add transaction details (sorted oldest -> newest to match on-screen order)
    csvData.push(['Bank', 'Account ID', 'Account Name', 'Account Number', 'Date', 'Description', 'Reference', 'Amount', 'Type', 'Tags']);

    const toTime = (raw: string): number => {
      const iso = convertToISOFormat(raw);
      if (iso) {
        const t = Date.parse(iso);
        if (!isNaN(t)) return t;
      }
      const parsed = parseDate(raw);
      if (parsed && !isNaN(parsed.getTime())) return parsed.getTime();
      return 0;
    };

    const sortedTxs = [...selectedTagForPage4.transactions].sort((a, b) => {
      const aRaw = String(a.Date || a['Transaction Date'] || '');
      const bRaw = String(b.Date || b['Transaction Date'] || '');
      return toTime(aRaw) - toTime(bRaw);
    });

    sortedTxs.forEach((tx: Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string }) => {
      const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
      const tags = Array.isArray(tx.tags) ? tx.tags : [];
      const description = tx.Description || tx['Transaction Description'] || tx['Narration'] || 'N/A';
      const reference = tx['Reference No.'] || tx['Reference'] || tx['Cheque No.'] || 'N/A';
      const date = formatDateForCSV(String(tx.Date || tx['Transaction Date'] || 'N/A'));
      const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
      const bankName = bankIdNameMap[tx.bankId] || tx.bankId;
      const accountName = tx.accountName || tx.accountHolderName || 'N/A';
      const accountNumber = tx.accountNumber || 'N/A';
      
      csvData.push([
        bankName,
        tx.accountId,
        accountName,
        accountNumber,
        date,
        description,
        reference,
        amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        crdr,
        tags.map((tag: Tag) => tag.name).join('; ')
      ]);
    });
    
    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tag-transactions-${selectedTagForPage4.tagName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTagTransactionsPDF = async () => {
    if (!selectedTagForPage4) return;
    
    // Create a temporary container for PDF generation
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '800px';
    tempContainer.style.background = 'white';
    tempContainer.style.padding = '20px';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    
    // Calculate totals
    let totalCredit = 0, totalDebit = 0;
    selectedTagForPage4.transactions.forEach((tx: Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string }) => {
      const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
      const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
      if (crdr === 'CR') totalCredit += Math.abs(amount);
      else if (crdr === 'DR') totalDebit += Math.abs(amount);
    });
    const balance = totalCredit - totalDebit;
    
    // Create PDF content
    tempContainer.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1f2937; margin-bottom: 10px;">Tag Transactions Report</h1>
                        <h2 style="color: #3b82f6; margin-bottom: 20px;">Tag: &quot;${selectedTagForPage4.tagName}&quot;</h2>
      </div>
      
      <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #1e40af; margin-bottom: 10px;">Summary</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
          <div style="text-align: center;">
            <div style="font-size: 12px; color: #6b7280;">Total Credit</div>
            <div style="font-size: 18px; font-weight: bold; color: #059669;">₹${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 12px; color: #6b7280;">Total Debit</div>
            <div style="font-size: 18px; font-weight: bold; color: #dc2626;">₹${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 12px; color: #6b7280;">Balance</div>
            <div style="font-size: 18px; font-weight: bold; color: ${balance >= 0 ? '#059669' : '#dc2626'};">₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 12px; color: #6b7280;">Total Transactions</div>
            <div style="font-size: 18px; font-weight: bold; color: #3b82f6;">${selectedTagForPage4.transactions.length}</div>
          </div>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px;">Bank</th>
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px;">Account ID</th>
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px;">Account Name</th>
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px;">Account Number</th>
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px;">Date</th>
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px;">Description</th>
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-size: 12px;">Amount</th>
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-size: 12px;">Type</th>
          </tr>
        </thead>
        <tbody>
          ${selectedTagForPage4.transactions.map((tx: Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string }) => {
            const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
            const description = tx.Description || tx['Transaction Description'] || tx['Narration'] || 'N/A';
            const date = (() => {
              const rawDate = tx.Date || tx['Transaction Date'] || 'N/A';
              if (rawDate && rawDate !== 'N/A') {
                try {
                  const dateObj = new Date(String(rawDate));
                  if (!isNaN(dateObj.getTime())) {
                    const dd = String(dateObj.getDate()).padStart(2, '0');
                    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const yyyy = dateObj.getFullYear();
                    return `${dd}/${mm}/${yyyy}`;
                  }
                } catch {
                  // If parsing fails, return original date
                }
              }
              return String(rawDate);
            })();
            const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
            const bankName = bankIdNameMap[tx.bankId] || tx.bankId;
            const accountName = tx.accountName || tx.accountHolderName || 'N/A';
            const accountNumber = tx.accountNumber || 'N/A';
            const color = crdr === 'CR' ? '#059669' : '#dc2626';
            
            return `
              <tr>
                <td style="border: 1px solid #d1d5db; padding: 8px; font-size: 11px;">${bankName}</td>
                <td style="border: 1px solid #d1d5db; padding: 8px; font-size: 11px;">${tx.accountId}</td>
                <td style="border: 1px solid #d1d5db; padding: 8px; font-size: 11px;">${accountName}</td>
                <td style="border: 1px solid #d1d5db; padding: 8px; font-size: 11px;">${accountNumber}</td>
                <td style="border: 1px solid #d1d5db; padding: 8px; font-size: 11px;">${date}</td>
                <td style="border: 1px solid #d1d5db; padding: 8px; font-size: 11px;">${description}</td>
                <td style="border: 1px solid #d1d5db; padding: 8px; font-size: 11px; text-align: right; color: ${color}; font-weight: bold;">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style="border: 1px solid #d1d5db; padding: 8px; font-size: 11px; text-align: center;">${crdr}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
    
    document.body.appendChild(tempContainer);
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: 10,
          filename: `tag-transactions-${selectedTagForPage4.tagName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, allowTaint: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(tempContainer)
        .save();
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  if (Object.keys(bankIdNameMap).length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Super Bank Report">
        <div className="p-8 text-center text-gray-500 text-lg">Loading bank names...</div>
      </Modal>
    );
  }
  // moved tag summary search/sort hooks to the top of SuperBankReportModal


  // Console logging for individual tags Credit, Debit, and Balance
  if (tagFilters && tagFilters.length > 0) {
    console.log('=== INDIVIDUAL TAGS FINANCIAL SUMMARY ===');
    statsArr.forEach(stat => {
      const tagBalance = stat.totalCredit - stat.totalDebit;
      console.log(`${stat.label}:`);
      console.log(`  Credit (Cr.): ₹${stat.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`  Debit (Dr.): ₹${stat.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`  Balance (Bal.): ₹${tagBalance >= 0 ? '+' : ''}${tagBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log('---');
    });
    console.log('==========================================');
    
    // Additional debugging: Show transaction structure for first few transactions
    console.log('=== TRANSACTION STRUCTURE DEBUG ===');
    if (transactions.length > 0) {
      console.log('Sample transaction structure:', transactions[0]);
      console.log('Available fields:', Object.keys(transactions[0]));
      
      // Show first few transactions with their amount and Dr./Cr. fields
      const sampleTransactions = transactions.slice(0, 3);
      sampleTransactions.forEach((tx, index) => {
        console.log(`Transaction ${index + 1}:`, {
          id: tx.id,
          AmountRaw: tx.AmountRaw,
          Amount: tx.Amount,
          amount: tx.amount,
          'Dr./Cr.': tx['Dr./Cr.'],
          'DR/CR': tx['DR/CR'],
          tags: tx.tags
        });
      });
    }
    console.log('=====================================');
  }

  // Group transactions by bank and then by accountId
  const perBankAccount: { [bankId: string]: { [accountId: string]: (Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string })[] } } = {};
  transactions.forEach(tx => {
    const bankId = tx.bankId;
    const accountId = tx.accountId;
    if (!perBankAccount[bankId]) perBankAccount[bankId] = {};
    if (!perBankAccount[bankId][accountId]) perBankAccount[bankId][accountId] = [];
    perBankAccount[bankId][accountId].push(tx);
  });

  // --- A4 Pagination Logic ---
  const pages: JSX.Element[] = [
    // Tag Summary Page
    <div key="tag-summary" style={{ width: exportingAllPages ? `${A4_WIDTH_PX}px` : '100%', minHeight: `${A4_HEIGHT_PX}px`, padding: 0, boxSizing: 'border-box', background: 'transparent', pageBreakAfter: 'always' }}>
      <div>
        <h3 className="text-xl font-bold mb-4 text-blue-700 tracking-tight">Tag Summary</h3>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500">
              Showing all tags with their total credits, debits, and balance
            </div>
            {/* Search */}
            <input
              type="text"
              value={tagSummarySearch}
              onChange={e => setTagSummarySearch(e.target.value)}
              placeholder="Search tags..."
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            />
            {/* Sort dropdown */}
            <div className="relative sort-dropdown-container">
              <button
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                title="Sort tags"
              >
                <span>{tagSummarySort === 'az' ? 'A→Z' : tagSummarySort === 'za' ? 'Z→A' : 'Sort'}</span>
                <svg className={`w-3 h-3 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showSortDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 min-w-[120px]">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setTagSummarySort('az');
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1 text-xs hover:bg-gray-100 ${tagSummarySort === 'az' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                    >
                      A → Z (Ascending)
                    </button>
                    <button
                      onClick={() => {
                        setTagSummarySort('za');
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1 text-xs hover:bg-gray-100 ${tagSummarySort === 'za' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                    >
                      Z → A (Descending)
                    </button>
                    <button
                      onClick={() => {
                        setTagSummarySort('');
                        setShowSortDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1 text-xs hover:bg-gray-100 text-gray-700"
                    >
                      Clear Sort
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setSelectedTags(new Set(statsArr.map(s => s.label)))}
              className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedTags(new Set())}
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
        <div>
          <table className="w-full border text-sm rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-blue-50">
                <th className="border px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedTags.size === statsArr.length && statsArr.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTags(new Set(statsArr.map(s => s.label)));
                      } else {
                        setSelectedTags(new Set());
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="border px-4 py-2">Tag</th>
                <th className="border px-4 py-2">Total Txns</th>
                <th className="border px-4 py-2">Total Amount</th>
                <th className="border px-4 py-2">Credit</th>
                <th className="border px-4 py-2">Debit</th>
                <th className="border px-4 py-2">Balance</th>
              </tr>
            </thead>
                          <tbody>
                {filteredAndSortedStats.map((s, i) => (
                  <tr 
                    key={s.label + i} 
                    className="hover:bg-blue-50 transition cursor-pointer group"
                    onClick={(e) => {
                      // Don't trigger row click if clicking on checkbox
                      if (!(e.target as HTMLElement).closest('input[type="checkbox"]')) {
                        handleTagRowClick(s.label);
                      }
                    }}
                    title={`Click to view all transactions for tag "${s.label}"`}
                  >
                    <td className="border px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedTags.has(s.label)}
                        onChange={(e) => {
                          e.stopPropagation();
                          const newSelected = new Set(selectedTags);
                          if (e.target.checked) {
                            newSelected.add(s.label);
                          } else {
                            newSelected.delete(s.label);
                          }
                          setSelectedTags(newSelected);
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="border px-4 py-2 font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="group-hover:text-blue-700 transition-colors">{s.label}</span>
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </td>
                    <td className="border px-4 py-2 text-center">{s.totalTransactions}</td>
                    <td className="border px-4 py-2 text-right">{s.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="border px-4 py-2 text-right text-green-700">{s.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="border px-4 py-2 text-right text-red-700">{s.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className={`border px-4 py-2 text-right font-semibold ${
                      s.totalCredit > s.totalDebit ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {s.totalCredit - s.totalDebit > 0 ? '+' : ''}
                      {(s.totalCredit - s.totalDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        </div>
      </div>
    </div>,
    // Tag Transactions Page (4th page)
    ...(selectedTagForPage4 ? [(
      <div key="tag-transactions" style={{ width: exportingAllPages ? `${A4_WIDTH_PX}px` : '100%', minHeight: `${A4_HEIGHT_PX}px`, padding: 0, boxSizing: 'border-box', background: 'transparent', pageBreakAfter: 'always' }}>
        <div>
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-blue-700 tracking-tight">
                  Transactions for Tag: &quot;{selectedTagForPage4.tagName}&quot;
                </h3>
                <div className="text-sm text-gray-600 mt-1">
                  Showing {selectedTagForPage4.transactions.length} transactions across all banks and accounts
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadTagTransactionsCSV}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  CSV
                </button>
                <button
                  onClick={handleDownloadTagTransactionsPDF}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
              </div>
            </div>
            
            {/* Summary Statistics */}
            {(() => {
              let totalCredit = 0, totalDebit = 0;
              selectedTagForPage4.transactions.forEach(tx => {
                const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
                const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
                if (crdr === 'CR') totalCredit += Math.abs(amount);
                else if (crdr === 'DR') totalDebit += Math.abs(amount);
              });
              const balance = totalCredit - totalDebit;

              return (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="text-md font-semibold text-green-800 mb-3">Summary for Tag: &quot;{selectedTagForPage4.tagName}&quot;</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Total Credit</div>
                      <div className="text-lg font-bold text-green-700">
                        ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Total Debit</div>
                      <div className="text-lg font-bold text-red-700">
                        ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Balance</div>
                      <div className={`text-lg font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Total Transactions</div>
                      <div className="text-lg font-bold text-blue-700">
                        {selectedTagForPage4.transactions.length}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Transactions by Bank and Account */}
            {Object.entries(selectedTagForPage4.groupedTransactions).map(([bankId, accounts]) => (
              <div key={bankId} className="border rounded-lg overflow-hidden mb-6">
                <div className="bg-gray-100 px-4 py-2 border-b">
                  <h4 className="font-semibold text-gray-800">
                    {bankIdNameMap[bankId] || bankId}
                  </h4>
                  {/* Bank Summary */}
                  {(() => {
                    let bankCredit = 0, bankDebit = 0;
                    Object.values(accounts).flat().forEach(tx => {
                      const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
                      const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
                      if (crdr === 'CR') bankCredit += Math.abs(amount);
                      else if (crdr === 'DR') bankDebit += Math.abs(amount);
                    });
                    const bankBalance = bankCredit - bankDebit;

                    return (
                      <div className="mt-2 text-xs text-gray-600">
                        <span className="mr-4">Credit: <span className="text-green-700 font-semibold">₹{bankCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
                        <span className="mr-4">Debit: <span className="text-red-700 font-semibold">₹{bankDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
                        <span>Balance: <span className={`font-semibold ${bankBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
                      </div>
                    );
                  })()}
                </div>
                {Object.entries(accounts).map(([accountId, accountTransactions]) => (
                  <div key={accountId} className="border-b last:border-b-0">
                    <div className="bg-blue-50 px-4 py-2 border-b">
                      <h5 className="text-sm font-medium text-blue-800">
                        {(() => {
                          const firstTx = accountTransactions[0];
                          const acctNo = firstTx ? ((firstTx as unknown as { accountNumber?: string }).accountNumber || accountId) : accountId;
                          return `Account: ${acctNo}`;
                        })()}
                      </h5>
                      <p className="text-xs text-blue-600">
                        {accountTransactions.length} transactions
                      </p>
                      {/* Account Summary */}
                      {(() => {
                        let accountCredit = 0, accountDebit = 0;
                        accountTransactions.forEach(tx => {
                          const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
                          const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
                          if (crdr === 'CR') accountCredit += Math.abs(amount);
                          else if (crdr === 'DR') accountDebit += Math.abs(amount);
                        });
                        const accountBalance = accountCredit - accountDebit;

                        return (
                          <div className="mt-1 text-xs text-blue-600">
                            <span className="mr-3">Credit: <span className="text-green-700 font-semibold">₹{accountCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
                            <span className="mr-3">Debit: <span className="text-red-700 font-semibold">₹{accountDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
                            <span>Balance: <span className={`font-semibold ${accountBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{accountBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">Account No.</th>
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

                            return (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {(() => {
                                    // Convert ISO date to DD/MM/YYYY format
                                    if (date && date !== 'N/A') {
                                      try {
                                        const dateObj = new Date(date);
                                        if (!isNaN(dateObj.getTime())) {
                                          const dd = String(dateObj.getDate()).padStart(2, '0');
                                          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                                          const yyyy = dateObj.getFullYear();
                                          return `${dd}/${mm}/${yyyy}`;
                                        }
                                      } catch {
                                        // If parsing fails, return original date
                                      }
                                    }
                                    return date;
                                  })()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 min-w-[300px] max-w-[400px] break-words">{description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reference}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{accountName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 min-w-[120px]">{accountNumber}</td>
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
                                        className="inline-block px-2 py-1 text-xs rounded-full mr-1 mb-1 font-semibold"
                                        style={{
                                          backgroundColor: `${tag.color || '#6366F1'}30`,
                                          color: '#000000',
                                          border: `2px solid ${tag.color || '#6366F1'}`,
                                          fontWeight: '500'
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

            {selectedTagForPage4.transactions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No transactions found for tag &quot;{selectedTagForPage4.tagName}&quot;</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )] : [])
  ];

  const handleDownloadPDF = async () => {
    setExportingAllPages(true);
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for DOM update
    if (!reportContainerRef.current) return;
    const html2pdf = (await import('html2pdf.js')).default;
    
    // Create filtered pages for selected tags
    const tagsToExport = selectedTags.size > 0 ? selectedTags : new Set(statsArr.map(s => s.label));
    const filteredStatsArr = statsArr.filter(stat => tagsToExport.has(stat.label));
    
    // Get all transactions for selected tags
    const selectedTransactions = transactions.filter(tx => {
      const tags = Array.isArray(tx.tags) ? tx.tags : [];
      return tags.some((tag: Tag) => tagsToExport.has(tag.name));
    });
    
    // Sort transactions by date (oldest to newest)
    selectedTransactions.sort((a, b) => {
      const getDateValue = (tx: Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string }) => {
        const dateField = tx.Date || tx['Transaction Date'];
        if (typeof dateField === 'string') return dateField;
        if (typeof dateField === 'number') return String(dateField);
        return '';
      };
      const dateA = new Date(getDateValue(a));
      const dateB = new Date(getDateValue(b));
      return dateA.getTime() - dateB.getTime();
    });
    
    // Create filtered pages array
    const filteredPages = [
      // Tag Summary Page (filtered)
      <div key="tag-summary-filtered" style={{ width: exportingAllPages ? `${A4_WIDTH_PX}px` : '100%', minHeight: `${A4_HEIGHT_PX}px`, padding: 0, boxSizing: 'border-box', background: 'transparent', pageBreakAfter: 'always' }}>
        <div>
          <h3 className="text-xl font-bold mb-4 text-blue-700 tracking-tight">Tag Summary</h3>
          <div className="text-xs text-gray-500 mb-2">
            Showing {filteredStatsArr.length} selected tags with their total credits, debits, and balance
          </div>
          <div>
            <table className="w-full border text-sm rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-blue-50">
                  <th className="border px-4 py-2">Tag</th>
                  <th className="border px-4 py-2">Total Txns</th>
                  <th className="border px-4 py-2">Total Amount</th>
                  <th className="border px-4 py-2">Credit</th>
                  <th className="border px-4 py-2">Debit</th>
                  <th className="border px-4 py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredStatsArr.map((s, i) => (
                  <tr key={s.label + i} className="hover:bg-blue-50 transition cursor-pointer group">
                    <td className="border px-4 py-2 font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="group-hover:text-blue-700 transition-colors">{s.label}</span>
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </td>
                    <td className="border px-4 py-2 text-center">{s.totalTransactions}</td>
                    <td className="border px-4 py-2 text-right">{s.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="border px-4 py-2 text-right text-green-700">{s.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="border px-4 py-2 text-right text-red-700">{s.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className={`border px-4 py-2 text-right font-semibold ${
                      s.totalCredit > s.totalDebit ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {s.totalCredit - s.totalDebit > 0 ? '+' : ''}
                      {(s.totalCredit - s.totalDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>,
      // Transactions Page
      <div key="transactions-filtered" style={{ width: exportingAllPages ? `${A4_WIDTH_PX}px` : '100%', minHeight: `${A4_HEIGHT_PX}px`, padding: 0, boxSizing: 'border-box', background: 'transparent', pageBreakAfter: 'always' }}>
        <div>
          <h3 className="text-xl font-bold mb-4 text-blue-700 tracking-tight">Individual Transactions</h3>
          <div className="text-xs text-gray-500 mb-2">
            Showing {selectedTransactions.length} transactions for selected tags
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border text-xs rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-2 py-1">Tag</th>
                  <th className="border px-2 py-1">Bank</th>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1">Description</th>
                  <th className="border px-2 py-1">Amount</th>
                  <th className="border px-2 py-1">Type</th>
                </tr>
              </thead>
              <tbody>
                {selectedTransactions.map((tx, idx) => {
                  const tags = Array.isArray(tx.tags) ? tx.tags : [];
                  const tagNames = tags.map((tag: Tag) => tag.name).join('; ');
                  const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
                  const description = (tx.Description || tx['Transaction Description'] || tx['Narration'] || 'N/A') as string;
                  const date = (tx.Date || tx['Transaction Date'] || 'N/A') as string;
                  const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
                  const bankName = bankIdNameMap[tx.bankId] || tx.bankId;
                  
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border px-2 py-1 text-xs">{tagNames}</td>
                      <td className="border px-2 py-1 text-xs">{bankName}</td>
                      <td className="border px-2 py-1 text-xs">{date}</td>
                      <td className="border px-2 py-1 text-xs max-w-[200px] truncate">{description}</td>
                      <td className={`border px-2 py-1 text-xs text-right ${crdr === 'CR' ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border px-2 py-1 text-xs text-center">{crdr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ];
    
    // Temporarily replace the content for PDF generation
    if (!reportContainerRef.current) return;
    const originalContent = reportContainerRef.current.innerHTML;
    reportContainerRef.current.innerHTML = '';
    
    // Create temporary container for filtered content
    const tempContainer = document.createElement('div');
    tempContainer.style.width = `${A4_WIDTH_PX}px`;
    tempContainer.style.minHeight = `${A4_HEIGHT_PX}px`;
    tempContainer.style.background = 'white';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.padding = '16px';
    tempContainer.style.borderRadius = '16px';
    tempContainer.style.boxShadow = '0 2px 16px rgba(0,0,0,0.08)';
    
    // Render filtered content
    const { renderToString } = await import('react-dom/server');
    tempContainer.innerHTML = renderToString(filteredPages[0]);
    reportContainerRef.current.appendChild(tempContainer);
    
    const fileName = selectedTags.size > 0 ? `selected-tags-report-${selectedTags.size}-tags.pdf` : 'super-bank-report.pdf';
    
    html2pdf()
      .set({
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
      })
      .from(tempContainer)
      .save()
      .finally(() => {
        // Restore original content
        if (reportContainerRef.current) {
          reportContainerRef.current.innerHTML = originalContent;
        }
        setExportingAllPages(false);
      });
  };

  const handleDownloadCSV = () => {
    // Create CSV data for the current view
    const csvData = [];
    
    // Filter stats based on selected tags, or use all if none selected
    const tagsToExport = selectedTags.size > 0 ? selectedTags : new Set(statsArr.map(s => s.label));
    
    // Add Tag Summary
    csvData.push(['Tag Summary']);
    csvData.push(['Tag', 'Total Txns', 'Total Amount', 'Credit', 'Debit', 'Balance']);
    
    statsArr.forEach(stat => {
      if (tagsToExport.has(stat.label)) {
        const balance = stat.totalCredit - stat.totalDebit;
        csvData.push([
          stat.label,
          stat.totalTransactions,
          stat.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          stat.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          stat.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })
        ]);
      }
    });
    
    // Add empty row for separation
    csvData.push([]);
    
    // Add Individual Transactions for each selected tag
    csvData.push(['Individual Transactions']);
    csvData.push(['Tag', 'Bank', 'Account Name', 'Account Number', 'Date', 'Description', 'Reference', 'Amount', 'Type', 'Transaction ID']);
    
    // Get all transactions for selected tags
    const selectedTransactions = transactions.filter(tx => {
      const tags = Array.isArray(tx.tags) ? tx.tags : [];
      return tags.some((tag: Tag) => tagsToExport.has(tag.name));
    });
    
    // Sort transactions by date (oldest to newest)
    selectedTransactions.sort((a, b) => {
      const getDateValue = (tx: Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string }) => {
        const dateField = tx.Date || tx['Transaction Date'];
        if (typeof dateField === 'string') return dateField;
        if (typeof dateField === 'number') return String(dateField);
        return '';
      };
      const dateA = new Date(getDateValue(a));
      const dateB = new Date(getDateValue(b));
      return dateA.getTime() - dateB.getTime();
    });
    
    // Add each transaction
    selectedTransactions.forEach(tx => {
      const tags = Array.isArray(tx.tags) ? tx.tags : [];
      const tagNames = tags.map((tag: Tag) => tag.name).join('; ');
      const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
      const description = tx.Description || tx['Transaction Description'] || tx['Narration'] || 'N/A';
      const reference = tx['Reference No.'] || tx['Reference'] || tx['Cheque No.'] || 'N/A';
      const date = tx.Date || tx['Transaction Date'] || 'N/A';
      const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
      const bankName = bankIdNameMap[tx.bankId] || tx.bankId;
      const accountName = tx.accountName || tx.accountHolderName || 'N/A';
      const accountNumber = tx.accountNumber || 'N/A';
      
      csvData.push([
        tagNames,
        bankName,
        accountName,
        accountNumber,
        date,
        description,
        reference,
        amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        crdr,
        tx.id || 'N/A'
      ]);
    });
    
    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fileName = selectedTags.size > 0 ? `selected-tags-transactions-${selectedTags.size}-tags.csv` : 'super-bank-transactions.csv';
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Super Bank Reports" maxWidthClass="max-w-[1500px]">
      {/* Download Dropdown */}
      <div className="relative">
        <div className="absolute top-4 right-4 z-10">
          <div className="relative" ref={dropdownRef}>
                    <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-all text-sm flex items-center gap-2"
              onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
            >
              <span>Download</span>
              {selectedTags.size > 0 && (
                <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold">
                  {selectedTags.size} selected
                </span>
              )}
              <svg className={`w-4 h-4 transition-transform ${showDownloadDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showDownloadDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                <div className="py-1">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => {
                      handleDownloadCSV();
                      setShowDownloadDropdown(false);
                    }}
                  >
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Download CSV
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => {
                      handleDownloadPDF();
                      setShowDownloadDropdown(false);
                    }}
        >
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          Download PDF
        </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Pagination controls at the top */}
      {pages.length > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4 mb-4">
          <button className="px-3 py-1 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Previous</button>
          <span className="text-sm font-medium">Page {page + 1} of {pages.length}</span>
          <button className="px-3 py-1 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50" onClick={() => setPage(p => Math.min(pages.length - 1, p + 1))} disabled={page === pages.length - 1}>Next</button>
        </div>
      )}
      {/* A4-sized paginated report */}
      <div
        ref={reportContainerRef}
        className={exportingAllPages ? "w-full bg-transparent p-0 m-0" : "flex justify-center items-start w-full bg-transparent p-0 m-0 overflow-x-auto"}
        style={{ margin: 0 }}
      >
        {exportingAllPages
          ? (
              <div style={{ width: '100%' }}>
                {pages.map((pageContent, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: `${A4_WIDTH_PX}px`,
                      height: `${A4_HEIGHT_PX}px`,
                      background: 'white',
                      boxSizing: 'border-box',
                      padding: 0,
                      overflow: 'hidden',
                      margin: '0 auto',
                      ...(idx !== pages.length - 1 ? { pageBreakAfter: 'always' } : {}),
                    }}
                  >
                    <div style={{ padding: '16px', width: '100%', height: '100%' }}>{pageContent}</div>
                  </div>
                ))}
              </div>
            )
          : (
              <div style={{ width: `${A4_WIDTH_PX}px`, minHeight: `${A4_HEIGHT_PX}px`, background: 'white', boxSizing: 'border-box', pageBreakAfter: 'always', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', minWidth: '1400px' }}>
                {pages[page]}
              </div>
            )}
      </div>
      {/* Hidden all-pages container for PDF export */}
      <div ref={allPagesRef} style={{ visibility: 'hidden', position: 'absolute', left: '-9999px', top: 0 }}>
        {pages.map((section, pageIdx) => (
          <div key={pageIdx} style={{ width: `${A4_WIDTH_PX}px`, minHeight: `${A4_HEIGHT_PX}px`, padding: '16px', boxSizing: 'border-box', pageBreakAfter: 'always', background: 'white' }}>
            {section}
          </div>
        ))}
      </div>

      {/* Selection Summary */}
      {selectedTagRows.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-40">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{selectedTagRows.size} tag rows selected</span>
              </div>
              <button
                onClick={() => setSelectedTagRows(new Set())}
                className="text-blue-100 hover:text-white text-sm underline"
              >
                Clear Selection
              </button>
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm font-medium transition-colors"
                onClick={() => {
                  // TODO: Add action for selected rows
                  console.log('Selected rows:', Array.from(selectedTagRows));
                }}
              >
                Export Selected
              </button>
              <button
                className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm font-medium transition-colors"
                onClick={() => {
                  // TODO: Add action for selected rows
                  console.log('Selected rows:', Array.from(selectedTagRows));
                }}
              >
                Analyze Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function SuperBankPage() {

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger
  
  // Add debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('SuperBankPage rendered - loading:', loading, 'error:', error, 'transactions count:', transactions.length);
  }

  // Super Bank header state
  const [superHeader, setSuperHeader] = useState<string[]>([]);
  const [bankMappings, setBankMappings] = useState<{ [bankId: string]: BankHeaderMapping & { bankName: string } }>({});
  const [headerInputs, setHeaderInputs] = useState<string[]>([]);
  const [headerLoading, setHeaderLoading] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [headerSuccess, setHeaderSuccess] = useState<string | null>(null);
  const [headerEditing, setHeaderEditing] = useState(false);

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [tagging, setTagging] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagSuccess, setTagSuccess] = useState<string | null>(null);
  
  // Additional loading states for specific tag operations
  const [applyingTagToRow, setApplyingTagToRow] = useState(false);
  const [applyingTagToAll, setApplyingTagToAll] = useState(false);
  const [removingTag, setRemovingTag] = useState<string | boolean>(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [removingTagsFromSelected, setRemovingTagsFromSelected] = useState(false);

  const [totalBanks, setTotalBanks] = useState<number>(0);
  const [totalAccounts, setTotalAccounts] = useState<number>(0);

  const [showHeaderSection, setShowHeaderSection] = useState(false);

  const [tagFilters, setTagFilters] = useState<string[]>([]);

  const [selection, setSelection] = useState<{ text: string; x: number; y: number; rowIdx?: number; transactionId?: string } | null>(null);
  const [tagCreateMsg, setTagCreateMsg] = useState<string | null>(null);
  const [pendingTag, setPendingTag] = useState<{ tagName: string; rowIdx?: number; transactionId?: string; selectionText: string } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Add state
  const [searchField, setSearchField] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'tagged' | 'untagged'>('asc');
  
  // Table sorting state
  const [tableSortColumn, setTableSortColumn] = useState<string>('');
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc');

  // Additional filter states
  const [bankFilter, setBankFilter] = useState<string>('');
  const [drCrFilter, setDrCrFilter] = useState<'DR' | 'CR' | ''>('');
  const [accountFilter, setAccountFilter] = useState<string>('');

  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Drag-and-drop state for header editing
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const [reportOpen, setReportOpen] = useState(false);

  const [bankIdNameMap, setBankIdNameMap] = useState<{ [id: string]: string }>({});
  const [transactionsWithAccountInfo, setTransactionsWithAccountInfo] = useState<(Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string })[]>([]);

  // Progress tracking for bulk operations
  const [matchingTransactions, setMatchingTransactions] = useState<Transaction[]>([]);
  const [failedTransactions, setFailedTransactions] = useState<{ id: string; error: string; description?: string }[]>([]);
  const [showRetryButton, setShowRetryButton] = useState(false);
  
  // Custom confirmation modal state
  const [showRemoveTagsConfirm, setShowRemoveTagsConfirm] = useState(false);
  const [selectedTagsToRemove, setSelectedTagsToRemove] = useState<Set<string>>(new Set());
  
  // Force refresh state for tag count updates (unused - kept for potential future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [forceRefresh, setForceRefresh] = useState(0);


  // Helper function to extract tag IDs for API calls
  const extractTagIds = (tags: Tag[]): string[] => {
    return tags.map(tag => tag.id);
  };

  // Event listener for tag deletion events
  useEffect(() => {
    console.log('SuperBank page: Setting up tag deletion event listeners...');
    
    // Function to refresh tags
    const refreshTags = async () => {
      try {
        const userId = localStorage.getItem('userId');
        const response = await fetch('/api/tags?userId=' + userId);
        const data = await response.json();
        if (Array.isArray(data)) {
          setAllTags(data);
          console.log('SuperBank page: Tags refreshed, new count:', data.length);
        } else {
          setAllTags([]);
          console.log('SuperBank page: Tags refreshed, empty array');
        }
      } catch (error) {
        console.error('SuperBank page: Error refreshing tags:', error);
      }
    };
    
    const handleTagDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Tag deleted event received in SuperBank:', customEvent.detail);
      // Refresh both tags and transactions
      refreshTags();
      setRefreshTrigger(prev => prev + 1);
    };

    const handleTagsBulkDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Tags bulk deleted event received in SuperBank:', customEvent.detail);
      // Refresh both tags and transactions
      refreshTags();
      setRefreshTrigger(prev => prev + 1);
    };

    const handleTagUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Tag updated event received in SuperBank:', customEvent.detail);
      // Refresh both tags and transactions
      refreshTags();
      setRefreshTrigger(prev => prev + 1);
    };

    // Add event listeners
    window.addEventListener('tagDeleted', handleTagDeleted);
    window.addEventListener('tagsBulkDeleted', handleTagsBulkDeleted);
    window.addEventListener('tagUpdated', handleTagUpdated);
    
    // Test tag event listener
    const testTagEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('SuperBank page: Test tag event received:', customEvent.detail);
    };
    window.addEventListener('testTagEvent', testTagEvent);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('tagDeleted', handleTagDeleted);
      window.removeEventListener('tagsBulkDeleted', handleTagsBulkDeleted);
      window.removeEventListener('tagUpdated', handleTagUpdated);
      window.removeEventListener('testTagEvent', testTagEvent);
    };
  }, []);

  // Helper to reorder array
  const reorder = (arr: string[], from: number, to: number) => {
    const updated = [...arr];
    const [removed] = updated.splice(from, 1);
    updated.splice(to, 0, removed);
    return updated;
  };

  // Fetch account information and merge with transactions
  const fetchAccountInfoAndMerge = async (transactions: (Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string })[]) => {
    try {
      // Get unique account IDs from transactions
      const uniqueAccountIds = [...new Set(transactions.map(tx => tx.accountId))];
      
      // Fetch account information for all unique accounts
      const accountInfoMap: { [accountId: string]: { accountName: string; accountNumber: string } } = {};
      
      for (const accountId of uniqueAccountIds) {
        try {
          let timeoutId: NodeJS.Timeout | null = null;
          let controller: AbortController | null = null;
          
          try {
            controller = new AbortController();
            timeoutId = setTimeout(() => {
              if (controller) {
                controller.abort();
              }
            }, 10000); // 10 second timeout for individual account requests
            
            const response = await fetch(`/api/account?accountId=${accountId}`, {
              signal: controller.signal
            });
            
            if (response.ok) {
              const account = await response.json();
              if (account) {
                accountInfoMap[accountId] = {
                  accountName: account.accountHolderName || 'N/A',
                  accountNumber: account.accountNumber || 'N/A'
                };
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch account info for ${accountId}:`, error);
          } finally {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch account info for ${accountId}:`, error);
        }
      }
      
      // Merge account information with transactions
      const transactionsWithAccountInfo = transactions.map(tx => {
        const accountInfo = accountInfoMap[tx.accountId];
        return {
          ...tx,
          accountName: accountInfo?.accountName || 'N/A',
          accountNumber: accountInfo?.accountNumber || 'N/A'
        };
      });
      
      return transactionsWithAccountInfo;
    } catch (error) {
      console.error('Error fetching account information:', error);
      return transactions; // Return original transactions if fetch fails
    }
  };

  // Fetch all transactions with streaming
  useEffect(() => {
    try {
      setLoading(true);
      setError(null);
      setTransactions([]); // Clear existing transactions
      const userId = localStorage.getItem("userId") || "";
    
    if (!userId) {
      setError("User ID not found. Please log in again.");
      setLoading(false);
      return;
    }
    
    let timeoutId: NodeJS.Timeout | null = null;
    let controller: AbortController | null = null;
    const maxRetries = 3;
    let isComponentMounted = true; // Track if component is still mounted
    let retryCount = 0; // Move retryCount inside the scope
    let isStreamingCompleted = false; // Track if streaming has completed
    
    const streamTransactions = () => {
      // Don't start new fetch if component is unmounted or streaming is already completed
      if (!isComponentMounted || isStreamingCompleted) {
        console.log('Streaming skipped: component unmounted or already completed');
        return;
      }
      
      try {
        controller = new AbortController();
        timeoutId = setTimeout(() => {
          if (controller && isComponentMounted) {
            controller.abort();
          }
        }, 120000); // Reduced to 2 minutes timeout for streaming
        
        console.log('Starting streaming transactions for userId:', userId);
        
        // Loading progress removed - using streaming instead
        
        // Use the new streaming API
        fetch(`/api/transactions/stream?userId=${userId}&limit=10000`, {
          signal: controller.signal,
        })
          .then((res) => {
            if (!isComponentMounted) return; // Don't process if unmounted
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            
            if (!reader) {
              throw new Error('No response body');
            }
            
            let buffer = '';
            
            const processStream = async () => {
              try {
                let streamingCompleted = false;
                while (true && !streamingCompleted) {
                  const { done, value } = await reader.read();
                  
                  if (done) break;
                  
                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || ''; // Keep incomplete line in buffer
                  
                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      try {
                        const data = JSON.parse(line.slice(6));
                        
                        switch (data.type) {
                          case 'status':
                            // Status updates handled by streaming
                            break;
                            
                          case 'progress':
                            // Progress updates handled by streaming
                            break;
                            
                          case 'transaction':
                            if (isComponentMounted) {
                              setTransactions(prev => [...prev, data.data]);
                            }
                            break;
                            
                          case 'complete':
                            if (isComponentMounted) {
                              console.log(`Streaming completed: ${data.totalTransactions} transactions`);
                              setError(null);
                              setLoading(false); // Stop loading when complete
                              streamingCompleted = true; // Mark streaming as completed
                              isStreamingCompleted = true; // Mark global streaming as completed
                            }
                            break;
                            
                          case 'error':
                            if (isComponentMounted) {
                              console.warn('Streaming error:', data.message);
                            }
                            break;
                        }
                      } catch (parseError) {
                        console.warn('Failed to parse streaming data:', parseError);
                      }
                    }
                  }
                }
              } catch (streamError) {
                if (isComponentMounted) {
                  console.error('Streaming error:', streamError);
                  setError(`Streaming error: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`);
                }
              } finally {
                if (isComponentMounted) {
                  setLoading(false);
                }
                // Clear any pending timeouts
                if (timeoutId) {
                  clearTimeout(timeoutId);
                }
              }
            };
            
            processStream();
          })
          .catch((error) => {
            if (!isComponentMounted) return; // Don't process if unmounted
            
            // Handle AbortError gracefully
            if (error.name === 'AbortError') {
              if (!isComponentMounted) {
                console.log('Stream aborted due to component unmount - this is normal behavior');
                return;
              }
              // Only retry if it's not a cleanup abort and we haven't exceeded max retries
              if (retryCount < maxRetries && isComponentMounted) {
                retryCount++;
                console.log(`Retrying stream (attempt ${retryCount}/${maxRetries})...`);
                setTimeout(() => {
                  if (isComponentMounted) {
                    streamTransactions();
                  }
                }, 1000); // Reduced wait time to 1 second before retry
              } else {
                console.log('Max retries reached or component unmounted, stopping retries');
                setError('Database connection timeout. Please check your internet connection and try again.');
                setLoading(false);
              }
              return;
            }
            
            // Handle other errors
            console.error('Error streaming transactions:', error);
            setError(`Failed to stream transactions: ${error.message}`);
            setLoading(false);
          });
      } catch (error) {
        if (!isComponentMounted) return; // Don't process if unmounted
        console.error('Error setting up stream request:', error);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        setError(`Failed to setup stream request: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    // Reset completion flag when refresh trigger changes (new files uploaded)
    isStreamingCompleted = false;
    
    streamTransactions();
    
    // Cleanup function
    return () => {
      isComponentMounted = false; // Mark component as unmounted
      isStreamingCompleted = false; // Reset completion flag
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (controller) {
        // Only abort if it's not already aborted
        try {
          controller.abort();
        } catch {
          // Ignore abort errors during cleanup
          console.log('Cleanup abort completed');
        }
      }
    };
    } catch (error) {
      console.error('Error in useEffect setup:', error);
      setError(`Failed to initialize data fetching: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  }, [refreshTrigger]); // Add refreshTrigger as dependency

  // Listen for file upload events and refresh data
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Check if a file was uploaded (this is a simple trigger mechanism)
      if (e.key === 'lastFileUpload' && e.newValue) {
        console.log('File upload detected, refreshing Super Bank data...');
        setRefreshTrigger(prev => prev + 1);
      }
    };

    // Listen for storage events (when localStorage changes in other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Also check for a custom event that can be triggered from file upload
    const handleFileUpload = () => {
      console.log('File upload event received, refreshing Super Bank data...');
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('fileUploaded', handleFileUpload);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('fileUploaded', handleFileUpload);
    };
  }, []);

  // Fetch Super Bank header
  useEffect(() => {
    fetch(`/api/bank-header?bankName=SUPER%20BANK`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.header)) {
          // Ensure 'Tags' is included in the header
          const header = data.header.includes('Tags') ? data.header : [...data.header, 'Tags'];
          setSuperHeader(header);
          setHeaderInputs(header);
        } else {
          setSuperHeader(['Tags']);
          setHeaderInputs(['Tags']);
        }
      })
      .catch(error => {
        console.error('Error fetching bank header:', error);
        // Set default header if fetch fails
        setSuperHeader(['Tags']);
        setHeaderInputs(['Tags']);
      });
  }, []);

  // Fetch all bank header mappings
  useEffect(() => {
    fetch(`/api/bank`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(async (banks: { id: string; bankName: string }[]) => {

        if (!Array.isArray(banks)) return;
        const mappings: { [bankId: string]: BankHeaderMapping & { bankName: string } } = {};
        const idNameMap: { [id: string]: string } = {};
        await Promise.all(
          banks.map(async (bank) => {
            const res = await fetch(`/api/bank-header?bankName=${encodeURIComponent(bank.bankName)}`);
            const data = await res.json();
            if (data && data.mapping) {
              mappings[bank.id] = { ...data, bankName: bank.bankName };
            } else {
              mappings[bank.id] = { id: bank.id, bankId: bank.id, header: [], bankName: bank.bankName };
            }
            idNameMap[bank.id] = bank.bankName;
          })
        );
        setBankMappings(mappings);
        setBankIdNameMap(idNameMap);
      });
  }, []);

  // Fetch all tags
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    fetch('/api/tags?userId=' + userId)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAllTags(data); else setAllTags([]); });
  }, []);



  // Detect text selection in table and which row
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

  // Hide selection button on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (selection) {
        setSelection(null);
      }
    };

    // Add scroll listeners to table container and window
    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener('scroll', handleScroll);
    }
    window.addEventListener('scroll', handleScroll);

    return () => {
      if (tableElement) {
        tableElement.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [selection]);

  // Create tag from selection
  const handleCreateTagFromSelection = async () => {
    if (!selection?.text) return;
    setCreatingTag(true);
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
    } catch (error) {
      setTagCreateMsg(error as string || "Failed to create tag");
      setTimeout(() => setTagCreateMsg(null), 1500);
    } finally {
      setCreatingTag(false);
    }
  };

  // Apply tag to only this transaction row
  const handleApplyTagToRow = async () => {
    if (!pendingTag) return;
    setApplyingTagToRow(true);
    const { tagName, transactionId } = pendingTag;
    const tagObj = allTags.find(t => t.name === tagName);
    if (!tagObj) return setPendingTag(null);
    
    // Find the transaction directly by ID
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) {
      console.error('Transaction not found for ID:', transactionId);
      setTagError('Transaction not found');
      setApplyingTagToRow(false);
      return;
    }
    const tags = Array.isArray(tx.tags) ? [...tx.tags] : [];
    if (!tags.some((t) => t.id === tagObj.id)) tags.push(tagObj);
    try {
      await fetch('/api/transaction/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: tx.id, tags: extractTagIds(tags), bankName: tx.bankName })
      });
      setPendingTag(null);
      setTagCreateMsg("Tag applied to transaction!");
      setTimeout(() => setTagCreateMsg(null), 1500);
      
      // Update local transactions state instead of refetching
      setTransactions(prevTransactions => 
        prevTransactions.map(tx => {
          if (tx.id === transactionId) {
            const existingTags = Array.isArray(tx.tags) ? tx.tags : [];
            if (!existingTags.some(t => t.id === tagObj.id)) {
              return { ...tx, tags: [...existingTags, tagObj] };
            }
          }
          return tx;
        })
      );
    } catch (error) {
      setTagError(error as string || 'Failed to apply tag to transaction');
    } finally {
      setApplyingTagToRow(false);
    }
  };

  // Apply tag to all transactions where selection text is present in ANY field (except tags, case-sensitive, all columns)
  const handleApplyTagToAll = async () => {
    if (!pendingTag) return;
    setApplyingTagToAll(true);
    // Hide the preview modal immediately when starting
    setPendingTag(null);
    
    const { tagName, selectionText } = pendingTag;
    const tagObj = allTags.find(t => t.name === tagName);
    if (!tagObj) return;
    
    // Find all matching transactions first
    const matching = transactions.filter((tx) => {
      // Check all primitive fields except arrays/objects and 'tags' for case-insensitive match
      return Object.entries(tx).some(([key, val]) =>
        key !== 'tags' &&
        ((typeof val === 'string' && val.toLowerCase().includes(selectionText.toLowerCase())) ||
         (typeof val === 'number' && String(val).toLowerCase().includes(selectionText.toLowerCase())))
      );
    });
    
    setMatchingTransactions(matching);
    
    try {
      // Prepare bulk update data
      const bulkUpdates = matching.map(tx => {
        const tags = Array.isArray(tx.tags) ? [...tx.tags] : [];
        if (!tags.some((t) => t.id === tagObj.id)) tags.push(tagObj);
        
        return {
          transactionId: tx.id,
          tags: extractTagIds(tags),
          bankName: tx.bankName
        };
      });
      
      // Use bulk update API
      const response = await fetch('/api/transaction/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: bulkUpdates })
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Bulk update failed');
      }
      
      const result = responseData;
      
      // Handle results
      const failedTransactions = result.failed || [];
      const successfulCount = result.successful || 0;
      
      // Store failed transactions globally
      setFailedTransactions(failedTransactions);
      setShowRetryButton(failedTransactions.length > 0);
      
      // Show detailed results
      if (failedTransactions.length === 0) {
        setTagCreateMsg(`✅ Tag applied to all ${matching.length} matching transactions! (Tag summary updating in background...)`);
      } else {
        setTagCreateMsg(`⚠️ Tag applied to ${successfulCount} transactions. ${failedTransactions.length} failed. (Tag summary updating in background...)`);
        console.error('Failed transactions:', failedTransactions);
      }
      
      setTimeout(() => setTagCreateMsg(null), 5000);
      
      // Update local transactions state instead of refetching
      setTransactions(prevTransactions => 
        prevTransactions.map(tx => {
          if (matching.some(m => m.id === tx.id)) {
            const existingTags = Array.isArray(tx.tags) ? tx.tags : [];
            if (!existingTags.some(t => t.id === tagObj.id)) {
              return { ...tx, tags: [...existingTags, tagObj] };
            }
          }
          return tx;
        })
      );
    } catch (error) {
      setTagError('Failed to apply tag to all matching transactions');
      console.error('Bulk update error:', error);
    } finally {
      setApplyingTagToAll(false);
      setMatchingTransactions([]);
    }
  };



  // Helper to robustly parse Indian-style and scientific notation amounts
  const parseIndianAmount = useCallback((val: string | number | undefined): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      // Remove all commas and spaces
      const cleaned = val.replace(/,/g, '').trim();
      // parseFloat handles scientific notation too
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }, []);

  // Helper to format any value as Indian-style string
  const formatIndianAmount = useCallback((val: string | number | undefined): string => {
    const num = parseIndianAmount(val);
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [parseIndianAmount]);

  // Helper: get value for any column using per-bank conditions
  const getValueForColumn = useCallback((row: TransactionRow, bankId: string, columnName: string): string | number | undefined => {
    const rawConds = bankMappings[bankId]?.conditions;
    const conditions = Array.isArray(rawConds) ? rawConds : [];
    for (const cond of conditions) {
      if (cond.then && cond.then[columnName] !== undefined) {
        // Robust normalization for condition
        const op = cond.if.op;
        const val = row[cond.if.field];
        const cmp = cond.if.value;
        const valStr = (val !== undefined && val !== null) ? String(val).trim() : '';
        const cmpStr = (cmp !== undefined && cmp !== null) ? String(cmp).trim() : '';
        const valNum = valStr === '' ? NaN : !isNaN(Number(valStr)) ? parseFloat(valStr) : NaN;
        const cmpNum = cmpStr === '' ? NaN : !isNaN(Number(cmpStr)) ? parseFloat(cmpStr) : NaN;
        const bothNumeric = !isNaN(valNum) && !isNaN(cmpNum);
        let match = false;
        if (op === 'present') {
          match = valStr !== '';
        } else if (op === 'not_present') {
          match = valStr === '';
        } else if (op === '==') {
          if (bothNumeric) {
            match = valNum === cmpNum;
          } else {
            match = valStr === cmpStr;
          }
        } else if (op === '!=') {
          if (bothNumeric) {
            match = valNum !== cmpNum;
          } else {
            match = valStr !== cmpStr;
          }
        } else if (op === '>=') {
          match = bothNumeric && valNum >= cmpNum;
        } else if (op === '<=') {
          match = bothNumeric && valNum <= cmpNum;
        } else if (op === '>') {
          match = bothNumeric && valNum > cmpNum;
        } else if (op === '<') {
          match = bothNumeric && valNum < cmpNum;
        }
        if (match) {
          const result = cond.then[columnName];
          // If result is a field reference, resolve it
          if (typeof result === 'string' && row[result] !== undefined) {
            const v = row[result];
            if (typeof v === 'string' || typeof v === 'number') {
              return v;
            }
            return undefined;
          }
          if (typeof result === 'string' || typeof result === 'number') {
            return result;
          }
          return undefined;
        }
      }
    }
    // Robust fallback: check mapping, then raw value
    const mapping = bankMappings[bankId]?.mapping;
    if (mapping && mapping[columnName] && row[mapping[columnName]] !== undefined) {
      const v = row[mapping[columnName]];
      if (typeof v === 'string' || typeof v === 'number') {
        return v;
      }
      return undefined;
    }
    if (row[columnName] !== undefined) {
    const v = row[columnName];
      if (typeof v === 'string' || typeof v === 'number') {
        return v;
      }
      return undefined;
    }
    return undefined;
  }, [bankMappings]);

  // Create mappedRowsWithConditions with proper condition evaluation
  const mappedRowsWithConditions = useMemo(() => transactions.map(tx => {
    // Build the mapped row as for the table
    const mapping = bankMappings[tx.bankId]?.mapping || {};
    const reverseMap: Record<string, string> = {};
    Object.entries(mapping).forEach(([bankHeader, superHeader]) => {
      if (superHeader) reverseMap[superHeader] = bankHeader;
    });
    const mappedRow: Record<string, string | number | Tag[] | undefined> = {
      id: tx.id,
      statementId: tx.statementId,
      bankId: tx.bankId,
      accountId: tx.accountId,
    };
    superHeader.forEach(sh => {
      if (sh === 'Tags') {
        const bankTagCol = Object.keys(tx).find(
          key => key.toLowerCase().includes('tag')
        );
        const tags = bankTagCol && Array.isArray(tx[bankTagCol])
          ? tx[bankTagCol] as Tag[]
          : [];
        mappedRow['Tags'] = tags;
        mappedRow['tags'] = tags;
      } else if (sh.toLowerCase() === 'date') {
        // Normalize date
        const bankHeader = reverseMap[sh];
        const value = bankHeader ? tx[bankHeader] : tx[sh];
        mappedRow[sh] = typeof value === 'string' ? convertToISOFormat(value) : value;
      } else if (sh === 'Amount') {
        const rawAmount = getValueForColumn(tx, String(tx.bankId), 'Amount');
        mappedRow.Amount = formatIndianAmount(rawAmount); // always Indian style for UI
        mappedRow.AmountRaw = parseIndianAmount(rawAmount); // for analytics
      } else if (sh === 'Description') {
        // Handle Description field more robustly - try multiple possible field names
        const possibleDescFields = [
          'Description', 'description', 'Narration', 'narration', 
          'Transaction Description', 'transaction description',
          'Particulars', 'particulars', 'Reference', 'reference',
          'Reference No.', 'reference no.', 'Remarks', 'remarks'
        ];
        
        let descValue = '';
        for (const field of possibleDescFields) {
          const bankHeader = reverseMap[field] || field;
          const value = tx[bankHeader];
          if (value && typeof value === 'string' && value.trim() !== '') {
            descValue = value.trim();
            break;
          }
        }
        
        // If still no value, try direct field access
        if (!descValue) {
          for (const field of possibleDescFields) {
            const value = tx[field];
            if (value && typeof value === 'string' && value.trim() !== '') {
              descValue = value.trim();
              break;
            }
          }
        }
        
        // Debug: Log description mapping for first few transactions
        if (tx.id && (tx.id.includes('1') || tx.id.includes('2') || tx.id.includes('3'))) {
          console.log(`🔍 Description mapping for tx ${tx.id}:`, {
            bankId: tx.bankId,
            reverseMap,
            availableFields: Object.keys(tx),
            foundValue: descValue,
            possibleFields: possibleDescFields.map(f => ({ field: f, value: tx[f], mappedValue: tx[reverseMap[f] || f] }))
          });
        }
        
        mappedRow[sh] = descValue;
      } else {
        const bankHeader = reverseMap[sh];
        const value = bankHeader ? tx[bankHeader] : tx[sh];
        mappedRow[sh] = typeof value === 'string' || typeof value === 'number' ? value : '';
      }
    });
    mappedRow.id = tx.id;
    mappedRow.statementId = tx.statementId;
          mappedRow.bankId = tx.bankId;
      mappedRow.accountId = tx.accountId;
      // Ensure account number is present for filtering; fall back to common fields
      mappedRow.accountNumber = (tx as Record<string, unknown>).accountNumber as string
        || (tx as Record<string, unknown>).accountNo as string
        || (tx as Record<string, unknown>).account as string
        || (tx as Record<string, unknown>).userAccountNumber as string
        || (tx.accountId ? String(tx.accountId) : '');
      // Add bank name for searching
      mappedRow.bankName = bankIdNameMap[tx.bankId] || tx.bankId;
      // Apply conditions for Dr./Cr.
      mappedRow['Dr./Cr.'] = getValueForColumn(tx, String(tx.bankId), 'Dr./Cr.');
      return mappedRow as Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string; bankName?: string };
  }), [transactions, bankMappings, superHeader, bankIdNameMap, formatIndianAmount, getValueForColumn, parseIndianAmount]);

  // First apply search, date, bank, Dr/Cr, account, and tagged/untagged filters (but not tagFilters yet)
  const baseFilteredRows = mappedRowsWithConditions.filter((row) => {
    // Search
    const searchMatch =
      !search ||
      (searchField === 'all'
        ? Object.values(row).some((val) => {
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(search.toLowerCase());
        } else if (Array.isArray(val)) {
              return val
                .map((v) =>
                  typeof v === 'object' && v !== null && 'name' in v
                    ? (v as Tag).name
                    : String(v)
                )
                .join(', ')
                .toLowerCase()
                .includes(search.toLowerCase());
        }
        return false;
          })
        : String(row[searchField === 'Bank Name' ? 'bankName' : searchField] || '')
            .toLowerCase()
            .includes(search.toLowerCase()));
    // Date range (try to find a date column)
    let dateMatch = true;
    const dateCol = superHeader.find((h) => h.toLowerCase().includes('date'));
    if (dateCol && (dateRange.from || dateRange.to)) {
      const rowDate = row[dateCol];
      if (typeof rowDate === 'string' && rowDate.trim()) {
        // Convert any date format directly to ISO format (YYYY-MM-DD) for comparison
        let comparisonDate = convertToISOFormat(rowDate.trim());
        
        if (!comparisonDate || comparisonDate === rowDate.trim()) {
          // If conversion failed, try to parse with parseDate function
          const parsedDate = parseDate(rowDate.trim());
          if (parsedDate && !isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1970) {
            const dd = String(parsedDate.getDate()).padStart(2, '0');
            const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const yyyy = parsedDate.getFullYear();
            comparisonDate = `${yyyy}-${mm}-${dd}`;
          } else {
            console.warn(`Unrecognized date format: ${rowDate} in column ${dateCol}`);
            return false; // Skip this row if date cannot be parsed
          }
        }
        
        // Apply date range filtering
        if (dateRange.from && comparisonDate < dateRange.from) {
          dateMatch = false;
        }
        if (dateRange.to && comparisonDate > dateRange.to) {
          dateMatch = false;
        }
      }
    }
    // Tagged/Untagged filter
    if (sortOrder === 'tagged') {
      const tags = (row['Tags'] || row['tags']) as Tag[] | undefined;
      if (!Array.isArray(tags) || tags.length === 0) return false;
    }
    if (sortOrder === 'untagged') {
      const tags = (row['Tags'] || row['tags']) as Tag[] | undefined;
      if (Array.isArray(tags) && tags.length > 0) return false;
    }

    // Bank filter
    let bankMatch = true;
    if (bankFilter) {
      const bankId = row.bankId;
      const bankDisplayName = bankIdNameMap[bankId];
      bankMatch = bankDisplayName === bankFilter;
    }

    // Dr./Cr. filter
    let drCrMatch = true;
    if (drCrFilter) {
      const drCrValue = row['Dr./Cr.'] || row['Dr. Cr.'] || row['Dr/Cr'];
      drCrMatch = drCrValue === drCrFilter;
    }

    // Account filter (match by account number if present)
    let accountMatch = true;
    if (accountFilter) {
      // Try multiple possible account number fields
      const enriched = (row as Record<string, unknown>).accountNumber || (row as Record<string, unknown>).AccountNumber;
      let val: string | undefined = typeof enriched === 'string' ? enriched : undefined;
      
      if (!val) {
        // Try to find account number from any header containing 'account'
        const accountHeader = superHeader.find(h => h.toLowerCase().includes('account'));
        if (accountHeader) {
          const rv = row[accountHeader];
          if (typeof rv === 'string' || typeof rv === 'number') {
            val = String(rv);
            // If the value contains " - " (like "hvhvhvjhjdcx - HDFC"), extract just the account number part
            if (val.includes(' - ')) {
              val = val.split(' - ')[0];
            }
          }
        }
      }
      
      // Also try to get account number from the enriched data
      if (!val && row.accountId) {
        val = String(row.accountId);
      }
      
      // Match the account number (accountFilter contains just the account number, not the full "account - bank" string)
      accountMatch = val ? String(val) === accountFilter : false;
    }

    return searchMatch && dateMatch && bankMatch && drCrMatch && accountMatch;
  });

  // Now apply tag filters (OR logic) on top of baseFilteredRows
  const filteredRows = tagFilters.length > 0
    ? baseFilteredRows.filter(row => {
        const tags = row.tags;
        if (!Array.isArray(tags)) return false;
        return tags.some(t => t && t.name && tagFilters.includes(t.name));
      })
    : baseFilteredRows;



  // Calculate stats from filtered transactions
  const stats = useMemo(() => {
    if (filteredRows.length === 0) {
      return { totalBanks: 0, totalAccounts: 0 };
    }
    
    // Count unique banks from filtered transactions
    const uniqueBankIds = new Set(filteredRows.map(tx => tx.bankId));
    const totalBanks = uniqueBankIds.size;
    
    // Count unique accounts from filtered transactions
    const uniqueAccountIds = new Set(filteredRows.map(tx => tx.accountId));
    const totalAccounts = uniqueAccountIds.size;
    
    return { totalBanks, totalAccounts };
  }, [filteredRows]);

  // Update state when stats change
  useEffect(() => {
    setTotalBanks(stats.totalBanks);
    setTotalAccounts(stats.totalAccounts);
  }, [stats]);



  // Filtered and searched rows with table sorting
  const sortedAndFilteredRows = [...filteredRows].sort((a, b) => {
    // If table sorting is active, use that instead of date sorting
    if (tableSortColumn && tableSortDirection) {
      if (tableSortColumn.toLowerCase() === 'amount') {
        const amountA = parseIndianAmount(a['Amount'] as string | number);
        const amountB = parseIndianAmount(b['Amount'] as string | number);
        
        if (tableSortDirection === 'asc') {
          return amountA - amountB;
        } else {
          return amountB - amountA;
        }
      }
      
      // Handle date sorting
      if (tableSortColumn.toLowerCase() === 'date') {
        const dateCol = superHeader.find((h) => h.toLowerCase().includes('date'));
        if (dateCol) {
          // Dates are already stored in ISO format, so we can use them directly
          const dateA = a[dateCol] as string;
          const dateB = b[dateCol] as string;
          
          if (tableSortDirection === 'asc') {
            return new Date(dateA).getTime() - new Date(dateB).getTime(); // Oldest to Newest
          } else {
            return new Date(dateB).getTime() - new Date(dateA).getTime(); // Newest to Oldest
          }
        }
      }
    }
    
    // Default to date sorting based on sortOrder
    const dateCol = superHeader.find((h) => h.toLowerCase().includes('date'));
    if (dateCol) {
      // Dates are already stored in ISO format, so we can use them directly
      const dateA = a[dateCol] as string;
      const dateB = b[dateCol] as string;
      if (sortOrder === 'desc') {
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      } else {
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      }
    }
    return 0; // No sorting if no date column found
  });

  // Handle row selection
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
    else setSelectedRows(new Set(filteredRows.map(tx => tx.id)));
    setSelectAll(!selectAll);
  };
  useEffect(() => {
    setSelectAll(
      filteredRows.length > 0 && filteredRows.every((_, i) => selectedRows.has(filteredRows[i].id))
    );
  }, [selectedRows, filteredRows]);



  // Tagging logic
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
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Bulk update failed');
      }
      setTagSuccess('Tag added!');
      setSelectedTagId("");
      setSelectedRows(new Set());
      setTimeout(() => setTagSuccess(null), 1500);
      
      // Update local transactions state instead of refetching
      setTransactions(prevTransactions => 
        prevTransactions.map(tx => {
          if (selectedRows.has(tx.id)) {
            // Add the new tag to this transaction if it doesn't already have it
            const existingTags = Array.isArray(tx.tags) ? tx.tags : [];
            const tagObj = allTags.find(t => t.id === selectedTagId);
            if (tagObj && !existingTags.some(t => t.id === tagObj.id)) {
              return { ...tx, tags: [...existingTags, tagObj] };
            }
          }
          return tx;
        })
      );
    } catch (e) {
      setTagError(e instanceof Error ? e.message : 'Failed to add tag');
    } finally {
      setTagging(false);
      setLoading(false);
    }
  };

  // Handler to remove a tag from a transaction
  const handleRemoveTag = async (rowIdx: number, tagId: string) => {
    const row = sortedAndFilteredRows[rowIdx];
    if (!row || !row.id) return;
    const tx = transactions.find(t => t.id === row.id);
    if (!tx) return;
    
    // Find the tag name for the confirmation message
    const tagToRemove = Array.isArray(tx.tags) ? tx.tags.find(t => t.id === tagId) : null;
    const tagName = tagToRemove?.name || 'this tag';
    
    // Show confirmation dialog
    const confirmed = window.confirm(`Are you sure you want to remove the tag "${tagName}" from this transaction?`);
    if (!confirmed) return;
    
    const tags = Array.isArray(tx.tags) ? tx.tags.filter((t) => t.id !== tagId) : [];
    if (tags.length === 0) {
      setRemovingTag('Removing all tags from transaction...');
    } else {
      setRemovingTag(true);
    }
    try {
      await fetch('/api/transaction/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: tx.id, tags: extractTagIds(tags), bankName: tx.bankName })
      });
      // Update local transactions state instead of refetching
      setTransactions(prevTransactions => 
        prevTransactions.map(tx => {
          if (tx.id === row.id) {
            // Remove the specific tag from this transaction
            const updatedTags = Array.isArray(tx.tags) 
              ? tx.tags.filter(t => t.id !== tagId)
              : [];
            return { ...tx, tags: updatedTags };
          }
          return tx;
        })
      );
      
      setTagCreateMsg('Tag removed!');
      setTimeout(() => setTagCreateMsg(null), 1500);
    } catch (error) {
      setTagError(error as string || 'Failed to remove tag');
    } finally {
      setRemovingTag(false);
    }
  };

  // Analytics calculations using mappedRowsWithConditions (filteredRows already contains the filtered version)
  const totalAmount = filteredRows.reduce((sum, row) => {
    const amountRaw = typeof row.AmountRaw === 'number' ? row.AmountRaw : 0;
    
    // For HDFC and similar banks that use separate Deposit/Withdrawal columns
    if (amountRaw === 0) {
      const depositAmt = parseFloat((row['Deposit Amt.'] as string) || (row['Deposit Amt'] as string) || (row['Deposit Amount'] as string) || '0') || 0;
      const withdrawalAmt = parseFloat((row['Withdrawal Amt.'] as string) || (row['Withdrawal Amt'] as string) || (row['Withdrawal Amount'] as string) || '0') || 0;
      return sum + Math.abs(depositAmt) + Math.abs(withdrawalAmt);
    }
    
    return sum + Math.abs(amountRaw);
  }, 0);

  // Calculate DR/CR totals for filteredRows with HDFC support
  let totalCredit = 0, totalDebit = 0;
  filteredRows.forEach(row => {
    const amount = typeof row.AmountRaw === 'number' && isFinite(row.AmountRaw) ? row.AmountRaw : 0;
    let crdr = row['Dr./Cr.'];
    if (typeof crdr === 'string') {
      crdr = crdr.trim().toUpperCase();
    } else {
      crdr = '';
    }
    
    // For HDFC and similar banks that use separate Deposit/Withdrawal columns
    if (amount === 0) {
      const depositAmt = parseFloat((row['Deposit Amt.'] as string) || (row['Deposit Amt'] as string) || (row['Deposit Amount'] as string) || '0') || 0;
      const withdrawalAmt = parseFloat((row['Withdrawal Amt.'] as string) || (row['Withdrawal Amt'] as string) || (row['Withdrawal Amount'] as string) || '0') || 0;
      if (depositAmt > 0) {
        totalCredit += Math.abs(depositAmt);
      }
      if (withdrawalAmt > 0) {
        totalDebit += Math.abs(withdrawalAmt);
      }
    } else {
      // Traditional Dr/Cr logic
      if (crdr === 'CR') {
        totalCredit += Math.abs(amount);
      } else if (crdr === 'DR') {
        totalDebit += Math.abs(amount);
      }
    }
  });
  if (!isFinite(totalCredit)) totalCredit = 0;
  if (!isFinite(totalDebit)) totalDebit = 0;

  // Log analytics data when calculations are complete
  useEffect(() => {
    if (filteredRows.length > 0 && !loading) {
      console.log('=== ANALYTICS DATA SUMMARY ===');
      console.log('Total Amount:', totalAmount);
      console.log('Total Credit:', totalCredit);
      console.log('Total Debit:', totalDebit);
      console.log('Total Transactions:', filteredRows.length);
      console.log('Total Banks:', stats.totalBanks);
      console.log('Total Accounts:', stats.totalAccounts);
      console.log('=====================================');


    }
  }, [filteredRows, totalAmount, totalCredit, totalDebit, stats.totalBanks, stats.totalAccounts, loading, mappedRowsWithConditions]);

  let tagged = 0, untagged = 0;
  filteredRows.forEach(row => {
    const tags = (row['Tags'] || row['tags']) as Tag[] | undefined;
    if (Array.isArray(tags) && tags.length > 0) tagged++;
    else untagged++;
  });

  // Automatically clear tagCreateMsg after 2 seconds
  useEffect(() => {
    if (tagCreateMsg) {
      const timeout = setTimeout(() => setTagCreateMsg(null), 2000);
      return () => clearTimeout(timeout);
    }
  }, [tagCreateMsg]);

  // Automatically clear tagError after 3 seconds
  useEffect(() => {
    if (tagError) {
      const timeout = setTimeout(() => setTagError(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [tagError]);

  // Handler for column reordering
  const handleReorderHeaders = (newHeaders: string[]) => {
    setSuperHeader(newHeaders);
  };

  // Handle table column sorting
  const handleTableSort = (column: string, direction: 'asc' | 'desc') => {
    console.log('Table sort triggered:', column, direction);
    setTableSortColumn(column);
    setTableSortDirection(direction);
  };

  // Date filtering function
  const handleDateFilter = (direction: 'newest' | 'oldest' | 'clear') => {
    console.log('Date filter triggered:', direction);
    if (direction === 'clear') {
      setTableSortColumn('');
      setTableSortDirection('asc');
    } else {
      setTableSortColumn('Date');
      setTableSortDirection(direction === 'newest' ? 'desc' : 'asc');
    }
  };

  // Bank filtering function
  const handleBankFilter = (bankName: string | 'clear') => {
    if (bankName === 'clear') {
      setBankFilter('');
    } else {
      setBankFilter(bankName);
    }
  };

  // Dr./Cr. filtering function
  const handleDrCrFilter = (type: 'DR' | 'CR' | 'clear') => {
    if (type === 'clear') {
      setDrCrFilter('');
    } else {
      setDrCrFilter(type);
    }
  };

  // Get available banks for dropdown
  const availableBanks = useMemo(() => {
    // Prefer rows already filtered by non-tag filters (includes Account filter)
    const rows = baseFilteredRows && baseFilteredRows.length > 0 ? baseFilteredRows : mappedRowsWithConditions;
    const names = new Set<string>();
    rows.forEach(row => {
      const bankName = (row as Record<string, unknown>).bankName as string || bankIdNameMap[(row as Record<string, unknown>).bankId as string] || ((row as Record<string, unknown>).bankId as string);
      if (bankName) names.add(bankName);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [baseFilteredRows, mappedRowsWithConditions, bankIdNameMap]);

  // Get available accounts for dropdown (respect current non-tag filters, including bank)
  const availableAccounts = useMemo(() => {
    const list: Array<{ bankName: string; accountNumber: string; count: number }> = [];
    const counter: { [key: string]: { bankName: string; accountNumber: string; count: number } } = {};

    // Respect current filters for bank/search/date/drcr etc. Use baseFilteredRows so Account No. list matches the visible bank
    const rows = baseFilteredRows && baseFilteredRows.length > 0 ? baseFilteredRows : mappedRowsWithConditions;

    rows.forEach(row => {
      const bankName = (row as Record<string, unknown>).bankName as string || (bankIdNameMap[(row as Record<string, unknown>).bankId as string] || (row as Record<string, unknown>).bankId as string);
      let accountNumber = (row as Record<string, unknown>).accountNumber as string;
      if (!accountNumber) {
        // try any header that includes 'account'
        const accountHeader = superHeader.find(h => h.toLowerCase().includes('account'));
        if (accountHeader) {
          const v = (row as Record<string, unknown>)[accountHeader];
          if (typeof v === 'string' || typeof v === 'number') accountNumber = String(v).split(' - ')[0];
        }
      }
      if (!accountNumber) return;
      const key = bankName + '|' + accountNumber;
      if (!counter[key]) counter[key] = { bankName, accountNumber, count: 0 };
      counter[key].count += 1;
    });

    Object.values(counter).forEach(v => list.push(v));
    list.sort((a, b) => a.bankName.localeCompare(b.bankName) || a.accountNumber.localeCompare(b.accountNumber));
    return list;
  }, [baseFilteredRows, mappedRowsWithConditions, superHeader, bankIdNameMap]);

  // Clear all filters function
  const clearAllFilters = () => {
    setBankFilter('');
    setDrCrFilter('');
    setAccountFilter('');
    setSearch('');
    setDateRange({ from: '', to: '' });
    setTagFilters([]);
    setTableSortColumn('');
    setTableSortDirection('asc');
  };

  // Account filter handler
  const handleAccountFilter = (accountNumber: string | 'clear') => {
    if (accountNumber === 'clear') setAccountFilter('');
    else setAccountFilter(accountNumber);
  };

  // Handler to apply tag to all matching transactions from context menu
  const handleApplyTagToAllFromMenu = (tagName: string) => {
    setPendingTag({ tagName, rowIdx: -1, selectionText: tagName });
    setTimeout(() => handleApplyTagToAll(), 0); // ensure pendingTag is set before running
  };

  // Compute tag statistics for tag pills based on baseFilteredRows (ignore current tag filters)
  const filteredTagStats = useMemo(() => {
    const stats: Record<string, number> = {};
    
    // Count tags in filtered rows
    baseFilteredRows.forEach(row => {
      if (Array.isArray(row.tags)) {
        row.tags.forEach(tag => {
          if (tag && tag.name) {
            stats[tag.name] = (stats[tag.name] || 0) + 1;
          }
        });
      }
    });
    
    // Ensure all tags show a count (including zero)
    allTags.forEach(tag => {
      if (!(tag.name in stats)) {
        stats[tag.name] = 0;
      }
    });
    
    return stats;
  }, [baseFilteredRows, allTags]);

  // Sort allTags by usage count descending (use filteredTagStats for current view)
  const sortedTags = useMemo(() => {
    return [...allTags].sort((a, b) => (filteredTagStats[b.name] || 0) - (filteredTagStats[a.name] || 0));
  }, [allTags, filteredTagStats]);

  // New handleTagDeleted function
  const handleTagDeleted = () => {
    // Refetch all tags (necessary when tags are deleted)
    const userId = localStorage.getItem('userId');
    fetch('/api/tags?userId=' + userId)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAllTags(data); else setAllTags([]); });

    // Also refresh transactions so removed tag chips disappear immediately
    setRefreshTrigger(prev => prev + 1);

    // Notify other pages (e.g., Transactions tab) to refresh too
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tagsRemovedFromTransactions', { detail: { source: 'super-bank' } }));
    }
  };

  // Handle tagged/untagged click filters
  const handleTaggedClick = () => {
    // Toggle: if already showing tagged, clear filter; otherwise show tagged
    if (sortOrder === 'tagged') {
      setSortOrder('desc'); // Clear filter and show all transactions
    } else {
      setTagFilters([]); // Clear any existing tag filters
      setSortOrder('tagged');
    }
  };

  const handleUntaggedClick = () => {
    // Toggle: if already showing untagged, clear filter; otherwise show untagged
    if (sortOrder === 'untagged') {
      setSortOrder('desc'); // Clear filter and show all transactions
    } else {
      setTagFilters([]); // Clear any existing tag filters
      setSortOrder('untagged');
    }
  };




  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      fetch(`/api/users?id=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.email) setUserEmail(data.email);
        })
        .catch(() => setUserEmail(null));
    }
  }, []);

  useEffect(() => {
    if (
      transactions.length > 0 &&
      Object.keys(bankMappings).length > 0 &&
      superHeader.length > 0
    ) {
      console.log('Mapped Rows with Condition Values (after all data loaded):', mappedRowsWithConditions);
    }
  }, [transactions, bankMappings, superHeader, mappedRowsWithConditions]);

  const handleHeaderSave = async () => {
    setHeaderLoading(true);
    setHeaderError(null);
    setHeaderSuccess(null);
    const headerArr = headerInputs.map(h => h && h.trim()).filter(Boolean);
    if (!headerArr.length) {
      setHeaderError("Header cannot be empty");
      setHeaderLoading(false);
      return;
    }
    // Ensure 'Tags' is included
    if (!headerArr.includes('Tags')) {
      headerArr.push('Tags');
    }
    try {
      const res = await fetch("/api/bank-header", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName: "SUPER BANK", bankId: null, header: headerArr })
      });
      if (!res.ok) throw new Error("Failed to save header");
      setSuperHeader(headerArr);
      setHeaderSuccess("Header saved!");
      setHeaderEditing(false);
    } catch {
      setHeaderError("Failed to save header");
    } finally {
      setHeaderLoading(false);
    }
  };

  const handleHeaderInputChange = (idx: number, value: string) => {
    setHeaderInputs(inputs => inputs.map((h, i) => i === idx ? value : h));
  };
  const handleAddHeaderInput = () => {
    setHeaderInputs(inputs => [...inputs, ""]);
  };
  const handleRemoveHeaderInput = (idx: number) => {
    setHeaderInputs(inputs => inputs.filter((_, i) => i !== idx));
  };



  useEffect(() => {
    console.log('BANKS:', bankIdNameMap);
  }, [bankIdNameMap]);

  // Fetch account information when report modal opens
  useEffect(() => {
    if (reportOpen && filteredRows.length > 0) {
      fetchAccountInfoAndMerge(filteredRows).then(setTransactionsWithAccountInfo);
    }
  }, [reportOpen, filteredRows]);

  // Add this handler in SuperBankPage
  const handleCreateTag = async (name: string) => {
    if (!name || typeof name !== 'string') {
      console.error('handleCreateTag called with invalid name:', name);
      return;
    }
    const trimmed = name.trim().toLowerCase();
    // Check for duplicate (case-insensitive, trimmed)
    const existing = allTags.find(tag => tag.name && tag.name.trim().toLowerCase() === trimmed);
    if (existing) {
      setSelectedTagId(existing.id);
      setTimeout(() => handleAddTag(), 0);
      return existing.id;
    }
    // Create tag in backend - color will be auto-assigned
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
      const existingTag = Array.isArray(existingTags) ? existingTags.find(t => t.name.toLowerCase() === trimmed) : null;
      if (existingTag) {
        setSelectedTagId(existingTag.id);
        setTimeout(() => handleAddTag(), 0);
        return existingTag.id;
      }
      throw new Error('Tag already exists');
    }
    
    if (!res.ok) throw new Error('Failed to create tag');
    const tag = await res.json();
    setAllTags(prev => [...prev, tag]);
    setSelectedTagId(tag.id);
    setTimeout(() => handleAddTag(), 0);
    return tag.id;
  };

  // Retry failed transactions
  const handleRetryFailedTransactions = async () => {
    if (failedTransactions.length === 0) return;
    
    setApplyingTagToAll(true);
    
    try {
      // Find the tag that was being applied (from the last operation)
      const tagObj = allTags.find(t => t.name === pendingTag?.tagName);
      if (!tagObj) {
        setTagError('Could not find the tag to retry');
        return;
      }
      
      // Prepare bulk update data for failed transactions
      const bulkUpdates = failedTransactions.map(failedTx => {
        const tx = transactions.find(t => t.id === failedTx.id);
        if (!tx) return null;
        
        const tags = Array.isArray(tx.tags) ? [...tx.tags] : [];
        if (!tags.some((t) => t.id === tagObj.id)) tags.push(tagObj);
        
        return {
          transactionId: tx.id,
          tags: extractTagIds(tags),
          bankName: tx.bankName
        };
      }).filter(Boolean);
      
      // Use bulk update API
      const response = await fetch('/api/transaction/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: bulkUpdates })
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Bulk retry failed');
      }
      
      const result = responseData;
      
      // Handle results
      const retryFailed = result.failed || [];
      const retrySuccessfulCount = result.successful || 0;
      
      setFailedTransactions(retryFailed);
      setShowRetryButton(retryFailed.length > 0);
      
      if (retryFailed.length === 0) {
        setTagCreateMsg(`✅ Retry successful! All ${failedTransactions.length} transactions updated.`);
      } else {
        setTagCreateMsg(`⚠️ Retry: ${retrySuccessfulCount} succeeded, ${retryFailed.length} still failed.`);
      }
      
      setTimeout(() => setTagCreateMsg(null), 3000);
      
      // Update local transactions state instead of refetching
      setTransactions(prevTransactions => 
        prevTransactions.map(tx => {
          const failedTx = failedTransactions.find(f => f.id === tx.id);
          if (failedTx) {
            // Add the tag to this transaction if it doesn't already have it
            const existingTags = Array.isArray(tx.tags) ? tx.tags : [];
            const tagObj = allTags.find(t => t.name === pendingTag?.tagName);
            if (tagObj && !existingTags.some(t => t.id === tagObj.id)) {
              return { ...tx, tags: [...existingTags, tagObj] };
            }
          }
          return tx;
        })
      );
    } catch (error) {
      setTagError('Failed to retry failed transactions');
      console.error('Bulk retry error:', error);
    } finally {
      setApplyingTagToAll(false);
    }
  };

  // Clear failed transactions state
  const handleClearFailedTransactions = () => {
    setFailedTransactions([]);
    setShowRetryButton(false);
  };

  // Show remove tags confirmation modal
  const handleRemoveTagsClick = () => {
    if (selectedRows.size === 0) return;
    
    // Get all unique tags from selected transactions
    const allTagsInSelection = new Set<string>();
    Array.from(selectedRows).forEach(id => {
      const tx = transactions.find(t => t.id === id);
      if (tx && Array.isArray(tx.tags)) {
        tx.tags.forEach(tag => {
          if (tag && tag.name) {
            allTagsInSelection.add(tag.name);
          }
        });
      }
    });
    
    // If only one tag type across all selected transactions, select it by default
    if (allTagsInSelection.size === 1) {
      setSelectedTagsToRemove(allTagsInSelection);
    } else {
      setSelectedTagsToRemove(new Set()); // Let user choose
    }
    
    setShowRemoveTagsConfirm(true);
  };

  // Remove tags from selected transactions
  const handleRemoveTagsFromSelected = async () => {
    if (selectedRows.size === 0 || selectedTagsToRemove.size === 0) return;
    
    setShowRemoveTagsConfirm(false);
    setRemovingTagsFromSelected(true);
    setTagError(null);
    setTagSuccess(null);
    
    try {
      // Prepare bulk update data - remove selected tags only
      const bulkUpdates = Array.from(selectedRows).map(id => {
        const tx = transactions.find(t => t.id === id);
        if (!tx) return null;
        
        // Filter out the tags that user wants to remove
        const tagsToKeep = Array.isArray(tx.tags) 
          ? tx.tags.filter(tag => !selectedTagsToRemove.has(tag.name))
          : [];
        
        return {
          transactionId: tx.id,
          tags: tagsToKeep.map(tag => tag.id), // Keep only the tags not selected for removal
          bankName: tx.bankName
        };
      }).filter(Boolean);
      
      // Use bulk update API
      const response = await fetch('/api/transaction/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: bulkUpdates })
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Bulk update failed');
      }
      
      const result = responseData;
      
      // Handle results
      const failedTransactions = result.failed || [];
      const successfulCount = result.successful || 0;
      
      if (failedTransactions.length === 0) {
        const tagNames = Array.from(selectedTagsToRemove).join(', ');
        setTagSuccess(`✅ Tags "${tagNames}" removed from ${successfulCount} transactions!`);
      } else {
        setTagError(`⚠️ Tags removed from ${successfulCount} transactions. ${failedTransactions.length} failed.`);
      }
      
      setTimeout(() => {
        setTagSuccess(null);
        setTagError(null);
      }, 3000);
      
      // Update local transactions state instead of refetching
      setTransactions(prevTransactions => 
        prevTransactions.map(tx => {
          if (selectedRows.has(tx.id)) {
            // Remove the selected tags from this transaction
            const updatedTags = Array.isArray(tx.tags) 
              ? tx.tags.filter(tag => !selectedTagsToRemove.has(tag.name))
              : [];
            return { ...tx, tags: updatedTags };
          }
          return tx;
        })
      );
      
      // Clear selection and tag selection
      setSelectedRows(new Set());
      setSelectAll(false);
      setSelectedTagsToRemove(new Set());
    } catch (error) {
      setTagError('Failed to remove tags from selected transactions');
      console.error('Bulk remove tags error:', error);
    } finally {
      setRemovingTagsFromSelected(false);
    }
  };

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full py-2 sm:py-3 px-2 sm:px-3">
        <div className="max-w-full mx-auto flex flex-col">
        {/* New Super Bank Header with Logo */}
        <div className="flex flex-row items-center justify-between gap-2 mb-2 sm:mb-3">
          <div className="flex items-center gap-2" />
          <div className="flex items-center gap-2" />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800">Error Loading Data</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  // Retry fetching data
                  const userId = localStorage.getItem("userId") || "";
                  if (userId) {
                    fetch(`/api/transactions/all?userId=${userId}&fetchAll=true`)
                      .then(res => res.json())
                      .then(data => {
                        if (Array.isArray(data)) {
                          setTransactions(data);
                          setError(null);
                        } else {
                          setError(data.error || "Failed to fetch transactions");
                        }
                      })
                      .catch(err => setError(`Failed to fetch transactions: ${err.message}`))
                      .finally(() => setLoading(false));
                  }
                }}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}


        {/* Super Bank Header Display and Edit - toggled by button */}
        {showHeaderSection && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 rounded-lg shadow relative">
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <button
                className="text-blue-700 hover:text-blue-900 text-xl font-bold"
                onClick={() => setShowHeaderSection(false)}
                title="Close"
              >
                ×
              </button>
              {userEmail === "nitesh.inkhub@gmail.com" && !headerEditing && (
                <button
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs flex items-center"
                  onClick={() => setHeaderEditing(true)}
                  title="Edit Header"
                >
                  <RiEdit2Line size={16} />
                </button>
              )}
            </div>
            {/* Removed small 'Super Bank Header' heading to declutter above analytics */}
            <div className="mb-2 text-xs sm:text-sm text-gray-700">
              <span className="font-semibold">Current Header:</span>
              <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                {superHeader.length > 0 ? (
                  superHeader.map((col, idx) => (
                    <span
                      key={idx}
                      className="px-2 sm:px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full border border-blue-200 shadow text-xs font-medium"
                    >
                      {col}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">No header set</span>
                )}
              </div>
            </div>
            {headerEditing && (
              <form onSubmit={handleHeaderSave} className="flex flex-col gap-2 mt-3 sm:mt-4">
                <label className="block text-xs font-medium text-blue-700 mb-1">Edit Header Columns</label>
                <div className="flex flex-wrap gap-2 sm:gap-3 items-center bg-white/70 p-2 sm:p-3 rounded border border-blue-100 shadow-sm">
                  {headerInputs.map((header, idx) => (
                    <div
                      key={idx}
                      className={`relative group flex-1 min-w-[120px] ${dragOverIdx === idx ? 'ring-2 ring-blue-400' : ''}`}
                      draggable
                      onDragStart={() => setDraggedIdx(idx)}
                      onDragOver={e => {
                        e.preventDefault();
                        setDragOverIdx(idx);
                      }}
                      onDrop={e => {
                        e.preventDefault();
                        if (draggedIdx !== null) {
                          const newOrder = reorder(headerInputs, draggedIdx, idx);
                          setHeaderInputs(newOrder);
                        }
                        setDraggedIdx(null);
                        setDragOverIdx(null);
                      }}
                      onDragEnd={() => {
                        setDraggedIdx(null);
                        setDragOverIdx(null);
                      }}
                    >
                      <input
                        type="text"
                        value={header}
                        onChange={e => handleHeaderInputChange(idx, e.target.value)}
                        className="w-full rounded border border-blue-200 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder={`Header ${idx + 1}`}
                        disabled={headerLoading}
                      />
                      {headerInputs.length > 1 && (
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                          title="Remove"
                          onClick={() => handleRemoveHeaderInput(idx)}
                          tabIndex={-1}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xl font-bold shadow"
                    onClick={handleAddHeaderInput}
                    title="Add header column"
                    disabled={headerLoading}
                    style={{ alignSelf: 'center' }}
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <button
                    type="submit"
                    className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold disabled:opacity-50 w-full sm:w-auto"
                    disabled={headerLoading}
                  >
                    {headerLoading ? "Saving..." : "Save Header"}
                  </button>
                  <button
                    type="button"
                    className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg shadow hover:bg-gray-300 transition-all font-semibold w-full sm:w-auto"
                    onClick={() => setHeaderEditing(false)}
                    disabled={headerLoading}
                  >
                    Cancel
                  </button>
                </div>
                {headerError && <div className="text-red-600 mt-2 text-sm">{headerError}</div>}
                {headerSuccess && <div className="text-green-600 mt-2 text-sm">{headerSuccess}</div>}
              </form>
            )}
          </div>
        )}
        {/* Analytics summary above controls */}
        {filteredRows.length > 0 && (
          <AnalyticsSummary
            totalAmount={totalAmount}
            totalCredit={totalCredit}
            totalDebit={totalDebit}
            totalTransactions={filteredRows.length}
            totalBanks={totalBanks}
            totalAccounts={totalAccounts}
            showBalance={true}
            transactions={sortedAndFilteredRows}
          />
        )}





        {/* Tag filter pills section below controls */}
        <div className="w-full overflow-visible relative">
          <TagFilterPills
            allTags={sortedTags}
            tagFilters={tagFilters}
            onToggleTag={tagName => setTagFilters(filters => filters.includes(tagName) ? filters.filter(t => t !== tagName) : [...filters, tagName])}
            onClear={() => setTagFilters([])}
            onTagDeleted={() => handleTagDeleted()}
            tagStats={filteredTagStats}
            onApplyTagToAll={handleApplyTagToAllFromMenu}
            tagged={tagged}
            untagged={untagged}
            totalTags={allTags.length}
            selectedCount={sortedAndFilteredRows.filter(tx => selectedRows.has(tx.id)).length}
            selectedTagId={selectedTagId}
            onTagChange={setSelectedTagId}
            onAddTag={handleAddTag}
            tagging={tagging}
            tagError={tagError}
            tagSuccess={tagSuccess}
            onCreateTag={handleCreateTag}
            onTaggedClick={handleTaggedClick}
            onUntaggedClick={handleUntaggedClick}
            currentSortOrder={sortOrder}
            onRemoveTags={handleRemoveTagsClick}
            removeTagsDisabled={tagging}
          />
        </div>


                                 {/* Filter box below stats, wider on PC */}
                 <TransactionFilterBar
           search={search}
           onSearchChange={setSearch}
           dateRange={dateRange}
           onDateRangeChange={setDateRange}
           onDownload={() => setReportOpen(true)}
           downloadDisabled={false}
           onRefresh={() => setRefreshTrigger(prev => prev + 1)}
           refreshDisabled={loading}
           onOpenHeader={() => setShowHeaderSection(true)}
           searchField={searchField}
           onSearchFieldChange={setSearchField}
           searchFieldOptions={['all', ...superHeader.filter(header => !['Bank Name', 'Date', 'Dr./Cr.', 'Amount'].includes(header))]}
           selectedCount={selectedRows.size}
           onDeselectAll={() => {
             setSelectedRows(new Set());
             setSelectAll(false);
           }}
           availableDateSpanText={(() => {
             if (!filteredRows.length) return '';
             const dates: number[] = [];
             for (const row of filteredRows) {
               const r = row as Record<string, unknown>;
               const dRaw = (r['Date'] as string) || (r['date'] as string) || (r['createdAt'] as string) || '';
               const d = new Date(String(dRaw));
               if (!isNaN(d.getTime())) dates.push(d.getTime());
             }
             if (!dates.length) return '';
             const min = new Date(Math.min(...dates));
             const max = new Date(Math.max(...dates));
             const fmt = (dt: Date) => dt.toLocaleDateString('en-GB');
             return `${fmt(min)} – ${fmt(max)}`;
           })()}
         />

        {/* Active filters indicator */}
        {(bankFilter || accountFilter || drCrFilter || search || tagFilters.length > 0) && (
          <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
            <span>Active filters:</span>
            {bankFilter && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                Bank: {bankFilter}
              </span>
            )}
            {accountFilter && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                Account: {accountFilter}
              </span>
            )}
            {drCrFilter && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                Type: {drCrFilter}
              </span>
            )}
            {search && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                Search: &quot;{search}&quot;
              </span>
            )}
            {/* Date range chip removed; a Clear button is shown near the picker */}
            {tagFilters.length > 0 && (
              <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs">
                Tags: {tagFilters.length}
              </span>
            )}
            {(bankFilter || accountFilter || drCrFilter || search || tagFilters.length > 0) && (
              <button
                onClick={clearAllFilters}
                className="text-red-600 hover:text-red-800 text-xs underline"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Table and selection logic */}
        <div ref={tableRef} className="overflow-x-auto relative h-[80vh]">
          {/* Global loading overlay for tag operations */}
          {(applyingTagToRow || applyingTagToAll || removingTag || creatingTag || tagging || removingTagsFromSelected) && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg px-6 py-4 max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-700 font-medium">
                    {applyingTagToRow ? 'Applying tag to transaction...' :
                     applyingTagToAll ? 'Applying tag to all matching transactions...' :
                     (removingTag && typeof removingTag === 'string') ? removingTag :
                     removingTag ? 'Removing tag...' :
                     creatingTag ? 'Creating tag...' :
                     tagging ? 'Adding tag...' :
                     removingTagsFromSelected ? 'Removing tags...' : 'Processing...'}
                  </span>
                </div>
                
                {/* Show matching transactions for bulk operations */}
                {applyingTagToAll && matchingTransactions.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      Found <span className="font-semibold text-blue-600">{matchingTransactions.length}</span> matching transactions
                    </div>
                    
                    <div className="text-xs text-gray-500 text-center">
                      Updating all transactions in bulk...
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Floating create tag button */}
          {selection && (
            <button
              style={{ position: 'absolute', left: selection.x, top: selection.y + 8, zIndex: 1000 }}
              className="px-3 py-1 bg-blue-600 text-white rounded shadow font-semibold text-xs hover:bg-blue-700 transition-all disabled:opacity-50"
              onClick={handleCreateTagFromSelection}
              disabled={creatingTag}
            >
              {creatingTag ? 'Creating...' : '+ Create Tag from Selection'}
            </button>
          )}
          {/* Prompt to apply tag to transaction */}
          {pendingTag && (
            <div style={{ position: 'absolute', left: selection?.x, top: selection?.y !== undefined ? selection.y + 8 : 48, zIndex: 1001 }} className="bg-white border border-blue-200 rounded shadow-lg px-3 sm:px-4 py-2 sm:py-3 flex flex-col gap-2 sm:gap-3 items-center max-w-md">
              <span className="text-sm">Apply tag &quot;{pendingTag.tagName}&quot; to:</span>
              
              {/* Show preview of matching transactions for "All transactions with this text" */}
              {pendingTag.selectionText && (
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
                          {String(tx.Date || tx.date || '')} • {bankIdNameMap[tx.bankId] || 'Unknown Bank'}
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
              )}
              
              <div className="flex flex-col sm:flex-row gap-2">
                <button className="px-3 py-1 bg-green-600 text-white rounded font-semibold text-xs hover:bg-green-700" onClick={handleApplyTagToRow} disabled={applyingTagToRow}>{applyingTagToRow ? 'Applying...' : 'Only this transaction'}</button>
                <button className="px-3 py-1 bg-blue-600 text-white rounded font-semibold text-xs hover:bg-blue-700" onClick={handleApplyTagToAll} disabled={applyingTagToAll}>{applyingTagToAll ? 'Applying...' : 'All transactions with this text'}</button>
                <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded font-semibold text-xs hover:bg-gray-300" onClick={() => setPendingTag(null)}>Cancel</button>
              </div>
            </div>
          )}
          {tagCreateMsg && (
            <div className="absolute left-1/2 top-2 -translate-x-1/2 bg-green-100 text-green-800 px-3 sm:px-4 py-2 rounded shadow text-xs sm:text-sm z-50">
              {tagCreateMsg}
            </div>
          )}
          {tagError && (
            <div className="absolute left-1/2 top-2 -translate-x-1/2 bg-red-100 text-red-800 px-3 sm:px-4 py-2 rounded shadow text-xs sm:text-sm z-50">
              {tagError}
            </div>
          )}
          {showRetryButton && failedTransactions.length > 0 && (
            <div className="absolute left-1/2 top-16 -translate-x-1/2 bg-yellow-100 text-yellow-800 px-3 sm:px-4 py-2 rounded shadow text-xs sm:text-sm z-50 flex items-center gap-2">
              <span>{failedTransactions.length} transactions failed</span>
              <button 
                onClick={handleRetryFailedTransactions}
                className="bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700"
                disabled={applyingTagToAll}
              >
                {applyingTagToAll ? 'Retrying...' : 'Retry'}
              </button>
              <button 
                onClick={handleClearFailedTransactions}
                className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          )}
          <div className="flex-1 min-h-0" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 400px)' }}>

          <TransactionTable
            rows={sortedAndFilteredRows}
            headers={superHeader}
            selectedRows={new Set(sortedAndFilteredRows.map((tx, idx) => selectedRows.has(tx.id) ? idx : -1).filter(i => i !== -1))}
            onRowSelect={idx => {
              const tx = sortedAndFilteredRows[idx];
              if (tx) handleRowSelect(tx.id);
            }}
            onSelectAll={handleSelectAll}
            selectAll={selectAll}
            loading={false} // Don't show loading spinner in table - show streaming data instead
            error={error}
            onRemoveTag={handleRemoveTag}
            onReorderHeaders={handleReorderHeaders}
            transactions={transactions}
            bankMappings={bankMappings}
            getValueForColumn={(tx, bankId, sh) => {
              const value = getValueForColumn(tx, bankId, sh);
              return value;
            }}
            onSort={handleTableSort}
            sortColumn={tableSortColumn}
            sortDirection={tableSortDirection}
            onDateFilter={handleDateFilter}
            onBankFilter={handleBankFilter}
            onDrCrFilter={handleDrCrFilter}
            onAccountFilter={handleAccountFilter}
            availableBanks={availableBanks}
            availableAccounts={availableAccounts}
          />
          </div>
        </div>
        </div>
      </div>
      <SuperBankReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        transactions={transactionsWithAccountInfo.length > 0 ? transactionsWithAccountInfo : filteredRows}
        bankIdNameMap={bankIdNameMap}
        tagFilters={tagFilters}
      />

      {/* Custom Remove Tags Confirmation Modal */}
      {showRemoveTagsConfirm && (() => {
        // Get all unique tags from selected transactions
        const allTagsInSelection = new Set<string>();
        Array.from(selectedRows).forEach(id => {
          const tx = transactions.find(t => t.id === id);
          if (tx && Array.isArray(tx.tags)) {
            tx.tags.forEach(tag => {
              if (tag && tag.name) {
                allTagsInSelection.add(tag.name);
              }
            });
          }
        });
        
        const tagArray = Array.from(allTagsInSelection);
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Remove Tags</h3>
                  <p className="text-sm text-gray-500">Select which tags to remove</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">
                Remove tags from{' '}
                <span className="font-semibold text-red-600">
                  {selectedRows.size} selected transaction{selectedRows.size !== 1 ? 's' : ''}
                </span>:
              </p>
              
              {/* Tag Selection */}
              <div className="mb-6 space-y-2">
                {tagArray.map(tagName => {
                  const tag = allTags.find(t => t.name === tagName);
                  const isSelected = selectedTagsToRemove.has(tagName);
                  
                  return (
                    <label key={tagName} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newSelected = new Set(selectedTagsToRemove);
                          if (e.target.checked) {
                            newSelected.add(tagName);
                          } else {
                            newSelected.delete(tagName);
                          }
                          setSelectedTagsToRemove(newSelected);
                        }}
                        className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                      />
                      <div className="flex items-center gap-2">
                        <span 
                          className="inline-block px-2 py-1 text-xs rounded-full font-semibold"
                          style={{
                            backgroundColor: `${tag?.color || '#6366F1'}30`,
                            color: '#000000',
                            border: `2px solid ${tag?.color || '#6366F1'}`,
                            fontWeight: '500'
                          }}
                        >
                          {tagName}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
              
              {/* Quick Selection Buttons */}
              {tagArray.length > 1 && (
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => setSelectedTagsToRemove(new Set(tagArray))}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedTagsToRemove(new Set())}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              )}
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowRemoveTagsConfirm(false);
                    setSelectedTagsToRemove(new Set());
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  disabled={removingTagsFromSelected}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveTagsFromSelected}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={removingTagsFromSelected || selectedTagsToRemove.size === 0}
                >
                  {removingTagsFromSelected ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Removing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove Selected Tags ({selectedTagsToRemove.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
} 
