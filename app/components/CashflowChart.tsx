'use client';

import React, { useEffect, useState } from 'react';

interface CashflowData {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

interface CashflowChartProps {
  data: CashflowData[];
  loading?: boolean;
}

const CashflowChart: React.FC<CashflowChartProps> = ({ data, loading = false }) => {
  // Removed chart.js: no external chart component
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      borderWidth: number;
      fill: boolean;
      tension: number;
      pointBackgroundColor: string;
      pointBorderColor: string;
      pointBorderWidth: number;
      pointRadius: number;
      pointHoverRadius: number;
    }>;
  } | null>(null);

  // Removed chart.js dynamic import

  useEffect(() => {
    if (data && data.length > 0) {
      const processedData = {
        labels: data.map(item => {
          try {
            const date = new Date(item.date);
            if (isNaN(date.getTime())) {
              // If date is invalid, use a fallback
              return 'Invalid Date';
            }
            return date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            });
          } catch (error) {
            console.error('Error parsing date:', item.date, error);
            return 'Invalid Date';
          }
        }),
        datasets: [
          {
            label: 'Income',
            data: data.map(item => item.income || 0),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: 'rgb(34, 197, 94)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Expenses',
            data: data.map(item => item.expense || 0),
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: 'rgb(239, 68, 68)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Balance',
            data: data.map(item => item.balance || 0),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 3,
            fill: false,
            tension: 0.4,
            pointBackgroundColor: 'rgb(59, 130, 246)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      };
      setChartData(processedData);
    }
  }, [data]);

  // removed unused chart options entirely

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cashflow Over Time</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Income, expenses, and balance trends</p>
          </div>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading chart data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cashflow Over Time</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Income, expenses, and balance trends</p>
          </div>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <p className="text-gray-500 dark:text-gray-400">No cashflow data available</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Add transactions to see your cashflow trends</p>
          </div>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cashflow Over Time</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Income, expenses, and balance trends</p>
          </div>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Preparing chart data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cashflow Over Time</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Income, expenses, and balance trends</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Income</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Expenses</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Balance</span>
          </div>
        </div>
      </div>
      
      <div className="w-full h-80">
        {/* Simple inline SVG line chart to avoid heavy deps */}
        {(() => {
          const width = 900;
          const height = 320;
          const pad = 32;
          const labels = chartData.labels;
          const ds = chartData.datasets;
          const maxY = Math.max(1, ...ds.flatMap(d => d.data.map(v => Math.abs(v))));
          const scaleX = (i: number) => pad + (i * (width - 2 * pad)) / Math.max(1, labels.length - 1);
          const scaleY = (v: number) => height - pad - (Math.abs(v) * (height - 2 * pad)) / maxY;
          const pathFor = (arr: number[]) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(v)}`).join(' ');
          return (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
              <rect x="0" y="0" width={width} height={height} fill="white" />
              {/* Axes */}
              <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#e5e7eb" />
              <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#e5e7eb" />
              {/* Series */}
              {ds.map((d, idx) => (
                <g key={idx}>
                  <path d={pathFor(d.data)} fill="none" stroke={d.borderColor} strokeWidth={idx === 2 ? 3 : 2} />
                </g>
              ))}
            </svg>
          );
        })()}
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">Total Income</div>
          <div className="text-lg font-bold text-green-700 dark:text-green-300">
            ₹{data.reduce((sum, item) => sum + (item.income || 0), 0).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-sm text-red-600 dark:text-red-400 font-medium">Total Expenses</div>
          <div className="text-lg font-bold text-red-700 dark:text-red-300">
            ₹{data.reduce((sum, item) => sum + (item.expense || 0), 0).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Net Balance</div>
          <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
            ₹{data.reduce((sum, item) => sum + (item.balance || 0), 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashflowChart;
