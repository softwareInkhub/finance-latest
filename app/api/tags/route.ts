import { NextResponse } from 'next/server';
import { ScanCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES, getBankTransactionTable } from '../aws-client';
import { v4 as uuidv4 } from 'uuid';
import { ScanCommandInput } from '@aws-sdk/lib-dynamodb';

export const runtime = 'nodejs';

// GET /api/tags
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const params: ScanCommandInput = { TableName: TABLES.TAGS };
    if (userId) {
      params.FilterExpression = '#userId = :userId';
      params.ExpressionAttributeNames = { '#userId': 'userId' };
      params.ExpressionAttributeValues = { ':userId': userId };
    }
    const result = await docClient.send(new ScanCommand(params));
    return NextResponse.json(result.Items || []);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/tags
export async function POST(request: Request) {
  try {
    const { name, color, userId } = await request.json();
    if (!name || !userId) return NextResponse.json({ error: 'Tag name and userId required' }, { status: 400 });
    
    // Check if tag with same name already exists for this user (case-insensitive)
    const existingTagsParams: ScanCommandInput = {
      TableName: TABLES.TAGS,
      FilterExpression: '#userId = :userId',
      ExpressionAttributeNames: { '#userId': 'userId' },
      ExpressionAttributeValues: { ':userId': userId },
    };
    const existingTagsResult = await docClient.send(new ScanCommand(existingTagsParams));
    
    // Check for case-insensitive duplicate
    if (existingTagsResult.Items && existingTagsResult.Items.length > 0) {
      const existingTag = existingTagsResult.Items.find(tag => 
        tag.name && tag.name.toLowerCase() === name.toLowerCase()
      );
      if (existingTag) {
        return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 409 });
      }
    }
    
    const tag = {
      id: uuidv4(),
      name,
      color: color || '#60a5fa', // default: light blue
      userId,
      createdAt: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({ TableName: TABLES.TAGS, Item: tag }));
    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}

// PUT /api/tags
export async function PUT(request: Request) {
  try {
    const { id, name, color } = await request.json();
    if (!id) return NextResponse.json({ error: 'Tag id required' }, { status: 400 });
    await docClient.send(new UpdateCommand({
      TableName: TABLES.TAGS,
      Key: { id },
      UpdateExpression: 'SET #name = :name, #color = :color',
      ExpressionAttributeNames: { '#name': 'name', '#color': 'color' },
      ExpressionAttributeValues: { ':name': name, ':color': color },
    }));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// DELETE /api/tags
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Tag id required' }, { status: 400 });
    // 1. Delete the tag itself
    await docClient.send(new DeleteCommand({ TableName: TABLES.TAGS, Key: { id } }));

    // 2. Remove this tag from all transactions in all bank-specific tables
    // Get all banks
    const banksResult = await docClient.send(new ScanCommand({ TableName: TABLES.BANKS }));
    const banks = banksResult.Items || [];
    for (const bank of banks) {
      const tableName = getBankTransactionTable(bank.bankName);
      try {
        const txResult = await docClient.send(new ScanCommand({ TableName: tableName }));
        const transactions = Array.isArray(txResult.Items) ? txResult.Items : [];
        const updatePromises = transactions.map(async (tx) => {
          if (!Array.isArray(tx.tags) || tx.tags.length === 0) return;
          // Filter out the tag ID to be deleted
          const newTags = tx.tags.filter((tagId) => tagId !== id);
          if (newTags.length === tx.tags.length) return; // no change
          await docClient.send(new UpdateCommand({
            TableName: tableName,
            Key: { id: tx.id },
            UpdateExpression: 'SET #tags = :tags',
            ExpressionAttributeNames: { '#tags': 'tags' },
            ExpressionAttributeValues: { ':tags': newTags },
          }));
        });
        await Promise.all(updatePromises);
      } catch {
        // If table doesn't exist, skip
        continue;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
} 