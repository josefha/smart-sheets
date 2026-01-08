"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useSpreadsheetStore } from "@/lib/store";
import { pointToCellRef } from "@/types/spreadsheet";
import { isFormula, isLLMFormula, isMathFormula } from "@/lib/formulas";

export function FormulaBar() {
  const { 
    activeCell, 
    data, 
    setCellValue,
    formulaEditing,
    startFormulaEditing,
    updateFormulaValue,
    endFormulaEditing,
  } = useSpreadsheetStore();
  
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Get the actual stored value (formula or plain value)
  const storedValue = activeCell
    ? data[activeCell.row]?.[activeCell.column]?.value || ""
    : "";

  // Update input when active cell changes - show the formula, not the computed value
  useEffect(() => {
    setInputValue(storedValue);
    // End formula editing when cell changes
    if (formulaEditing.isEditing) {
      endFormulaEditing();
    }
  }, [storedValue, activeCell]);

  // Sync with formula editing state from store (when cell references are inserted)
  useEffect(() => {
    if (formulaEditing.isEditing && formulaEditing.formulaValue !== inputValue) {
      setInputValue(formulaEditing.formulaValue);
      // Restore cursor position after update
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(
            formulaEditing.cursorPosition,
            formulaEditing.cursorPosition
          );
          inputRef.current.focus();
        }
      }, 0);
    }
  }, [formulaEditing.formulaValue, formulaEditing.cursorPosition, formulaEditing.isEditing]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      setInputValue(newValue);
      
      // Start or update formula editing mode
      if (newValue.startsWith("=")) {
        if (!formulaEditing.isEditing) {
          startFormulaEditing(newValue, cursorPos);
        } else {
          updateFormulaValue(newValue, cursorPos);
        }
      } else if (formulaEditing.isEditing) {
        endFormulaEditing();
      }
    },
    [formulaEditing.isEditing, startFormulaEditing, updateFormulaValue, endFormulaEditing]
  );

  const handleSelect = useCallback(
    (e: React.SyntheticEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement;
      const cursorPos = target.selectionStart || 0;
      
      // Update cursor position in store if in formula editing mode
      if (formulaEditing.isEditing) {
        updateFormulaValue(inputValue, cursorPos);
      }
    },
    [formulaEditing.isEditing, inputValue, updateFormulaValue]
  );

  const handleFocus = useCallback(() => {
    // Start formula editing if the current value is a formula
    if (inputValue.startsWith("=") && !formulaEditing.isEditing) {
      const cursorPos = inputRef.current?.selectionStart || inputValue.length;
      startFormulaEditing(inputValue, cursorPos);
    }
  }, [inputValue, formulaEditing.isEditing, startFormulaEditing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && activeCell) {
        setCellValue(activeCell.row, activeCell.column, inputValue);
        endFormulaEditing();
      } else if (e.key === "Escape") {
        setInputValue(storedValue);
        endFormulaEditing();
      }
    },
    [activeCell, inputValue, setCellValue, storedValue, endFormulaEditing]
  );

  const handleBlur = useCallback(() => {
    // Small delay to allow cell click events to be processed first
    setTimeout(() => {
      if (activeCell && inputValue !== storedValue) {
        setCellValue(activeCell.row, activeCell.column, inputValue);
      }
      // Only end formula editing if we're not clicking on a cell to add reference
      if (!formulaEditing.isEditing) {
        return;
      }
      // Check if the focus moved to the spreadsheet (for cell selection)
      const activeElement = document.activeElement;
      const isSpreadsheetClick = activeElement?.closest('.sheet-container');
      if (!isSpreadsheetClick) {
        endFormulaEditing();
      }
    }, 100);
  }, [activeCell, inputValue, setCellValue, storedValue, formulaEditing.isEditing, endFormulaEditing]);

  const cellRef = activeCell ? pointToCellRef(activeCell) : "";
  const formulaType = isLLMFormula(inputValue)
    ? "llm"
    : isMathFormula(inputValue)
    ? "math"
    : isFormula(inputValue)
    ? "formula"
    : null;

  // Show indicator when in formula editing mode
  const isInFormulaMode = formulaEditing.isEditing && inputValue.startsWith("=");

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
          ref={inputRef}
          value={inputValue}
          onChange={handleChange}
          onSelect={handleSelect}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={activeCell ? "Enter value or formula (e.g., =SUM(A1:A5))" : "Select a cell to edit"}
          disabled={!activeCell}
          className={`h-8 font-mono text-sm bg-background border-border ${
            isInFormulaMode ? "ring-2 ring-primary/50" : ""
          }`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {isInFormulaMode && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary animate-pulse">
              Click cells to add
            </span>
          )}
          {formulaType && !isInFormulaMode && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              formulaType === "llm" 
                ? "bg-primary/20 text-primary" 
                : "bg-muted text-muted-foreground"
            }`}>
              {formulaType.toUpperCase()}
            </span>
          )}
        </div>
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
