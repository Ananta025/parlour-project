// types/socket.d.ts
import { Socket } from "socket.io";

declare module "socket.io" {
  interface Socket {
    data: {
      userId?: string;
      // Add more custom properties as needed
    };
  }
}
