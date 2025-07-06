declare module 'socket.io' {
  import { Server as HttpServer } from 'http';
  import { EventEmitter } from 'events';

  class Socket extends EventEmitter {
    id: string;
    emit(event: string, ...args: any[]): boolean;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  class Server extends EventEmitter {
    constructor(server: HttpServer, options?: any);
    on(event: 'connection', listener: (socket: Socket) => void): this;
    emit(event: string, ...args: any[]): boolean;
  }

  export { Server, Socket };
}
