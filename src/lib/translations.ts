// Order status translations
export const orderStatusTranslations: Record<string, string> = {
  'pending': 'Pending',
  'processing': 'In Bearbeitung',
  'completed': 'Completed', 
  'on-hold': 'In Wartestellung',
  'cancelled': 'Storniert',
  'refunded': 'Erstattet',
  'failed': 'Fehlgeschlagen'
};

// Get translated status
export function getTranslatedStatus(status: string): string {
  return orderStatusTranslations[status] || status;
}