import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../brmh-client';
import bcrypt from 'bcryptjs';

// GET /api/users?id=xxx - Get user by ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Fetch user from database
    const result = await brmhCrud.scan(TABLES.USERS, {
      FilterExpression: 'userId = :userId OR id = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      itemPerPage: 1
    });
    
    const user = result.items?.[0];
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Return user data without password
    return NextResponse.json({
      id: user.id,
      userId: user.userId,
      email: user.email,
      name: user.name || user.username,
      username: user.username,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt || user.timestamp
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}

// POST /api/users - Create or authenticate user
export async function POST(request: Request) {
  try {
    const { action, email, password, name } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    
    if (action === 'login') {
      // Real authentication - find user by email
      const result = await brmhCrud.scan(TABLES.USERS, {
        FilterExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
        itemPerPage: 1
      });
      
      const user = result.items?.[0];
      
      if (!user) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      
      return NextResponse.json({
        success: true,
        userId: user.userId || user.id,
        email: user.email,
        name: user.name || user.username || email.split('@')[0],
        message: 'Login successful'
      });
    }
    
    if (action === 'signup') {
      // Check if user already exists
      const existingUserResult = await brmhCrud.scan(TABLES.USERS, {
        FilterExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
        itemPerPage: 1
      });
      
      if (existingUserResult.items && existingUserResult.items.length > 0) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create new user
      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        username: email.split('@')[0],
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };
      
      await brmhCrud.create(TABLES.USERS, newUser);
      
      return NextResponse.json({
        success: true,
        userId: newUser.userId,
        email: newUser.email,
        name: newUser.name,
        message: 'Signup successful'
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error with user operation:', error);
    return NextResponse.json({ error: 'Failed to process user request' }, { status: 500 });
  }
}


