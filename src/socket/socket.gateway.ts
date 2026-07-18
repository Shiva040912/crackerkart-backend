import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class SocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`✅ Client Connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Client Disconnected: ${client.id}`);
  }
}