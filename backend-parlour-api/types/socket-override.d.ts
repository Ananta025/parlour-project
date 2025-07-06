declare module 'socket.io' {
  import { Server as HttpServer } from 'http';
  import { Server as IOServer, Socket } from 'socket.io';

  export { IOServer as Server, Socket };
}
