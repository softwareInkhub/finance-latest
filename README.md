# Finance App v2

A comprehensive financial management application with transaction tracking, tagging, and analytics.

## Features

- **Bank & Account Management**: Create and manage multiple banks and accounts
- **File Upload & Processing**: Upload CSV statements and process transactions
- **Transaction Tagging**: Tag transactions for better categorization
- **Advanced Analytics**: Comprehensive dashboard with detailed breakdowns
- **User-Specific File Storage**: Each user has their own secure folder for files
- **PDF Reporting**: Generate detailed financial reports in PDF format
- **Real-time Filtering**: Advanced filtering and sorting capabilities

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
- **File Access Control**: Users can only access their own files
- **Input Validation**: Comprehensive validation on all endpoints
- **Error Handling**: Secure error messages without exposing internals

## Getting Started

1. **Environment Setup**: Configure AWS credentials and environment variables
2. **Database Setup**: Set up DynamoDB tables for users, banks, statements, and transactions
3. **S3 Setup**: Create S3 bucket for file storage
4. **Install Dependencies**: Run `npm install`
5. **Start Development**: Run `npm run dev`

## Environment Variables

```env
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_DYNAMODB_STATEMENTS_TABLE=bank-statements
AWS_DYNAMODB_TRANSACTIONS_TABLE=transactions
AWS_DYNAMODB_TAGS_TABLE=tags
USERS_TABLE=users
```

## Migration Notes

If you're upgrading from a previous version:

1. **Backup Data**: Always backup your data before migration
2. **Test Migration**: Test the migration process in a development environment
3. **Monitor Progress**: Watch for any errors during migration
4. **Verify Results**: Ensure all files are accessible after migration

## Support

For issues with file migration or any other features, please check the application logs and contact support with detailed error information.
