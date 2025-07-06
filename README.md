# Parlour Admin Dashboard

A comprehensive administration system for beauty parlours, enabling real-time attendance tracking, employee management, task assignment, and business operations monitoring.


## 📋 Features

- **Role-based Access Control**: Custom role hierarchy with levels L1-L6
- **Authentication**: Secure JWT-based authentication with protected routes
- **Real-time Attendance**: Clock in/out system with real-time updates via WebSockets
- **Employee Management**: Add, edit, and manage employee profiles
- **Task Management**: Create, assign and track tasks with status updates
- **Responsive Design**: Mobile-friendly interface for on-the-go management
- **Real-time Updates**: Socket.IO integration for live data synchronization

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** (App Router) - React framework
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Utility-first styling
- **ShadCN UI** - Component library
- **Socket.IO Client** - Real-time communication

### Backend
- **Node.js with TypeScript** - Server runtime
- **Express.js** - Web framework
- **MongoDB with Mongoose** - Database
- **JWT** - Authentication
- **Socket.IO** - WebSockets for real-time features
- **MVC Architecture** - Organized code structure

## 🗂️ Project Structure

```
parlour-project/
├── frontend-parlour-dashboard/  # Next.js frontend
│   ├── app/                     # App router pages
│   ├── components/              # UI components
│   ├── lib/                     # Utility functions
│   ├── contexts/                # React contexts
│   └── public/                  # Static assets
│
└── backend-parlour-api/         # Express backend
    ├── src/
    │   ├── config/              # Configuration files
    │   ├── controllers/         # Request handlers
    │   ├── middlewares/         # Express middlewares
    │   ├── models/              # Mongoose models
    │   ├── routes/              # API routes
    │   ├── sockets/             # Socket.IO handlers
    │   ├── types/               # TypeScript types
    │   ├── app.ts               # Express app setup
    │   └── server.ts            # Server entry point
    └── .env                     # Environment variables
```

## 📝 Prerequisites

Before running this project, make sure you have:

- Node.js (v18.0.0 or newer)
- npm or yarn package manager
- MongoDB (local instance or MongoDB Atlas account)
- Git

## 🚀 Installation & Setup

### Clone the repository

```bash
git clone https://github.com/yourusername/parlour-project.git
cd parlour-project
```

### Backend Setup

```bash
# Navigate to backend directory
cd backend-parlour-api

# Install dependencies
npm install

# Create .env file
touch .env
```

Configure your `.env` file with the following variables:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/parlour-db
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend-parlour-dashboard

# Install dependencies
npm install

# Create .env.local file
touch .env.local
```

Configure your `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

## 🏃‍♂️ Running the Application

### Start Backend Server

```bash
# From backend directory
npm run dev
```

The server will start on http://localhost:5000.

### Start Frontend Development Server

```bash
# From frontend directory
npm run dev
```

The frontend will be available at http://localhost:3000.

## 🔌 WebSocket Functionality

The project uses Socket.IO for real-time features:

- **Attendance Tracking**: Real-time punch in/out updates
- **Task Status Updates**: Live task status changes
- **Notifications**: Instant alerts for important events

### WebSocket Events

#### Client-Side (Listening)

```typescript
// Listen for attendance updates
socket.on('attendance:update', (data) => {
  // Handle attendance update
});

// Listen for task updates
socket.on('task-update', (data) => {
  // Handle task update
});
```

#### Server-Side (Emitting)

```typescript
// Emit attendance update
io.emit('attendance:update', attendanceData);

// Emit task update
io.emit('task-update', taskData);
```

## 🔒 Authentication

The system uses JWT for authentication:

1. Login with credentials to receive JWT token
2. Token is stored in client-side storage
3. Token is sent with each request in the Authorization header
4. Protected routes check token validity
5. Role-based access control determines permissions



## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
