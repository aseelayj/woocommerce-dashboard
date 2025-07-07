import { Order, Shop } from '@/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getStoreLogoUrl } from '@/config/store-logos';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

// Format currency
const formatCurrency = (amount: string | number) => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('de-DE', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value).replace('.', ',') + ' €';
};

// Generate HTML invoice
export const generateInvoiceHTML = (order: Order, shop: Shop | null) => {
  const company = getCompanyData(shop);
  const invoiceNumber = order.number;
  const invoiceDate = new Date();
  const logoUrl = getStoreLogoUrl(shop?.baseUrl || '');
  
  // Calculate totals
  const shipping = parseFloat(order.shipping_total || '0');
  const tax = parseFloat(order.total_tax || '0');
  const total = parseFloat(order.total);
  const netTotal = total - tax;
  const taxRate = netTotal > 0 ? Math.round((tax / netTotal) * 100) : 19;

  // Limit items
  const itemsToShow = order.line_items.slice(0, 8);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Ropa+Sans&display=swap');
        body { margin: 0; padding: 0; font-family: 'Ropa Sans', Arial, sans-serif; }
        .invoice { width: 794px; background: white; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #52809c; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { color: #52809c; font-size: 40px; margin: 0; }
        .logo { max-width: 150px; max-height: 50px; }
        .row { display: flex; gap: 40px; margin-bottom: 20px; }
        .col { flex: 1; }
        h3 { color: #52809c; font-size: 14px; margin-bottom: 8px; }
        p { margin: 2px 0; font-size: 11px; color: #636060; }
        .invoice-info { background: #f5f5f5; padding: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #52809c; color: white; padding: 10px; text-align: left; font-size: 13px; }
        td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .summary { display: flex; justify-content: flex-end; margin-bottom: 20px; }
        .summary-table { width: 250px; }
        .summary-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
        .summary-total { border-top: 2px solid #52809c; padding-top: 8px; font-weight: bold; font-size: 14px; }
        .footer { border-top: 1px solid #e0e0e0; padding-top: 20px; font-size: 10px; color: #666; }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <h1>Rechnung</h1>
          ${logoUrl ? 
            `<img src="${logoUrl}" alt="${shop?.name}" class="logo" />` :
            `<div style="font-size: 24px; font-weight: bold; color: #52809c;">${shop?.name || 'STORE'}</div>`
          }
        </div>
        
        <div class="row">
          <div class="col">
            <h3>${company.name}</h3>
            <p>${company.address}</p>
            <p>${company.zipCity}</p>
            <p>USt-IdNr: ${company.ustId}</p>
            <p>Geschäftsführung: ${company.ceo}</p>
          </div>
          <div class="col">
            <h3>Rechnungsempfänger</h3>
            <p><strong>${order.billing.company || `${order.billing.first_name} ${order.billing.last_name}`}</strong></p>
            <p>${order.billing.address_1}</p>
            <p>${order.billing.postcode} ${order.billing.city}</p>
            <p>${order.billing.country}</p>
          </div>
        </div>
        
        <div class="invoice-info">
          <span><strong>Rechnungsnummer:</strong> ${invoiceNumber}</span>
          <span><strong>Datum:</strong> ${format(invoiceDate, 'dd.MM.yyyy', { locale: de })}</span>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Produkt</th>
              <th class="text-center" style="width: 80px;">Anzahl</th>
              <th class="text-right" style="width: 100px;">Preis</th>
            </tr>
          </thead>
          <tbody>
            ${itemsToShow.map(item => `
              <tr>
                <td>
                  <strong>${item.name}</strong>
                  ${item.meta_data && item.meta_data.length > 0 ? 
                    `<br><span style="font-size: 9px; color: #666;">
                      ${item.meta_data
                        .filter(meta => !meta.key.startsWith('_'))
                        .slice(0, 1)
                        .map(meta => `${meta.display_key || meta.key}: ${meta.display_value || meta.value}`)
                        .join('; ')}
                    </span>` : ''
                  }
                </td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
            ${order.line_items.length > 8 ? `
              <tr>
                <td colspan="3" style="text-align: center; font-style: italic; color: #666;">
                  ... weitere ${order.line_items.length - 8} Artikel
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
        
        <div class="summary">
          <div class="summary-table">
            <div class="summary-row">
              <span>Nettobetrag:</span>
              <span>${formatCurrency(netTotal)}</span>
            </div>
            ${shipping > 0 ? `
              <div class="summary-row">
                <span>Versand:</span>
                <span>${formatCurrency(shipping)}</span>
              </div>
            ` : ''}
            ${tax > 0 ? `
              <div class="summary-row">
                <span>MwSt. (${taxRate}%):</span>
                <span>${formatCurrency(tax)}</span>
              </div>
            ` : ''}
            <div class="summary-row summary-total">
              <span>Gesamtbetrag:</span>
              <span>${formatCurrency(total)}</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div>
              <p><strong>Zahlungsart:</strong> ${order.payment_method_title}</p>
              <p>Rechnungsdatum entspricht dem Leistungsdatum</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Bankverbindung:</strong></p>
              <p>IBAN: ${company.iban}</p>
              <p>BIC: ${company.bic}</p>
            </div>
          </div>
          <div style="text-align: center; color: #999;">
            ${company.name} • ${company.address} • ${company.zipCity} • ${company.website}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// WORKING PDF DOWNLOAD - NO BLANK PAGES
export const downloadInvoicePDF = async (order: Order, shop: Shop | null) => {
  const invoiceNumber = order.number;
  const fileName = `Rechnung-${invoiceNumber}.pdf`;
  
  // Create element
  const element = document.createElement('div');
  element.innerHTML = generateInvoiceHTML(order, shop);
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.top = '0';
  document.body.appendChild(element);
  
  try {
    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get the invoice element
    const invoice = element.querySelector('.invoice') as HTMLElement;
    if (!invoice) throw new Error('Invoice element not found');
    
    // Create canvas from the invoice
    const canvas = await html2canvas(invoice, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    // Create PDF with exact dimensions
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add image to PDF
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    
    // Save PDF
    pdf.save(fileName);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    // Clean up
    document.body.removeChild(element);
  }
};

// Print function
export const printInvoicePDF = async (order: Order, shop: Shop | null) => {
  const element = document.createElement('div');
  element.innerHTML = generateInvoiceHTML(order, shop);
  document.body.appendChild(element);
  
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const invoice = element.querySelector('.invoice') as HTMLElement;
    if (!invoice) throw new Error('Invoice element not found');
    
    const canvas = await html2canvas(invoice, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    
    // Create blob and print
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    
  } finally {
    document.body.removeChild(element);
  }
};