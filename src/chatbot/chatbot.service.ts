import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import Groq from 'groq-sdk';

@Injectable()
export class ChatbotService {
  private readonly groq: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error(
        'GROQ_API_KEY is not configured',
      );
    }

    this.groq = new Groq({
      apiKey,
    });
  }

  async getReply(message: string) {
    const cleanedMessage = message?.trim();

    if (!cleanedMessage) {
      throw new BadRequestException(
        'Message is required',
      );
    }

    try {
      const completion =
        await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',

          temperature: 0.5,

          messages: [
            {
              role: 'system',
              content: `
You are the official AI assistant of Japan Pattasu.

About Japan Pattasu:
- Online fireworks shopping website.
- Reply naturally.
- Reply in Tanglish if customer speaks Tanglish.
- Reply in English if customer speaks English.
- reply in malayalam if customer speaks malayalam.

Website Features:
- Products
- Categories
- Brands
- Wishlist
- Cart
- Quick Buy
- Razorpay Payment
- Twilio OTP Login
- Google Login
- Orders
- Invoice
- Refund

Business Rules:
- ₹1000 and above → Free Delivery
- 20+  firework brands (Sony , vinayaga , standard, etc)
- location sivakasi 
- 20+ categories( flowerpots , bomb , chakaram , skyshots , etc)
- price starts from 100rs 
- delivery across tamilnadu
- Below ₹1000 → ₹300 Delivery Charge
- Payment via Razorpay.
- OTP via Twilio Verify.
- Never say you don't know Japan Pattasu.
- Never mention you are Groq or Meta AI.
- if any one asks Gk qustions say i know only about japan pattasu 
- owner name sivabalan
- payment types describe razor pay types
- Be friendly.
- Keep replies short unless customer asks detailed questions.
`,
            },
            {
              role: 'user',
              content: cleanedMessage,
            },
          ],
        });

      return {
        success: true,
        reply:
          completion.choices[0].message
            .content,
      };
    } catch (error) {
      console.error(error);

      throw new InternalServerErrorException(
        'AI chatbot unavailable',
      );
    }
  }
}