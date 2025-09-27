import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../brmh-client';

// GET /api/namespace?bankId=xxx - Get namespace data for a specific bank
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get('bankId');
    
    if (!bankId) {
      return NextResponse.json({ error: 'Bank ID is required' }, { status: 400 });
    }
    
    // Get bank information
    const bankResult = await brmhCrud.scan(TABLES.BANKS, {
      FilterExpression: 'id = :bankId',
      ExpressionAttributeValues: { ':bankId': bankId },
      itemPerPage: 1
    });
    
    if (!bankResult.items || bankResult.items.length === 0) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 });
    }
    
    const bank = bankResult.items[0];
    
    // Get accounts for this bank
    const accountsResult = await brmhCrud.scan(TABLES.ACCOUNTS, {
      FilterExpression: 'bankId = :bankId',
      ExpressionAttributeValues: { ':bankId': bankId },
      itemPerPage: 100
    });
    
    // Get bank statements for this bank
    const statementsResult = await brmhCrud.scan(TABLES.BANK_STATEMENTS, {
      FilterExpression: 'bankId = :bankId',
      ExpressionAttributeValues: { ':bankId': bankId },
      itemPerPage: 100
    });
    
    // Return namespace data
    return NextResponse.json({
      bank: bank,
      accounts: accountsResult.items || [],
      statements: statementsResult.items || [],
      namespace: {
        bankId,
        bankName: bank.bankName,
        accountCount: accountsResult.items?.length || 0,
        statementCount: statementsResult.items?.length || 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching namespace data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch namespace data' },
      { status: 500 }
    );
  }
}
 