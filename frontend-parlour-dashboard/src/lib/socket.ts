import { io, Socket } from 'socket.io-client';

// Use environment variable with fallback
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// Create socket instance but don't connect immediately
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Add event listeners for connection status
socket.on('connect', () => {
  console.log('Socket connected successfully with ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log(`Socket disconnected: ${reason}`);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
  
  // Try to authenticate if that was the issue
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      authenticateSocket(token);
    }
  }
});

// Helper to ensure socket is connected with auth
export const connectAuthenticatedSocket = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    
    if (token) {
      socket.auth = { token };
      
      if (!socket.connected) {
        socket.connect();
      }
      
      return socket;
    }
  }
  
  return socket;
};

// Add authentication capability
export const authenticateSocket = (token: string) => {
  socket.auth = { token };
  if (socket.connected) {
    socket.disconnect().connect();
  } else {
    socket.connect();
  }
};

// Add cleanup function
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

// Register app-specific events
export const registerSocketEvents = (eventHandlers: Record<string, (data: any) => void>) => {
  Object.entries(eventHandlers).forEach(([event, handler]) => {
    socket.on(event, handler);
  });
  
  return () => {
    Object.keys(eventHandlers).forEach(event => {
      socket.off(event);
    });
  };
};

// Function to emit attendance events
export const emitAttendanceEvent = (employeeId: string, type: 'check-in' | 'check-out') => {
  connectAuthenticatedSocket();
  
  socket.emit('attendance-event', {
    employeeId,
    type,
    timestamp: new Date().toISOString()
  });
};


