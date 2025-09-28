import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../brmh-client';

export async function GET() {
  try {
    console.log('Testing BRMH connection...');
    
    // Test basic connection
    const result = await brmhCrud.scan(TABLES.BANKS, { itemPerPage: 5 });
    console.log('BRMH test result:', result);
    
    return NextResponse.json({
      success: true,
      message: 'BRMH connection successful',
      banksCount: result.items?.length || 0,
      adminEmail: process.env.ADMIN_EMAIL,
      publicAdminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL
    });
  } catch (error) {
    console.error('BRMH test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      adminEmail: process.env.ADMIN_EMAIL,
      publicAdminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL
    }, { status: 500 });
  }
}
