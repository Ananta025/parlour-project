import { httpServer } from './app.js';
import { Server, Socket } from 'socket.io'; //  Add Socket type

const PORT = process.env.PORT || 5000;

const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

export { io };

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
