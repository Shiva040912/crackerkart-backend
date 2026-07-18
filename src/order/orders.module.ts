import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { InvoiceModule } from '../invoice/invoice.module';

import {
  Order,
  OrderSchema,
} from './order.schema';

import {
  Cart,
  CartSchema,
} from '../cart/cart.schema';

import {
  Product,
  ProductSchema,
} from '../product/product.schema';

import { ProductsGateway } from '../product/products.gateway';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Order.name,
        schema: OrderSchema,
      },
      {
        name: Cart.name,
        schema: CartSchema,
      },
      {
        name: Product.name,
        schema: ProductSchema,
      },
    ]),

    WhatsappModule,
    InvoiceModule,
  ],

  controllers: [OrdersController],

  providers: [
    OrdersService,
    ProductsGateway,
  ],
})
export class OrdersModule {}