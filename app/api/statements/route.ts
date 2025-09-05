import { NextResponse } from 'next/server';
import { TABLES } from '../../config/database';
import { brmhExecute } from '@/app/lib/brmhExecute';



// GET /api/statements?accountId=xxx&userId=yyy&bankId=zzz
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const userId = searchParams.get('userId');
  const bankId = searchParams.get('bankId');
  
  if (!accountId && !bankId) {
    return NextResponse.json({ error: 'accountId or bankId is required' }, { status: 400 });
  }
  
  try {
    let filterExpression = '';
    const expressionAttributeValues: Record<string, string> = {};
    
    if (accountId) {
      filterExpression = 'accountId = :accountId';
      expressionAttributeValues[':accountId'] = accountId;
    }
    
    if (bankId) {
      if (filterExpression) {
        filterExpression += ' AND bankId = :bankId';
      } else {
        filterExpression = 'bankId = :bankId';
      }
      expressionAttributeValues[':bankId'] = bankId;
    }
    
    if (userId) {
      if (filterExpression) {
        filterExpression += ' AND userId = :userId';
      } else {
        filterExpression = 'userId = :userId';
      }
      expressionAttributeValues[':userId'] = userId;
    }
    
    const r = await brmhExecute<{ items?: Record<string, unknown>[] }>({ executeType: 'crud', crudOperation: 'get', tableName: TABLES.BANK_STATEMENTS, pagination: 'true', itemPerPage: 1000 });
    let items = r.items || [];
    if (accountId) items = items.filter(s => s.accountId === accountId);
    if (bankId) items = items.filter(s => s.bankId === bankId);
    if (userId) items = items.filter(s => s.userId === userId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching statements:', error);
    return NextResponse.json({ error: 'Failed to fetch statements' }, { status: 500 });
  }
} 