'use client';

import React, { useEffect, useState } from 'react';

interface AnalyticsData {
  totalAmount: number;
  totalCredit: number;
  totalDebit: number;
  totalTransactions: number;
  totalBanks: number;
  totalAccounts: number;
  bankBreakdown: Array<{
    name: string;
    count: number;
    credit: number;
    debit: number;
    balance: number;
  }>;
}

interface AnalyticsGraphProps {
  transactions?: Array<Record<string, unknown>>;
}

const AnalyticsGraph: React.FC<AnalyticsGraphProps> = ({ transactions }) => {
  const [ChartComponent, setChartComponent] = useState<Record<string, unknown> | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'doughnut'>('pie');

  useEffect(() => {
    const loadChart = async () => {
      try {
        const { Chart: ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement } = await import('chart.js');
        const { Pie, Bar, Doughnut } = await import('react-chartjs-2');

        ChartJS.register(
          CategoryScale,
          LinearScale,
          PointElement,
          LineElement,
          Title,
          Tooltip,
          Legend,
          Filler,
          ArcElement
        );

        setChartComponent({ Pie, Bar, Doughnut });
      } catch (error) {
        console.error('Failed to load Chart.js:', error);
      }
    };

    loadChart();
  }, []);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        if (!userId) return;

        // Use provided transactions or fetch all
        let workingTransactions: Array<Record<string, unknown>> = Array.isArray(transactions) ? transactions : [];
        if (!workingTransactions.length) {
          const txRes = await fetch(`/api/transactions/all?userId=${encodeURIComponent(userId)}`);
          if (txRes.ok) {
            workingTransactions = await txRes.json();
          }
        }

        if (workingTransactions.length === 0) {
          setAnalyticsData(null);
          setLoading(false);
          return;
        }

        // Calculate analytics
        let totalAmount = 0;
        let totalCredit = 0;
        let totalDebit = 0;
        const bankMap = new Map<string, { count: number; credit: number; debit: number; balance: number }>();

        workingTransactions.forEach((tx: Record<string, unknown>) => {
          const amount = parseFloat((tx.AmountRaw as string) || (tx.Amount as string) || (tx.amount as string) || '0') || 0;
          const drCr = (tx['Dr./Cr.'] || '').toString().toUpperCase();
          
          totalAmount += Math.abs(amount);
          
          if (drCr === 'CR') {
            totalCredit += Math.abs(amount);
          } else if (drCr === 'DR') {
            totalDebit += Math.abs(amount);
          }

          // Bank breakdown
          const bankName = (tx.bankName as string) || 'Unknown Bank';
          if (!bankMap.has(bankName)) {
            bankMap.set(bankName, { count: 0, credit: 0, debit: 0, balance: 0 });
          }
          
          const bankData = bankMap.get(bankName)!;
          bankData.count += 1;
          
          if (drCr === 'CR') {
            bankData.credit += Math.abs(amount);
          } else if (drCr === 'DR') {
            bankData.debit += Math.abs(amount);
          }
          
          bankData.balance = bankData.credit - bankData.debit;
        });

        const bankBreakdown = Array.from(bankMap.entries()).map(([name, data]) => ({
          name,
          ...data
        })).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

        setAnalyticsData({
          totalAmount,
          totalCredit,
          totalDebit,
          totalTransactions: workingTransactions.length,
          totalBanks: bankMap.size,
          totalAccounts: new Set(workingTransactions.map(tx => tx.accountId).filter(Boolean)).size,
          bankBreakdown
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [transactions]);

  const getChartData = () => {
    if (!analyticsData) return null;

    const colors = [
      'rgba(59, 130, 246, 0.8)',   // Blue
      'rgba(16, 185, 129, 0.8)',   // Green
      'rgba(239, 68, 68, 0.8)',    // Red
      'rgba(245, 158, 11, 0.8)',   // Yellow
      'rgba(139, 92, 246, 0.8)',   // Purple
      'rgba(236, 72, 153, 0.8)',   // Pink
    ];

    const borderColors = [
      'rgba(59, 130, 246, 1)',
      'rgba(16, 185, 129, 1)',
      'rgba(239, 68, 68, 1)',
      'rgba(245, 158, 11, 1)',
      'rgba(139, 92, 246, 1)',
      'rgba(236, 72, 153, 1)',
    ];

    if (chartType === 'pie' || chartType === 'doughnut') {
      return {
        labels: analyticsData.bankBreakdown.map(bank => bank.name),
        datasets: [
          {
            data: analyticsData.bankBreakdown.map(bank => Math.abs(bank.balance)),
            backgroundColor: colors.slice(0, analyticsData.bankBreakdown.length),
            borderColor: borderColors.slice(0, analyticsData.bankBreakdown.length),
            borderWidth: 2,
          },
        ],
      };
    } else {
      return {
        labels: analyticsData.bankBreakdown.map(bank => bank.name),
        datasets: [
          {
            label: 'Credits',
            data: analyticsData.bankBreakdown.map(bank => bank.credit),
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1,
          },
          {
            label: 'Debits',
            data: analyticsData.bankBreakdown.map(bank => bank.debit),
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 1,
          },
        ],
      };
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: { dataset: { label?: string }; label?: string; parsed: { y?: number } }) {
            let label = context.dataset.label || context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== undefined) {
              label += new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: chartType === 'bar' ? {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: number) {
            return new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(value);
          },
        },
      },
    } : undefined,
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Analytics Summary</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Analytics Summary</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <p className="text-gray-500">No analytics data available</p>
            <p className="text-sm text-gray-400">Add transactions to see analytics</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ChartComponent) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Analytics Summary</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading chart component...</p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = getChartData();
  if (!chartData) return null;

  const SelectedChart = (
    ChartComponent[chartType.charAt(0).toUpperCase() + chartType.slice(1)]
  ) as unknown as React.ComponentType<{ data: unknown; options?: unknown }>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Analytics Summary</h3>
          <p className="text-sm text-gray-600">Financial breakdown by bank</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setChartType('pie')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              chartType === 'pie' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pie
          </button>
          <button
            onClick={() => setChartType('doughnut')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              chartType === 'doughnut' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Doughnut
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              chartType === 'bar' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Bar
          </button>
        </div>
      </div>
      
      <div className="w-full h-80">
        <SelectedChart data={chartData} options={chartOptions} />
      </div>
      
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Total Transactions</div>
          <div className="text-lg font-bold text-blue-700">
            {analyticsData.totalTransactions.toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-sm text-green-600 font-medium">Total Credits</div>
          <div className="text-lg font-bold text-green-700">
            ₹{analyticsData.totalCredit.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg">
          <div className="text-sm text-red-600 font-medium">Total Debits</div>
          <div className="text-lg font-bold text-red-700">
            ₹{analyticsData.totalDebit.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <div className="text-sm text-purple-600 font-medium">Total Banks</div>
          <div className="text-lg font-bold text-purple-700">
            {analyticsData.totalBanks}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsGraph;
