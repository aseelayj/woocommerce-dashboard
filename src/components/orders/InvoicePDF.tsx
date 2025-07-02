import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Order, Shop } from '@/types';
import { format } from 'date-fns';

interface InvoicePDFProps {
  order: Order;
  shop?: Shop;
}

export async function generateInvoicePDF({ order, shop }: InvoicePDFProps): Promise<Blob> {
  // Create a temporary div to render the invoice
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '210mm'; // A4 width
  tempDiv.style.padding = '20mm';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: shop?.storeInfo?.currency || order.currency || 'USD',
    }).format(parseFloat(amount));
  };

  const subtotal = order.line_items.reduce((sum, item) => sum + parseFloat(item.total), 0);

  tempDiv.innerHTML = `
    <div style="color: #333; line-height: 1.6;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
        <div>
          ${shop?.storeInfo?.store_name || shop?.name ? `
            <h1 style="margin: 0 0 10px 0; color: #1e40af; font-size: 28px;">
              ${shop.storeInfo?.store_name || shop.name}
            </h1>
          ` : ''}
          
          ${shop?.storeInfo?.store_address ? `
            <p style="margin: 2px 0; color: #666;">
              ${shop.storeInfo.store_address}
              ${shop.storeInfo.store_city ? `, ${shop.storeInfo.store_city}` : ''}
              ${shop.storeInfo.store_postcode ? ` ${shop.storeInfo.store_postcode}` : ''}
              ${shop.storeInfo.store_country ? `, ${shop.storeInfo.store_country}` : ''}
            </p>
          ` : shop?.baseUrl ? `
            <p style="margin: 2px 0; color: #666;">${shop.baseUrl}</p>
          ` : ''}
          
          ${shop?.storeInfo?.store_email ? `
            <p style="margin: 2px 0; color: #666;">Email: ${shop.storeInfo.store_email}</p>
          ` : shop ? `
            <p style="margin: 2px 0; color: #666;">Email: support@${new URL(shop.baseUrl).hostname}</p>
          ` : ''}
          
          ${!shop || (!shop.name && !shop.storeInfo?.store_name) ? `
            <div style="margin-bottom: 20px;">
              <p style="color: #666; font-style: italic;">Shop information not available</p>
            </div>
          ` : ''}
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0 0 10px 0; color: #1e40af; font-size: 24px;">INVOICE</h2>
          <p style="margin: 2px 0;"><strong>Invoice #:</strong> ${order.number}</p>
          <p style="margin: 2px 0;"><strong>Date:</strong> ${format(new Date(order.date_created), 'MMM dd, yyyy')}</p>
          <p style="margin: 2px 0;">
            <strong>Status:</strong> 
            <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: 500; 
              ${order.status === 'completed' ? 'background: #d1fae5; color: #065f46;' : ''}
              ${order.status === 'processing' ? 'background: #dbeafe; color: #1e3a8a;' : ''}
              ${order.status === 'pending' ? 'background: #fef3c7; color: #92400e;' : ''}
              ${order.status === 'cancelled' ? 'background: #fee2e2; color: #991b1b;' : ''}
              ${order.status === 'refunded' ? 'background: #e9d5ff; color: #6b21a8;' : ''}
              ${order.status === 'failed' ? 'background: #fee2e2; color: #991b1b;' : ''}
            ">
              ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </p>
        </div>
      </div>

      <!-- Addresses -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
        <div>
          <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; text-transform: uppercase;">Bill To</h3>
          <p style="margin: 2px 0;"><strong>${order.billing.first_name} ${order.billing.last_name}</strong></p>
          ${order.billing.company ? `<p style="margin: 2px 0;">${order.billing.company}</p>` : ''}
          <p style="margin: 2px 0;">${order.billing.address_1}</p>
          ${order.billing.address_2 ? `<p style="margin: 2px 0;">${order.billing.address_2}</p>` : ''}
          <p style="margin: 2px 0;">${order.billing.city}, ${order.billing.state} ${order.billing.postcode}</p>
          <p style="margin: 2px 0;">${order.billing.country}</p>
          <p style="margin: 2px 0;">${order.billing.email}</p>
          <p style="margin: 2px 0;">${order.billing.phone}</p>
        </div>
        <div>
          <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; text-transform: uppercase;">Ship To</h3>
          <p style="margin: 2px 0;"><strong>${order.shipping.first_name} ${order.shipping.last_name}</strong></p>
          ${order.shipping.company ? `<p style="margin: 2px 0;">${order.shipping.company}</p>` : ''}
          <p style="margin: 2px 0;">${order.shipping.address_1}</p>
          ${order.shipping.address_2 ? `<p style="margin: 2px 0;">${order.shipping.address_2}</p>` : ''}
          <p style="margin: 2px 0;">${order.shipping.city}, ${order.shipping.state} ${order.shipping.postcode}</p>
          <p style="margin: 2px 0;">${order.shipping.country}</p>
        </div>
      </div>

      <!-- Order Items -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr>
            <th style="background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Item</th>
            <th style="background-color: #f3f4f6; padding: 12px; text-align: right; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Qty</th>
            <th style="background-color: #f3f4f6; padding: 12px; text-align: right; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Price</th>
            <th style="background-color: #f3f4f6; padding: 12px; text-align: right; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.line_items.map(item => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.price)}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="margin-left: auto; width: 300px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span>Subtotal:</span>
          <span>${formatCurrency(subtotal.toString())}</span>
        </div>
        ${parseFloat(order.shipping_total) > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span>Shipping:</span>
            <span>${formatCurrency(order.shipping_total)}</span>
          </div>
        ` : ''}
        ${parseFloat(order.total_tax) > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span>Tax:</span>
            <span>${formatCurrency(order.total_tax)}</span>
          </div>
        ` : ''}
        ${parseFloat(order.discount_total) > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #059669;">
            <span>Discount:</span>
            <span>-${formatCurrency(order.discount_total)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; padding: 8px 0; font-weight: bold; font-size: 18px; border-top: 2px solid #e5e7eb; margin-top: 10px; padding-top: 10px;">
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

      <!-- Footer -->
      <div style="margin-top: 60px; text-align: center; color: #666; font-size: 14px;">
        <p>Thank you for your business!</p>
        <p>Payment Method: ${order.payment_method_title || 'N/A'}</p>
        ${order.transaction_id ? `<p>Transaction ID: ${order.transaction_id}</p>` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(tempDiv);

  try {
    // Convert HTML to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: tempDiv.scrollWidth,
      windowHeight: tempDiv.scrollHeight
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add image to PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // Get PDF as blob
    const pdfBlob = pdf.output('blob');
    
    return pdfBlob;
  } finally {
    // Cleanup
    document.body.removeChild(tempDiv);
  }
}

export async function downloadInvoicePDF(order: Order, shop?: Shop) {
  try {
    const pdfBlob = await generateInvoicePDF({ order, shop });
    
    // Create download link
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${order.number}.pdf`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export async function printInvoicePDF(order: Order, shop?: Shop) {
  try {
    const pdfBlob = await generateInvoicePDF({ order, shop });
    
    // Create URL for the PDF
    const url = URL.createObjectURL(pdfBlob);
    
    // Open in new window and print
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    // Cleanup after a delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (error) {
    console.error('Error printing PDF:', error);
    throw error;
  }
}