import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './user/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { SocketModule } from './socket/socket.module';
import { ProductsModule } from './product/products.module';
import { CartModule } from './cart/carts.module';
import { OrdersModule } from './order/orders.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { EmployeeModule } from './employee/employee.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const mongodbUri = configService.get<string>('MONGODB_URI');

        if (!mongodbUri) {
          throw new Error('MONGODB_URI is missing in environment variables');
        }

        return {
          uri: mongodbUri,
        };
      },
    }),

    UsersModule,
    EmployeeModule,
    AuthModule,
    CategoriesModule,
    SocketModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    WishlistModule,
    AdminDashboardModule,
    ChatbotModule,
    WhatsappModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}