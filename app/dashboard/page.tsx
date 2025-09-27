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
  RiPriceTag3Line,
  RiErrorWarningLine
} from 'react-icons/ri';
// Removed chart components from dashboard

interface CashflowData {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalBanks: 0,
    totalAccounts: 0,
    totalStatements: 0,
    totalTransactions: 0
  });

  // Keep setters only; values are not rendered on dashboard
  const [, setCashflowData] = useState<CashflowData[]>([]);
  const [, setTransactions] = useState<Array<Record<string, unknown>>>([]);
  const [recentActivities, setRecentActivities] = useState<Array<{
    id: string;
    type: 'transaction' | 'statement' | 'bank' | 'account' | 'tag';
    title: string;
    description: string;
    timestamp: string;
    icon: string;
    color: string;
  }>>([]);

  useEffect(() => {
    // Fetch basic dashboard data with simple error handling
    const fetchDashboardData = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setError('User not logged in');
          setLoading(false);
          return;
        }

        // Fetch all data in parallel with timeouts for better performance
        const fetchWithTimeout = (url: string, timeout = 10000) => {
          return Promise.race([
            fetch(url),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), timeout)
            )
          ]);
        };

        // Load essential data first (fast APIs)
        const [banksResult, accountsResult, statementsResult] = await Promise.allSettled([
          fetchWithTimeout(`/api/bank?userId=${userId}`, 5000),
          fetchWithTimeout(`/api/account?userId=${userId}`, 5000),
          fetchWithTimeout(`/api/statements?userId=${userId}`, 5000)
        ]);

        // Set initial stats with fast data
        let banks = [];
        let accounts = [];
        let statements = [];

        if (banksResult.status === 'fulfilled' && (banksResult.value as Response).ok) {
          banks = await (banksResult.value as Response).json();
        } else {
          console.warn('Failed to fetch banks:', banksResult.status === 'rejected' ? banksResult.reason : 'HTTP error');
        }

        if (accountsResult.status === 'fulfilled' && (accountsResult.value as Response).ok) {
          accounts = await (accountsResult.value as Response).json();
        } else {
          console.warn('Failed to fetch accounts:', accountsResult.status === 'rejected' ? accountsResult.reason : 'HTTP error');
        }

        if (statementsResult.status === 'fulfilled' && (statementsResult.value as Response).ok) {
          statements = await (statementsResult.value as Response).json();
        } else {
          console.warn('Failed to fetch statements:', statementsResult.status === 'rejected' ? statementsResult.reason : 'HTTP error');
        }

        // Set initial stats and show dashboard
        setStats({
          totalBanks: Array.isArray(banks) ? banks.length : 0,
          totalAccounts: Array.isArray(accounts) ? accounts.length : 0,
          totalStatements: Array.isArray(statements) ? statements.length : 0,
          totalTransactions: 0 // Will be updated when transactions load
        });

        setError(null);
        setLoading(false); // Show dashboard immediately

        // Load transactions in background (slower API)
        try {
          const transactionsResponse = await fetchWithTimeout(`/api/transactions/all?userId=${userId}&limit=50`, 20000) as Response;
          if (transactionsResponse.ok) {
            const recentTransactions = await transactionsResponse.json();
            setStats(prev => ({
              ...prev,
              totalTransactions: Array.isArray(recentTransactions) ? recentTransactions.length : 0
            }));
            setTransactions(Array.isArray(recentTransactions) ? recentTransactions : []);
            generateCashflowData(Array.isArray(recentTransactions) ? recentTransactions : []);
            
            // Generate recent activities with all data
            const activities = generateRecentActivities(
              Array.isArray(banks) ? banks : [],
              Array.isArray(accounts) ? accounts : [],
              Array.isArray(statements) ? statements : [],
              Array.isArray(recentTransactions) ? recentTransactions : []
            );
            setRecentActivities(activities);
          }
        } catch (error) {
          console.warn('Failed to fetch transactions in background:', error);
        }

        return; // Exit early, don't process transactions below
      } catch (error) {
        console.error('Error in dashboard data fetch:', error);
        setError('Some data failed to load, but dashboard is still functional.');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Function to generate recent activities from various data sources
  const generateRecentActivities = (
    banks: Record<string, unknown>[],
    accounts: Record<string, unknown>[],
    statements: Record<string, unknown>[],
    transactions: Record<string, unknown>[]
  ) => {
    const activities: Array<{
      id: string;
      type: 'transaction' | 'statement' | 'bank' | 'account' | 'tag';
      title: string;
      description: string;
      timestamp: string;
      icon: string;
      color: string;
    }> = [];

    // Add bank activities
    banks.forEach(bank => {
      if (bank.createdAt) {
        activities.push({
          id: bank.id as string,
          type: 'bank',
          title: `Added ${bank.bankName as string || 'Bank'}`,
          description: `New bank account created`,
          timestamp: bank.createdAt as string,
          icon: '🏦',
          color: 'blue'
        });
      }
    });

    // Add account activities
    accounts.forEach(account => {
      if (account.createdAt) {
        activities.push({
          id: account.id as string,
          type: 'account',
          title: `Added Account`,
          description: `Account ${account.accountHolderName as string || account.accountNumber as string || 'created'}`,
          timestamp: account.createdAt as string,
          icon: '💳',
          color: 'green'
        });
      }
    });

    // Add statement upload activities
    statements.forEach(statement => {
      if (statement.createdAt) {
        activities.push({
          id: statement.id as string,
          type: 'statement',
          title: `Uploaded Statement`,
          description: statement.fileName as string || 'Bank statement uploaded',
          timestamp: statement.createdAt as string,
          icon: '📄',
          color: 'purple'
        });
      }
    });

    // Add recent transaction activities (limit to 10 most recent)
    const recentTransactions = transactions
      .filter(tx => tx.createdAt)
      .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime())
      .slice(0, 10);

    recentTransactions.forEach(tx => {
      const amount = parseFloat((tx.AmountRaw as string) || (tx.Amount as string) || '0') || 0;
      const drCr = (tx['Dr./Cr.'] || '').toString().toUpperCase();
      const description = tx.Description as string || tx.Narration as string || 'Transaction processed';
      
      activities.push({
        id: tx.id as string,
        type: 'transaction',
        title: `${drCr === 'CR' ? 'Credit' : 'Debit'} Transaction`,
        description: `${description} - ₹${amount.toLocaleString('en-IN')}`,
        timestamp: tx.createdAt as string,
        icon: drCr === 'CR' ? '💰' : '💸',
        color: drCr === 'CR' ? 'green' : 'red'
      });
    });

    // Sort all activities by timestamp (most recent first) and take top 8
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  };

  const generateCashflowData = (transactions: Record<string, unknown>[]) => {
    if (!transactions || transactions.length === 0) {
      // Generate sample data for demonstration
      const sampleData: CashflowData[] = [];
      const today = new Date();
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Generate more realistic financial data
        const baseIncome = 25000; // Base income
        const baseExpense = 15000; // Base expenses
        const variation = 0.3; // 30% variation
        
        const income = Math.floor(baseIncome + (Math.random() - 0.5) * baseIncome * variation);
        const expense = Math.floor(baseExpense + (Math.random() - 0.5) * baseExpense * variation);
        const balance = income - expense;
        
        sampleData.push({
          date: date.toISOString().split('T')[0], // YYYY-MM-DD format
          income: Math.max(income, 5000), // Minimum 5k income
          expense: Math.max(expense, 3000), // Minimum 3k expense
          balance: balance
        });
      }
      
      setCashflowData(sampleData);
      return;
    }

    // Process real transaction data
    const cashflowMap = new Map<string, { income: number; expense: number; balance: number }>();
    
    transactions.forEach((tx: Record<string, unknown>) => {
      let date = tx.Date as string || tx['Transaction Date'] as string || new Date().toISOString().split('T')[0];
      
      // Ensure date is in YYYY-MM-DD format
      if (date && typeof date === 'string') {
        try {
          const parsedDate = new Date(date);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split('T')[0];
          } else {
            date = new Date().toISOString().split('T')[0];
          }
        } catch {
          date = new Date().toISOString().split('T')[0];
        }
      } else {
        date = new Date().toISOString().split('T')[0];
      }
      
      const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 
                    typeof tx.Amount === 'number' ? tx.Amount :
                    parseFloat((tx.Amount as string)?.replace(/[^\d.-]/g, '')) || 0;
      const drCr = (tx['Dr./Cr.'] || '').toString().toUpperCase();
      
      if (!cashflowMap.has(date)) {
        cashflowMap.set(date, { income: 0, expense: 0, balance: 0 });
      }
      
      const dayData = cashflowMap.get(date)!;
      
      if (drCr === 'CR') {
        dayData.income += Math.abs(amount);
      } else if (drCr === 'DR') {
        dayData.expense += Math.abs(amount);
      }
      
      dayData.balance = dayData.income - dayData.expense;
    });
    
    // Convert to array and sort by date
    const cashflowArray: CashflowData[] = Array.from(cashflowMap.entries()).map(([date, data]) => ({
      date,
      ...data
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // If no real data, generate sample data
    if (cashflowArray.length === 0) {
      const sampleData: CashflowData[] = [];
      const today = new Date();
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const baseIncome = 25000;
        const baseExpense = 15000;
        const variation = 0.3;
        
        const income = Math.floor(baseIncome + (Math.random() - 0.5) * baseIncome * variation);
        const expense = Math.floor(baseExpense + (Math.random() - 0.5) * baseExpense * variation);
        const balance = income - expense;
        
        sampleData.push({
          date: date.toISOString().split('T')[0],
          income: Math.max(income, 5000),
          expense: Math.max(expense, 3000),
          balance: balance
        });
      }
      
      setCashflowData(sampleData);
    } else {
      setCashflowData(cashflowArray);
    }
  };

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      {/* Dashboard Content */}
      <div className="p-6 min-h-full">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard data...</p>
            </div>
          </div>
        )}

        {/* Dashboard Content - Show even with partial data */}
        {!loading && (
          <>
            {/* Error Notification - Show at top if there are issues */}
            {error && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-yellow-700">
                  <RiErrorWarningLine className="text-yellow-600" size={16} />
                  <span>{error}</span>
                </div>
              </div>
            )}

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

        {/* Recent Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
              <Link href="/super-bank" className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors">
                View All
              </Link>
            </div>
            
            {recentActivities.length > 0 ? (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      activity.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      activity.color === 'green' ? 'bg-green-100 text-green-600' :
                      activity.color === 'red' ? 'bg-red-100 text-red-600' :
                      activity.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <span className="text-xs text-gray-500 ml-2">
                          {new Date(activity.timestamp).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RiTimeLine className="text-gray-400" size={32} />
                </div>
                <p className="text-gray-500 font-medium">No recent activity</p>
                <p className="text-sm text-gray-400 mt-1">Your activities will appear here</p>
              </div>
            )}
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

        {/* Chart components removed as requested */}
          </>
        )}
      </div>
    </div>
  );
} 