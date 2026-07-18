import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ProductsGateway {
  @WebSocketServer()
  server!: Server;

  emitProductUpdate(productId: string) {
    this.server.emit('productUpdated', { productId });
  }
}