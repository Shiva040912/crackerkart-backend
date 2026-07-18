import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CartDocument = HydratedDocument<Cart>;

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop({ required: true, default: 1 })
  quantity!: number;
  
}

export const CartSchema = SchemaFactory.createForClass(Cart);