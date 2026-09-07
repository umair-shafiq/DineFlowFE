// Multi-Currency Engine & Formatter

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  position: 'prefix' | 'suffix';
  decimals: number;
  rateAgainstUSD: number; // For optional conversion
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  PKR: {
    code: 'PKR',
    symbol: 'Rs.',
    name: 'Pakistani Rupee (PKR)',
    position: 'prefix',
    decimals: 2,
    rateAgainstUSD: 278.50
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar (USD)',
    position: 'prefix',
    decimals: 2,
    rateAgainstUSD: 1.00
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro (EUR)',
    position: 'prefix',
    decimals: 2,
    rateAgainstUSD: 0.92
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound (GBP)',
    position: 'prefix',
    decimals: 2,
    rateAgainstUSD: 0.79
  },
  SAR: {
    code: 'SAR',
    symbol: 'SAR',
    name: 'Saudi Riyal (SAR)',
    position: 'prefix',
    decimals: 2,
    rateAgainstUSD: 3.75
  },
  AED: {
    code: 'AED',
    symbol: 'AED',
    name: 'UAE Dirham (AED)',
    position: 'prefix',
    decimals: 2,
    rateAgainstUSD: 3.67
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee (INR)',
    position: 'prefix',
    decimals: 2,
    rateAgainstUSD: 83.90
  }
};

const STORAGE_KEY = 'chef_active_currency_code';

export function getActiveCurrencyCode(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_CURRENCIES[saved]) {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'PKR'; // Default to PKR as requested, or USD
}

export function setActiveCurrencyCode(code: string): void {
  try {
    if (SUPPORTED_CURRENCIES[code]) {
      localStorage.setItem(STORAGE_KEY, code);
      window.dispatchEvent(new CustomEvent('currency_changed', { detail: code }));
    }
  } catch {
    // ignore
  }
}

export function formatPrice(amount: number | undefined | null, currencyCode?: string): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const activeCode = currencyCode || getActiveCurrencyCode();
  const config = SUPPORTED_CURRENCIES[activeCode] || SUPPORTED_CURRENCIES.PKR;

  const formattedNum = num.toLocaleString('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals
  });

  if (config.position === 'suffix') {
    return `${formattedNum} ${config.symbol}`;
  }
  return `${config.symbol} ${formattedNum}`;
}

export function getCurrencySymbol(currencyCode?: string): string {
  const activeCode = currencyCode || getActiveCurrencyCode();
  return SUPPORTED_CURRENCIES[activeCode]?.symbol || 'Rs.';
}
