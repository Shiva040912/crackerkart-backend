import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';

import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product, ProductSchema } from './product.schema';

import { Category, CategorySchema } from '../categories/category.schema';

import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [
    MulterModule.register({
      storage: undefined,
    }),

    MongooseModule.forFeature([
      {
        name: Product.name,
        schema: ProductSchema,
      },
      {
        name: Category.name,
        schema: CategorySchema,
      },
    ]),

    SocketModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}