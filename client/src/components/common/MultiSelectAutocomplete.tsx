import React, { useState, useRef, useEffect, useId } from "react";
import clsx from "clsx";

export interface MultiSelectAutocompleteProps {
  id?: string;
  label?: string;
  selectedItems: string[];
  onChange: (items: string[]) => void;
  options: readonly string[] | string[];
  placeholder?: string;
  maxItems?: number;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
  error?: string;
  allowCustom?: boolean;
  maxSuggestions?: number;
  className?: string;
}

export function MultiSelectAutocomplete({
  id: explicitId,
  label,
  selectedItems,
  onChange,
  options,
  placeholder = "Search and add...",
  maxItems = 50,
  disabled = false,
  required = false,
  helperText,
  error,
  allowCustom = true,
  maxSuggestions = 8,
  className,
}: MultiSelectAutocompleteProps) {
  const generatedId = useId();
  const inputId = explicitId || generatedId;
  const listboxId = `${inputId}-listbox`;

  const [inputVal, setInputVal] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [localError, setLocalError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suggestions excluding already selected items
  const query = inputVal.trim().toLowerCase();
  const availableOptions = React.useMemo(() => {
    const selectedLower = new Set(selectedItems.map((s) => s.toLowerCase()));
    return options.filter((opt) => !selectedLower.has(opt.toLowerCase()));
  }, [options, selectedItems]);

  const filteredOptions = React.useMemo(() => {
    if (!query) {
      return availableOptions.slice(0, maxSuggestions);
    }
    return availableOptions
      .filter((opt) => opt.toLowerCase().includes(query))
      .slice(0, maxSuggestions);
  }, [availableOptions, query, maxSuggestions]);

  // Click outside closes dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleAddItem = (item: string) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    setLocalError("");

    if (selectedItems.length >= maxItems) {
      setLocalError(`Maximum of ${maxItems} items reached.`);
      return;
    }

    const alreadyExists = selectedItems.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyExists) {
      setLocalError(`"${trimmed}" is already added.`);
      return;
    }

    onChange([...selectedItems, trimmed]);
    setInputVal("");
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemoveItem = (itemToRemove: string) => {
    onChange(selectedItems.filter((i) => i.toLowerCase() !== itemToRemove.toLowerCase()));
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
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleAddItem(filteredOptions[highlightedIndex]);
      } else if (allowCustom && inputVal.trim()) {
        handleAddItem(inputVal.trim());
      }
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    } else if (e.key === "Backspace" && !inputVal && selectedItems.length > 0) {
      // Remove last tag when backspace on empty input
      handleRemoveItem(selectedItems[selectedItems.length - 1]);
    }
  };

  const displayError = localError || error;

  return (
    <div ref={containerRef} className={clsx("relative w-full", className)}>
      {label && (
        <div className="flex justify-between items-center mb-1.5">
          <label
            htmlFor={inputId}
            className="block text-xs font-bold uppercase tracking-wider text-slate-700"
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <span className="text-[11px] text-slate-400">
            {selectedItems.length} / {maxItems}
          </span>
        </div>
      )}

      {/* Input container with chips */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={clsx(
          "min-h-[46px] w-full rounded-xl border bg-white p-2 flex flex-wrap items-center gap-1.5 transition cursor-text",
          displayError
            ? "border-red-300 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100"
            : "border-slate-300 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100",
          disabled && "bg-slate-100 cursor-not-allowed"
        )}
      >
        {selectedItems.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 animate-fadeIn"
          >
            <span>{item}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveItem(item);
                }}
                className="text-indigo-400 hover:text-indigo-900 rounded focus:outline-none"
                aria-label={`Remove ${item}`}
              >
                ✕
              </button>
            )}
          </span>
        ))}

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            setLocalError("");
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedItems.length === 0 ? placeholder : "Add another..."}
          disabled={disabled || selectedItems.length >= maxItems}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && highlightedIndex >= 0
              ? `${inputId}-opt-${highlightedIndex}`
              : undefined
          }
          className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none px-2 py-1"
        />
      </div>

      {helperText && !displayError && (
        <p className="mt-1 text-[11px] text-slate-400">{helperText}</p>
      )}
      {displayError && (
        <p className="mt-1 text-[11px] text-red-600 font-medium">{displayError}</p>
      )}

      {/* Suggestion Dropdown */}
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl py-1 text-sm text-slate-800 focus:outline-none"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={opt}
                  id={`${inputId}-opt-${idx}`}
                  role="option"
                  onClick={() => handleAddItem(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={clsx(
                    "flex items-center justify-between px-3.5 py-2 cursor-pointer transition-colors text-xs font-medium",
                    isHighlighted
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span>{opt}</span>
                  <span className="text-[10px] text-indigo-500 font-semibold">+ Add</span>
                </li>
              );
            })
          ) : (
            <li className="px-3.5 py-2.5 text-xs text-slate-500">
              {allowCustom && inputVal.trim() ? (
                <button
                  type="button"
                  onClick={() => handleAddItem(inputVal.trim())}
                  className="w-full text-left text-indigo-600 font-semibold hover:underline"
                >
                  + Add custom: <span className="text-slate-800 font-bold">"{inputVal.trim()}"</span>
                </button>
              ) : (
                <span className="italic text-slate-400">No suggestions match "{inputVal}"</span>
              )}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

