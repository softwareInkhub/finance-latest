import { NextResponse } from 'next/server';
import { ScanCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES, getBankTransactionTable } from '../aws-client';
import { v4 as uuidv4 } from 'uuid';
import { getUniqueColor, getExistingColors } from '../../utils/colorUtils';

export const runtime = 'nodejs';

// GET /api/tags
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // Fetch all tags with pagination
    const allTags: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const params: ScanCommandInput = { TableName: TABLES.TAGS };
      if (userId) {
        params.FilterExpression = '#userId = :userId';
        params.ExpressionAttributeNames = { '#userId': 'userId' };
        params.ExpressionAttributeValues = { ':userId': userId };
      }
      
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const result = await docClient.send(new ScanCommand(params));
      const tags = result.Items || [];
      allTags.push(...tags);
      
      // Check if there are more items to fetch
      lastEvaluatedKey = result.LastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      
      // Add a small delay to avoid overwhelming DynamoDB
      if (hasMoreItems) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return NextResponse.json(allTags);
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
    
    // Check if tag with same name already exists for this user (case-insensitive) with pagination
    const existingTags: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const existingTagsParams: ScanCommandInput = {
        TableName: TABLES.TAGS,
        FilterExpression: '#userId = :userId',
        ExpressionAttributeNames: { '#userId': 'userId' },
        ExpressionAttributeValues: { ':userId': userId },
      };
      
      if (lastEvaluatedKey) {
        existingTagsParams.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const existingTagsResult = await docClient.send(new ScanCommand(existingTagsParams));
      const batchTags = existingTagsResult.Items || [];
      existingTags.push(...batchTags);
      
      // Check if there are more items to fetch
      lastEvaluatedKey = existingTagsResult.LastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      
      // Add a small delay to avoid overwhelming DynamoDB
      if (hasMoreItems) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Check for case-insensitive duplicate
    if (existingTags.length > 0) {
      const existingTag = existingTags.find(tag => 
        typeof tag.name === 'string' && tag.name.toLowerCase() === name.toLowerCase()
      );
      if (existingTag) {
        return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 409 });
      }
    }
    
    // Get existing colors to ensure uniqueness
    const existingColors = getExistingColors(existingTags);
    
    // Generate unique color if not provided
    const uniqueColor = color || getUniqueColor(existingColors);
    
    const tag = {
      id: uuidv4(),
      name,
      color: uniqueColor,
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
    // Get all banks with pagination
    const allBanks: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const banksParams: ScanCommandInput = { TableName: TABLES.BANKS };
      if (lastEvaluatedKey) {
        banksParams.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const banksResult = await docClient.send(new ScanCommand(banksParams));
      const batchBanks = banksResult.Items || [];
      allBanks.push(...batchBanks);
      
      // Check if there are more items to fetch
      lastEvaluatedKey = banksResult.LastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      
      // Add a small delay to avoid overwhelming DynamoDB
      if (hasMoreItems) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    for (const bank of allBanks) {
      const tableName = getBankTransactionTable(typeof bank.bankName === 'string' ? bank.bankName : '');
      try {
        // Fetch all transactions for this bank with pagination
        const allTransactions: Record<string, unknown>[] = [];
        let txLastEvaluatedKey: Record<string, unknown> | undefined = undefined;
        let txHasMoreItems = true;
        
        while (txHasMoreItems) {
          const txParams: ScanCommandInput = { TableName: tableName };
          if (txLastEvaluatedKey) {
            txParams.ExclusiveStartKey = txLastEvaluatedKey;
          }
          
          const txResult = await docClient.send(new ScanCommand(txParams));
          const batchTransactions = txResult.Items || [];
          allTransactions.push(...batchTransactions);
          
          // Check if there are more items to fetch
          txLastEvaluatedKey = txResult.LastEvaluatedKey;
          txHasMoreItems = !!txLastEvaluatedKey;
          
          // Add a small delay to avoid overwhelming DynamoDB
          if (txHasMoreItems) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        const updatePromises = allTransactions.map(async (tx) => {
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