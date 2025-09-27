import { NextResponse } from 'next/server';
import { brmhDrive } from '../../brmh-drive-client';
import { brmhCrud, getBankTransactionTable } from '../../brmh-client';

// GET /api/folders/[id]?userId=xxx
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    // Get folder details from BRMH Drive
    const folderResult = await brmhDrive.getFolderById(userId, id);
    
    return NextResponse.json(folderResult);
  } catch (error) {
    console.error('Error getting folder:', error);
    return NextResponse.json({ error: 'Failed to get folder' }, { status: 500 });
  }
}


// PATCH /api/folders/[id] - Rename folder
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId, newName } = await request.json();
    
    if (!userId || !newName) {
      return NextResponse.json({ error: 'userId and newName are required' }, { status: 400 });
    }
    
    // Rename folder using BRMH Drive
    const renameResult = await brmhDrive.renameFolder(userId, id, newName);
    
    return NextResponse.json(renameResult);
  } catch (error) {
    console.error('Error renaming folder:', error);
    return NextResponse.json({ error: 'Failed to rename folder' }, { status: 500 });
  }
}

// DELETE /api/folders/[id] - Delete folder
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    // First, get folder details and list all files in the folder
    let folderFiles: Record<string, unknown>[] = [];
    try {
      // Get all files in this folder
      const filesResult = await brmhDrive.listFiles(userId, id);
      folderFiles = filesResult.files || [];
    } catch (error) {
      console.warn('Could not get folder details for cleanup:', error);
    }
    
    // Clean up related transactions for all files in the folder
    if (folderFiles.length > 0) {
      try {
        // Get user's banks to know which tables to scan
        const banksResult = await brmhCrud.scan('banks', {
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId }
        });
        const banks = banksResult.items || [];
        
        let totalDeletedTransactions = 0;
        
        // For each file in the folder, clean up its transactions
        for (const file of folderFiles) {
          // For each bank, scan its transaction table for transactions linked to this file
          for (const bank of banks) {
            const tableName = getBankTransactionTable(bank.bankName);
            try {
              // Look for transactions with matching fileName or statementId
              const transactionResult = await brmhCrud.scan(tableName, {
                FilterExpression: 'fileName = :fileName OR statementId = :statementId',
                ExpressionAttributeValues: {
                  ':fileName': String(file.name),
                  ':statementId': String(file.id)
                }
              });
              
              const relatedTransactions = transactionResult.items || [];
              if (relatedTransactions.length > 0) {
                console.log(`Found ${relatedTransactions.length} related transactions in ${tableName} for file ${file.name}`);
                
                // Delete all related transactions
                const deletePromises = relatedTransactions.map((transaction: { id: string }) =>
                  brmhCrud.delete(tableName, { id: transaction.id })
                );
                await Promise.all(deletePromises);
                totalDeletedTransactions += relatedTransactions.length;
              }
            } catch (tableError) {
              console.warn(`Failed to scan table ${tableName} for file ${file.name}:`, tableError);
              // Continue with other tables even if one fails
            }
          }
        }
        
        if (totalDeletedTransactions > 0) {
          console.log(`Successfully deleted ${totalDeletedTransactions} related transactions from folder`);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup related transactions from folder:', cleanupError);
        // Continue with folder deletion even if cleanup fails
      }
    }
    
    // Delete folder using BRMH Drive
    const deleteResult = await brmhDrive.deleteFolder(userId, id);
    
    return NextResponse.json({
      ...deleteResult,
      deletedTransactions: folderFiles.length > 0 ? 'cleanup attempted' : 'no files in folder',
      filesInFolder: folderFiles.length
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}




