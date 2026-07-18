import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Order } from '../order/order.schema';

@Injectable()
export class InvoiceService {
  async generateInvoicePdf(
    order: Order,
  ): Promise<string> {
    let browser: Awaited<
      ReturnType<typeof puppeteer.launch>
    > | null = null;

    try {
      const invoiceNumber =
        order.invoiceNumber ||
        `INV-${Date.now()}`;

      const safeInvoiceNumber =
        invoiceNumber.replace(
          /[^a-zA-Z0-9-_]/g,
          '-',
        );

      const outputPath = path.join(
        os.tmpdir(),
        `${safeInvoiceNumber}.pdf`,
      );

      const html =
        this.buildInvoiceHtml(order);

      browser = await puppeteer.launch({
        headless: true,

        executablePath:
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',

        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      });

      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'load',
      });

      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,

        margin: {
          top: '12mm',
          right: '10mm',
          bottom: '12mm',
          left: '10mm',
        },
      });

      await fs.access(outputPath);

      return outputPath;
    } catch (error) {
      console.error(
        'Invoice PDF generation error:',
        error,
      );

      throw new InternalServerErrorException(
        'Unable to generate invoice PDF',
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async deleteInvoiceFile(
    filePath: string,
  ): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        console.error(
          'Invoice temp file delete error:',
          error,
        );
      }
    }
  }

  private buildInvoiceHtml(
    order: Order,
  ): string {
    const address =
      order.deliveryAddress || ({} as any);

    const items = order.items || [];

    const subtotal = items.reduce(
      (total, item) =>
        total +
        Number(item.price || 0) *
          Number(item.quantity || 0),
      0,
    );

    const totalAmount = Number(
      order.totalAmount || 0,
    );

    const deliveryCharge = Math.max(
      totalAmount - subtotal,
      0,
    );

    const itemRows = items
      .map(
        (item, index) => `
          <tr>
            <td class="center">${index + 1}</td>

            <td>
              <strong>${this.escapeHtml(
                item.name || 'Product',
              )}</strong>
            </td>

            <td class="center">
              ${Number(item.quantity || 0)}
            </td>

            <td class="right">
              ${this.formatCurrency(
                item.price,
              )}
            </td>

            <td class="right">
              ${this.formatCurrency(
                Number(item.price || 0) *
                  Number(
                    item.quantity || 0,
                  ),
              )}
            </td>
          </tr>
        `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #f8fafc;
              color: #0f172a;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
            }

            .invoice {
              width: 100%;
              min-height: 100%;
              overflow: hidden;
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 14px;
            }

            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 24px 28px;
              color: #ffffff;
              background: #0f172a;
            }

            .brand {
              display: flex;
              align-items: center;
              gap: 16px;
            }

            .brand-logo {
              display: flex;
              width: 62px;
              height: 62px;
              align-items: center;
              justify-content: center;
              border: 3px solid #f59e0b;
              border-radius: 50%;
              color: #f59e0b;
              font-size: 22px;
              font-weight: 900;
            }

            .brand h1 {
              margin: 0;
              color: #f59e0b;
              font-size: 25px;
              letter-spacing: 1px;
            }

            .brand p {
              margin: 5px 0 0;
              color: #e2e8f0;
              font-size: 11px;
            }

            .company {
              text-align: right;
              font-size: 10px;
              line-height: 1.7;
            }

            .title {
              padding: 10px;
              background: #f59e0b;
              color: #0f172a;
              text-align: center;
              font-size: 16px;
              font-weight: 900;
              letter-spacing: 0.5px;
            }

            .content {
              padding: 24px 28px 20px;
            }

            .invoice-meta {
              display: grid;
              grid-template-columns:
                1fr 1.4fr 1fr;
              gap: 14px;
              margin-bottom: 18px;
            }

            .meta-item {
              padding: 12px;
              border-radius: 8px;
              background: #f8fafc;
            }

            .meta-item:last-child {
              text-align: right;
            }

            .label {
              display: block;
              margin-bottom: 6px;
              color: #64748b;
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
            }

            .value {
              font-size: 10px;
              font-weight: 800;
              overflow-wrap: anywhere;
            }

            .cards {
              display: grid;
              grid-template-columns: 1.7fr 1fr;
              gap: 16px;
              margin-bottom: 22px;
            }

            .card {
              padding: 16px;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              background: #f8fafc;
            }

            .card h3 {
              margin: 0 0 12px;
              font-size: 13px;
            }

            .card p {
              margin: 5px 0;
              color: #334155;
              font-size: 10px;
              line-height: 1.45;
            }

            .detail-row {
              display: flex;
              justify-content: space-between;
              gap: 14px;
              margin-bottom: 9px;
              font-size: 10px;
            }

            .detail-row span:first-child {
              color: #64748b;
            }

            .status {
              color: #15803d;
              font-weight: 900;
              text-transform: uppercase;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            th {
              padding: 11px 9px;
              background: #0f172a;
              color: #f59e0b;
              font-size: 9px;
              text-align: left;
            }

            td {
              padding: 11px 9px;
              border: 1px solid #e2e8f0;
              color: #1e293b;
              font-size: 9.5px;
              line-height: 1.4;
              overflow-wrap: anywhere;
            }

            tbody tr:nth-child(even) {
              background: #f8fafc;
            }

            th:nth-child(1),
            td:nth-child(1) {
              width: 8%;
            }

            th:nth-child(2),
            td:nth-child(2) {
              width: 42%;
            }

            th:nth-child(3),
            td:nth-child(3) {
              width: 10%;
            }

            th:nth-child(4),
            td:nth-child(4),
            th:nth-child(5),
            td:nth-child(5) {
              width: 20%;
            }

            .center {
              text-align: center;
            }

            .right {
              text-align: right;
            }

            .bottom {
              display: grid;
              grid-template-columns: 1.25fr 1fr;
              gap: 22px;
              margin-top: 20px;
            }

            .payment-success {
              align-self: start;
              padding: 16px;
              border: 1px solid #bbf7d0;
              border-radius: 10px;
              background: #ecfdf5;
            }

            .payment-success h3 {
              margin: 0 0 8px;
              color: #15803d;
              font-size: 13px;
            }

            .payment-success p {
              margin: 4px 0;
              color: #475569;
              font-size: 9px;
              overflow-wrap: anywhere;
            }

            .summary {
              padding: 16px;
              border-radius: 10px;
              background: #f8fafc;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              color: #334155;
              font-size: 10px;
            }

            .summary-total {
              display: flex;
              justify-content: space-between;
              margin-top: 12px;
              padding: 13px;
              border-radius: 8px;
              background: #0f172a;
              color: #f59e0b;
              font-size: 13px;
              font-weight: 900;
            }

            .terms {
              margin-top: 22px;
              color: #64748b;
              font-size: 8.5px;
              line-height: 1.55;
            }

            .terms strong {
              color: #0f172a;
            }

            .footer {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              margin-top: 22px;
              padding: 16px 28px;
              background: #0f172a;
              color: #ffffff;
              font-size: 9px;
            }

            .footer strong {
              display: block;
              margin-bottom: 4px;
              color: #f59e0b;
              font-size: 11px;
            }

            .footer-right {
              text-align: right;
            }
          </style>
        </head>

        <body>
          <section class="invoice">
            <header class="header">
              <div class="brand">
                <div class="brand-logo">
                  JP
                </div>

                <div>
                  <h1>JAPAN PATTASU</h1>

                  <p>
                    Premium Fireworks Store
                  </p>

                  <p>
                    Celebrate Safely.
                    Celebrate Brightly.
                  </p>
                </div>
              </div>

              <div class="company">
                Sivakasi, Tamil Nadu<br />
                Phone: +91 98765 43210<br />
                support@japanpattasu.com<br />
                www.japanpattasu.com
              </div>
            </header>

            <div class="title">
              TAX INVOICE / BILL
            </div>

            <main class="content">
              <section class="invoice-meta">
                <div class="meta-item">
                  <span class="label">
                    Invoice Number
                  </span>

                  <div class="value">
                    ${this.escapeHtml(
                      order.invoiceNumber ||
                        'N/A',
                    )}
                  </div>
                </div>

                <div class="meta-item">
                  <span class="label">
                    Order ID
                  </span>

                  <div class="value">
                    ${this.escapeHtml(
                      order._id?.toString() ||
                        'N/A',
                    )}
                  </div>
                </div>

                <div class="meta-item">
                  <span class="label">
                    Invoice Date
                  </span>

                  <div class="value">
                    ${this.formatDate(
                      (order as any)
                        .createdAt,
                    )}
                  </div>
                </div>
              </section>

              <section class="cards">
                <div class="card">
                  <h3>Bill To</h3>

                  <p>
                    <strong>
                      ${this.escapeHtml(
                        address.fullName ||
                          'Customer',
                      )}
                    </strong>
                  </p>

                  <p>
                    Phone:
                    ${this.escapeHtml(
                      address.phone || 'N/A',
                    )}
                  </p>

                  <p>
                    ${this.escapeHtml(
                      address.address || 'N/A',
                    )}
                  </p>

                  <p>
                    ${this.escapeHtml(
                      address.city || 'N/A',
                    )}
                    -
                    ${this.escapeHtml(
                      address.pincode || 'N/A',
                    )}
                  </p>
                </div>

                <div class="card">
                  <h3>Payment Details</h3>

                  <div class="detail-row">
                    <span>Method</span>
                    <strong>Razorpay</strong>
                  </div>

                  <div class="detail-row">
                    <span>Payment</span>

                    <span class="status">
                      ${this.escapeHtml(
                        order.paymentStatus ||
                          'paid',
                      )}
                    </span>
                  </div>

                  <div class="detail-row">
                    <span>Order Status</span>

                    <strong>
                      ${this.escapeHtml(
                        order.orderStatus ||
                          'confirmed',
                      ).toUpperCase()}
                    </strong>
                  </div>
                </div>
              </section>

              <table>
                <thead>
                  <tr>
                    <th class="center">
                      S.No
                    </th>

                    <th>
                      Product Description
                    </th>

                    <th class="center">
                      Qty
                    </th>

                    <th class="right">
                      Unit Price
                    </th>

                    <th class="right">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${itemRows}
                </tbody>
              </table>

              <section class="bottom">
                <div class="payment-success">
                  <h3>
                    Payment Successful
                  </h3>

                  <p>
                    Your payment has been
                    securely processed.
                  </p>

                  <p>
                    Transaction ID:
                    ${this.escapeHtml(
                      order.razorpayPaymentId ||
                        'N/A',
                    )}
                  </p>
                </div>

                <div class="summary">
                  <div class="summary-row">
                    <span>Subtotal</span>

                    <strong>
                      ${this.formatCurrency(
                        subtotal,
                      )}
                    </strong>
                  </div>

                  <div class="summary-row">
                    <span>
                      Delivery Charge
                    </span>

                    <strong>
                      ${
                        deliveryCharge === 0
                          ? 'FREE'
                          : this.formatCurrency(
                              deliveryCharge,
                            )
                      }
                    </strong>
                  </div>

                  <div class="summary-row">
                    <span>Discount</span>
                    <strong>₹0</strong>
                  </div>

                  <div class="summary-row">
                    <span>GST</span>
                    <strong>Included</strong>
                  </div>

                  <div class="summary-total">
                    <span>Grand Total</span>

                    <span>
                      ${this.formatCurrency(
                        totalAmount,
                      )}
                    </span>
                  </div>
                </div>
              </section>

              <section class="terms">
                <strong>Terms & Notes</strong>

                <div>
                  1. Please retain this invoice
                  for future reference.
                </div>

                <div>
                  2. Products are subject to the
                  applicable cancellation and
                  refund policy.
                </div>

                <div>
                  3. Handle fireworks responsibly
                  and follow all safety
                  instructions.
                </div>
              </section>
            </main>

            <footer class="footer">
              <div>
                <strong>
                  Thank You For Shopping With
                  Japan Pattasu!
                </strong>

                Light up your celebrations safely
                and responsibly.
              </div>

              <div class="footer-right">
                This is a computer-generated
                invoice.<br />

                Generated on:
                ${this.formatDate(new Date())}
              </div>
            </footer>
          </section>
        </body>
      </html>
    `;
  }

  private formatCurrency(
    amount: number,
  ): string {
    return `₹${Number(
      amount || 0,
    ).toLocaleString('en-IN')}`;
  }

  private formatDate(
    value: Date | string | undefined,
  ): string {
    if (!value) {
      return 'N/A';
    }

    return new Date(value).toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  }

  private escapeHtml(
    value: unknown,
  ): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}