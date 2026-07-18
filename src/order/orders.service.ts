import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

import { Order } from './order.schema';
import { Cart } from '../cart/cart.schema';
import { Product } from '../product/product.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { ProductsGateway } from '../product/products.gateway';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { InvoiceService } from '../invoice/invoice.service';

type PopulatedCartItem = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  product: any;
  quantity: number;
};

type OrderItemType = {
  product: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
};

@Injectable()
export class OrdersService {
  private readonly razorpay: Razorpay;

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,

    @InjectModel(Cart.name)
    private readonly cartModel: Model<Cart>,

    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,

    private readonly productsGateway: ProductsGateway,

    private readonly whatsappService: WhatsappService,

    private readonly invoiceService: InvoiceService,
  ) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay env values missing');
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  /*
   * Order create/status/refund change aagumbodhu
   * frontend pages-ku real-time notification anuppum.
   */
  private emitOrderUpdated(order: Order) {
    this.productsGateway.server.emit('orderUpdated', {
      orderId: order._id.toString(),
      userId: order.user?.toString(),
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      refundStatus: order.refundStatus,
      refundAmount: order.refundAmount,
      updatedAt: new Date().toISOString(),
    });
  }

  async createPayment(userId: string, dto: CreatePaymentDto) {
    const cartItems = (await this.cartModel
      .find({ user: userId })
      .populate('product')) as unknown as PopulatedCartItem[];

    if (!cartItems.length) {
      throw new BadRequestException('Cart is empty');
    }

    let productTotal = 0;

    for (const item of cartItems) {
      const product = item.product;

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(`${product.name} stock not available`);
      }

      productTotal += product.price * item.quantity;
    }

    const deliveryCharge = productTotal >= 1000 ? 0 : 300;

    const finalAmount = productTotal + deliveryCharge;

    const razorpayOrder = await this.razorpay.orders.create({
      amount: finalAmount * 100,
      currency: 'INR',
      receipt: `rcpt_${Date.now().toString().slice(-10)}`,
      notes: {
        userId,
        productTotal,
        deliveryCharge,
        finalAmount,
        deliveryAddress: JSON.stringify(dto.deliveryAddress),
      },
    });

    return {
      message: 'Razorpay order created',
      key: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      productTotal,
      deliveryCharge,
      finalAmount,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    };
  }

  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpaySecret) {
      throw new BadRequestException('Razorpay secret missing');
    }

    const generatedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(`${dto.razorpay_order_id}|${dto.razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== dto.razorpay_signature) {
      throw new BadRequestException('Invalid payment signature');
    }

    return this.createOrderFromCart(
      userId,
      dto.deliveryAddress,
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
    );
  }

  private async createOrderFromCart(
    userId: string,
    deliveryAddress: any,
    razorpayOrderId: string,
    razorpayPaymentId: string,
  ) {
    const cartItems = (await this.cartModel
      .find({ user: userId })
      .populate('product')) as unknown as PopulatedCartItem[];

    if (!cartItems.length) {
      throw new BadRequestException('Cart is empty');
    }

    let productTotal = 0;
    const orderItems: OrderItemType[] = [];

    for (const item of cartItems) {
      const product = item.product;

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(`${product.name} stock not available`);
      }

      productTotal += product.price * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }

    const deliveryCharge = productTotal >= 1000 ? 0 : 300;

    const finalAmount = productTotal + deliveryCharge;

    for (const item of cartItems) {
      const product = item.product;

      await this.productModel.findByIdAndUpdate(product._id, {
        $inc: {
          stock: -item.quantity,
        },
      });

      this.productsGateway.emitProductUpdate(product._id.toString());
    }

    const order = await this.orderModel.create({
      user: new Types.ObjectId(userId),
      items: orderItems,
      totalAmount: finalAmount,
      deliveryAddress,
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      razorpayOrderId,
      razorpayPaymentId,
      refundStatus: 'not_requested',
      refundAmount: 0,
      invoiceNumber: `INV-${Date.now()}`,
    });

    await this.cartModel.deleteMany({
      user: userId,
    });

    

    this.emitOrderUpdated(order);

    this.sendOrderConfirmationWithInvoice(order).catch((error) => {
      console.error(
        'Order confirmation with invoice WhatsApp failed:',
        error?.message || error,
      );
    });

    return {
      message: 'Payment verified and order placed successfully',
      order,
    };
  }

  async getMyOrders(userId: string) {
    return this.orderModel
      .find({
        user: new Types.ObjectId(userId),
      })
      .populate('items.product')
      .sort({ createdAt: -1 });
  }

  async getAllOrders() {
    return this.orderModel
      .find()
      .populate('user', 'name email phone profileImage')
      .populate('items.product', 'name imageUrl brand')
      .sort({ createdAt: -1 });
  }

  async updateOrderStatus(orderId: string, orderStatus: string) {
    const allowedStatuses = [
      'confirmed',
      'packed',
      'shipped',
      'delivered',
      'cancelled',
    ];

    if (!allowedStatuses.includes(orderStatus)) {
      throw new BadRequestException('Invalid order status');
    }

    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.refundStatus === 'processed') {
      throw new BadRequestException('Refunded order status cannot be changed');
    }

    if (order.orderStatus === orderStatus) {
      return {
        message: 'Order status is already updated',
        order,
      };
    }

    order.orderStatus = orderStatus;

    /*
     * Admin cancelled-a maathina paid order-ku
     * refund pending automatically set aagum.
     */
    if (orderStatus === 'cancelled' && order.paymentStatus === 'paid') {
      order.refundStatus = 'pending';
      order.paymentStatus = 'refund_pending';
      order.refundRequestedAt = new Date();
    }

    await order.save();
    this.sendOrderStatusWhatsapp(order).catch((error) => {
      console.error('Order status WhatsApp failed:', error?.message || error);
    });

    this.emitOrderUpdated(order);

    return {
      message: 'Order status updated',
      order,
    };
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      user: new Types.ObjectId(userId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.orderStatus === 'cancelled') {
      throw new BadRequestException('Order already cancelled');
    }

    if (['shipped', 'delivered'].includes(order.orderStatus)) {
      throw new BadRequestException(
        'Shipped or delivered order cannot be cancelled',
      );
    }

    order.orderStatus = 'cancelled';

    if (order.paymentStatus === 'paid') {
      order.refundStatus = 'pending';
      order.paymentStatus = 'refund_pending';
      order.refundRequestedAt = new Date();
    }

    await order.save();

    this.emitOrderUpdated(order);

    return {
      message: 'Order cancelled. Refund is waiting for admin approval.',
      order,
    };
  }

  async processRefund(orderId: string) {
    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.orderStatus !== 'cancelled') {
      throw new BadRequestException('Only cancelled orders can be refunded');
    }

    if (!order.razorpayPaymentId) {
      throw new BadRequestException('Razorpay payment ID is missing');
    }

    if (order.refundStatus === 'processed') {
      throw new BadRequestException('Order is already refunded');
    }

    /*
     * Refund start aaguradhukku munadiye
     * customer page-la Pending real-time show aagum.
     */
    order.refundStatus = 'pending';
    order.paymentStatus = 'refund_pending';
    order.refundRequestedAt = order.refundRequestedAt || new Date();
    order.refundFailureReason = undefined;

    await order.save();

    this.emitOrderUpdated(order);

    try {
      const refund = await this.razorpay.payments.refund(
        order.razorpayPaymentId,
        {
          amount: Math.round(order.totalAmount * 100),
          speed: 'normal',
          notes: {
            orderId: order._id.toString(),
            invoiceNumber: order.invoiceNumber || '',
          },
        },
      );

      order.razorpayRefundId = refund.id;
      order.refundAmount = Number(refund.amount || 0) / 100;
      order.refundStatus = 'processed';
      order.paymentStatus = 'refunded';
      order.refundedAt = new Date();
      order.refundFailureReason = undefined;

      await order.save();

      await this.restoreOrderStock(order);

      this.emitOrderUpdated(order);

      return {
        message: 'Refund initiated successfully',
        refund: {
          id: refund.id,
          amount: Number(refund.amount || 0) / 100,
          status: refund.status,
        },
        order,
      };
    } catch (error: any) {
      order.refundStatus = 'failed';
      order.paymentStatus = 'refund_failed';
      order.refundFailureReason =
        error?.error?.description || error?.message || 'Refund failed';

      await order.save();

      this.sendOrderStatusWhatsapp(order).catch((error) => {
        console.error(
          'Order cancellation WhatsApp failed:',
          error?.message || error,
        );
      });

      this.emitOrderUpdated(order);

      throw new BadRequestException(order.refundFailureReason);
    }
  }

  private async restoreOrderStock(order: Order) {
    for (const item of order.items || []) {
      await this.productModel.findByIdAndUpdate(item.product, {
        $inc: {
          stock: item.quantity,
        },
      });

      this.productsGateway.emitProductUpdate(item.product.toString());
    }
  }

  async deleteCancelledOrders(userId: string) {
    const result = await this.orderModel.deleteMany({
      user: new Types.ObjectId(userId),
      orderStatus: 'cancelled',

      refundStatus: {
        $in: ['not_requested', 'processed', 'failed'],
      },
    });

    return {
      message: 'Cancelled order history cleared',
      deletedCount: result.deletedCount,
    };
  }

  async testPayment(userId: string, dto: CreatePaymentDto) {
    return this.createOrderFromCart(
      userId,
      dto.deliveryAddress,
      `TEST_ORDER_${Date.now()}`,
      `TEST_PAYMENT_${Date.now()}`,
    );
  }

  private async sendOrderConfirmationWithInvoice(order: Order) {
    const address = order.deliveryAddress;

    if (!address?.phone) {
      console.warn(`WhatsApp skipped: Phone missing for order ${order._id}`);

      return;
    }

    const customerName = address.fullName?.trim() || 'Customer';

    let invoicePath: string | null = null;

    try {
      invoicePath = await this.invoiceService.generateInvoicePdf(order);

      const result =
        await this.whatsappService.sendOrderConfirmationWithInvoiceTemplate(
          address.phone,
          customerName,
          order._id.toString(),
          Number(order.totalAmount),
          invoicePath,
        );

      console.log('WhatsApp confirmation with invoice sent:', result);
    } catch (error: any) {
      console.error(
        'WhatsApp confirmation with invoice failed:',
        error?.message || error,
      );
    } finally {
      if (invoicePath) {
        await this.invoiceService.deleteInvoiceFile(invoicePath);
      }
    }
  }

  private async sendNormalOrderConfirmation(order: Order) {
    const address = order.deliveryAddress;

    if (!address?.phone) {
      console.warn(`WhatsApp skipped: Phone missing for order ${order._id}`);
      return;
    }

    const customerName = address.fullName?.trim() || 'Customer';

    const result = await this.whatsappService.sendOrderConfirmation(
      address.phone,
      customerName,
      order._id.toString(),
      Number(order.totalAmount),
    );

    console.log('WhatsApp order confirmation sent:', result);
  }
  private async sendOrderStatusWhatsapp(order: Order) {
    const address = order.deliveryAddress;

    if (!address?.phone) {
      console.warn(`WhatsApp skipped: Phone missing for order ${order._id}`);

      return;
    }

    const customerName = address.fullName?.trim() || 'Customer';

    const templateMap: Record<string, string> = {
      shipped: 'order_shipped',
      delivered: 'order_delivered',
      cancelled: 'order_cancelled',
    };

    const templateName = templateMap[order.orderStatus];

    /*
     * packed status-ku approved template illa.
     * confirmed message order create time-la already send aagum.
     */
    if (!templateName) {
      return;
    }

    const result = await this.whatsappService.sendOrderStatusTemplate(
      address.phone,
      customerName,
      order._id.toString(),
      templateName,
    );

    console.log(`WhatsApp ${order.orderStatus} template sent:`, result);
  }
}
