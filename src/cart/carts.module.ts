import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CartController } from './carts.controller';
import { CartService } from './carts.service';
import { Cart, CartSchema } from './cart.schema';
import { Product, ProductSchema } from '../product/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}