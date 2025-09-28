# Finance App v2

A comprehensive financial management application with transaction tracking, tagging, and analytics, fully integrated with BRMH backend services.

## Features

- **Bank & Account Management**: Create and manage multiple banks and accounts
- **File Upload & Processing**: Upload CSV statements and process transactions
- **Transaction Tagging**: Tag transactions for better categorization
- **Advanced Analytics**: Comprehensive dashboard with detailed breakdowns
- **User-Specific File Storage**: Each user has their own secure folder for files
- **PDF Reporting**: Generate detailed financial reports in PDF format
- **Real-time Filtering**: Advanced filtering and sorting capabilities
- **Entity Management**: Organize and manage business entities with file associations
- **Namespace API**: Efficient data retrieval for bank-specific information
- **Smooth Navigation**: No page refreshes when switching between banks
- **Error Handling**: Comprehensive error handling with AbortController for network requests

## File Storage System

### User-Specific Folders

The application now uses a user-specific file storage system where each user gets their own dedicated folder in S3:

- **Old Structure**: `statements/{filename}`

- **New Structure**: `users/{userId}/statements/{filename}`

### Benefits

1. **Security**: Users can only access their own files
2. **Organization**: Better file organization and management
3. **Scalability**: Easier to manage and backup user data
4. **Compliance**: Better data isolation for privacy compliance

### Migration Process

Existing users will see a migration banner that allows them to move their files to the new structure:

1. **Automatic Detection**: The system detects if files need migration
2. **One-Click Migration**: Users can migrate all their files with a single click
3. **Progress Tracking**: Real-time feedback on migration progress
4. **Error Handling**: Detailed error reporting for failed migrations

## API Endpoints

### File Management

- `POST /api/statement/upload` - Upload new statements (requires userId)
- `POST /api/statement/delete` - Delete statements (requires userId)
- `POST /api/statement/presign` - Generate presigned URLs (requires userId)
- `POST /api/migrate-files` - Migrate files to new structure
- `GET /api/files` - Get user files and folders
- `POST /api/files` - Upload files to user folders
- `DELETE /api/files/[id]` - Delete specific files
- `POST /api/files/[id]/move` - Move files between folders
- `POST /api/files/[id]/share` - Share files with other users

### Data Management

- `GET /api/bank` - Get all banks
- `GET /api/account` - Get account details
- `GET /api/statements` - Get statements for an account
- `GET /api/transactions` - Get transactions for an account
- `GET /api/transactions/all` - Get all transactions with pagination
- `GET /api/transactions/bank` - Get transactions for specific bank
- `GET /api/transactions/by-tag` - Get transactions filtered by specific tag (optimized)
- `POST /api/tags` - Create and manage tags
- `GET /api/namespace` - Get comprehensive bank data (bank, accounts, statements)

### Entity Management

- `GET /api/folders` - Get user folders
- `POST /api/folders` - Create new folders
- `GET /api/folders/[id]/contents` - Get folder contents
- `POST /api/folders/[id]/move` - Move folders

### Reports & Analytics

- `GET /api/reports/cashflow` - Get cashflow data
- `GET /api/reports/tags-summary` - Get tag-based analytics
- `GET /api/dashboard/summary` - Get dashboard summary data

## Security Features

- **User Authentication**: Required for all file operations
- **Automatic Redirect**: Users without valid authentication are redirected to login
- **Session Management**: Uses localStorage for session persistence
- **File Access Control**: Users can only access their own files
- **Input Validation**: Comprehensive validation on all endpoints
- **Error Handling**: Secure error messages without exposing internals
- **Admin Controls**: Special admin user with elevated permissions

## Getting Started

1. **Install Dependencies**: Run `npm install`
2. **Start Development**: Run `npm run dev`

## Environment Variables

```env
# Required: Admin Configuration
ADMIN_EMAIL=your-admin-email@gmail.com
NEXT_PUBLIC_ADMIN_EMAIL=your-admin-email@gmail.com

# Optional: Override BRMH backend URL (defaults to https://brmh.in)
NEXT_PUBLIC_BACKEND_URL=https://brmh.in
```

**Note**: No AWS credentials or setup required! All data operations are handled through BRMH backend services.

## Architecture

This application is fully integrated with BRMH backend services:

- **Database Operations**: All CRUD operations go through `https://brmh.in/api/crud`
- **File Operations**: All file storage goes through `https://brmh.in/drive`
- **Authentication**: User authentication handled by BRMH backend
- **No AWS Setup Required**: All cloud infrastructure is managed by BRMH

## Recent Improvements & Fixes

### Navigation & Performance
- ✅ **Fixed Page Refresh Issues**: Replaced `router.push()` with `router.replace()` to prevent unnecessary page refreshes
- ✅ **Smooth Bank Navigation**: Clicking on banks now opens tabs without page reloads
- ✅ **URL State Management**: Proper handling of URL parameters for deep linking
- ✅ **AbortController Integration**: Prevents race conditions and memory leaks in network requests

### Error Handling & Stability
- ✅ **AbortError Handling**: Proper cleanup of cancelled network requests
- ✅ **TypeScript Fixes**: Resolved all type errors in API routes
- ✅ **Linting Cleanup**: Removed unused imports, variables, and components
- ✅ **Memory Management**: Improved useEffect cleanup to prevent memory leaks

### API Enhancements
- ✅ **Namespace API**: New `/api/namespace` endpoint for efficient bank data retrieval
- ✅ **Transactions by Tag API**: New `/api/transactions/by-tag` endpoint for optimized tag-based queries
- ✅ **BRMH Integration**: Complete migration from direct AWS to BRMH backend
- ✅ **Legacy Code Cleanup**: Removed outdated AWS configuration files
- ✅ **Error Logging**: Improved error messages and debugging information

### Performance Optimizations
- ✅ **Client-Side Caching**: Implemented intelligent caching for tags summary (2min), tags list (5min), and tag transactions (2min)
- ✅ **Rate Limiting**: Added rate limiting for visibility changes (30s) and tag updates (5s) to prevent excessive API calls
- ✅ **Parallel Processing**: Optimized tag deletion with `Promise.allSettled` for concurrent operations
- ✅ **Background Processing**: Moved heavy operations (transaction cleanup, cashflow updates) to background tasks
- ✅ **Progressive Loading**: Reduced initial transaction load from 3000 to 500 with conditional background loading
- ✅ **Server-Side Filtering**: New API endpoint performs filtering on backend with early termination

### Code Quality
- ✅ **Component Cleanup**: Removed unused modal components and imports
- ✅ **Type Safety**: Added proper TypeScript interfaces for file and folder operations
- ✅ **Performance Optimization**: Reduced unnecessary re-renders and API calls
- ✅ **Documentation**: Updated README with current features and architecture

## Technical Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Icons**: Icon library for UI components
- **React Hooks**: State management and side effects

### Backend Integration
- **BRMH Client**: Custom client for database operations (`brmhCrud`)
- **BRMH Drive**: Custom client for file operations (`brmhDrive`)
- **RESTful APIs**: Clean API design with proper error handling
- **AbortController**: Network request management and cleanup

### Development Features
- **Hot Reload**: Fast development with Next.js dev server
- **TypeScript**: Compile-time error checking
- **ESLint**: Code quality and consistency
- **Error Boundaries**: Graceful error handling in React components
- **Performance Monitoring**: Built-in performance tracking

## Development Workflow

### Getting Started
1. **Clone Repository**: `git clone <repository-url>`
2. **Install Dependencies**: `npm install`
3. **Start Development**: `npm run dev`
4. **Open Browser**: Navigate to `http://localhost:3000`

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality

### Code Structure
```
app/
├── api/                 # API routes
│   ├── brmh-client.ts   # Database operations
│   ├── brmh-drive-client.ts # File operations
│   └── namespace/       # Namespace API
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Troubleshooting

### Common Issues

#### Page Refresh When Clicking Banks
- **Issue**: Page refreshes when clicking on bank names
- **Solution**: Fixed with `router.replace()` instead of `router.push()`
- **Status**: ✅ Resolved

#### AbortError in Console
- **Issue**: "AbortError: signal is aborted without reason" messages
- **Solution**: Normal behavior - indicates proper request cleanup
- **Status**: ✅ Expected behavior

#### Namespace 404 Errors
- **Issue**: `GET /api/namespace?bankId=...` returns 404
- **Solution**: Created namespace API endpoint
- **Status**: ✅ Resolved

#### TypeScript Errors
- **Issue**: Type errors in API routes
- **Solution**: Fixed method signatures and type definitions
- **Status**: ✅ Resolved

#### Slow Tag Transactions Loading
- **Issue**: "Transactions for Tag" modal taking too long to load
- **Solution**: Created optimized `/api/transactions/by-tag` endpoint with server-side filtering
- **Status**: ✅ Resolved

#### Continuous API Calls in Reports
- **Issue**: APIs running continuously in reports section
- **Solution**: Implemented rate limiting and intelligent caching
- **Status**: ✅ Resolved

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed console logs for:
- Network requests and responses
- Component render cycles
- Error handling and cleanup

### Performance Tips
- Use browser dev tools to monitor network requests
- Check console for any remaining linting errors
- Monitor memory usage in development tools
- Use React DevTools for component debugging
- Look for cache hit messages in console (e.g., "Using cached tags summary")
- Monitor API call frequency to ensure rate limiting is working

## Support

For issues with file migration or any other features, please check the application logs and contact support with detailed error information.

### Reporting Issues
When reporting issues, please include:
1. **Browser console logs** (F12 → Console tab)
2. **Network requests** (F12 → Network tab)
3. **Steps to reproduce** the issue
4. **Expected vs actual behavior**
5. **Screenshots** if applicable
