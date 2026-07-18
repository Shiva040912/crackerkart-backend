import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  brand!: string;

  @Prop({ trim: true })
  description!: string;

  @Prop({ required: true })
  price!: number;

  @Prop({ required: true, default: 0 })
  stock!: number;

  @Prop({ default: '' })
  imageUrl!: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category!: Types.ObjectId;

  @Prop({
    enum: ['Single', 'Box', 'Bundle'],
    default: 'Single',
  })
  packType!: string;

  @Prop({ default: 1 })
  packQuantity!: number;

  @Prop({
    enum: ['Piece', 'Pieces', 'Packet', 'Packets'],
    default: 'Piece',
  })
  unit!: string;

  @Prop({ default: false })
  isBestSeller!: boolean;

  @Prop({ default: false })
  isNewArrival!: boolean;

  @Prop({ default: false })
  festivalOffer!: boolean;

  @Prop({ default: 0 })
  discount!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);