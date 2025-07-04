import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Order, Shop } from '@/types';
import { format } from 'date-fns';
import { getStoreCurrency } from '@/lib/currency';

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
    const currency = getStoreCurrency(shop);
    const locale = currency === 'EUR' ? 'de-DE' : 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(parseFloat(amount));
  };

  const subtotal = order.line_items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
  
  // Calculate total discount including coupon lines
  const discountFromItems = order.line_items.reduce((sum, item) => {
    return sum + (parseFloat(item.subtotal) - parseFloat(item.total));
  }, 0);
  
  const couponDiscount = order.coupon_lines?.reduce((sum, coupon: any) => {
    return sum + Math.abs(parseFloat(coupon.discount || '0'));
  }, 0) || 0;
  
  const totalDiscount = parseFloat(order.discount_total) || (discountFromItems + couponDiscount);

  tempDiv.innerHTML = `
    <div style="color: #333; line-height: 1.6;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 2px solid #e5e7eb;">
        <div style="max-width: 60%;">
          ${shop?.storeInfo?.store_name || shop?.name ? `
            <h1 style="margin: 0 0 20px 0; color: #1e40af; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
              ${shop.storeInfo?.store_name || shop.name}
            </h1>
          ` : ''}
          
          <div style="color: #6b7280; font-size: 14px; line-height: 1.8;">
            ${shop?.storeInfo?.store_address ? `
              <div style="margin-bottom: 8px;">
                <div>${shop.storeInfo.store_address}</div>
                <div>
                  ${shop.storeInfo.store_city ? `${shop.storeInfo.store_city}` : ''}${shop.storeInfo.store_postcode ? `, ${shop.storeInfo.store_postcode}` : ''}
                </div>
                ${shop.storeInfo.store_country ? `<div>${shop.storeInfo.store_country}</div>` : ''}
              </div>
            ` : ''}
            
            <div style="margin-top: 12px;">
              ${shop?.baseUrl ? `
                <div style="margin-bottom: 4px;">
                  <span style="font-weight: 600; color: #374151;">Website:</span> 
                  <span style="color: #1e40af;">${new URL(shop.baseUrl).hostname}</span>
                </div>
              ` : ''}
              
              ${shop?.storeInfo?.store_email || shop ? `
                <div>
                  <span style="font-weight: 600; color: #374151;">Email:</span> 
                  <span style="color: #1e40af;">${shop.storeInfo?.store_email || `support@${new URL(shop.baseUrl).hostname}`}</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          ${!shop || (!shop.name && !shop.storeInfo?.store_name) ? `
            <div style="padding: 16px; background: #f9fafb; border-radius: 8px; margin-bottom: 20px;">
              <p style="color: #6b7280; font-style: italic; margin: 0;">Store information not available</p>
            </div>
          ` : ''}
        </div>
        
        <div style="text-align: right; min-width: 250px;">
          <h2 style="margin: 0 0 24px 0; color: #111827; font-size: 36px; font-weight: 700; letter-spacing: -0.5px;">INVOICE</h2>
          
          <div style="font-size: 14px;">
            <div style="margin-bottom: 16px;">
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Invoice Number</div>
              <div style="font-weight: 700; color: #111827; font-size: 20px;">#${order.number}</div>
            </div>
            
            <div style="margin-bottom: 16px;">
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Date Issued</div>
              <div style="font-weight: 600; color: #374151; font-size: 16px;">${format(new Date(order.date_created), 'MMM dd, yyyy')}</div>
            </div>
            
            <div>
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Status</div>
              <div style="font-size: 16px; font-weight: 700; text-transform: uppercase;
                ${order.status === 'completed' ? 'color: #065f46;' : ''}
                ${order.status === 'processing' ? 'color: #1e3a8a;' : ''}
                ${order.status === 'pending' ? 'color: #92400e;' : ''}
                ${order.status === 'cancelled' ? 'color: #991b1b;' : ''}
                ${order.status === 'refunded' ? 'color: #6b21a8;' : ''}
                ${order.status === 'failed' ? 'color: #991b1b;' : ''}
              ">
                ${order.status}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Addresses -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px;">
        <div style="background: #f9fafb; padding: 24px; border-radius: 8px;">
          <h3 style="margin: 0 0 16px 0; color: #1e40af; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Billing Information</h3>
          <div style="color: #374151; font-size: 14px; line-height: 1.6;">
            <div style="font-weight: 600; color: #111827; font-size: 16px; margin-bottom: 8px;">
              ${order.billing.first_name} ${order.billing.last_name}
            </div>
            ${order.billing.company ? `<div style="margin-bottom: 4px; color: #6b7280;">${order.billing.company}</div>` : ''}
            <div style="margin-bottom: 12px;">
              <div>${order.billing.address_1}</div>
              ${order.billing.address_2 ? `<div>${order.billing.address_2}</div>` : ''}
              <div>${order.billing.city}, ${order.billing.state} ${order.billing.postcode}</div>
              <div>${order.billing.country}</div>
            </div>
            <div style="padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 13px;">
              <div style="margin-bottom: 4px;">
                <span style="color: #6b7280;">Email:</span> 
                <span style="color: #1e40af;">${order.billing.email}</span>
              </div>
              <div>
                <span style="color: #6b7280;">Phone:</span> 
                <span style="color: #374151;">${order.billing.phone}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 24px; border-radius: 8px;">
          <h3 style="margin: 0 0 16px 0; color: #1e40af; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Shipping Information</h3>
          <div style="color: #374151; font-size: 14px; line-height: 1.6;">
            <div style="font-weight: 600; color: #111827; font-size: 16px; margin-bottom: 8px;">
              ${order.shipping.first_name} ${order.shipping.last_name}
            </div>
            ${order.shipping.company ? `<div style="margin-bottom: 4px; color: #6b7280;">${order.shipping.company}</div>` : ''}
            <div>
              <div>${order.shipping.address_1}</div>
              ${order.shipping.address_2 ? `<div>${order.shipping.address_2}</div>` : ''}
              <div>${order.shipping.city}, ${order.shipping.state} ${order.shipping.postcode}</div>
              <div>${order.shipping.country}</div>
            </div>
          </div>
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
        ${totalDiscount > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #059669;">
            <span>Discount${order.coupon_lines?.length > 0 ? ` (${order.coupon_lines.map((c: any) => c.code).join(', ')})` : ''}:</span>
            <span>-${formatCurrency(totalDiscount.toString())}</span>
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
      <div style="margin-top: 80px; padding-top: 40px; border-top: 2px solid #e5e7eb;">
        <div style="background: #f9fafb; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 20px;">
          <h3 style="margin: 0 0 16px 0; color: #1e40af; font-size: 20px; font-weight: 600;">Thank You for Your Business!</h3>
          <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
            We appreciate your trust in us. If you have any questions about this invoice,<br>
            please don't hesitate to contact us.
          </p>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 0;">
          <div style="color: #6b7280; font-size: 13px;">
            <div style="margin-bottom: 8px;">
              <span style="font-weight: 600; color: #374151;">Payment Method:</span> 
              <span style="color: #111827;">${order.payment_method_title || (order.payment_method ? order.payment_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified')}</span>
            </div>
            ${order.transaction_id ? `
              <div>
                <span style="font-weight: 600; color: #374151;">Transaction ID:</span> 
                <span style="color: #111827; font-family: monospace;">${order.transaction_id}</span>
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: right; color: #9ca3af; font-size: 12px;">
            <div>Invoice generated on ${format(new Date(), 'MMM dd, yyyy')}</div>
            ${shop?.name ? `<div style="margin-top: 4px;">© ${new Date().getFullYear()} ${shop.name}</div>` : ''}
          </div>
        </div>
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