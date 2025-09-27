import { NextResponse } from 'next/server';
import { brmhDrive } from '../../brmh-drive-client';
import { brmhCrud, getBankTransactionTable } from '../../brmh-client';

// GET /api/files/[id]?userId=xxx
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    // Get file details from BRMH Drive
    const fileResult = await brmhDrive.getFileById(userId, id);
    
    return NextResponse.json(fileResult);
  } catch (error) {
    console.error('Error getting file:', error);
    return NextResponse.json({ error: 'Failed to get file' }, { status: 500 });
  }
}

// PATCH /api/files/[id] - Rename file
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId, newName } = await request.json();
    
    if (!userId || !newName) {
      return NextResponse.json({ error: 'userId and newName are required' }, { status: 400 });
    }
    
    // Rename file using BRMH Drive
    const renameResult = await brmhDrive.renameFile(userId, id, newName);
    
    return NextResponse.json(renameResult);
  } catch (error) {
    console.error('Error renaming file:', error);
    return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 });
  }
}

// DELETE /api/files/[id] - Delete file
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    // First, get file details to find related transactions
    let fileDetails = null;
    try {
      fileDetails = await brmhDrive.getFileById(userId, id);
    } catch (error) {
      console.warn('Could not get file details for cleanup:', error);
    }
    
    // Clean up related transactions if file details are available
    if (fileDetails && fileDetails.name) {
      try {
        // Get user's banks to know which tables to scan
        const banksResult = await brmhCrud.scan('banks', {
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId }
        });
        const banks = banksResult.items || [];
        
        let totalDeletedTransactions = 0;
        
        // If user has no banks configured, scan common bank tables anyway
        const bankTablesToScan = banks.length > 0 
          ? banks.map((bank: { bankName: string }) => getBankTransactionTable(bank.bankName))
          : ['brmh-hdfc', 'brmh-icici', 'brmh-kotak', 'brmh-idfc', 'brmh-axis', 'brmh-sbi']; // Common bank tables
        
        // For each bank table, scan for transactions linked to this file
        for (const tableName of bankTablesToScan) {
          try {
            // Look for transactions with matching fileName, statementId, or userId
            const transactionResult = await brmhCrud.scan(tableName, {
              FilterExpression: 'fileName = :fileName OR statementId = :statementId OR userId = :userId',
              ExpressionAttributeValues: {
                ':fileName': fileDetails.name,
                ':statementId': id,
                ':userId': userId
              }
            });
            
            const relatedTransactions = transactionResult.items || [];
            if (relatedTransactions.length > 0) {
              console.log(`Found ${relatedTransactions.length} related transactions in ${tableName} to delete`);
              
              // Delete all related transactions
              const deletePromises = relatedTransactions.map((transaction: { id: string }) =>
                brmhCrud.delete(tableName, { id: transaction.id })
              );
              await Promise.all(deletePromises);
              totalDeletedTransactions += relatedTransactions.length;
            }
          } catch (tableError) {
            console.warn(`Failed to scan table ${tableName}:`, tableError);
            // Continue with other tables even if one fails
          }
        }
        
        if (totalDeletedTransactions > 0) {
          console.log(`Successfully deleted ${totalDeletedTransactions} related transactions`);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup related transactions:', cleanupError);
        // Continue with file deletion even if cleanup fails
      }
    }
    
    // Delete file using BRMH Drive
    const deleteResult = await brmhDrive.deleteFile(userId, id);
    
    return NextResponse.json({
      ...deleteResult,
      deletedTransactions: fileDetails ? 'cleanup attempted' : 'no file details available'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}




