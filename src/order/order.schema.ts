import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class DeliveryAddress {
  @Prop({ default: '' })
  fullName!: string;

  @Prop({ default: '' })
  phone!: string;

  @Prop({ default: '' })
  address!: string;

  @Prop({ default: '' })
  city!: string;

  @Prop({ default: '' })
  pincode!: string;
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user!: Types.ObjectId;

  @Prop([
    {
      product: {
        type: Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      name: String,
      price: Number,
      quantity: Number,
    },
  ])
  items!: {
    product: Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
  }[];

  @Prop({ required: true })
  totalAmount!: number;

  @Prop({
    type: DeliveryAddress,
    default: {},
  })
  deliveryAddress!: DeliveryAddress;

  @Prop({
    default: 'paid',
    enum: [
      'pending',
      'paid',
      'refund_pending',
      'refunded',
      'refund_failed',
    ],
  })
  paymentStatus!: string;

  @Prop({
    default: 'confirmed',
    enum: [
      'confirmed',
      'packed',
      'shipped',
      'delivered',
      'cancelled',
    ],
  })
  orderStatus!: string;

  @Prop()
  razorpayOrderId?: string;

  @Prop()
  razorpayPaymentId?: string;

  @Prop()
  razorpayRefundId?: string;

  @Prop({
    default: 'not_requested',
    enum: [
      'not_requested',
      'pending',
      'processed',
      'failed',
    ],
  })
  refundStatus!: string;

  @Prop({ default: 0 })
  refundAmount!: number;

  @Prop()
  refundRequestedAt?: Date;

  @Prop()
  refundedAt?: Date;

  @Prop()
  refundFailureReason?: string;

  @Prop()
  invoiceNumber?: string;
}

export const OrderSchema =
  SchemaFactory.createForClass(Order);