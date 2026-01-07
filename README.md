# 🚀 Enterprise CRM System

A comprehensive Customer Relationship Management system built with the MERN stack, featuring real-time communication, attendance tracking, lead management, and advanced telephony integration.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)
![React](https://img.shields.io/badge/react-19.0.0-blue)
![MongoDB](https://img.shields.io/badge/mongodb-latest-green)

## ✨ Features

### 📊 Core Modules
- **Lead Management** - Track, import, and manage leads with advanced filtering and pagination
- **Attendance System** - Real-time attendance tracking with heatmap visualization and monthly reports
- **Task Management** - Assign, track, and manage tasks with priority levels and status updates
- **BDM (Business Development Manager)** - Appointment scheduling, contract tracking, and revenue analytics
- **Customer Support** - Query management system with status tracking
- **Team Reports** - Performance analytics and reporting dashboard

### 💬 Communication
- **Real-time Chat** - Built-in messaging system with Socket.IO
- **Voice Calls** - Huawei E173 modem integration for telephony
- **Notifications** - Real-time updates and alerts

### 🔐 Security & Authentication
- **JWT Authentication** - Secure token-based authentication
- **Role-based Access Control** - Admin, Team Leader, BDM, Tech Team, Customer Support, Telecaller
- **Session Management** - Automatic timeout and session tracking

### 📍 Advanced Features
- **Live Location Tracking** - Real-time GPS tracking for field teams using Leaflet maps
- **File Management** - Excel import/export, PDF generation
- **Real-time Updates** - Socket.IO for live data synchronization
- **Responsive Design** - Mobile-friendly interface with glassmorphism UI

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and dev server
- **Redux Toolkit** - State management
- **React Router v6** - Client-side routing
- **Styled Components** - CSS-in-JS styling
- **Bootstrap 5** - UI components
- **Socket.IO Client** - Real-time communication
- **Leaflet** - Interactive maps
- **Chart.js** - Data visualization
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **Socket.IO** - WebSocket server
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

### Additional Tools
- **Excel.js** - Excel file processing
- **jsPDF** - PDF generation
- **SerialPort** - USB modem communication

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16.0.0 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**
- **Git**

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/crm-system.git
cd crm-system
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create .env file
cp .env.example .env
```

**Configure `.env` file:**
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/crm_db

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# CORS Origins (comma-separated)
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Optional: Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Create .env file
cp .env.example .env
```

**Configure frontend `.env` file:**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs (if configured)

## 📁 Project Structure

```
CRM/
├── backend/
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API endpoints
│   ├── middleware/       # Auth, error handling
│   ├── sockets/          # Socket.IO handlers
│   ├── services/         # Business logic
│   ├── uploads/          # File storage
│   └── server.js         # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── store/        # Redux store
│   │   ├── contexts/     # React contexts
│   │   ├── services/     # API services
│   │   └── App.jsx       # Root component
│   └── public/           # Static assets
│
└── README.md
```

## 🔑 Default Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

**⚠️ Important:** Change default credentials immediately after first login!

## 📱 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management, all reports |
| **Team Leader** | Team management, task assignment, reports |
| **BDM** | Appointment management, lead tracking, field updates |
| **Tech Team** | Query management, daily reports, technical tasks |
| **Customer Support** | Query handling, customer communication |
| **Telecaller** | Lead calling, basic task management |

## 🎯 Key Features Guide

### Lead Management
1. Import leads via Excel
2. Filter by status, date, amount
3. Assign to team members
4. Track conversion funnel
5. Export reports

### Attendance System
- **Check-in/Check-out**: GPS-based attendance
- **Heatmap View**: Visual attendance patterns
- **Monthly Reports**: Excel export with statistics
- **Admin Controls**: Manual entry, status updates

### BDM Module
- **Appointment Scheduling**: Date, time, client details
- **Contract Tracking**: Values, clearances, renewals
- **Revenue Analytics**: Real-time metrics and trends
- **Follow-up Management**: Automated reminders

### Live Tracking
- Real-time location updates
- Route history playback
- Geofencing alerts
- Distance calculations

## 🔧 Configuration

### MongoDB Indexes
For optimal performance, create these indexes:
```javascript
// Leads
db.leads.createIndex({ companyName: "text" })
db.leads.createIndex({ createdAt: -1 })
db.leads.createIndex({ status: 1 })

// Attendance
db.attendance.createIndex({ userId: 1, date: -1 })

// Messages
db.messages.createIndex({ sender: 1, recipient: 1, timestamp: -1 })
```

### Environment Variables

**Backend:**
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens
- `CORS_ORIGIN` - Allowed origins for CORS

**Frontend:**
- `VITE_API_URL` - Backend API URL
- `VITE_SOCKET_URL` - Socket.IO server URL

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Stop containers
docker-compose down
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Leads
- `GET /api/leads` - Get all leads
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance/checkin` - Check in
- `POST /api/attendance/checkout` - Check out

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task

*For complete API documentation, see [API.md](./API.md)*

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚀 Production Deployment

### 1. Build Frontend
```bash
cd frontend
npm run build
```

### 2. Environment Setup
- Set `NODE_ENV=production`
- Use strong JWT secret
- Configure production MongoDB
- Set up SSL certificates
- Configure reverse proxy (Nginx)

### 3. Process Manager
```bash
# Install PM2
npm install -g pm2

# Start backend
pm2 start backend/server.js --name crm-backend

# Start with cluster mode
pm2 start backend/server.js -i max --name crm-backend
```

### 4. Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /path/to/frontend/dist;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Issues

- Chat unread count endpoint needs debugging (non-critical)
- USB modem requires Windows environment
- Large Excel imports may timeout (>10,000 rows)

## 🔮 Roadmap

- [ ] Mobile app (React Native)
- [ ] Email integration
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode
- [ ] API rate limiting
- [ ] Automated backups
- [ ] Two-factor authentication

## 📞 Support

For support, email support@yourcompany.com or open an issue on GitHub.

## 👥 Authors

- **Your Name** - *Initial work* - [YourGitHub](https://github.com/yourusername)

## 🙏 Acknowledgments

- React team for the amazing framework
- MongoDB for the flexible database
- Socket.IO for real-time capabilities
- All contributors who helped improve this project

---

**Made with ❤️ by MECH DEVELOPER**
