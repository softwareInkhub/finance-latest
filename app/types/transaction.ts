export interface Tag {
  id: string;
  name: string;
  color?: string;
}

// Type for tags that can be either IDs (strings) or full Tag objects
export type TagOrId = string | Tag;

export interface TransactionRow {
  [key: string]: string | number | Tag[] | undefined;
  tags?: Tag[];
  id?: string;
}

export interface Transaction {
  id: string;
  statementId: string;
  bankId: string;
  accountId: string;
  startRow?: number;
  endRow?: number;
  s3FileUrl?: string;
  fileName?: string;
  createdAt?: string;
  tags?: Tag[]; // Note: In storage, this contains tag IDs, but APIs return full Tag objects
  [key: string]: string | number | Tag[] | undefined;
} 