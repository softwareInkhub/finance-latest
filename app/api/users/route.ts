import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, PutItemCommand, ScanCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const USERS_TABLE = process.env.USERS_TABLE || 'users';

export async function POST(req: NextRequest) {
  try {
    const { action, email, password, name } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    if (action === 'signup') {
      // Validate name for signup
      if (!name || name.trim().length < 2) {
        return NextResponse.json({ error: 'Name must be at least 2 characters long' }, { status: 400 });
      }

      // Check if user exists by scanning for email
      const scanCmd = new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: '#email = :email',
        ExpressionAttributeNames: { '#email': 'email' },
        ExpressionAttributeValues: { ':email': { S: email.toLowerCase() } },
      });
      
      const existing = await client.send(scanCmd);
      if (existing.Items && existing.Items.length > 0) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const userId = uuidv4();
      const putCmd = new PutItemCommand({
        TableName: USERS_TABLE,
        Item: {
          id: { S: userId },
          email: { S: email.toLowerCase() },
          password: { S: hashedPassword },
          name: { S: name.trim() },
          userId: { S: userId },
          createdAt: { S: new Date().toISOString() },
        },
      });
      
      await client.send(putCmd);
      return NextResponse.json({ 
        success: true, 
        message: 'Account created successfully' 
      });
      
    } else if (action === 'login') {
      // Scan for user by email
      const scanCmd = new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: '#email = :email',
        ExpressionAttributeNames: { '#email': 'email' },
        ExpressionAttributeValues: { ':email': { S: email.toLowerCase() } },
      });
      
      const result = await client.send(scanCmd);
      const user = result.Items && result.Items[0];
      
      if (!user) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      // Verify password
      const storedPassword = user.password.S;
      if (!storedPassword) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const isPasswordValid = await bcrypt.compare(password, storedPassword);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      return NextResponse.json({ 
        success: true, 
        user: { 
          email: user.email.S, 
          name: user.name.S, 
          userId: user.userId.S 
        } 
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/users?id=...
export async function GET(req: NextRequest) {
  try {
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
    
    return NextResponse.json({ 
      email: result.Item.email.S,
      name: result.Item.name.S 
    });
  } catch (error) {
    console.error('Get user API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 