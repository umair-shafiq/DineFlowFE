import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  SUPPORTED_CURRENCIES, 
  CurrencyConfig, 
  getActiveCurrencyCode, 
  setActiveCurrencyCode, 
  formatPrice as formatPriceUtil,
  getCurrencySymbol as getCurrencySymbolUtil
} from '../utils/currency';

interface CurrencyContextType {
  currencyCode: string;
  currency: CurrencyConfig;
  setCurrencyCode: (code: string) => void;
  formatPrice: (amount: number | undefined | null) => string;
  symbol: string;
  currencies: Record<string, CurrencyConfig>;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currencyCode: 'PKR',
  currency: SUPPORTED_CURRENCIES.PKR,
  setCurrencyCode: () => {},
  formatPrice: (amt) => formatPriceUtil(amt, 'PKR'),
  symbol: 'Rs.',
  currencies: SUPPORTED_CURRENCIES
});

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currencyCode, setCodeState] = useState<string>(getActiveCurrencyCode);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'chef_active_currency_code' && e.newValue) {
        setCodeState(e.newValue);
      }
    };
    const handleCustom = (e: any) => {
      if (e.detail) {
        setCodeState(e.detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('currency_changed', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('currency_changed', handleCustom);
    };
  }, []);

  const handleSetCurrency = (code: string) => {
    if (SUPPORTED_CURRENCIES[code]) {
      setActiveCurrencyCode(code);
      setCodeState(code);
    }
  };

  const currency = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.PKR;

  const formatPrice = (amount: number | undefined | null) => {
    return formatPriceUtil(amount, currencyCode);
  };

  const symbol = getCurrencySymbolUtil(currencyCode);

  return (
    <CurrencyContext.Provider
      value={{
        currencyCode,
        currency,
        setCurrencyCode: handleSetCurrency,
        formatPrice,
        symbol,
        currencies: SUPPORTED_CURRENCIES
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export function useCurrency() {
  return useContext(CurrencyContext);
}
