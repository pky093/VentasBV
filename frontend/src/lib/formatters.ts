export type CurrencyCode = 'PEN' | 'USD' | 'EUR';

const CURRENCY_SYMBOLS: Record<CurrencyCode, { symbol: string; locale: string }> = {
  PEN: { symbol: 'S/', locale: 'es-PE' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'es-ES' },
};

export const formatCurrency = (amount: number, currency: CurrencyCode = 'PEN'): string => {
  const config = CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS.PEN;
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${config.symbol} ${amount.toFixed(2)}`;
  }
};

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};