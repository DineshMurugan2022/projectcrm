# Task Assignment Notification System

This notification system provides real-time notifications when tasks are assigned to users in the CRM application.

## Features

1. **Real-time Notifications**: Uses Socket.IO for instant notifications
2. **Visual Notification Icon**: Bell icon in the navbar with unread count badge
3. **Browser Notifications**: Native browser notifications (with user permission)
4. **Dropdown Interface**: Click the bell icon to see all notifications
5. **Mark as Read/Unread**: Individual and bulk notification management
6. **Auto-cleanup**: Notifications can be dismissed individually

## Components Added

### Frontend

1. **NotificationContext** (`src/contexts/NotificationContext.jsx`)
   - Manages notification state
   - Handles Socket.IO connections
   - Provides notification functions to components

2. **NotificationIcon** (`src/components/notifications/NotificationIcon.jsx`)
   - Bell icon with unread count badge
   - Dropdown interface for viewing notifications
   - Mark as read/unread functionality

3. **Updated Header** (`src/components/layout/Header.jsx`)
   - Added notification icon to navbar
   - Available for all authenticated users

4. **Updated Main App** (`src/main.jsx`)
   - Wrapped app with NotificationProvider

### Backend

1. **Updated Tasks Routes** (`backend/routes/tasks.js`)
   - Emits Socket.IO events when tasks are assigned/updated
   - Sends notifications to specific user rooms

2. **Updated Server** (`backend/server.js`)
   - Added socket middleware to routes
   - Added user room joining functionality
   - Enhanced socket event handling

## How It Works

### Task Assignment Flow

1. **Task Creation/Assignment**:
   - Admin/TeamLeader creates or assigns a task
   - Backend emits `taskAssigned` socket event to assignee's room
   - Frontend receives notification and updates UI

2. **Notification Display**:
   - Bell icon shows unread count
   - User clicks bell to see notification details
   - Notifications include task title, assigner, and timestamp

3. **Real-time Updates**:
   - Socket.IO ensures instant delivery
   - Browser notifications (if permitted)
   - Persistent until marked as read

### Socket Events

- `joinUserRoom`: User joins their notification room
- `taskAssigned`: New task assigned to user
- `taskUpdated`: Task details updated

## Usage Example

```javascript
// Using the notification system in a component
import { useNotifications } from '../contexts/NotificationContext';

const MyComponent = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  
  return (
    <div>
      <p>You have {unreadCount} unread notifications</p>
      {notifications.map(notif => (
        <div key={notif.id} onClick={() => markAsRead(notif.id)}>
          {notif.message}
        </div>
      ))}
    </div>
  );
};
```

## Browser Permission

The system requests browser notification permission on first load. Users can:
- Allow: Receive native browser notifications
- Deny: Still see in-app notifications via the bell icon

## Testing

Use the NotificationDemo component to test the system:

```javascript
import NotificationDemo from '../components/notifications/NotificationDemo';

// Add to any page for testing
<NotificationDemo />
```

## Configuration

### Socket.IO Settings

The notification system uses the same Socket.IO configuration as the rest of the app:
- URL: `VITE_SOCKET_URL` environment variable
- Fallback: `http://localhost:5000`

### Notification Types

Currently supported notification types:
- `task_assigned`: New task assignment
- `task_updated`: Task details changed

## Security

- Notifications are sent only to the assigned user's socket room
- User authentication required via JWT middleware
- Socket rooms are user-specific (`user_${userId}`)

## Future Enhancements

Possible improvements:
1. Email notifications for offline users
2. Notification preferences/settings
3. Different notification sounds
4. Push notifications for mobile
5. Notification history/archive
6. Custom notification templates