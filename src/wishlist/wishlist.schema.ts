import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WishlistDocument = HydratedDocument<Wishlist>;

@Schema({ timestamps: true })
export class Wishlist {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);

WishlistSchema.index({ user: 1, product: 1 }, { unique: true });