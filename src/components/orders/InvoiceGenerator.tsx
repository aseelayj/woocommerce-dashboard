import { Order } from '@/types';
import { format } from 'date-fns';

interface InvoiceGeneratorProps {
  order: Order;
  shopName?: string;
  shopAddress?: string;
  shopEmail?: string;
  shopPhone?: string;
}

export function generateInvoiceHTML({
  order,
  shopName = '',
  shopAddress = '',
  shopEmail = '',
  shopPhone = ''
}: InvoiceGeneratorProps): string {
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: order.currency || 'USD',
    }).format(parseFloat(amount));
  };

  const subtotal = order.line_items.reduce((sum, item) => sum + parseFloat(item.total), 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice #${order.number}</title>
      <style>
        @page { margin: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 40px;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .company-info h1 {
          margin: 0 0 10px 0;
          color: #1e40af;
        }
        .company-info p {
          margin: 2px 0;
          color: #666;
        }
        .invoice-details {
          text-align: right;
        }
        .invoice-details h2 {
          margin: 0 0 10px 0;
          color: #1e40af;
        }
        .invoice-details p {
          margin: 2px 0;
        }
        .addresses {
          display: flex;
          gap: 40px;
          margin-bottom: 40px;
        }
        .address-block {
          flex: 1;
        }
        .address-block h3 {
          margin: 0 0 10px 0;
          color: #1e40af;
          font-size: 14px;
          text-transform: uppercase;
        }
        .address-block p {
          margin: 2px 0;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background-color: #f3f4f6;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #e5e7eb;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .text-right {
          text-align: right;
        }
        .totals {
          margin-left: auto;
          width: 300px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }
        .totals-row.total {
          font-weight: bold;
          font-size: 18px;
          border-top: 2px solid #e5e7eb;
          margin-top: 10px;
          padding-top: 10px;
        }
        .status {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
        }
        .status.completed { background: #d1fae5; color: #065f46; }
        .status.processing { background: #dbeafe; color: #1e3a8a; }
        .status.pending { background: #fef3c7; color: #92400e; }
        .status.cancelled { background: #fee2e2; color: #991b1b; }
        .status.refunded { background: #e9d5ff; color: #6b21a8; }
        .status.failed { background: #fee2e2; color: #991b1b; }
        .footer {
          margin-top: 60px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-header">
        <div class="company-info">
          ${shopName ? `<h1>${shopName}</h1>` : ''}
          ${shopAddress ? `<p>${shopAddress}</p>` : ''}
          ${shopEmail ? `<p>Email: ${shopEmail}</p>` : ''}
          ${shopPhone ? `<p>Phone: ${shopPhone}</p>` : ''}
          ${!shopName && !shopAddress && !shopEmail && !shopPhone ? `
            <div style="margin-bottom: 20px;">
              <p style="color: #666; font-style: italic;">Shop information not available</p>
            </div>
          ` : ''}
        </div>
        <div class="invoice-details">
          <h2>INVOICE</h2>
          <p><strong>Invoice #:</strong> ${order.number}</p>
          <p><strong>Date:</strong> ${format(new Date(order.date_created), 'MMMM dd, yyyy')}</p>
          <p><strong>Status:</strong> <span class="status ${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></p>
        </div>
      </div>

      <div class="addresses">
        <div class="address-block">
          <h3>Bill To</h3>
          <p><strong>${order.billing.first_name} ${order.billing.last_name}</strong></p>
          ${order.billing.company ? `<p>${order.billing.company}</p>` : ''}
          <p>${order.billing.address_1}</p>
          ${order.billing.address_2 ? `<p>${order.billing.address_2}</p>` : ''}
          <p>${order.billing.city}, ${order.billing.state} ${order.billing.postcode}</p>
          <p>${order.billing.country}</p>
          <p>${order.billing.email}</p>
          <p>${order.billing.phone}</p>
        </div>
        <div class="address-block">
          <h3>Ship To</h3>
          <p><strong>${order.shipping.first_name} ${order.shipping.last_name}</strong></p>
          ${order.shipping.company ? `<p>${order.shipping.company}</p>` : ''}
          <p>${order.shipping.address_1}</p>
          ${order.shipping.address_2 ? `<p>${order.shipping.address_2}</p>` : ''}
          <p>${order.shipping.city}, ${order.shipping.state} ${order.shipping.postcode}</p>
          <p>${order.shipping.country}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="text-right">Quantity</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.line_items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">${formatCurrency(item.price)}</td>
              <td class="text-right">${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(subtotal.toString())}</span>
        </div>
        ${parseFloat(order.shipping_total) > 0 ? `
          <div class="totals-row">
            <span>Shipping:</span>
            <span>${formatCurrency(order.shipping_total)}</span>
          </div>
        ` : ''}
        ${parseFloat(order.total_tax) > 0 ? `
          <div class="totals-row">
            <span>Tax:</span>
            <span>${formatCurrency(order.total_tax)}</span>
          </div>
        ` : ''}
        ${parseFloat(order.discount_total) > 0 ? `
          <div class="totals-row" style="color: #059669;">
            <span>Discount:</span>
            <span>-${formatCurrency(order.discount_total)}</span>
          </div>
        ` : ''}
        <div class="totals-row total">
          <span>Total:</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
      </div>

      ${order.customer_note ? `
        <div style="margin-top: 40px; padding: 16px; background: #f3f4f6; border-radius: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px;">Customer Note:</h3>
          <p style="margin: 0; color: #666;">${order.customer_note}</p>
        </div>
      ` : ''}

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Payment Method: ${order.payment_method_title || 'N/A'}</p>
        ${order.transaction_id ? `<p>Transaction ID: ${order.transaction_id}</p>` : ''}
      </div>
    </body>
    </html>
  `;
}

export function downloadInvoice(order: Order, shopInfo?: Partial<InvoiceGeneratorProps>) {
  const html = generateInvoiceHTML({ order, ...shopInfo });
  
  // Create a blob from the HTML
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${order.number}.html`;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printInvoice(order: Order, shopInfo?: Partial<InvoiceGeneratorProps>) {
  const html = generateInvoiceHTML({ order, ...shopInfo });
  
  // Open a new window with the invoice
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}