'use client';
import { useState } from 'react';

interface DebugEntityTransactionsProps {
  entityName: string;
}

interface EntityTransaction {
  id: string;
  entityName: string;
  userId: string;
  fileName: string;
  fileId: string;
  createdAt: string;
}

export default function DebugEntityTransactions({ entityName }: DebugEntityTransactionsProps) {
  const [transactions, setTransactions] = useState<EntityTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = localStorage.getItem('userId') || '';
      const response = await fetch(`/api/entities/check-transactions?userId=${encodeURIComponent(userId)}&entityName=${encodeURIComponent(entityName)}`);
      const data = await response.json();
      
      if (response.ok) {
        setTransactions(data.transactions || []);
        console.log('Transaction check result:', data);
      } else {
        setError(data.error || 'Failed to check transactions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-2">Debug: Entity Transactions</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Entity: <strong>{entityName}</strong>
      </p>
      
      <button 
        onClick={checkTransactions}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
      >
        {loading ? 'Checking...' : 'Check Transactions'}
      </button>

      {error && (
        <div className="text-red-600 dark:text-red-400 mb-4">
          <div className="font-semibold">Error: {error}</div>
          {error.includes('Backend server') && (
            <div className="text-sm mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border">
              <p className="font-medium">Backend Connection Issue:</p>
              <p className="text-xs mt-1">
                The backend server (BRMH API) is not accessible. This means:
              </p>
              <ul className="text-xs mt-1 list-disc list-inside">
                <li>Transaction cleanup during entity deletion won&apos;t work</li>
                <li>CSV parsing and storage won&apos;t work</li>
                <li>All database operations will fail</li>
              </ul>
              <p className="text-xs mt-2 font-medium">
                Please start the backend server on port 5001 to enable full functionality.
              </p>
            </div>
          )}
        </div>
      )}

      {transactions.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Found {transactions.length} transactions:</h4>
          <div className="space-y-2">
            {transactions.map((transaction, index) => (
              <div key={transaction.id || index} className="p-2 bg-white dark:bg-gray-700 rounded border text-sm">
                <div><strong>ID:</strong> {transaction.id}</div>
                <div><strong>Entity:</strong> {transaction.entityName}</div>
                <div><strong>User:</strong> {transaction.userId}</div>
                <div><strong>File:</strong> {transaction.fileName}</div>
                <div><strong>File ID:</strong> {transaction.fileId}</div>
                <div><strong>Created:</strong> {transaction.createdAt}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {transactions.length === 0 && !loading && !error && (
        <div className="text-gray-600 dark:text-gray-400">
          No transactions found for this entity.
        </div>
      )}
    </div>
  );
}
