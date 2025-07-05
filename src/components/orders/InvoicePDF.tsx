import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { Order, Shop } from '@/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Create styles
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    alignItems: 'flex-start',
  },
  companyInfo: {
    fontSize: 8,
    lineHeight: 1.3,
  },
  logoContainer: {
    width: 180,
  },
  logo: {
    width: 180,
    height: 60,
    objectFit: 'contain',
  },
  logoText: {
    fontSize: 18,
    color: '#999999',
    letterSpacing: -0.5,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: 10,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    fontSize: 8,
    width: 120,
  },
  infoValue: {
    fontSize: 8,
    flex: 1,
  },
  addressText: {
    fontSize: 9,
    marginBottom: 2,
  },
  table: {
    marginTop: 30,
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCol1: {
    width: '10%',
    fontSize: 8,
  },
  tableCol2: {
    width: '50%',
    fontSize: 8,
  },
  tableCol3: {
    width: '15%',
    fontSize: 8,
    textAlign: 'right',
  },
  tableCol4: {
    width: '25%',
    fontSize: 8,
    textAlign: 'right',
  },
  totalSection: {
    marginTop: 20,
    paddingTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 8,
    width: 120,
    textAlign: 'right',
    marginRight: 20,
  },
  totalValue: {
    fontSize: 8,
    width: 80,
    textAlign: 'right',
  },
  grandTotal: {
    borderTopWidth: 2,
    borderTopColor: '#000',
    paddingTop: 10,
    marginTop: 10,
  },
  vatNote: {
    fontSize: 8,
    marginTop: 30,
    color: '#666',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 7,
    color: '#666',
    textAlign: 'center',
  }
});

// Company data based on shop
const getCompanyData = (shop: Shop | null) => {
  const domain = shop?.baseUrl ? new URL(shop.baseUrl).hostname : '';
  
  // Default company data
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

  // Customize based on shop
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

// Invoice Document Component
const InvoiceDocument = ({ order, shop }: { order: Order; shop: Shop | null }) => {
  const company = getCompanyData(shop);
  const invoiceNumber = getInvoiceNumber(order, shop);
  const invoiceDate = new Date();
  
  // Calculate totals
  const subtotal = order.line_items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
  const shipping = parseFloat(order.shipping_total || '0');
  const discount = parseFloat(order.discount_total || '0');
  const tax = parseFloat(order.total_tax || '0');
  const total = parseFloat(order.total);

  // Determine VAT status
  const isVatFree = order.billing.country !== 'DE' && order.total_tax === '0';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text>{company.name}</Text>
            <Text>{company.address}</Text>
            <Text>{company.zipCity}</Text>
          </View>
          <View style={styles.logoContainer}>
            {/* Always use text logo for reliability */}
            <Text style={[styles.logoText, { color: shop?.name?.toLowerCase().includes('follower') ? '#ff6900' : '#1a73e8' }]}>
              {shop?.name?.toUpperCase() || 'ONLINE STORE'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Billing Address */}
        <View style={styles.infoSection}>
          <Text style={styles.addressText}>{order.billing.company || `${order.billing.first_name} ${order.billing.last_name}`}</Text>
          <Text style={styles.addressText}>{order.billing.address_1}</Text>
          {order.billing.address_2 && <Text style={styles.addressText}>{order.billing.address_2}</Text>}
          <Text style={styles.addressText}>{`${order.billing.postcode} ${order.billing.city}`}</Text>
          <Text style={styles.addressText}>{order.billing.country}</Text>
        </View>

        {/* Company Details */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>{company.name}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Geschäftsführung:</Text>
            <Text style={styles.infoValue}>{company.ceo}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>IBAN:</Text>
            <Text style={styles.infoValue}>{company.iban}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BIC:</Text>
            <Text style={styles.infoValue}>{company.bic}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rechnungsdatum:</Text>
            <Text style={styles.infoValue}>{format(invoiceDate, 'dd.MM.yyyy', { locale: de })}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>USt-IdNr:</Text>
            <Text style={styles.infoValue}>{company.ustId}</Text>
          </View>
        </View>

        {/* Invoice Title */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>{shop?.name || 'Online Store'}</Text>
          <Text style={{ fontSize: 8 }}>Rechnungsnummer: {invoiceNumber}</Text>
          <Text style={{ fontSize: 8 }}>{format(invoiceDate, 'dd. MMMM yyyy', { locale: de })}</Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCol1}>Art.-Nr.</Text>
            <Text style={styles.tableCol2}>Produkt</Text>
            <Text style={styles.tableCol3}>Anzahl</Text>
            <Text style={styles.tableCol4}>Preis</Text>
          </View>

          {order.line_items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCol1}>{item.sku || '-'}</Text>
              <View style={styles.tableCol2}>
                <Text>{item.name}</Text>
                {item.meta_data && item.meta_data.length > 0 && (
                  <Text style={{ fontSize: 7, color: '#666' }}>
                    {item.meta_data
                      .filter(meta => !meta.key.startsWith('_'))
                      .map(meta => `${meta.display_key || meta.key}: ${meta.display_value || meta.value}`)
                      .join(', ')}
                  </Text>
                )}
              </View>
              <Text style={styles.tableCol3}>{item.quantity}</Text>
              <Text style={styles.tableCol4}>{formatCurrency(item.subtotal, order.currency)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Zwischensumme:</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal, order.currency)}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Rabatt:</Text>
              <Text style={styles.totalValue}>-{formatCurrency(discount, order.currency)}</Text>
            </View>
          )}

          {shipping > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Versand:</Text>
              <Text style={styles.totalValue}>{formatCurrency(shipping, order.currency)}</Text>
            </View>
          )}

          {tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>MwSt. (19%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(tax, order.currency)}</Text>
            </View>
          )}

          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={[styles.totalLabel, { fontSize: 10 }]}>Gesamt:</Text>
            <Text style={[styles.totalValue, { fontSize: 10 }]}>{formatCurrency(total, order.currency)}</Text>
          </View>
        </View>

        {/* VAT Note */}
        <Text style={styles.vatNote}>
          {isVatFree 
            ? 'Umsatzsteuerfreie Ausfuhrlieferung'
            : 'Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer.'
          }
        </Text>

        {/* Payment Info */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 8 }}>
            Zahlungsart: {order.payment_method_title}
          </Text>
          {order.status === 'completed' && (
            <Text style={{ fontSize: 8, marginTop: 5 }}>
              Bezahlt am: {format(new Date(order.date_paid || order.date_created), 'dd.MM.yyyy', { locale: de })}
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{company.name} • {company.address} • {company.zipCity}</Text>
          <Text>{company.website} • {company.email}</Text>
        </View>
      </Page>
    </Document>
  );
};

// Export function to download PDF
export const downloadInvoicePDF = async (order: Order, shop: Shop | null) => {
  const invoiceNumber = getInvoiceNumber(order, shop);
  const fileName = `Rechnung-${invoiceNumber}.pdf`;
  
  const blob = await pdf(<InvoiceDocument order={order} shop={shop} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

// Export function to print PDF
export const printInvoicePDF = async (order: Order, shop: Shop | null) => {
  const blob = await pdf(<InvoiceDocument order={order} shop={shop} />).toBlob();
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
  
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// Component for rendering PDF download link
export const InvoicePDFLink = ({ order, shop }: { order: Order; shop: Shop | null }) => {
  const invoiceNumber = getInvoiceNumber(order, shop);
  const fileName = `Rechnung-${invoiceNumber}.pdf`;
  
  return (
    <PDFDownloadLink
      document={<InvoiceDocument order={order} shop={shop} />}
      fileName={fileName}
    >
      {({ loading }) =>
        loading ? 'Generiere PDF...' : 'PDF herunterladen'
      }
    </PDFDownloadLink>
  );
};