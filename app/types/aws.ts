export interface Bank {
  id: string;
  bankName: string;
  tags: string[];
}

export interface Account {
  id: string;
  bankId: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  tags: string[];
}

export interface Transaction {
  rowId: string;
  data: Record<string, string>;
  tag: string | null;
}

export interface BankStatement {
  statementId: string;
  bankId: string;
  accountId: string;
  s3FileUrl: string;
  transactionHeader: string[];
  transactionData: Transaction[];
  tags: string[];
} 