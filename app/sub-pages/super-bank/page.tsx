"use client";
import { useEffect, useState, useRef } from "react";
import { RiEdit2Line } from 'react-icons/ri';
import { FiDownload } from 'react-icons/fi';
import type { JSX } from 'react';
import React from 'react';

import AnalyticsSummary from '../../components/AnalyticsSummary';
import TransactionFilterBar from '../../components/TransactionFilterBar';
import TagFilterPills from '../../components/TagFilterPills';
import TaggingControls from '../../components/TaggingControls';
import TransactionTable from '../../components/TransactionTable';
import { Transaction, TransactionRow, Tag } from '../../types/transaction';
import Modal from '../../components/Modals/Modal';

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

function SuperBankReportModal({ isOpen, onClose, transactions, totalBanks, totalAccounts, bankIdNameMap, tagFilters }: {
  isOpen: boolean;
  onClose: () => void;
  transactions: (Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string })[];
  totalBanks: number;
  totalAccounts: number;
  bankIdNameMap: { [id: string]: string };
  tagFilters: string[];
}) {
  // Move all hooks to the top, before any early return
  const A4_HEIGHT_PX = 1122; // 297mm at 96dpi
  const A4_WIDTH_PX = 794;   // 210mm at 96dpi
  const [page, setPage] = useState(0);
  const [exportingAllPages, setExportingAllPages] = useState(false);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const allPagesRef = useRef<HTMLDivElement>(null);

  if (Object.keys(bankIdNameMap).length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Super Bank Report">
        <div className="p-8 text-center text-gray-500 text-lg">Loading bank names...</div>
      </Modal>
    );
  }
  // Compute per-tag or per-bank stats
  type Stat = {
    label: string;
    totalTransactions: number;
    totalAmount: number;
    totalCredit: number;
    totalDebit: number;
    tagged: number;
    untagged: number;
  };
  let statsArr: Stat[] = [];
  if (tagFilters && tagFilters.length > 0) {
    // Group by tag
    statsArr = tagFilters.map(tagName => {
      const txs = transactions.filter(tx => Array.isArray(tx.tags) && tx.tags.some(t => t.name === tagName));
      let totalAmount = 0, totalCredit = 0, totalDebit = 0, tagged = 0, untagged = 0;
      txs.forEach(tx => {
        const amount = typeof (tx as Transaction & { AmountRaw?: number }).AmountRaw === 'number' ? (tx as Transaction & { AmountRaw?: number }).AmountRaw : 0;
        totalAmount += amount || 0;
        const crdr = ((tx as Transaction & { 'Dr./Cr.'?: string })['Dr./Cr.'] || '').toString().trim().toUpperCase();
        if (crdr === 'CR') totalCredit += Math.abs(amount || 0);
        else if (crdr === 'DR') totalDebit += Math.abs(amount || 0);
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
  } else {
    // Group by bank
    const bankStats: { [bankId: string]: Stat } = {};
    transactions.forEach((tx: Transaction) => {
      const bankId = tx.bankId;
      const label = bankIdNameMap[bankId] || 'Unknown Bank';
      if (!bankStats[bankId]) {
        bankStats[bankId] = {
          label,
          totalTransactions: 0,
          totalAmount: 0,
          totalCredit: 0,
          totalDebit: 0,
          tagged: 0,
          untagged: 0,
        };
      }
      const amount = typeof (tx as Transaction & { AmountRaw?: number }).AmountRaw === 'number' ? (tx as Transaction & { AmountRaw?: number }).AmountRaw : 0;
      bankStats[bankId].totalTransactions++;
      bankStats[bankId].totalAmount += amount || 0;
      const crdr = ((tx as Transaction & { 'Dr./Cr.'?: string })['Dr./Cr.'] || '').toString().trim().toUpperCase();
      if (crdr === 'CR') bankStats[bankId].totalCredit += Math.abs(amount || 0);
      else if (crdr === 'DR') bankStats[bankId].totalDebit += Math.abs(amount || 0);
      const tags = (tx as Transaction).tags;
      if (Array.isArray(tags) && tags.length > 0) bankStats[bankId].tagged++;
      else bankStats[bankId].untagged++;
    });
    statsArr = Object.values(bankStats);
  }
  // Super bank stats
  const superTotalTransactions = transactions.length;
  const superTotalAmount = statsArr.reduce((sum, s) => sum + s.totalAmount, 0);
  const superTotalCredit = statsArr.reduce((sum, s) => sum + s.totalCredit, 0);
  const superTotalDebit = statsArr.reduce((sum, s) => sum + s.totalDebit, 0);
  const superTagged = statsArr.reduce((sum, s) => sum + s.tagged, 0);
  const superUntagged = statsArr.reduce((sum, s) => sum + s.untagged, 0);

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
    // Super Bank Summary Page
    <div key="summary" style={{ width: `${A4_WIDTH_PX}px`, minHeight: `${A4_HEIGHT_PX}px`, padding: '32px', boxSizing: 'border-box', background: 'white', pageBreakAfter: 'always' }}>
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl shadow p-6 mb-4 flex flex-col gap-4">
        <h3 className="text-2xl font-extrabold mb-2 text-purple-800 tracking-tight">Super Bank Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
            <div className="text-xs text-gray-500">Total Transactions</div>
            <div className="text-2xl font-bold text-blue-700">{superTotalTransactions}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
            <div className="text-xs text-gray-500">Total Amount</div>
            <div className="text-2xl font-bold text-green-700">{superTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
            <div className="text-xs text-gray-500">Total Credit</div>
            <div className="text-2xl font-bold text-green-700">{superTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
            <div className="text-xs text-gray-500">Total Debit</div>
            <div className="text-2xl font-bold text-red-700">{superTotalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
            <div className="text-xs text-gray-500">Total Banks</div>
            <div className="text-2xl font-bold text-yellow-700">{totalBanks}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
            <div className="text-xs text-gray-500">Total Accounts</div>
            <div className="text-2xl font-bold text-purple-700">{totalAccounts}</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4 col-span-2 sm:col-span-3 flex flex-col items-center">
            <div className="text-xs text-gray-500">Tagged / Untagged Transactions</div>
            <div className="text-lg font-bold text-blue-700">{superTagged} <span className="text-gray-400">/</span> {superUntagged}</div>
          </div>
        </div>
      </div>
    </div>,
    // Per-Bank Summary Page
    <div key="per-bank" style={{ width: `${A4_WIDTH_PX}px`, minHeight: `${A4_HEIGHT_PX}px`, padding: '32px', boxSizing: 'border-box', background: 'white', pageBreakAfter: 'always' }}>
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-blue-700 tracking-tight">Per-Bank Summary</h3>
        {tagFilters && tagFilters.length > 0 && (
          <div className="text-xs text-gray-500 mb-2">
            Note: If a transaction has multiple selected tags, it is counted in each relevant tag row.
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-blue-50">
                <th className="border px-4 py-2">{tagFilters && tagFilters.length > 0 ? 'Tag' : 'Bank'}</th>
                <th className="border px-4 py-2">Total Txns</th>
                <th className="border px-4 py-2">Total Amount</th>
                <th className="border px-4 py-2">Credit</th>
                <th className="border px-4 py-2">Debit</th>
                <th className="border px-4 py-2">Tagged</th>
                <th className="border px-4 py-2">Untagged</th>
              </tr>
            </thead>
            <tbody>
              {statsArr.map((s, i) => (
                <tr key={s.label + i} className="hover:bg-blue-50 transition">
                  <td className="border px-4 py-2 font-semibold">{s.label}</td>
                  <td className="border px-4 py-2 text-center">{s.totalTransactions}</td>
                  <td className="border px-4 py-2 text-right">{s.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border px-4 py-2 text-right text-green-700">{s.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border px-4 py-2 text-right text-red-700">{s.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border px-4 py-2 text-center text-blue-700">{s.tagged}</td>
                  <td className="border px-4 py-2 text-center text-gray-500">{s.untagged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    // Per-Bank, Per-Account Report Page
    <div key="per-account" style={{ width: `${A4_WIDTH_PX}px`, minHeight: `${A4_HEIGHT_PX}px`, padding: '32px', boxSizing: 'border-box', background: 'white', pageBreakAfter: 'always' }}>
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-blue-700 tracking-tight">Per-Bank, Per-Account Report</h3>
        {Object.entries(perBankAccount).map(([bankId, accounts]) => (
          <div key={bankId} className="mb-8">
            <div className="font-semibold text-blue-800 mb-4 text-xl border-b border-blue-100 pb-1 uppercase tracking-wide">{bankIdNameMap[bankId] || bankId}</div>
            {Object.entries(accounts).map(([accountId, txs]) => {
              let totalAmount = 0, totalCredit = 0, totalDebit = 0;
              txs.forEach(tx => {
                const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
                totalAmount += amount;
                const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
                if (crdr === 'CR') totalCredit += Math.abs(amount);
                else if (crdr === 'DR') totalDebit += Math.abs(amount);
              });

              // Tag breakdown for this account
              const tagStats: { [tagName: string]: { count: number; totalAmount: number; totalCredit: number; totalDebit: number; } } = {};
              txs.forEach(tx => {
                const tags = Array.isArray(tx.tags) ? tx.tags : [];
                const amount = typeof tx.AmountRaw === 'number' ? tx.AmountRaw : 0;
                const crdr = (tx['Dr./Cr.'] || '').toString().trim().toUpperCase();
                tags.forEach(tag => {
                  if (!tagStats[tag.name]) tagStats[tag.name] = { count: 0, totalAmount: 0, totalCredit: 0, totalDebit: 0 };
                  tagStats[tag.name].count++;
                  tagStats[tag.name].totalAmount += amount;
                  if (crdr === 'CR') tagStats[tag.name].totalCredit += Math.abs(amount);
                  else if (crdr === 'DR') tagStats[tag.name].totalDebit += Math.abs(amount);
                });
              });

              return (
                <div key={accountId} className="mb-6">
                  <div className="bg-blue-100/60 rounded-2xl shadow-md p-6 mb-4">
                    <div className="text-base font-semibold text-gray-700 mb-1">
                      Account: <span className="font-mono text-blue-900 underline underline-offset-2 cursor-pointer hover:text-blue-700 hover:underline">{accountId}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      Transactions: <span className="font-bold text-blue-800">{txs.length}</span> |
                      Total: <span className="font-bold text-blue-800">{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> |
                      Credit: <span className="font-bold text-green-700">{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> |
                      Debit: <span className="font-bold text-red-700">{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {/* Tag breakdown table */}
                    {Object.keys(tagStats).length > 0 && (
                      <div className="overflow-x-auto mt-2">
                        <table className="min-w-[400px] w-full border text-xs bg-white rounded-xl overflow-hidden shadow-sm">
                          <thead>
                            <tr className="bg-blue-50 text-blue-900">
                              <th className="border px-4 py-2 font-semibold">Tag</th>
                              <th className="border px-4 py-2 font-semibold"># Txns</th>
                              <th className="border px-4 py-2 font-semibold">Total</th>
                              <th className="border px-4 py-2 font-semibold">Credit</th>
                              <th className="border px-4 py-2 font-semibold">Debit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(tagStats).map(([tagName, stat]) => (
                              <tr key={tagName} className="hover:bg-blue-100/60 transition">
                                <td className="border px-4 py-2">{tagName}</td>
                                <td className="border px-4 py-2 text-center">{stat.count}</td>
                                <td className="border px-4 py-2 text-right">{stat.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="border px-4 py-2 text-right text-green-700">{stat.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="border px-4 py-2 text-right text-red-700">{stat.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  ];

  const handleDownloadPDF = async () => {
    setExportingAllPages(true);
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for DOM update
    if (!reportContainerRef.current) return;
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf()
      .set({
        margin: 0,
        filename: 'super-bank-report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
      })
      .from(reportContainerRef.current)
      .save()
      .finally(() => setExportingAllPages(false));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Super Bank Report" maxWidthClass="max-w-[810px]">
      {/* Download PDF Button */}
      <div className="relative">
        <button
          className="absolute top-4 right-4 z-10 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-all"
          onClick={handleDownloadPDF}
        >
          Download PDF
        </button>
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
        className={exportingAllPages ? "w-full bg-transparent p-0 m-0" : "flex justify-center items-start w-full bg-transparent p-0 m-0"}
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
              <div style={{ width: `${A4_WIDTH_PX}px`, minHeight: `${A4_HEIGHT_PX}px`, background: 'white', boxSizing: 'border-box', pageBreakAfter: 'always', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
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
    </Modal>
  );
}

export default function SuperBankPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const [totalBanks, setTotalBanks] = useState<number>(0);
  const [totalAccounts, setTotalAccounts] = useState<number>(0);

  const [showHeaderSection, setShowHeaderSection] = useState(false);

  const [tagFilters, setTagFilters] = useState<string[]>([]);

  const [selection, setSelection] = useState<{ text: string; x: number; y: number; rowIdx?: number } | null>(null);
  const [tagCreateMsg, setTagCreateMsg] = useState<string | null>(null);
  const [pendingTag, setPendingTag] = useState<{ tagName: string; rowIdx: number; selectionText: string } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Add state
  const [searchField, setSearchField] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'tagged' | 'untagged'>('desc');

  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Drag-and-drop state for header editing
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const [reportOpen, setReportOpen] = useState(false);

  const [bankIdNameMap, setBankIdNameMap] = useState<{ [id: string]: string }>({});

  // Progress tracking for bulk operations
  const [matchingTransactions, setMatchingTransactions] = useState<Transaction[]>([]);
  const [failedTransactions, setFailedTransactions] = useState<{ id: string; error: string; description?: string }[]>([]);
  const [showRetryButton, setShowRetryButton] = useState(false);

  // Helper function to extract tag IDs for API calls
  const extractTagIds = (tags: Tag[]): string[] => {
    return tags.map(tag => tag.id);
  };

  // Helper to reorder array
  const reorder = (arr: string[], from: number, to: number) => {
    const updated = [...arr];
    const [removed] = updated.splice(from, 1);
    updated.splice(to, 0, removed);
    return updated;
  };

  // Fetch all transactions
  useEffect(() => {
    setLoading(true);
    setError(null);
    const userId = localStorage.getItem("userId") || "";
    fetch(`/api/transactions/all?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
        else setError(data.error || "Failed to fetch transactions");
      })
      .catch(() => setError("Failed to fetch transactions"))
      .finally(() => setLoading(false));
  }, []);

  // Fetch Super Bank header
  useEffect(() => {
    fetch(`/api/bank-header?bankName=SUPER%20BANK`)
      .then(res => res.json())
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
      });
  }, []);

  // Fetch all bank header mappings
  useEffect(() => {
    fetch(`/api/bank`)
      .then(res => res.json())
      .then(async (banks: { id: string; bankName: string }[]) => {
        console.log('BANKS FETCHED:', banks); // Debug log
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

  // Fetch all banks and accounts for stats
  useEffect(() => {
    fetch('/api/bank')
      .then(res => res.json())
      .then(async (banks: { id: string; bankName: string }[]) => {
        if (!Array.isArray(banks)) return;
        setTotalBanks(banks.length);
        let accountCount = 0;
        await Promise.all(
          banks.map(async (bank) => {
            const res = await fetch(`/api/account?bankId=${bank.id}`);
            const accounts = await res.json();
            if (Array.isArray(accounts)) accountCount += accounts.length;
          })
        );
        setTotalAccounts(accountCount);
      });
  }, []);

  // Detect text selection in table and which row
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim() && tableRef.current && tableRef.current.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = tableRef.current.getBoundingClientRect();
        // Try to find the row index
        let rowIdx: number | undefined = undefined;
        let node = sel.anchorNode as HTMLElement | null;
        while (node && node !== tableRef.current) {
          if (node instanceof HTMLTableRowElement && node.hasAttribute('data-row-idx')) {
            rowIdx = parseInt(node.getAttribute('data-row-idx') || '', 10);
            break;
          }
          node = node.parentElement;
        }
        setSelection({
          text: sel.toString().trim(),
          x: rect.left - containerRect.left,
          y: rect.bottom - containerRect.top,
          rowIdx,
        });
      } else {
        setSelection(null);
      }
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

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
        body: JSON.stringify({ name: selection.text, userId }),
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
    const { tagName, rowIdx } = pendingTag;
    const tagObj = allTags.find(t => t.name === tagName);
    if (!tagObj) return setPendingTag(null);
    const row = filteredRows[rowIdx];
    if (!row || !row.id) return setPendingTag(null);
    const tx = transactions.find(t => t.id === row.id);
    if (!tx) return setPendingTag(null);
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
      setLoading(true);
      fetch("/api/transactions/all?userId=" + (localStorage.getItem("userId") || ""))
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setTransactions(data);
          else setError(data.error || "Failed to fetch transactions");
        })
        .catch(() => setError("Failed to fetch transactions"))
        .finally(() => setLoading(false));
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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk update failed');
      }
      
      const result = await response.json();
      
      // Handle results
      const failedTransactions = result.failed || [];
      const successfulCount = result.successful || 0;
      
      // Store failed transactions globally
      setFailedTransactions(failedTransactions);
      setShowRetryButton(failedTransactions.length > 0);
      
      // Show detailed results
      if (failedTransactions.length === 0) {
        setTagCreateMsg(`✅ Tag applied to all ${matching.length} matching transactions!`);
      } else {
        setTagCreateMsg(`⚠️ Tag applied to ${successfulCount} transactions. ${failedTransactions.length} failed.`);
        console.error('Failed transactions:', failedTransactions);
      }
      
      setTimeout(() => setTagCreateMsg(null), 3000);
      setLoading(true);
      fetch("/api/transactions/all?userId=" + (localStorage.getItem("userId") || ""))
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setTransactions(data);
          else setError(data.error || "Failed to fetch transactions");
        })
        .catch(() => setError("Failed to fetch transactions"))
        .finally(() => setLoading(false));
    } catch (error) {
      setTagError('Failed to apply tag to all matching transactions');
      console.error('Bulk update error:', error);
    } finally {
      setApplyingTagToAll(false);
      setMatchingTransactions([]);
    }
  };

  // Helper to normalize date to dd/mm/yyyy
  function normalizeDateToDDMMYYYY(dateStr: string): string {
    if (!dateStr) return '';
    // Match dd/mm/yyyy, dd-mm-yyyy, dd/mm/yy, dd-mm-yy
    const match = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (match) {
      let [, dd, mm, yyyy] = match;
      if (yyyy.length === 2) yyyy = '20' + yyyy;
      // Pad day and month
      if (dd.length === 1) dd = '0' + dd;
      if (mm.length === 1) mm = '0' + mm;
      return `${dd}/${mm}/${yyyy}`;
    }
    // Try ISO or fallback
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    return dateStr;
  }

  // Helper to robustly parse Indian-style and scientific notation amounts
  function parseIndianAmount(val: string | number | undefined): number {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      // Remove all commas and spaces
      const cleaned = val.replace(/,/g, '').trim();
      // parseFloat handles scientific notation too
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  // Helper to format any value as Indian-style string
  function formatIndianAmount(val: string | number | undefined): string {
    const num = parseIndianAmount(val);
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Create mappedRowsWithConditions with proper condition evaluation
  const mappedRowsWithConditions = transactions.map(tx => {
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
        mappedRow[sh] = typeof value === 'string' ? normalizeDateToDDMMYYYY(value) : value;
      } else if (sh === 'Amount') {
        const rawAmount = getValueForColumn(tx, String(tx.bankId), 'Amount');
        mappedRow.Amount = formatIndianAmount(rawAmount); // always Indian style for UI
        mappedRow.AmountRaw = parseIndianAmount(rawAmount); // for analytics
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
    // Apply conditions for Dr./Cr.
    mappedRow['Dr./Cr.'] = getValueForColumn(tx, String(tx.bankId), 'Dr./Cr.');
    return mappedRow as Transaction & { AmountRaw?: number; 'Dr./Cr.'?: string };
  });

  // Tag filter logic: filter mappedRowsWithConditions by selected tags first
  const tagFilteredRows = tagFilters.length > 0
    ? mappedRowsWithConditions.filter(row => Array.isArray(row.tags) && row.tags.some(t => tagFilters.includes(t.name)))
    : mappedRowsWithConditions;

  // Then apply search, date, and tag/untagged filters to tagFilteredRows
  const filteredRows = tagFilteredRows.filter((row) => {
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
        : String(row[searchField] || '')
            .toLowerCase()
            .includes(search.toLowerCase()));
    // Date range (try to find a date column)
    let dateMatch = true;
    const dateCol = superHeader.find((h) => h.toLowerCase().includes('date'));
    if (dateCol && (dateRange.from || dateRange.to)) {
      const rowDate = row[dateCol];
      if (typeof rowDate === 'string') {
        // Try to parse as yyyy-mm-dd or dd/mm/yyyy
        let d = rowDate;
        if (/\d{2}\/\d{2}\/\d{4}/.test(d)) {
          const [dd, mm, origYyyy] = d.split("/");
          d = `${origYyyy}-${mm}-${dd}`;
        }
        if (dateRange.from && d < dateRange.from) dateMatch = false;
        if (dateRange.to && d > dateRange.to) dateMatch = false;
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
    return searchMatch && dateMatch;
  });

  // Filtered and searched rows (already present as filteredRows)
  const sortedAndFilteredRows = [...filteredRows].sort((a, b) => {
    const dateA = parseDate(a['Date'] as string);
    const dateB = parseDate(b['Date'] as string);
    if (sortOrder === 'desc') {
      return dateB.getTime() - dateA.getTime();
    } else {
      return dateA.getTime() - dateB.getTime();
    }
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

  // Download selected as CSV
  const handleDownload = () => {
    if (selectedRows.size === 0) return;
    const rows = Array.from(selectedRows)
      .map((id) => filteredRows.find(tx => tx.id === id))
      .filter((row): row is typeof filteredRows[number] => !!row); // filter out undefined
    const csv = [superHeader.join(",")].concat(
      rows.map((row) =>
        superHeader.map((sh) => {
          const val = row[sh];
          if (Array.isArray(val)) return val.map((v) => (typeof v === 'object' && v !== null && 'name' in v ? (v as Tag).name : String(v))).join('; ');
          if (typeof val === 'object' && val !== null && 'name' in val) return (val as Tag).name;
          if (typeof val === 'string' || typeof val === 'number') return String(val);
          return '';
        }).join(",")
      )
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "super-bank-selected.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

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
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk update failed');
      }
      setTagSuccess('Tag added!');
      setSelectedTagId("");
      setSelectedRows(new Set());
      setTimeout(() => setTagSuccess(null), 1500);
      setLoading(true);
      fetch("/api/transactions/all?userId=" + (localStorage.getItem("userId") || ""))
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setTransactions(data);
          else setError(data.error || "Failed to fetch transactions");
        })
        .catch(() => setError("Failed to fetch transactions"))
        .finally(() => setLoading(false));
    } catch (e) {
      setTagError(e instanceof Error ? e.message : 'Failed to add tag');
    } finally {
      setTagging(false);
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
      setTagCreateMsg('Tag removed!');
      setTimeout(() => setTagCreateMsg(null), 1500);
      setLoading(true);
      fetch("/api/transactions/all?userId=" + (localStorage.getItem("userId") || ""))
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setTransactions(data);
          else setError(data.error || "Failed to fetch transactions");
        })
        .catch(() => setError("Failed to fetch transactions"))
        .finally(() => {
          setLoading(false);
          // Refresh the tab after tag deletion
          window.location.reload();
        });
    } catch (error) {
      setTagError(error as string || 'Failed to remove tag');
    } finally {
      setRemovingTag(false);
    }
  };

  // Analytics calculations using mappedRowsWithConditions (filteredRows already contains the filtered version)
  const totalAmount = filteredRows.reduce((sum, row) => {
    const amountRaw = typeof row.AmountRaw === 'number' ? row.AmountRaw : 0;
    return sum + amountRaw;
  }, 0);

  // Calculate DR/CR totals for filteredRows
  let totalCredit = 0, totalDebit = 0;
  filteredRows.forEach(row => {
    const amount = typeof row.AmountRaw === 'number' && isFinite(row.AmountRaw) ? row.AmountRaw : 0;
    let crdr = row['Dr./Cr.'];
    if (typeof crdr === 'string') {
      crdr = crdr.trim().toUpperCase();
        } else {
      crdr = '';
      }
    if (crdr === 'CR') {
      totalCredit += Math.abs(amount);
    } else if (crdr === 'DR') {
      totalDebit += Math.abs(amount);
    }
  });
  if (!isFinite(totalCredit)) totalCredit = 0;
  if (!isFinite(totalDebit)) totalDebit = 0;

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

  // Handler to apply tag to all matching transactions from context menu
  const handleApplyTagToAllFromMenu = (tagName: string) => {
    setPendingTag({ tagName, rowIdx: -1, selectionText: tagName });
    setTimeout(() => handleApplyTagToAll(), 0); // ensure pendingTag is set before running
  };

  // Compute tag statistics for filteredRows (for pills and summary)
  const filteredTagStats: Record<string, number> = {};
  filteredRows.forEach(row => {
    if (Array.isArray(row.tags)) {
      row.tags.forEach(tag => {
        if (tag && tag.name) {
          filteredTagStats[tag.name] = (filteredTagStats[tag.name] || 0) + 1;
        }
      });
    }
  });
  // Optionally, ensure all tags show a count (including zero)
  allTags.forEach(tag => {
    if (!(tag.name in filteredTagStats)) {
      filteredTagStats[tag.name] = 0;
    }
  });
  const filteredTotalTags = Object.keys(filteredTagStats).length;

  // Sort allTags by usage count descending (use filteredTagStats for current view)
  const sortedTags = [...allTags].sort((a, b) => (filteredTagStats[b.name] || 0) - (filteredTagStats[a.name] || 0));

  // New handleTagDeleted function
  const handleTagDeleted = () => {
    // Refetch all tags
    const userId = localStorage.getItem('userId');
    fetch('/api/tags?userId=' + userId)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAllTags(data); else setAllTags([]); });
    // Refetch all transactions
    setLoading(true);
    fetch("/api/transactions/all?userId=" + (userId || ""))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
        else setError(data.error || "Failed to fetch transactions");
      })
      .catch(() => setError("Failed to fetch transactions"))
      .finally(() => setLoading(false));
  };


  // Helper: get value for any column using per-bank conditions
  function getValueForColumn(row: TransactionRow, bankId: string, columnName: string): string | number | undefined {
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
    // if (mapping && mapping[columnName]) {
    //   console.log('Mapping fallback debug:', {
    //     bankId,
    //     columnName,
    //     mappingField: mapping[columnName],
    //     value: row[mapping[columnName]],
    //     row
    //   });
    // }
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
  }

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
    const headerArr = headerInputs.map(h => h.trim()).filter(Boolean);
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

  // Helper to parse both dd/mm/yyyy and dd-mm-yy, and with - as separator
  function parseDate(dateStr: string): Date {
    if (!dateStr || typeof dateStr !== 'string') return new Date('1970-01-01');

    // Regex to match dd/mm/yyyy or dd-mm-yyyy (and yy)
    const match = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

    if (match) {
      const day = match[1];
      const month = match[2];
      let year = match[3];

      if (year.length === 2) {
        year = '20' + year;
      }

      // Create date, note that the month is 0-indexed in JavaScript's Date constructor.
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }
    
    // Fallback for ISO date strings or other formats recognized by new Date()
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d;
    }

    // Return a default date for invalid formats
    return new Date('1970-01-01');
  }

  useEffect(() => {
    console.log('BANKS:', bankIdNameMap);
  }, [bankIdNameMap]);

  // Add this handler in SuperBankPage
  const handleCreateTag = async (name: string) => {
    const trimmed = name.trim().toLowerCase();
    // Check for duplicate (case-insensitive, trimmed)
    const existing = allTags.find(tag => tag.name.trim().toLowerCase() === trimmed);
    if (existing) {
      setSelectedTagId(existing.id);
      setTimeout(() => handleAddTag(), 0);
      return existing.id;
    }
    // Create tag in backend
    const userId = localStorage.getItem('userId');
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, userId, color: '#60a5fa' }) // default blue
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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk retry failed');
      }
      
      const result = await response.json();
      
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
      
      // Refresh transactions
      setLoading(true);
      fetch("/api/transactions/all?userId=" + (localStorage.getItem("userId") || ""))
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setTransactions(data);
          else setError(data.error || "Failed to fetch transactions");
        })
        .catch(() => setError("Failed to fetch transactions"))
        .finally(() => setLoading(false));
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

  return (
    <div className="min-h-screen py-4 sm:py-6 px-2 sm:px-4">
      <div className="max-w-full sm:max-w-[75%] mx-auto">
        <div className="flex flex-row items-center justify-between gap-2 mb-4 sm:mb-6">
          <h1 className="text-base sm:text-2xl font-bold text-blue-700 truncate">Super Bank: All Transactions</h1>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow font-semibold text-sm sm:text-base whitespace-nowrap"
            onClick={() => setShowHeaderSection(true)}
          >
            Header
          </button>
        </div>
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
            <h2 className="font-bold text-blue-700 mb-2 text-sm sm:text-base">Super Bank Header</h2>
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
            totalTags={filteredTotalTags}
            tagged={tagged}
            untagged={untagged}
            showTagStats={true}
            onShowUntagged={() => {
              // Filter to show only untagged transactions
              setSortOrder('untagged');
            }}
          />
        )}
        {/* Filter box below stats, wider on PC */}
        <TransactionFilterBar
          search={search}
          onSearchChange={setSearch}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onDownload={handleDownload}
          downloadDisabled={selectedRows.size === 0}
          searchField={searchField}
          onSearchFieldChange={setSearchField}
          searchFieldOptions={['all', ...superHeader]}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          sortOrderOptions={[
            { value: 'desc', label: 'Latest First' },
            { value: 'asc', label: 'Oldest First' },
            { value: 'tagged', label: 'Tagged Only' },
            { value: 'untagged', label: 'Untagged Only' },
          ]}
        />
        {/* Tag filter pills section below controls */}
        <TagFilterPills
          allTags={sortedTags}
          tagFilters={tagFilters}
          onToggleTag={tagName => setTagFilters(filters => filters.includes(tagName) ? filters.filter(t => t !== tagName) : [...filters, tagName])}
          onClear={() => setTagFilters([])}
          onTagDeleted={() => handleTagDeleted()}
          onApplyTagToAll={handleApplyTagToAllFromMenu}
          tagStats={filteredTagStats}
        />
        {/* Tagging controls above table */}
        {sortedAndFilteredRows.filter(tx => selectedRows.has(tx.id)).length > 0 && (
          <TaggingControls
            allTags={allTags}
            selectedTagId={selectedTagId}
            onTagChange={setSelectedTagId}
            onAddTag={handleAddTag}
            selectedCount={sortedAndFilteredRows.filter(tx => selectedRows.has(tx.id)).length}
            tagging={tagging}
            tagError={tagError}
            tagSuccess={tagSuccess}
            onCreateTag={handleCreateTag}
          />
        )}
        {/* Table and selection logic */}
        <div ref={tableRef} className="overflow-x-auto relative">
          {/* Global loading overlay for tag operations */}
          {(applyingTagToRow || applyingTagToAll || removingTag || creatingTag || tagging) && (
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
                     tagging ? 'Adding tag...' : 'Processing...'}
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
            loading={loading}
            error={error}
            onRemoveTag={handleRemoveTag}
            onReorderHeaders={handleReorderHeaders}
            transactions={transactions}
            bankMappings={bankMappings}
            getValueForColumn={(tx, bankId, sh) => {
              const value = getValueForColumn(tx, bankId, sh);
              return value;
            }}
          />
        </div>
      </div>
      {/* Floating Download Report Button */}
      <button
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center text-white text-3xl transition-all"
        title="Download Report"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
        onClick={() => setReportOpen(true)}
      >
        <FiDownload />
      </button>
      <SuperBankReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        transactions={filteredRows}
        totalBanks={totalBanks}
        totalAccounts={totalAccounts}
        bankIdNameMap={bankIdNameMap}
        tagFilters={tagFilters}
      />
    </div>
  );
} 
