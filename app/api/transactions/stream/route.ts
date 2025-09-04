import { NextResponse } from 'next/server';
import { ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, getBankTransactionTable } from '../../aws-client';

// GET /api/transactions/stream?userId=xxx&limit=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10000;
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // Create a ReadableStream for streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial status
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"type":"status","message":"Starting transaction fetch..."}\n\n'));

        // First, get all banks with timeout and error handling
        controller.enqueue(encoder.encode('data: {"type":"status","message":"Connecting to database..."}\n\n'));
        
        let banks: Record<string, unknown>[] = [];
        let tagsMap = new Map<string, Record<string, unknown>>();
        
        try {
          // Fetch banks and tags in parallel for better performance
          const [banksResult, tagsResult] = await Promise.all([
            docClient.send(new ScanCommand({ TableName: 'banks' })),
            docClient.send(new ScanCommand({ TableName: 'tags' }))
          ]);
          
          banks = banksResult.Items || [];
          const allTags = tagsResult.Items || [];
          tagsMap = new Map(allTags.map(tag => [tag.id, tag]));
          
          controller.enqueue(encoder.encode(`data: {"type":"status","message":"Found ${banks.length} banks, fetching transactions..."}\n\n`));
        } catch (error) {
          console.error('Error fetching initial data:', error);
          controller.enqueue(encoder.encode(`data: {"type":"error","message":"Failed to connect to database. Please check your connection and try again."}\n\n`));
          controller.close();
          return;
        }

        // Fetch transactions from all bank tables with progressive streaming
        let totalTransactions = 0;
        
        for (const bank of banks) {
          const tableName = getBankTransactionTable(bank.bankName as string);
          
          try {
            controller.enqueue(encoder.encode(`data: {"type":"status","message":"Fetching from ${bank.bankName}..."}\n\n`));
            
            let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
            let hasMoreItems = true;
            let bankTransactionCount = 0;
            
            while (hasMoreItems && totalTransactions < limit) {
              const params: ScanCommandInput = {
                TableName: tableName,
                // Increase batch size to reduce number of round trips
                Limit: Math.min(250, limit - totalTransactions),
              };
              
              if (userId) {
                params.FilterExpression = 'userId = :userId';
                params.ExpressionAttributeValues = { ':userId': userId };
              }
              
              if (lastEvaluatedKey) {
                params.ExclusiveStartKey = lastEvaluatedKey;
              }
              
              const result = await docClient.send(new ScanCommand(params));
              const transactions = result.Items || [];
              
              // Populate tag data for each transaction
              const transactionsWithTags = transactions.map(transaction => {
                if (Array.isArray(transaction.tags)) {
                  transaction.tags = transaction.tags
                    .map(tag => typeof tag === 'string' ? tagsMap.get(tag) : tag)
                    .filter(Boolean);
                }
                return transaction;
              });
              
              // Stream each batch of transactions
              for (const transaction of transactionsWithTags) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'transaction',
                  data: transaction
                })}\n\n`));
                totalTransactions++;
              }
              
              bankTransactionCount += transactionsWithTags.length;
              
              // Send progress update
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                bankName: bank.bankName,
                bankCount: bankTransactionCount,
                totalCount: totalTransactions,
                limit: limit
              })}\n\n`));
              
              // Check if we've reached the limit or if there are more items to fetch
              if (totalTransactions >= limit) {
                hasMoreItems = false;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'status',
                  message: `Reached limit of ${limit} transactions`
                })}\n\n`));
              } else {
                lastEvaluatedKey = result.LastEvaluatedKey;
                hasMoreItems = !!lastEvaluatedKey;
              }
              
              // No artificial delay; rely on AWS SDK backoff if needed
            }
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'status',
              message: `Completed ${bank.bankName}: ${bankTransactionCount} transactions`
            })}\n\n`));
            
          } catch (error) {
            // If a table doesn't exist yet, skip it
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              message: `Table ${tableName} not found, skipping: ${error}`
            })}\n\n`));
            continue;
          }
        }

        // Send completion message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          totalTransactions: totalTransactions
        })}\n\n`));
        
        controller.close();
        
      } catch (error) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: `Failed to fetch transactions: ${error}`
        })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}



