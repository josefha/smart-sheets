"use client";

import React, { useCallback, useMemo, useEffect, useRef } from "react";
import Spreadsheet, { 
  CellBase, 
  Matrix, 
  Point,
  EntireRowsSelection,
  EntireColumnsSelection,
  Selection,
  RangeSelection
} from "react-spreadsheet";
import { useSpreadsheetStore } from "@/lib/store";
import { CellData, columnIndexToLabel } from "@/types/spreadsheet";
import { evaluateFormula, isFormula, isLLMFormula } from "@/lib/formulas";

interface SheetProps {
  onSelectionChange?: (cells: Point[]) => void;
}

export function Sheet({ onSelectionChange }: SheetProps) {
  const { 
    data, 
    setData, 
    setSelectedCells, 
    setActiveCell,
    formulaEditing,
    insertCellReference,
    setFormulaRangeStart,
  } = useSpreadsheetStore();
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate column labels (A, B, C, ...)
  const columnLabels = useMemo(() => {
    if (!data[0]) return [];
    return Array.from({ length: data[0].length }, (_, i) => columnIndexToLabel(i));
  }, [data]);

  // Generate row labels (1, 2, 3, ...)
  const rowLabels = useMemo(() => {
    return Array.from({ length: data.length }, (_, i) => String(i + 1));
  }, [data]);

  // Handle cell clicks during formula editing mode
  useEffect(() => {
    if (!formulaEditing.isEditing || !containerRef.current) return;

    const handleCellClick = (e: MouseEvent) => {
      // Find the clicked cell
      const target = e.target as HTMLElement;
      const cell = target.closest('.Spreadsheet__cell');
      if (!cell) return;

      // Get cell coordinates from the table structure
      const row = cell.closest('tr');
      if (!row) return;
      
      const tbody = row.closest('tbody');
      if (!tbody) return;
      
      const rows = Array.from(tbody.querySelectorAll('tr'));
      // First row is the header row, so we subtract 1 to get the data row index
      const rowIndex = rows.indexOf(row as HTMLTableRowElement) - 1;
      
      const cells = Array.from(row.querySelectorAll('.Spreadsheet__cell'));
      const colIndex = cells.indexOf(cell as HTMLElement);
      
      // Skip if clicking on header row or invalid cell
      if (rowIndex < 0 || colIndex < 0) return;

      // Prevent default cell selection behavior
      e.preventDefault();
      e.stopPropagation();

      const clickedPoint: Point = { row: rowIndex, column: colIndex };
      
      // Check for modifier keys
      const isMetaOrCtrl = e.metaKey || e.ctrlKey;  // Cmd on Mac, Ctrl on Windows
      const isShift = e.shiftKey;

      if (isShift && formulaEditing.rangeStart) {
        // Complete range selection (A1:B3)
        insertCellReference(clickedPoint, true, false);
      } else if (isMetaOrCtrl) {
        // Add another reference with comma (A1, A2)
        insertCellReference(clickedPoint, false, true);
      } else {
        // Single reference - also set as potential range start
        insertCellReference(clickedPoint, false, false);
        setFormulaRangeStart(clickedPoint);
      }
    };

    // Use capture phase to intercept before react-spreadsheet handles it
    const container = containerRef.current;
    container.addEventListener('mousedown', handleCellClick, true);

    return () => {
      container.removeEventListener('mousedown', handleCellClick, true);
    };
  }, [formulaEditing.isEditing, formulaEditing.rangeStart, insertCellReference, setFormulaRangeStart]);

  // Transform data to evaluate formulas for display
  const displayData = useMemo((): Matrix<CellBase> => {
    return data.map((row) =>
      row.map((cell) => {
        if (!cell) return { value: "" };
        if (!cell.value) return cell;
        
        const value = String(cell.value);
        
        // If it's a formula, evaluate it
        if (isFormula(value)) {
          // Skip LLM formulas - they need async processing
          if (isLLMFormula(value)) {
            return {
              ...cell,
              value: cell.isLoading ? "Loading..." : value,
            };
          }
          
          // Evaluate math formula
          const result = evaluateFormula(value, data);
          return {
            ...cell,
            value: result.error ? "#ERROR" : String(result.value),
          };
        }
        
        return cell;
      })
    );
  }, [data]);

  // Handle data changes from the spreadsheet
  const handleChange = useCallback(
    (newData: Matrix<CellBase>) => {
      const updatedData: Matrix<CellData> = newData.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const oldCell = data[rowIndex]?.[colIndex];
          const newValue = cell?.value;
          
          // If the value is the same as the evaluated result, keep the original formula
          if (oldCell?.value && isFormula(String(oldCell.value))) {
            const result = evaluateFormula(String(oldCell.value), data);
            if (String(result.value) === String(newValue)) {
              return oldCell;
            }
          }
          
          return {
            ...oldCell,
            value: newValue ?? "",
          };
        })
      );
      
      setData(updatedData);
    },
    [data, setData]
  );

  // Handle selection changes
  // NOTE: We don't clear selection when clicking outside the spreadsheet
  // This allows the toolbar buttons to work with the current selection
  const handleSelect = useCallback(
    (selection: Selection) => {
      // Don't clear selection when clicking outside - preserve for toolbar actions
      if (!selection) {
        return;
      }

      // Handle entire row/column selections
      if (selection instanceof EntireRowsSelection || selection instanceof EntireColumnsSelection) {
        return;
      }

      const selectedPoints: Point[] = [];
      
      // Check if it's a RangeSelection (has range property with start/end)
      if (selection instanceof RangeSelection) {
        const range = selection.range;
        const minRow = Math.min(range.start.row, range.end.row);
        const maxRow = Math.max(range.start.row, range.end.row);
        const minCol = Math.min(range.start.column, range.end.column);
        const maxCol = Math.max(range.start.column, range.end.column);

        for (let row = minRow; row <= maxRow; row++) {
          for (let col = minCol; col <= maxCol; col++) {
            selectedPoints.push({ row, column: col });
          }
        }
        
        setActiveCell(range.start);
      } 
      // Handle object with start/end properties directly
      else if ('start' in selection && 'end' in selection) {
        const sel = selection as { start: Point; end: Point };
        const minRow = Math.min(sel.start.row, sel.end.row);
        const maxRow = Math.max(sel.start.row, sel.end.row);
        const minCol = Math.min(sel.start.column, sel.end.column);
        const maxCol = Math.max(sel.start.column, sel.end.column);

        for (let row = minRow; row <= maxRow; row++) {
          for (let col = minCol; col <= maxCol; col++) {
            selectedPoints.push({ row, column: col });
          }
        }
        
        setActiveCell(sel.start);
      }
      // Handle point selection (single cell)
      else if ('row' in selection && 'column' in selection) {
        const point = selection as Point;
        selectedPoints.push(point);
        setActiveCell(point);
      }

      setSelectedCells(selectedPoints);
      onSelectionChange?.(selectedPoints);
    },
    [setSelectedCells, setActiveCell, onSelectionChange]
  );

  // Handle when a cell is activated (clicked)
  const handleActivate = useCallback(
    (active: Point) => {
      setActiveCell(active);
      // If no range selection, set the single cell as selected
      setSelectedCells([active]);
      onSelectionChange?.([active]);
    },
    [setActiveCell, setSelectedCells, onSelectionChange]
  );

  return (
    <div 
      ref={containerRef}
      className={`sheet-container w-full h-full overflow-auto ${
        formulaEditing.isEditing ? 'formula-editing-mode' : ''
      }`}
    >
      <Spreadsheet
        data={displayData}
        onChange={handleChange}
        onSelect={handleSelect}
        onActivate={handleActivate}
        columnLabels={columnLabels}
        rowLabels={rowLabels}
        className="smart-sheet"
      />
    </div>
  );
}
