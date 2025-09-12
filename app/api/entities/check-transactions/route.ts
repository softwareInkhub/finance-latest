import { NextResponse } from 'next/server';
import { brmhExecute } from '@/app/lib/brmhExecute';

interface EntityTransaction {
  id: string;
  fileId: string;
  userId: string;
  entityName: string;
  fileName: string;
  createdAt: string;
  [key: string]: unknown;
}

// GET /api/entities/check-transactions?userId=xxx&entityName=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const entityName = searchParams.get('entityName');

    if (!userId || !entityName) {
      return NextResponse.json({ error: 'userId and entityName are required' }, { status: 400 });
    }

    console.log(`Checking transactions for entity: ${entityName}, userId: ${userId}`);

    const transactionsData = await brmhExecute<{ items?: EntityTransaction[] }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: 'brmh-entity-transactions',
      pagination: 'true',
      itemPerPage: 1000
    });

    const transactions = transactionsData.items || [];
    console.log(`Found ${transactions.length} total transactions in brmh-entity-transactions table`);

    const entityTransactions = transactions.filter((transaction: EntityTransaction) => 
      transaction.entityName === entityName && transaction.userId === userId
    );

    console.log(`Found ${entityTransactions.length} transactions for entity ${entityName}`);

    return NextResponse.json({
      success: true,
      totalTransactions: transactions.length,
      entityTransactions: entityTransactions.length,
      transactions: entityTransactions.map(t => ({
        id: t.id,
        entityName: t.entityName,
        userId: t.userId,
        fileName: t.fileName,
        fileId: t.fileId,
        createdAt: t.createdAt
      }))
    });
  } catch (error) {
    console.error('Error checking transactions:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to check transactions';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }
    
    // Check if it's a backend connection error
    if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('5001')) {
      errorMessage = 'Backend server not accessible. Please ensure the backend server is running on port 5001.';
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails,
      backendUrl: process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'
    }, { status: 500 });
  }
}
