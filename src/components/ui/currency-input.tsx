"use client";

import * as React from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<InputProps, 'onChange' | 'value'> {
  value: number | string | undefined;
  onValueChange: (value: number | undefined) => void;
  locale?: string;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, locale = "id-ID", className, ...props }, ref) => {
    
    const [internalDisplay, setInternalDisplay] = React.useState("");

    const getNumericValue = (val: string): number | undefined => {
        const num = Number(val.replace(/[^0-9]/g, ""));
        return isNaN(num) ? undefined : num;
    };
    
    const formatValue = React.useCallback((val: number | undefined) => {
        if (val === undefined || val === 0) return "";
        return new Intl.NumberFormat(locale).format(val);
    }, [locale]);

    // This effect updates the display value when the external `value` prop changes.
    React.useEffect(() => {
        const numericValue = typeof value === 'string' ? getNumericValue(value) : value;
        setInternalDisplay(formatValue(numericValue));
    }, [value, formatValue]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputVal = e.target.value;
      const numericVal = getNumericValue(inputVal);
      setInternalDisplay(inputVal); // Allow user to type freely
      onValueChange(numericVal);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const inputVal = e.target.value;
        const numericVal = getNumericValue(inputVal);
        setInternalDisplay(formatValue(numericVal));
        props.onBlur?.(e);
    }

    return (
      <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              Rp
          </span>
          <Input
              {...props}
              ref={ref}
              value={internalDisplay}
              onChange={handleChange}
              onBlur={handleBlur}
              className={cn("pl-9 text-right", className)}
              placeholder="0"
          />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
