import { ScanCommand, ScanCommandInput, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES, getBankTransactionTable } from '../../aws-client';

type TagItem = { id: string; name: string; color?: string; userId?: string };
type TransactionItem = Record<string, unknown> & {
  id?: string;
  userId?: string;
  statementId?: string;
  tags?: Array<string | TagItem>;
  AmountRaw?: number;
  Amount?: number | string;
  amount?: number | string;
  'Dr./Cr.'?: string;
  bankId?: string;
  accountId?: string;
  accountNumber?: string;
  AccountNumber?: string;
  account_number?: string;
  AccountNo?: string;
  accountNo?: string;
  'Dr/Cr'?: string;
  'DR/CR'?: string;
  'Type'?: string;
  // ICICI specific fields
  'Cr/Dr'?: string;
  'Transaction Amount(INR)'?: number | string;
};

function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const match = val.replace(/₹|,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (match) return parseFloat(match[0]);
  }
  return 0;
}

function extractAmountAndType(tx: TransactionItem): { amountAbs: number; crdr: 'CR' | 'DR' | '' } {
  // Debug: Log the first few transactions to see field structure
  const txId = tx.id;
  const bankId = tx.bankId as string | undefined;
  
  // Enhanced debugging for ICICI and Kotak transactions specifically
  if (bankId && (bankId.toLowerCase().includes('kotak') || bankId.toLowerCase().includes('icici'))) {
    console.log(`🔍 ${bankId.toUpperCase()} Transaction fields:`, {
      id: txId,
      bankId: bankId,
      allFields: Object.keys(tx),
      allValues: Object.fromEntries(
        Object.entries(tx).map(([k, v]) => [k, typeof v === 'string' ? v.substring(0, 50) : v])
      ),
      drCrField: tx['Dr./Cr.'],
      drCrField2: tx['Dr/Cr' as keyof typeof tx],
      drCrField3: tx['DR/CR' as keyof typeof tx],
      typeField: tx['Type' as keyof typeof tx],
      amountField: tx.AmountRaw ?? tx.Amount ?? tx.amount,
      // ICICI specific fields
      iciciCrDr: tx['Cr/Dr' as keyof typeof tx],
      iciciAmount: tx['Transaction Amount(INR)' as keyof typeof tx]
    });
  }

  // Prefer unified amount fields if present (including ICICI specific field)
  const unified = tx.AmountRaw ?? tx.Amount ?? tx.amount ?? tx['Transaction Amount(INR)' as keyof typeof tx];

  // Enhanced CR/DR field detection
  const findCrDr = (): string => {
    // Try all possible CR/DR field variations
    const possibleFields = [
      'Dr./Cr.',
      'Dr/Cr', 
      'DR/CR',
      'dr/cr',
      'CR/DR',
      'cr/dr',
      'Cr/Dr',
      'Type',
      'Transaction Type',
      'Txn Type',
      'Debit/Credit',
      'DebitCredit',
      'DC',
      'D/C',
      // Add the exact field names from Kotak bank
      'Dr / Cr',
      'Dr / Cr_1',
      'DR / CR',
      'DR / CR_1',
      // Add ICICI specific field names
      'Cr/Dr',
      'Cr / Dr',
      'CR/DR',
      'CR / DR'
    ];
    
    for (const field of possibleFields) {
      const value = tx[field as keyof typeof tx];
      if (value != null && value !== '') {
        const norm = String(value).trim().toUpperCase();
        if (norm === 'CR' || norm === 'DR' || norm === 'DEBIT' || norm === 'CREDIT') {
          if (bankId && (bankId.toLowerCase().includes('kotak') || bankId.toLowerCase().includes('icici'))) {
            console.log(`🔍 Found CR/DR field "${field}": "${value}" -> "${norm}"`);
          }
          return norm === 'DEBIT' ? 'DR' : norm === 'CREDIT' ? 'CR' : norm;
        }
      }
    }
    
    // Fallback: scan keys that contain CR/DR indicators
    for (const k of Object.keys(tx || {})) {
      const lk = k.toLowerCase();
      if ((lk.includes('cr') && lk.includes('dr')) || lk.includes('debit') || lk.includes('credit')) {
        const v = tx[k as keyof typeof tx];
        if (v != null && v !== '') {
          const norm = String(v).trim().toUpperCase();
                  if (norm === 'CR' || norm === 'DR' || norm === 'DEBIT' || norm === 'CREDIT') {
          if (bankId && (bankId.toLowerCase().includes('kotak') || bankId.toLowerCase().includes('icici'))) {
            console.log(`🔍 Found CR/DR via key scan "${k}": "${v}" -> "${norm}"`);
          }
          return norm === 'DEBIT' ? 'DR' : norm === 'CREDIT' ? 'CR' : norm;
        }
        }
      }
    }
    
    if (bankId && (bankId.toLowerCase().includes('kotak') || bankId.toLowerCase().includes('icici'))) {
      console.log(`🔍 No CR/DR field found for ${bankId} transaction`);
    }
    return '';
  };
  
  const crdrField = findCrDr();

  if (unified !== undefined) {
    const num = toNumber(unified);
    const abs = Math.abs(num);
    if (crdrField === 'CR' || crdrField === 'DR') {
      const result = { amountAbs: abs, crdr: crdrField as 'CR' | 'DR' };
      if (bankId && (bankId.toLowerCase().includes('kotak') || bankId.toLowerCase().includes('icici'))) {
        console.log(`🔍 ${bankId}: Using explicit CR/DR field:`, result);
      }
      return result;
    }
    // Don't fall back to sign-based inference for now - let it go to split field detection
  }

  // Try split credit/debit style fields
  let credit = 0;
  let debit = 0;
  for (const [rawKey, value] of Object.entries(tx)) {
    const key = rawKey.toLowerCase();
    const n = toNumber(value);
    if (!n) continue;
    if (key.includes('credit') || key.includes('deposit') || key.includes('cr amount') || /(^|\W)cr(\W|$)/.test(key)) {
      credit += Math.abs(n);
    }
    if (key.includes('debit') || key.includes('withdraw') || key.includes('dr amount') || /(^|\W)dr(\W|$)/.test(key)) {
      debit += Math.abs(n);
    }
  }
  if (credit > 0 && debit === 0) return { amountAbs: Math.round(credit * 100) / 100, crdr: 'CR' };
  if (debit > 0 && credit === 0) return { amountAbs: Math.round(debit * 100) / 100, crdr: 'DR' };

  // If we still can't determine, return 0 to skip this transaction
  if (bankId && (bankId.toLowerCase().includes('kotak') || bankId.toLowerCase().includes('icici'))) {
    console.log(`🔍 ${bankId}: Could not determine CR/DR, skipping transaction`);
  }
  return { amountAbs: 0, crdr: '' };
}

export async function recomputeAndSaveTagsSummary(userId: string): Promise<void> {
  // 1) Load all tags for this user
  const userTags: TagItem[] = [];
  {
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    while (hasMoreItems) {
      const params: ScanCommandInput = {
        TableName: TABLES.TAGS,
        FilterExpression: '#userId = :userId',
        ExpressionAttributeNames: { '#userId': 'userId' },
        ExpressionAttributeValues: { ':userId': userId },
      };
      if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
      const result = await docClient.send(new ScanCommand(params));
      userTags.push(...(result.Items as TagItem[] | undefined ?? []));
      lastEvaluatedKey = result.LastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      if (hasMoreItems) await new Promise(r => setTimeout(r, 100));
    }
  }

  const tagsById = new Map<string, TagItem>();
  const tagsByNameLower = new Map<string, TagItem>();
  for (const t of userTags) {
    if (t?.id) tagsById.set(t.id, t);
    if (t?.name) tagsByNameLower.set(t.name.toLowerCase(), t);
  }

  type BankBreakdown = {
    credit: number;
    debit: number;
    balance: number;
    transactionCount: number;
    accounts: string[];
  };

  type TagAgg = {
    tagId: string;
    tagName: string;
    credit: number;
    debit: number;
    balance: number;
    transactionCount: number;
    statementIds: string[];
    bankBreakdown: { [bankName: string]: BankBreakdown };
  };
  const aggByTagId = new Map<string, TagAgg>();

  const getOrInitAgg = (tag: TagItem): TagAgg => {
    let entry = aggByTagId.get(tag.id);
    if (!entry) {
      entry = {
        tagId: tag.id,
        tagName: tag.name || '',
        credit: 0,
        debit: 0,
        balance: 0,
        transactionCount: 0,
        statementIds: [],
        bankBreakdown: {},
      };
      aggByTagId.set(tag.id, entry);
    }
    return entry;
  };

  // 2) Load all banks
  const banksResult = await docClient.send(new ScanCommand({ TableName: TABLES.BANKS }));
  const banks = (banksResult.Items || []) as Array<{ bankName?: string } & Record<string, unknown>>;

  // 3) Accumulate per-tag metrics across bank tables
  for (const bank of banks) {
    const bankName = String(bank.bankName ?? '').trim();
    if (!bankName) continue;
    const tableName = getBankTransactionTable(bankName);
    try {
      let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
      let hasMoreItems = true;
      while (hasMoreItems) {
        const params: ScanCommandInput = { 
          TableName: tableName, 
          FilterExpression: 'userId = :userId', 
          ExpressionAttributeValues: { ':userId': userId },
          Limit: 1000 // Limit batch size for better performance
        };
        if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
        const result = await docClient.send(new ScanCommand(params));
        const txs = (result.Items || []) as TransactionItem[];

        for (const tx of txs) {
          const txTagsRaw = Array.isArray(tx.tags) ? tx.tags : [];
          const txTags: TagItem[] = txTagsRaw
            .map(tag => {
              if (typeof tag === 'string') return tagsById.get(tag) || tagsByNameLower.get(tag.toLowerCase());
              if (tag && typeof tag === 'object') {
                const anyTag = tag as Record<string, unknown>;
                const byId = typeof anyTag.id === 'string' ? tagsById.get(anyTag.id) : undefined;
                if (byId) return byId;
                const byName = typeof anyTag.name === 'string' ? tagsByNameLower.get((anyTag.name as string).toLowerCase()) : undefined;
                if (byName) return byName;
              }
              return undefined;
            })
            .filter(Boolean) as TagItem[];

          if (txTags.length === 0) continue;

          const { amountAbs, crdr } = extractAmountAndType(tx);
          if (!amountAbs) continue; // skip zero/unknown amounts
          const statementId = typeof tx.statementId === 'string' ? tx.statementId : undefined;

          for (const tag of txTags) {
            const entry = getOrInitAgg(tag);
            if (crdr === 'CR') {
              entry.credit = Math.round((entry.credit + amountAbs) * 100) / 100;
            } else if (crdr === 'DR') {
              entry.debit = Math.round((entry.debit + amountAbs) * 100) / 100;
            }
            entry.balance = Math.round((entry.credit - entry.debit) * 100) / 100;
            entry.transactionCount += 1;
            if (statementId && !entry.statementIds.includes(statementId)) {
              entry.statementIds.push(statementId);
            }
            
            // Add bank breakdown data
            if (!entry.bankBreakdown[bankName]) {
              entry.bankBreakdown[bankName] = {
                credit: 0,
                debit: 0,
                balance: 0,
                transactionCount: 0,
                accounts: [],
              };
            }
            
            const bankData = entry.bankBreakdown[bankName];
            if (crdr === 'CR') {
              bankData.credit = Math.round((bankData.credit + amountAbs) * 100) / 100;
            } else if (crdr === 'DR') {
              bankData.debit = Math.round((bankData.debit + amountAbs) * 100) / 100;
            }
            bankData.balance = Math.round((bankData.credit - bankData.debit) * 100) / 100;
            bankData.transactionCount += 1;
            
            // Add account number if not already present (prefer account number over name)
            const accountNumber = tx.accountNumber as string | undefined || 
                                 tx.AccountNumber as string | undefined || 
                                 tx.account_number as string | undefined || 
                                 tx.AccountNo as string | undefined || 
                                 tx.accountNo as string | undefined || '';
            
            let accountDisplay = '';
            if (accountNumber && typeof accountNumber === 'string') {
              accountDisplay = accountNumber;
            } else if (tx.accountId && typeof tx.accountId === 'string') {
              // Only use accountId as last resort, but truncate UUID for readability
              accountDisplay = `Account-${tx.accountId.substring(0, 8)}...`;
            }
            
            if (accountDisplay && !bankData.accounts.includes(accountDisplay)) {
              bankData.accounts.push(accountDisplay);
            }
            
            // Debug logging for HDFC tag
            if (tag.name === 'HDFC') {
              console.log(`HDFC Tag - Transaction ${tx.id}: amount=${amountAbs}, crdr=${crdr}, totalCount=${entry.transactionCount}, bank=${bankName}, accountDisplay=${accountDisplay}`);
              console.log(`Available account fields:`, {
                accountId: tx.accountId,
                accountNumber,
                allKeys: Object.keys(tx).filter(k => k.toLowerCase().includes('account'))
              });
            }
          }
        }

        lastEvaluatedKey = result.LastEvaluatedKey;
        hasMoreItems = !!lastEvaluatedKey;
        if (hasMoreItems) await new Promise(r => setTimeout(r, 50)); // Reduced delay for better performance
      }
    } catch (error) {
      console.error(`Error processing bank ${bankName} (table: ${tableName}):`, error);
      continue;
    }
  }

  // 4) Ensure all user tags present
  for (const tag of userTags) {
    if (!aggByTagId.has(tag.id)) {
      aggByTagId.set(tag.id, {
        tagId: tag.id,
        tagName: tag.name || '',
        credit: 0,
        debit: 0,
        balance: 0,
        transactionCount: 0,
        statementIds: [],
        bankBreakdown: {},
      });
    }
  }

  const tagsSummary = Array.from(aggByTagId.values()).sort((a, b) => (a.tagName || '').localeCompare(b.tagName || ''));
  
  // Debug logging for final summary
  console.log(`Tags Summary Computation Complete for user ${userId}:`);
  tagsSummary.forEach(tag => {
    console.log(`  ${tag.tagName}: ${tag.transactionCount} transactions, Credit: ${tag.credit}, Debit: ${tag.debit}, Balance: ${tag.balance}`);
    if (Object.keys(tag.bankBreakdown).length > 0) {
      console.log(`    Bank Breakdown:`);
      Object.entries(tag.bankBreakdown).forEach(([bankName, bankData]) => {
        console.log(`      ${bankName}: ${bankData.transactionCount} transactions, Credit: ${bankData.credit}, Debit: ${bankData.debit}, Balance: ${bankData.balance}`);
      });
    }
  });
  
  const now = new Date().toISOString();
  await docClient.send(
    new UpdateCommand({
      TableName: TABLES.REPORTS,
      Key: { id: `tags_summary_${userId}` },
      UpdateExpression: 'SET #type = :type, #uid = :uid, #tags = :tags, #u = :updatedAt, #ca = if_not_exists(#ca, :createdAt)',
      ExpressionAttributeNames: { '#type': 'type', '#uid': 'userId', '#tags': 'tags', '#u': 'updatedAt', '#ca': 'createdAt' },
      ExpressionAttributeValues: { ':type': 'tags_summary', ':uid': userId, ':tags': tagsSummary, ':updatedAt': now, ':createdAt': now },
    })
  );
}


