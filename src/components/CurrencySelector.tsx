import React, { useState, useRef, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { CurrencyConfig } from '../utils/currency';
import { Coins, ChevronDown, Check } from 'lucide-react';

interface CurrencySelectorProps {
  compact?: boolean;
}

export default function CurrencySelector({ compact = false }: CurrencySelectorProps) {
  const { currencyCode, currency, setCurrencyCode, currencies } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} id="currency-selector-dropdown">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surf-low hover:bg-surf-container border border-border-subtle rounded-xl text-xs font-bold text-text-primary transition-all active-scale cursor-pointer"
        title="Change Display Currency"
      >
        <span className="font-mono text-brand-secondary font-extrabold">{currency.symbol}</span>
        <span className="font-mono font-bold text-[11px] text-brand-primary">{currency.code}</span>
        <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-border-subtle rounded-2xl shadow-xl py-1.5 z-[150] animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-border-subtle/60 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-wider flex items-center justify-between">
            <span>Select Currency</span>
            <Coins className="w-3.5 h-3.5 text-brand-secondary" />
          </div>
          
          <div className="max-h-60 overflow-y-auto py-1">
            {(Object.values(currencies) as CurrencyConfig[]).map((curr) => {
              const isSelected = curr.code === currencyCode;
              return (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => {
                    setCurrencyCode(curr.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-brand-secondary/10 text-brand-secondary font-bold'
                      : 'hover:bg-surf-low text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 text-center font-mono font-extrabold text-[11px] bg-surf-low rounded px-1 py-0.5 border border-border-subtle/60">
                      {curr.symbol}
                    </span>
                    <div>
                      <span className="font-bold block">{curr.name}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-secondary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
