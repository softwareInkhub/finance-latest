# Global Tab System

This project now includes a global tab system similar to browser tabs or Excel sheets, allowing you to open multiple sections/files in separate tabs that can be managed independently.

## Features

- **Multiple Tabs**: Open different sections in separate tabs
- **Tab Management**: Close, duplicate, and reorder tabs
- **Context Menus**: Right-click for additional options
- **Drag & Drop**: Reorder tabs by dragging
- **Icons**: Each tab type has its own icon
- **Responsive**: Works on desktop and mobile
- **Dark Mode**: Full dark mode support

## How to Use

### 1. Opening Tabs

Click on any section in the sidebar to open it in a new tab:

- Dashboard
- Banks
- Transactions
- Reports
- Files
- Tags

### 2. Tab Actions

**Mouse Actions:**
- Click tab to switch to it
- Click X button to close tab
- Right-click for context menu
- Drag to reorder tabs

**Context Menu Options:**
- Close Tab
- Duplicate Tab
- Close Other Tabs
- Close Tabs to Right
- Close All Tabs

### 3. Programmatic Tab Management

You can also open tabs programmatically from anywhere in your app:

```typescript
import { useTabManager } from '../hooks/useTabManager';

function MyComponent() {
  const { openDashboard, openTransactions, openTab } = useTabManager();

  const handleOpenDashboard = () => {
    openDashboard();
  };

  const handleOpenCustomTab = () => {
    openTab({
      id: 'custom-tab',
      title: 'Custom Tab',
      type: 'custom',
      component: <div>Your custom content here</div>
    });
  };

  return (
    <div>
      <button onClick={handleOpenDashboard}>Open Dashboard</button>
      <button onClick={handleOpenCustomTab}>Open Custom Tab</button>
    </div>
  );
}
```

### 4. Available Tab Types

- `dashboard` - Dashboard and analytics
- `banks` - Bank management
- `transactions` - Transaction management
- `reports` - Financial reports
- `files` - File management
- `tags` - Tag organization
- `accounts` - Account management
- `statements` - Statement viewing
- `custom` - Custom content

## Demo

Visit `/demo-tabs` to see a demonstration of all tab features.

## File Structure

```
app/
├── contexts/
│   └── GlobalTabContext.tsx      # Tab state management
├── components/
│   ├── GlobalTabBar.tsx          # Tab bar UI
│   └── GlobalTabContent.tsx      # Tab content display
├── hooks/
│   └── useTabManager.ts          # Easy tab management
└── demo-tabs/
    └── page.tsx                  # Demo page
```

## Integration with Existing Components

The tab system is designed to work with your existing components. You can wrap any component in a tab:

```typescript
// Example: Opening your existing TransactionTable in a tab
const { openTab } = useTabManager();

openTab({
  id: 'transaction-table',
  title: 'Transaction Table',
  type: 'transactions',
  component: <TransactionTable {...props} />
});
```

## Customization

### Adding New Tab Types

1. Add the new type to the `GlobalTab` interface in `GlobalTabContext.tsx`
2. Add an icon in `useTabManager.ts`
3. Create a function to open the new tab type

### Styling

The tab system uses Tailwind CSS classes and can be customized by modifying the components in `GlobalTabBar.tsx` and `GlobalTabContent.tsx`.

## Browser-like Features

- **Tab Persistence**: Tabs remain open until manually closed
- **Active Tab Highlighting**: Current tab is visually distinguished
- **Tab Overflow**: Horizontal scrolling when many tabs are open
- **Keyboard Shortcuts**: (Can be added for Ctrl+W, Ctrl+T, etc.)

## Performance

- Tabs are rendered on-demand
- Unused tabs are automatically cleaned up
- Smooth animations and transitions
- Optimized for large numbers of tabs

## Future Enhancements

- Tab persistence across sessions
- Keyboard shortcuts
- Tab groups
- Tab search functionality
- Tab pinning
- Tab synchronization across devices

