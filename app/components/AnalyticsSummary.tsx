import React, { useState } from 'react';

interface BankAccount {
  id: string;
  name: string;
}
interface Bank {
  id: string;
  name: string;
  accounts: BankAccount[];
}

interface AnalyticsSummaryProps {
  totalTransactions: number;
  totalAmount?: string | number;
  totalCredit?: string | number;
  totalDebit?: string | number;
  totalBanks: number;
  totalAccounts: number;
  tagged?: number;
  untagged?: number;
  totalTags?: number;
  showAmount?: boolean;
  showTagStats?: boolean;
  banks?: Bank[];
  onShowUntagged?: () => void;
}

const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({
  totalTransactions,
  totalAmount,
  totalCredit,
  totalDebit,
  totalBanks,
  totalAccounts,
  tagged,
  untagged,
  totalTags,
  showAmount = true,
  showTagStats = false,
  banks = [],
  onShowUntagged,
}) => {
  const [expandedBanks, setExpandedBanks] = useState<string[]>([]);

  const toggleBank = (bankId: string) => {
    setExpandedBanks((prev) =>
      prev.includes(bankId) ? prev.filter((id) => id !== bankId) : [...prev, bankId]
    );
  };

  return (
    <div className="flex flex-wrap gap-2 sm:gap-4 justify-center mb-4">
      <div className="px-3 sm:px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
        Total Transactions: {totalTransactions}
      </div>
      {showAmount && (
        <>
          <div className="px-3 sm:px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
            Total Amount: {totalAmount}
          </div>
          {typeof totalCredit !== 'undefined' && (
            <div className="px-3 sm:px-4 py-2 bg-cyan-100 text-cyan-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
              Credit: {typeof totalCredit === 'number' ? totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (Number(totalCredit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
            </div>
          )}
          {typeof totalDebit !== 'undefined' && (
            <div className="px-3 sm:px-4 py-2 bg-rose-100 text-rose-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
              Debit: {typeof totalDebit === 'number' ? totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (Number(totalDebit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
            </div>
          )}
        </>
      )}
      <div className="relative">
        <button
          className="px-3 sm:px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-semibold shadow text-xs sm:text-sm focus:outline-none"
          onClick={() => setExpandedBanks((prev) => (prev.length ? [] : banks.map(b => b.id)))}
          type="button"
        >
          Total Banks: {totalBanks}
        </button>
        {banks.length > 0 && expandedBanks.length > 0 && (
          <div className="absolute left-0 mt-2 z-10 bg-white border border-gray-200 rounded shadow-lg min-w-[180px] p-2">
            {banks.map((bank) => (
              <div key={bank.id} className="mb-1">
                <button
                  className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 font-semibold text-blue-700 flex items-center gap-2"
                  onClick={() => toggleBank(bank.id)}
                  type="button"
                >
                  <span>{expandedBanks.includes(bank.id) ? '▼' : '►'}</span>
                  {bank.name}
                </button>
                {expandedBanks.includes(bank.id) && bank.accounts.length > 0 && (
                  <div className="ml-6 mt-1">
                    {bank.accounts.map((acc) => (
                      <button
                        key={acc.id}
                        className="block w-full text-left px-2 py-1 rounded hover:bg-purple-50 text-xs text-purple-700"
                        // Add onClick for account-specific stats if needed
                        type="button"
                      >
                        {acc.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-3 sm:px-4 py-2 bg-pink-100 text-pink-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
        Total Accounts: {totalAccounts}
      </div>
      {showTagStats && (
        <>
          <div className="px-3 sm:px-4 py-2 bg-purple-100 text-purple-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
            Tagged: {tagged}
          </div>
          <button
            className="px-3 sm:px-4 py-2 bg-orange-100 text-orange-800 rounded-lg font-semibold shadow text-xs sm:text-sm focus:outline-none hover:bg-orange-200"
            onClick={onShowUntagged}
            type="button"
          >
            Untagged: {untagged}
          </button>
          <div className="px-3 sm:px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
            Total Tags: {totalTags}
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsSummary; 