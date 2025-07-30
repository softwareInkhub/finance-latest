"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  RiBankLine, 
  RiAccountPinCircleLine, 
  RiFileList3Line, 
  RiTimeLine,
  RiBarChartLine,
  RiArrowUpLine,
  RiAddLine,
  RiUploadLine,
  RiPriceTag3Line
} from 'react-icons/ri';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalBanks: 0,
    totalAccounts: 0,
    totalStatements: 0,
    totalTransactions: 0
  });

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        // Fetch banks
        const banksResponse = await fetch('/api/bank');
        const banks = await banksResponse.json();
        
        // Fetch accounts - we need to get all accounts for the user
        let allAccounts: Array<{ id: string; bankId: string; accountHolderName: string }> = [];
        if (Array.isArray(banks)) {
          for (const bank of banks) {
            try {
              const accountsResponse = await fetch(`/api/account?bankId=${bank.id}&userId=${userId}`);
              if (accountsResponse.ok) {
                const bankAccounts = await accountsResponse.json();
                if (Array.isArray(bankAccounts)) {
                  allAccounts = allAccounts.concat(bankAccounts);
                }
              }
            } catch (error) {
              console.error(`Error fetching accounts for bank ${bank.id}:`, error);
            }
          }
        }
        
        // Fetch statements - we need to get all statements for the user
        let allStatements: Array<{ id: string; accountId: string; fileName: string }> = [];
        if (Array.isArray(allAccounts)) {
          for (const account of allAccounts) {
            try {
              const statementsResponse = await fetch(`/api/statements?accountId=${account.id}&userId=${userId}`);
              if (statementsResponse.ok) {
                const accountStatements = await statementsResponse.json();
                if (Array.isArray(accountStatements)) {
                  allStatements = allStatements.concat(accountStatements);
                }
              }
            } catch (error) {
              console.error(`Error fetching statements for account ${account.id}:`, error);
            }
          }
        }
        
        // Fetch transactions
        const transactionsResponse = await fetch('/api/transactions/all?userId=' + userId);
        const transactions = await transactionsResponse.json();

        setStats({
          totalBanks: Array.isArray(banks) ? banks.length : 0,
          totalAccounts: allAccounts.length,
          totalStatements: allStatements.length,
          totalTransactions: Array.isArray(transactions) ? transactions.length : 0
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Content */}
      <div className="p-6">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here&apos;s what&apos;s happening with your finances.</p>
          </div>
          <div className="flex space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <RiBarChartLine size={16} />
              <span className="text-sm font-medium">Export Report</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <RiArrowUpLine size={16} />
              <span className="text-sm font-medium">View Analytics</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Banks */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Banks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalBanks}</p>
                <p className="text-xs text-green-600 mt-1">↑ +0% from last month</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <RiBankLine className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          {/* Total Accounts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalAccounts}</p>
                <p className="text-xs text-green-600 mt-1">↑ +0% from last month</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <RiAccountPinCircleLine className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          {/* Total Statements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Statements</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStatements}</p>
                <p className="text-xs text-green-600 mt-1">↑ +0% from last month</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <RiFileList3Line className="text-purple-600" size={24} />
              </div>
            </div>
          </div>

          {/* Total Transactions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalTransactions}</p>
                <p className="text-xs text-green-600 mt-1">↑ +0% from last month</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <RiTimeLine className="text-orange-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <RiTimeLine className="text-purple-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  <p className="text-sm text-gray-500">Latest transactions and updates</p>
                </div>
              </div>
              <button className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors">
                View All
              </button>
            </div>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RiTimeLine className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-500 font-medium">No recent activity</p>
              <p className="text-sm text-gray-400 mt-1">Your recent transactions will appear here</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <RiAddLine className="text-green-600" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-500">Common tasks and shortcuts</p>
              </div>
            </div>
            <div className="space-y-4">
              <Link href="/banks" className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <RiBankLine className="text-blue-600" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Add Bank</p>
                  <p className="text-sm text-gray-500">Create new bank account</p>
                </div>
              </Link>
              
              <Link href="/files" className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <RiUploadLine className="text-green-600" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Upload Statement</p>
                  <p className="text-sm text-gray-500">Import bank statements</p>
                </div>
              </Link>
              
              <Link href="/tags" className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <RiPriceTag3Line className="text-purple-600" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Manage Tags</p>
                  <p className="text-sm text-gray-500">Organize transactions</p>
                </div>
              </Link>
              
              <Link href="/reports" className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <RiBarChartLine className="text-orange-600" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">View Reports</p>
                  <p className="text-sm text-gray-500">Generate financial reports</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 