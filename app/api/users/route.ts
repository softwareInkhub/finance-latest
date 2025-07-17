import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, PutItemCommand, ScanCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const USERS_TABLE = process.env.USERS_TABLE || 'users';

export async function POST(req: NextRequest) {
  const { action, email, password, name } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }
  if (action === 'signup') {
    // Check if user exists by scanning for email
    const scanCmd = new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: '#email = :email',
      ExpressionAttributeNames: { '#email': 'email' },
      ExpressionAttributeValues: { ':email': { S: email } },
    });
    const existing = await client.send(scanCmd);
    if (existing.Items && existing.Items.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }
    // Create user
    const userId = uuidv4();
    const putCmd = new PutItemCommand({
      TableName: USERS_TABLE,
      Item: {
        id: { S: userId },
        email: { S: email },
        password: { S: password },
        name: { S: name || '' },
        userId: { S: userId },
      },
    });
    await client.send(putCmd);
    return NextResponse.json({ success: true });
  } else if (action === 'login') {
    // Scan for user by email
    const scanCmd = new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: '#email = :email',
      ExpressionAttributeNames: { '#email': 'email' },
      ExpressionAttributeValues: { ':email': { S: email } },
    });
    const result = await client.send(scanCmd);
    const user = result.Items && result.Items[0];
    if (!user || user.password.S !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    return NextResponse.json({ success: true, user: { email, name: user.name.S, userId: user.userId.S } });
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// GET /api/users?id=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'User id required' }, { status: 400 });
  }
  const getCmd = new GetItemCommand({
    TableName: USERS_TABLE,
    Key: { id: { S: id } },
  });
  const result = await client.send(getCmd);
  if (!result.Item) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json({ email: result.Item.email.S });
} 