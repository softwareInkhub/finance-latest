 import { NextResponse } from 'next/server';
import { ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { docClient, getBankTransactionTable } from '../../aws-client';

// GET /api/debug/bank-tables
export async function GET() {
  try {
    // List all tables
    const listTablesResult = await docClient.send(new ListTablesCommand({}));
    const allTables = listTablesResult.TableNames || [];
    
    // Filter for bank transaction tables (tables starting with 'brmh-')
    const bankTables = allTables.filter(tableName => tableName.startsWith('brmh-'));
    
    // Get some common bank names and check if their tables exist
    const commonBanks = ['Kotak', 'HDFC', 'ICICI', 'IDFC'];
    const bankTableStatus = commonBanks.map(bankName => {
      const expectedTableName = getBankTransactionTable(bankName);
      const exists = bankTables.includes(expectedTableName);
      return {
        bankName,
        expectedTableName,
        exists,
        tableName: exists ? expectedTableName : null
      };
    });
    
    return NextResponse.json({
      allTables: allTables,
      bankTables: bankTables,
      bankTableStatus: bankTableStatus,
      totalTables: allTables.length,
      totalBankTables: bankTables.length
    });
    
  } catch (error) {
    console.error('Error listing tables:', error);
    return NextResponse.json({ 
      error: 'Failed to list tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}



