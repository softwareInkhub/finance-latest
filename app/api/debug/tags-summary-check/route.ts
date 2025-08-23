import { NextRequest, NextResponse } from 'next/server';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../../aws-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get the current tags summary
    const result = await docClient.send(new GetCommand({
      TableName: TABLES.REPORTS,
      Key: { id: `tags_summary_${userId}` }
    }));

    if (!result.Item) {
      return NextResponse.json({ 
        error: 'No tags summary found for this user',
        userId,
        key: `tags_summary_${userId}`
      });
    }

    const tagsSummary = result.Item;
    const tags = tagsSummary.tags || [];

    // Analyze each tag's CR/DR data
    const analysis = tags.map((tag: Record<string, unknown>) => ({
      tagName: tag.tagName as string,
      tagId: tag.tagId as string,
      credit: tag.credit as number,
      debit: tag.debit as number,
      balance: tag.balance as number,
      transactionCount: tag.transactionCount as number,
      hasBankBreakdown: Object.keys(tag.bankBreakdown || {}).length > 0,
      bankBreakdown: tag.bankBreakdown ? Object.entries(tag.bankBreakdown as Record<string, unknown>).map(([bankName, data]) => ({
        bankName,
        credit: (data as Record<string, unknown>).credit as number,
        debit: (data as Record<string, unknown>).debit as number,
        balance: (data as Record<string, unknown>).balance as number,
        transactionCount: (data as Record<string, unknown>).transactionCount as number,
        accounts: ((data as Record<string, unknown>).accounts as unknown[])?.length || 0
      })) : []
    }));

    return NextResponse.json({
      userId,
      tagsSummaryId: `tags_summary_${userId}`,
      totalTags: tags.length,
      tagsWithDR: analysis.filter((tag: { debit: number }) => tag.debit > 0).length,
      tagsWithCR: analysis.filter((tag: { credit: number }) => tag.credit > 0).length,
      tagsWithBoth: analysis.filter((tag: { credit: number; debit: number }) => tag.credit > 0 && tag.debit > 0).length,
      analysis,
      rawData: tagsSummary
    });

  } catch (error) {
    console.error('Error checking tags summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}





