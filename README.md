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

### Data Management

- `GET /api/bank` - Get all banks
- `GET /api/account` - Get account details
- `GET /api/statements` - Get statements for an account
- `GET /api/transactions` - Get transactions for an account
- `POST /api/tags` - Create and manage tags

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

## Support

For issues with file migration or any other features, please check the application logs and contact support with detailed error information.
