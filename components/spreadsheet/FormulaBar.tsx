"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useSpreadsheetStore } from "@/lib/store";
import { pointToCellRef } from "@/types/spreadsheet";
import { isFormula, isLLMFormula, isMathFormula } from "@/lib/formulas";

export function FormulaBar() {
  const { activeCell, data, setCellValue } = useSpreadsheetStore();
  const [inputValue, setInputValue] = useState("");

  // Get the actual stored value (formula or plain value)
  const storedValue = activeCell
    ? data[activeCell.row]?.[activeCell.column]?.value || ""
    : "";

  // Update input when active cell changes - show the formula, not the computed value
  useEffect(() => {
    setInputValue(storedValue);
  }, [storedValue, activeCell]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && activeCell) {
        setCellValue(activeCell.row, activeCell.column, inputValue);
      } else if (e.key === "Escape") {
        setInputValue(storedValue);
      }
    },
    [activeCell, inputValue, setCellValue, storedValue]
  );

  const handleBlur = useCallback(() => {
    if (activeCell && inputValue !== storedValue) {
      setCellValue(activeCell.row, activeCell.column, inputValue);
    }
  }, [activeCell, inputValue, setCellValue, storedValue]);

  const cellRef = activeCell ? pointToCellRef(activeCell) : "";
  const formulaType = isLLMFormula(inputValue)
    ? "llm"
    : isMathFormula(inputValue)
    ? "math"
    : isFormula(inputValue)
    ? "formula"
    : null;

  return (
    <div className="formula-bar flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/20">
      <div className="cell-ref flex items-center justify-center min-w-[4rem] h-7 px-2 bg-background border border-border rounded-md">
        <span className="text-sm font-mono font-semibold text-foreground">
          {cellRef || "—"}
        </span>
      </div>
      
      <div className="h-5 w-px bg-border" />
      
      <div className="formula-icon flex items-center justify-center w-8 h-7 bg-muted rounded-md">
        {formulaType === "llm" ? (
          <SparklesIcon className="h-4 w-4 text-primary" />
        ) : formulaType === "math" || formulaType === "formula" ? (
          <span className="text-sm font-mono font-semibold text-primary">fx</span>
        ) : (
          <span className="text-sm font-mono text-muted-foreground">fx</span>
        )}
      </div>
      
      <div className="flex-1 relative">
        <Input
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={activeCell ? "Enter value or formula (e.g., =SUM(A1:A5))" : "Select a cell to edit"}
          disabled={!activeCell}
          className="h-8 font-mono text-sm bg-background border-border"
        />
        {formulaType && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              formulaType === "llm" 
                ? "bg-primary/20 text-primary" 
                : "bg-muted text-muted-foreground"
            }`}>
              {formulaType.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}
