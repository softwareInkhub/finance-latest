import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../../brmh-client';
import { brmhDrive } from '../../brmh-drive-client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { statementId, userId, fileName, bankName, fileType } = await request.json();
    if (!statementId || !userId || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the file from brmh-drive-files table (where files are actually stored)
    const fileResult = await brmhCrud.getItem(TABLES.BRMH_DRIVE_FILES, { id: statementId });
    if (!fileResult.item) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const file = fileResult.item;
    if (file.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized: You can only edit your own files' }, { status: 403 });
    }

    // Get bankName from file if not provided
    let finalBankName = bankName;
    
    // If no bankName provided, try to get it from bankId
    if (!finalBankName && file.bankId) {
      try {
        const bankResult = await brmhCrud.getItem(TABLES.BANKS, { id: file.bankId });
        if (bankResult.item && bankResult.item.bankName) {
          finalBankName = bankResult.item.bankName;
        }
      } catch (error) {
        console.warn('Failed to fetch bank name from bankId:', error);
      }
    }
    
    // If still no bankName, keep the existing one (but log a warning)
    if (!finalBankName) {
      console.warn('No bank name found, keeping existing:', file.bankName);
      finalBankName = file.bankName;
    }

    // 1. Try to rename the actual file in S3 via BRMH Drive API
    // Note: BRMH Drive API may not support file renaming, so we'll continue with database update if it fails
    try {
      const renameResult = await brmhDrive.renameFile(userId, statementId, fileName);
      console.log('File renamed in S3 via BRMH Drive:', renameResult);
    } catch (driveError) {
      console.warn('BRMH Drive API file rename failed (endpoint may not exist):', driveError instanceof Error ? driveError.message : String(driveError));
      console.log('Continuing with database update only - file will be renamed in display but keep original name in S3');
      // Continue with database update even if S3 rename fails
    }

    // 2. Update the file record in brmh-drive-files table
    await brmhCrud.update(TABLES.BRMH_DRIVE_FILES, { id: statementId }, {
      name: fileName, // Update the file name
      bankName: finalBankName, // Use the resolved bank name
      fileType: fileType || file.fileType || 'Statement',
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
  }
} 