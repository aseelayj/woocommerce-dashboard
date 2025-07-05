import { Order, Shop } from '@/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getStoreLogoUrl } from '@/config/store-logos';
import html2pdf from 'html2pdf.js';

// Get company data based on shop
const getCompanyData = (shop: Shop | null) => {
  const domain = shop?.baseUrl ? new URL(shop.baseUrl).hostname : '';
  
  let companyData = {
    name: 'Online Store',
    address: '',
    zipCity: '',
    country: '',
    ceo: '',
    iban: '',
    bic: '',
    ustId: '',
    email: `support@${domain}`,
    website: domain,
  };

  if (shop?.name?.toLowerCase().includes('social') || domain.includes('socialmediadaily')) {
    companyData = {
      name: 'Sentrox GmbH',
      address: 'Werner-Otto-Straße 26',
      zipCity: '22179 Hamburg',
      country: 'Deutschland',
      ceo: 'Mikel-Santino Fandrei',
      iban: 'DE54 2135 2240 0179 2541 15',
      bic: 'NOLADE21HOL',
      ustId: 'DE345839413',
      email: 'support@socialmediadaily.de',
      website: 'socialmediadaily.de',
    };
  } else if (shop?.name?.toLowerCase().includes('follower') || domain.includes('followerfast')) {
    companyData = {
      name: 'FollowerFast GmbH',
      address: 'Hauptstraße 1',
      zipCity: '10115 Berlin',
      country: 'Deutschland',
      ceo: 'Max Mustermann',
      iban: 'DE12 3456 7890 1234 5678 90',
      bic: 'DEUTDEFF',
      ustId: 'DE123456789',
      email: 'support@followerfast.com',
      website: 'followerfast.com',
    };
  }

  return companyData;
};

// Get invoice number
const getInvoiceNumber = (order: Order, shop: Shop | null) => {
  const prefix = shop?.name?.substring(0, 3).toUpperCase() || 'INV';
  return `${prefix}-${order.number}`;
};

// Format currency
const formatCurrency = (amount: string | number, currency: string = 'EUR') => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Generate HTML invoice
export const generateInvoiceHTML = (order: Order, shop: Shop | null) => {
  const company = getCompanyData(shop);
  const invoiceNumber = getInvoiceNumber(order, shop);
  const invoiceDate = new Date();
  const logoUrl = getStoreLogoUrl(shop?.baseUrl || '');
  
  // Calculate totals
  const subtotal = order.line_items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
  const shipping = parseFloat(order.shipping_total || '0');
  const discount = parseFloat(order.discount_total || '0');
  const tax = parseFloat(order.total_tax || '0');
  const total = parseFloat(order.total);
  const isVatFree = order.billing.country !== 'DE' && order.total_tax === '0';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 8pt;
          line-height: 1.2;
          color: #000;
        }
        
        .page {
          padding: 20px;
          background: white;
          position: relative;
          height: 297mm;
          max-height: 297mm;
          overflow: hidden;
        }
        
        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        
        .company-info {
          font-size: 8pt;
          line-height: 1.2;
        }
        
        .logo-container {
          text-align: right;
          width: 150px;
        }
        
        .logo {
          max-width: 150px;
          max-height: 50px;
          object-fit: contain;
        }
        
        .logo-text {
          font-size: 14pt;
          font-weight: bold;
          color: ${shop?.name?.toLowerCase().includes('follower') ? '#ff6900' : '#1a73e8'};
          letter-spacing: -0.5px;
        }
        
        /* Divider */
        .divider {
          height: 1px;
          background-color: #e0e0e0;
          margin: 10px 0;
        }
        
        /* Sections */
        .section {
          margin-bottom: 12px;
        }
        
        .section-title {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .info-row {
          display: flex;
          margin-bottom: 2px;
        }
        
        .info-label {
          width: 100px;
          font-size: 7pt;
        }
        
        .info-value {
          flex: 1;
          font-size: 7pt;
        }
        
        .address-text {
          font-size: 8pt;
          margin-bottom: 1px;
        }
        
        /* Table */
        .table {
          width: 100%;
          margin: 15px 0;
        }
        
        .table-header {
          display: flex;
          border-bottom: 1.5px solid #000;
          padding-bottom: 3px;
          margin-bottom: 3px;
          font-weight: bold;
          font-size: 7pt;
        }
        
        .table-row {
          display: flex;
          padding: 3px 0;
          border-bottom: 0.5px solid #f0f0f0;
          font-size: 7pt;
        }
        
        .col-1 { width: 10%; }
        .col-2 { width: 50%; }
        .col-3 { width: 15%; text-align: right; }
        .col-4 { width: 25%; text-align: right; }
        
        /* Totals */
        .totals {
          margin-top: 10px;
          padding-top: 5px;
        }
        
        .total-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 3px;
          font-size: 7pt;
        }
        
        .total-label {
          width: 100px;
          text-align: right;
          margin-right: 15px;
        }
        
        .total-value {
          width: 70px;
          text-align: right;
        }
        
        .grand-total {
          border-top: 1.5px solid #000;
          padding-top: 5px;
          margin-top: 5px;
          font-size: 9pt;
          font-weight: bold;
        }
        
        /* Footer */
        .vat-note {
          margin-top: 15px;
          font-size: 7pt;
          color: #666;
        }
        
        .payment-info {
          margin-top: 10px;
          font-size: 7pt;
        }
        
        .page-footer {
          position: absolute;
          bottom: 15px;
          left: 20px;
          right: 20px;
          font-size: 6pt;
          color: #666;
          text-align: center;
        }
        
        .meta-data {
          font-size: 6pt;
          color: #666;
          margin-top: 1px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="company-info">
            <div>${company.name}</div>
            <div>${company.address}</div>
            <div>${company.zipCity}</div>
          </div>
          <div class="logo-container">
            ${logoUrl ? 
              `<img src="${logoUrl.startsWith('/') ? window.location.origin + logoUrl : logoUrl}" alt="${shop?.name}" class="logo" />` :
              `<div class="logo-text">${shop?.name?.toUpperCase() || 'ONLINE STORE'}</div>`
            }
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- Billing Address -->
        <div class="section">
          <div class="address-text">${order.billing.company || `${order.billing.first_name} ${order.billing.last_name}`}</div>
          <div class="address-text">${order.billing.address_1}</div>
          ${order.billing.address_2 ? `<div class="address-text">${order.billing.address_2}</div>` : ''}
          <div class="address-text">${order.billing.postcode} ${order.billing.city}</div>
          <div class="address-text">${order.billing.country}</div>
        </div>
        
        <!-- Company Details -->
        <div class="section">
          <div class="section-title">${company.name}</div>
          <div class="info-row">
            <div class="info-label">Geschäftsführung:</div>
            <div class="info-value">${company.ceo}</div>
          </div>
          <div class="info-row">
            <div class="info-label">IBAN:</div>
            <div class="info-value">${company.iban}</div>
          </div>
          <div class="info-row">
            <div class="info-label">BIC:</div>
            <div class="info-value">${company.bic}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Rechnungsdatum:</div>
            <div class="info-value">${format(invoiceDate, 'dd.MM.yyyy', { locale: de })}</div>
          </div>
          <div class="info-row">
            <div class="info-label">USt-IdNr:</div>
            <div class="info-value">${company.ustId}</div>
          </div>
        </div>
        
        <!-- Invoice Title -->
        <div class="section">
          <div class="section-title">${shop?.name || 'Online Store'}</div>
          <div>Rechnungsnummer: ${invoiceNumber}</div>
          <div>${format(invoiceDate, 'dd. MMMM yyyy', { locale: de })}</div>
        </div>
        
        <!-- Items Table -->
        <div class="table">
          <div class="table-header">
            <div class="col-1">Art.-Nr.</div>
            <div class="col-2">Produkt</div>
            <div class="col-3">Anzahl</div>
            <div class="col-4">Preis</div>
          </div>
          
          ${order.line_items.map(item => `
            <div class="table-row">
              <div class="col-1">${item.sku || '-'}</div>
              <div class="col-2">
                <div>${item.name}</div>
                ${item.meta_data && item.meta_data.length > 0 ? `
                  <div class="meta-data">
                    ${item.meta_data
                      .filter(meta => !meta.key.startsWith('_'))
                      .map(meta => `${meta.display_key || meta.key}: ${meta.display_value || meta.value}`)
                      .join(', ')}
                  </div>
                ` : ''}
              </div>
              <div class="col-3">${item.quantity}</div>
              <div class="col-4">${formatCurrency(item.subtotal, order.currency)}</div>
            </div>
          `).join('')}
        </div>
        
        <!-- Totals -->
        <div class="totals">
          <div class="total-row">
            <div class="total-label">Zwischensumme:</div>
            <div class="total-value">${formatCurrency(subtotal, order.currency)}</div>
          </div>
          
          ${discount > 0 ? `
            <div class="total-row">
              <div class="total-label">Rabatt:</div>
              <div class="total-value">-${formatCurrency(discount, order.currency)}</div>
            </div>
          ` : ''}
          
          ${shipping > 0 ? `
            <div class="total-row">
              <div class="total-label">Versand:</div>
              <div class="total-value">${formatCurrency(shipping, order.currency)}</div>
            </div>
          ` : ''}
          
          ${tax > 0 ? `
            <div class="total-row">
              <div class="total-label">MwSt. (19%):</div>
              <div class="total-value">${formatCurrency(tax, order.currency)}</div>
            </div>
          ` : ''}
          
          <div class="total-row grand-total">
            <div class="total-label">Gesamt:</div>
            <div class="total-value">${formatCurrency(total, order.currency)}</div>
          </div>
        </div>
        
        <!-- VAT Note -->
        <div class="vat-note">
          ${isVatFree ? 
            'Umsatzsteuerfreie Ausfuhrlieferung' : 
            'Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer.'
          }
        </div>
        
        <!-- Payment Info -->
        <div class="payment-info">
          <div>Zahlungsart: ${order.payment_method_title}</div>
          ${order.status === 'completed' ? `
            <div style="margin-top: 5px;">
              Bezahlt am: ${format(new Date(order.date_paid || order.date_created), 'dd.MM.yyyy', { locale: de })}
            </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div class="page-footer">
          <div>${company.name} • ${company.address} • ${company.zipCity}</div>
          <div>${company.website} • ${company.email}</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Export function to download PDF
export const downloadInvoicePDF = async (order: Order, shop: Shop | null) => {
  const invoiceNumber = getInvoiceNumber(order, shop);
  const fileName = `Rechnung-${invoiceNumber}.pdf`;
  
  // Create a temporary div to render the HTML
  const element = document.createElement('div');
  element.innerHTML = generateInvoiceHTML(order, shop);
  document.body.appendChild(element);
  
  // Configure PDF options
  const options = {
    margin: 0,
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait' 
    }
  };
  
  // Generate and download the PDF
  await html2pdf().set(options).from(element).save();
  
  // Clean up
  document.body.removeChild(element);
};

// Export function to print PDF
export const printInvoicePDF = async (order: Order, shop: Shop | null) => {
  const element = document.createElement('div');
  element.innerHTML = generateInvoiceHTML(order, shop);
  document.body.appendChild(element);
  
  const options = {
    margin: 0,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait' 
    }
  };
  
  const pdf = await html2pdf().set(options).from(element).outputPdf('blob');
  const url = URL.createObjectURL(pdf);
  
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
  
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  document.body.removeChild(element);
};