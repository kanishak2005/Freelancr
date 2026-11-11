import React, { useState, useRef, useEffect, useId } from "react";
import clsx from "clsx";

export interface AutocompleteProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: readonly string[] | string[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  helperText?: string;
  error?: string;
  allowCustom?: boolean;
  maxSuggestions?: number;
  onBlur?: () => void;
}

export function Autocomplete({
  id: explicitId,
  label,
  value,
  onChange,
  options,
  placeholder = "Start typing...",
  disabled = false,
  required = false,
  className,
  inputClassName,
  helperText,
  error,
  allowCustom = true,
  maxSuggestions = 8,
  onBlur,
}: AutocompleteProps) {
  const generatedId = useId();
  const inputId = explicitId || generatedId;
  const listboxId = `${inputId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on value
  const query = value.trim().toLowerCase();
  const filteredOptions = React.useMemo(() => {
    if (!query) {
      return options.slice(0, maxSuggestions);
    }
    return options
      .filter((opt) => opt.toLowerCase().includes(query))
      .slice(0, maxSuggestions);
  }, [options, query, maxSuggestions]);

  // Handle outside click to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
        if (onBlur) onBlur();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onBlur]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filteredOptions.length - 1);
      } else {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
    } else if (e.key === "Enter") {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
  };

  return (
    <div ref={containerRef} className={clsx("relative w-full", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && highlightedIndex >= 0
              ? `${inputId}-opt-${highlightedIndex}`
              : undefined
          }
          className={clsx(
            "w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
              : "border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100",
            disabled && "bg-slate-100 text-slate-400 cursor-not-allowed",
            inputClassName
          )}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
              setHighlightedIndex(-1);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
            aria-label="Clear input"
          >
            ✕
          </button>
        )}
      </div>

      {helperText && !error && (
        <p className="mt-1 text-[11px] text-slate-400">{helperText}</p>
      )}
      {error && (
        <p className="mt-1 text-[11px] text-red-600 font-medium">{error}</p>
      )}

      {/* Suggestion Dropdown */}
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl py-1 text-sm text-slate-800 focus:outline-none"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isSelected = opt.toLowerCase() === value.trim().toLowerCase();
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={opt}
                  id={`${inputId}-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={clsx(
                    "flex items-center justify-between px-3.5 py-2 cursor-pointer transition-colors text-xs font-medium",
                    isHighlighted
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-700 hover:bg-slate-50",
                    isSelected && "font-bold text-indigo-600"
                  )}
                >
                  <span>{opt}</span>
                  {isSelected && <span className="text-indigo-600 font-bold">✓</span>}
                </li>
              );
            })
          ) : (
            <li className="px-3.5 py-2.5 text-xs text-slate-400 italic">
              {allowCustom && value.trim()
                ? `Press Enter to use "${value.trim()}"`
                : "No matching suggestions"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

