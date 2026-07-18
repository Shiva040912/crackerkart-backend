import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WhatsappService {
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  private readonly accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();

  private readonly apiVersion =
    process.env.WHATSAPP_API_VERSION?.trim() || 'v25.0';

  private readonly orderTemplateName =
    process.env.WHATSAPP_ORDER_TEMPLATE_NAME?.trim() || 'order_confirmation';

  private readonly templateLanguage =
    process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en';

  getConnectionStatus() {
    const configured = Boolean(
      this.phoneNumberId && this.accessToken && this.apiVersion,
    );

    return {
      configured,
      message: configured
        ? 'Meta WhatsApp Cloud API is configured'
        : 'WhatsApp Cloud API environment variables are missing',
      template: this.orderTemplateName,
      language: this.templateLanguage,
    };
  }

  async sendMessage(phone: string, message: string) {
    this.validateConfiguration();

    const cleanedPhone = this.getCleanIndianPhone(phone);

    const cleanedMessage = String(message || '').trim();

    if (!cleanedMessage) {
      throw new BadRequestException('WhatsApp message is required');
    }

    try {
      const response = await axios.post(
        this.getMessagesUrl(),
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: `91${cleanedPhone}`,
          type: 'text',
          text: {
            preview_url: false,
            body: cleanedMessage,
          },
        },
        {
          headers: this.getAuthorizationHeaders(),
          timeout: 15000,
        },
      );

      return {
        message: 'WhatsApp message sent successfully',
        messageId: response.data?.messages?.[0]?.id || null,
        to: `+91${cleanedPhone}`,
      };
    } catch (error) {
      this.handleMetaApiError(error);
    }
  }

  async sendOrderConfirmation(
    phone: string,
    customerName: string,
    orderId: string,
    amount: number,
  ) {
    this.validateConfiguration();

    const cleanedPhone = this.getCleanIndianPhone(phone);

    const safeCustomerName = String(customerName || '').trim() || 'Customer';

    const safeOrderId = String(orderId || '').trim();

    const safeAmount = Number(amount);

    if (!safeOrderId) {
      throw new BadRequestException('Order ID is required');
    }

    if (!Number.isFinite(safeAmount) || safeAmount < 0) {
      throw new BadRequestException('Valid order amount is required');
    }

    try {
      const response = await axios.post(
        this.getMessagesUrl(),
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: `91${cleanedPhone}`,
          type: 'template',

          template: {
            name: this.orderTemplateName,

            language: {
              code: this.templateLanguage,
            },

            components: [
              {
                type: 'body',
                parameters: [
                  {
                    type: 'text',
                    text: safeCustomerName,
                  },
                  {
                    type: 'text',
                    text: safeOrderId,
                  },
                  {
                    type: 'text',
                    text: safeAmount.toFixed(2),
                  },
                ],
              },
            ],
          },
        },
        {
          headers: this.getAuthorizationHeaders(),
          timeout: 15000,
        },
      );

      return {
        message: 'WhatsApp order confirmation sent successfully',
        messageId: response.data?.messages?.[0]?.id || null,
        to: `+91${cleanedPhone}`,
        template: this.orderTemplateName,
        language: this.templateLanguage,
      };
    } catch (error) {
      this.handleMetaApiError(error);
    }
  }

  async sendOrderStatusTemplate(
    phone: string,
    customerName: string,
    orderId: string,
    templateName: string,
  ) {
    this.validateConfiguration();

    const cleanedPhone = this.getCleanIndianPhone(phone);

    const safeCustomerName = String(customerName || '').trim() || 'Customer';

    const safeOrderId = String(orderId || '').trim();

    if (!safeOrderId) {
      throw new BadRequestException('Order ID is required');
    }

    const allowedTemplates = [
      'order_shipped',
      'order_delivered',
      'order_cancelled',
    ];

    if (!allowedTemplates.includes(templateName)) {
      throw new BadRequestException('Invalid WhatsApp order status template');
    }

    try {
      const response = await axios.post(
        this.getMessagesUrl(),
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: `91${cleanedPhone}`,
          type: 'template',

          template: {
            name: templateName,

            language: {
              code: this.templateLanguage,
            },

            components: [
              {
                type: 'body',

                parameters: [
                  {
                    type: 'text',
                    text: safeCustomerName,
                  },
                  {
                    type: 'text',
                    text: safeOrderId,
                  },
                ],
              },
            ],
          },
        },
        {
          headers: this.getAuthorizationHeaders(),
          timeout: 15000,
        },
      );

      return {
        message: `${templateName} WhatsApp template sent successfully`,
        messageId: response.data?.messages?.[0]?.id || null,
        to: `+91${cleanedPhone}`,
        template: templateName,
        language: this.templateLanguage,
      };
    } catch (error) {
      this.handleMetaApiError(error);
    }
  }

  async sendOrderConfirmationWithInvoiceTemplate(
    phone: string,
    customerName: string,
    orderId: string,
    amount: number,
    invoicePath: string,
  ) {
    this.validateConfiguration();

    const cleanedPhone = this.getCleanIndianPhone(phone);

    const safeCustomerName = String(customerName || '').trim() || 'Customer';

    const safeOrderId = String(orderId || '').trim();

    const safeAmount = Number(amount);

    if (!safeOrderId) {
      throw new BadRequestException('Order ID is required');
    }

    if (!Number.isFinite(safeAmount) || safeAmount < 0) {
      throw new BadRequestException('Valid order amount is required');
    }

    if (!invoicePath) {
      throw new BadRequestException('Invoice file path is required');
    }

    const absoluteFilePath = path.resolve(invoicePath);

    if (!fs.existsSync(absoluteFilePath)) {
      throw new BadRequestException(
        `Invoice file not found: ${absoluteFilePath}`,
      );
    }

    try {
      const mediaId = await this.uploadDocumentToMeta(absoluteFilePath);

      const response = await axios.post(
        this.getMessagesUrl(),
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: `91${cleanedPhone}`,
          type: 'template',

          template: {
            name: 'order_confirmation_with_invoice',

            language: {
              code: this.templateLanguage,
            },

            components: [
              {
                type: 'header',

                parameters: [
                  {
                    type: 'document',

                    document: {
                      id: mediaId,

                      filename: path.basename(absoluteFilePath),
                    },
                  },
                ],
              },

              {
                type: 'body',

                parameters: [
                  {
                    type: 'text',
                    text: safeCustomerName,
                  },
                  {
                    type: 'text',
                    text: safeOrderId,
                  },
                  {
                    type: 'text',
                    text: safeAmount.toFixed(2),
                  },
                ],
              },
            ],
          },
        },
        {
          headers: this.getAuthorizationHeaders(),

          timeout: 30000,
        },
      );

      return {
        message: 'Order confirmation with invoice sent successfully',

        messageId: response.data?.messages?.[0]?.id || null,

        mediaId,

        to: `+91${cleanedPhone}`,

        template: 'order_confirmation_with_invoice',

        language: this.templateLanguage,
      };
    } catch (error) {
      this.handleMetaApiError(error);
    }
  }

  async sendDocument(phone: string, filePath: string, caption: string) {
    this.validateConfiguration();

    const cleanedPhone = this.getCleanIndianPhone(phone);

    const cleanedCaption = String(caption || '').trim();

    if (!filePath) {
      throw new BadRequestException('WhatsApp document file path is required');
    }

    const absoluteFilePath = path.resolve(filePath);

    if (!fs.existsSync(absoluteFilePath)) {
      throw new BadRequestException(
        `WhatsApp document file not found: ${absoluteFilePath}`,
      );
    }

    try {
      const mediaId = await this.uploadDocumentToMeta(absoluteFilePath);

      const documentPayload: {
        id: string;
        filename: string;
        caption?: string;
      } = {
        id: mediaId,
        filename: path.basename(absoluteFilePath),
      };

      if (cleanedCaption) {
        documentPayload.caption = cleanedCaption;
      }

      const response = await axios.post(
        this.getMessagesUrl(),
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: `91${cleanedPhone}`,
          type: 'document',
          document: documentPayload,
        },
        {
          headers: this.getAuthorizationHeaders(),
          timeout: 30000,
        },
      );

      return {
        message: 'WhatsApp document sent successfully',
        messageId: response.data?.messages?.[0]?.id || null,
        mediaId,
        to: `+91${cleanedPhone}`,
      };
    } catch (error) {
      this.handleMetaApiError(error);
    }
  }

  private async uploadDocumentToMeta(
    absoluteFilePath: string,
  ): Promise<string> {
    const formData = new FormData();

    formData.append('messaging_product', 'whatsapp');

    formData.append('file', fs.createReadStream(absoluteFilePath), {
      filename: path.basename(absoluteFilePath),
      contentType: 'application/pdf',
    });

    const uploadUrl =
      `https://graph.facebook.com/` +
      `${this.apiVersion}/` +
      `${this.phoneNumberId}/media`;

    try {
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        timeout: 30000,
      });

      const mediaId = response.data?.id;

      if (!mediaId) {
        throw new InternalServerErrorException(
          'Meta did not return a media ID',
        );
      }

      return mediaId;
    } catch (error) {
      this.handleMetaApiError(error);
    }
  }

  private getMessagesUrl() {
    return (
      `https://graph.facebook.com/` +
      `${this.apiVersion}/` +
      `${this.phoneNumberId}/messages`
    );
  }

  private getAuthorizationHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private validateConfiguration() {
    if (!this.phoneNumberId) {
      throw new ServiceUnavailableException(
        'WHATSAPP_PHONE_NUMBER_ID is not configured',
      );
    }

    if (!this.accessToken) {
      throw new ServiceUnavailableException(
        'WHATSAPP_ACCESS_TOKEN is not configured',
      );
    }
  }

  private getCleanIndianPhone(phone: string) {
    let cleanedPhone = String(phone || '').replace(/\D/g, '');

    if (cleanedPhone.length === 12 && cleanedPhone.startsWith('91')) {
      cleanedPhone = cleanedPhone.slice(2);
    }

    if (!/^[6-9]\d{9}$/.test(cleanedPhone)) {
      throw new BadRequestException(
        'Enter a valid 10 digit Indian phone number',
      );
    }

    return cleanedPhone;
  }

  private handleMetaApiError(error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ServiceUnavailableException ||
      error instanceof InternalServerErrorException
    ) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{
        error?: {
          message?: string;
          type?: string;
          code?: number;
          error_subcode?: number;
          fbtrace_id?: string;
        };
      }>;

      const metaError = axiosError.response?.data?.error;

      console.error('Meta WhatsApp Cloud API error:', {
        status: axiosError.response?.status,
        code: metaError?.code,
        subcode: metaError?.error_subcode,
        type: metaError?.type,
        message: metaError?.message,
        traceId: metaError?.fbtrace_id,
      });

      if (!axiosError.response) {
        throw new ServiceUnavailableException(
          'Unable to connect to Meta WhatsApp Cloud API',
        );
      }

      throw new BadRequestException(
        metaError?.message || 'Meta WhatsApp Cloud API rejected the request',
      );
    }

    console.error('Unexpected WhatsApp error:', error);

    throw new InternalServerErrorException(
      'Unable to process WhatsApp request',
    );
  }
}
