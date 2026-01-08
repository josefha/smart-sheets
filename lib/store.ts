import { create } from "zustand";
import { CellBase, Matrix, Point } from "react-spreadsheet";
import { CellData, SpreadsheetData, pointToCellRef, FileData } from "@/types/spreadsheet";

// Default grid size
const DEFAULT_ROWS = 50;
const DEFAULT_COLS = 26;

// Initialize empty data matrix
function createEmptyMatrix(rows: number, cols: number): SpreadsheetData {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ value: "" }))
  );
}

interface FormulaEditingState {
  isEditing: boolean;
  formulaValue: string;
  cursorPosition: number;
  rangeStart: Point | null;  // For shift-click range selection
}

interface SpreadsheetState {
  // Data
  data: SpreadsheetData;
  
  // Selection state
  selectedCells: Point[];
  activeCell: Point | null;
  
  // Formula editing state
  formulaEditing: FormulaEditingState;
  
  // Loading states
  loadingCells: Set<string>;
  
  // Actions
  setData: (data: SpreadsheetData) => void;
  setCellValue: (row: number, col: number, value: string) => void;
  setCellFormula: (row: number, col: number, formula: string) => void;
  setCellFile: (row: number, col: number, file: FileData | null) => void;
  setSelectedCells: (cells: Point[]) => void;
  setActiveCell: (cell: Point | null) => void;
  setCellLoading: (row: number, col: number, loading: boolean) => void;
  setCellError: (row: number, col: number, error: string | null) => void;
  
  // Formula editing actions
  startFormulaEditing: (value: string, cursorPosition: number) => void;
  updateFormulaValue: (value: string, cursorPosition: number) => void;
  insertCellReference: (point: Point, isRange: boolean, isAdditive: boolean) => string;
  endFormulaEditing: () => void;
  setFormulaRangeStart: (point: Point | null) => void;
  
  // Batch operations
  setCellValues: (updates: Array<{ row: number; col: number; value: string }>) => void;
  
  // Computed
  getCell: (row: number, col: number) => CellData | undefined;
  getCellValue: (row: number, col: number) => string;
  getSelectedValues: () => Array<{ row: number; col: number; value: string }>;
}

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  // Initial state
  data: createEmptyMatrix(DEFAULT_ROWS, DEFAULT_COLS),
  selectedCells: [],
  activeCell: null,
  loadingCells: new Set(),
  formulaEditing: {
    isEditing: false,
    formulaValue: "",
    cursorPosition: 0,
    rangeStart: null,
  },

  // Actions
  setData: (data) => set({ data }),

  setCellValue: (row, col, value) =>
    set((state) => {
      const newData = [...state.data];
      if (!newData[row]) {
        newData[row] = [];
      }
      newData[row] = [...newData[row]];
      newData[row][col] = { ...newData[row][col], value };
      return { data: newData };
    }),

  setCellFormula: (row, col, formula) =>
    set((state) => {
      const newData = [...state.data];
      if (!newData[row]) {
        newData[row] = [];
      }
      newData[row] = [...newData[row]];
      const existingCell = newData[row][col] || { value: "" };
      newData[row][col] = { ...existingCell, value: existingCell.value || "", formula };
      return { data: newData };
    }),

  setCellFile: (row, col, file) =>
    set((state) => {
      const newData = [...state.data];
      if (!newData[row]) {
        newData[row] = [];
      }
      newData[row] = [...newData[row]];
      newData[row][col] = { 
        ...newData[row][col], 
        file: file || undefined,
        // Set the value to the filename if file is provided
        value: file ? `📎 ${file.name}` : newData[row][col]?.value || "",
      };
      return { data: newData };
    }),

  setSelectedCells: (cells) => set({ selectedCells: cells }),

  setActiveCell: (cell) => set({ activeCell: cell }),

  setCellLoading: (row, col, loading) =>
    set((state) => {
      const key = pointToCellRef({ row, column: col });
      const newLoadingCells = new Set(state.loadingCells);
      if (loading) {
        newLoadingCells.add(key);
      } else {
        newLoadingCells.delete(key);
      }
      
      const newData = [...state.data];
      if (!newData[row]) {
        newData[row] = [];
      }
      newData[row] = [...newData[row]];
      const existingCell = newData[row][col] || { value: "" };
      newData[row][col] = { ...existingCell, value: existingCell.value || "", isLoading: loading };
      
      return { loadingCells: newLoadingCells, data: newData };
    }),

  setCellError: (row, col, error) =>
    set((state) => {
      const newData = [...state.data];
      if (!newData[row]) {
        newData[row] = [];
      }
      newData[row] = [...newData[row]];
      const existingCell = newData[row][col] || { value: "" };
      newData[row][col] = { 
        ...existingCell, 
        value: existingCell.value || "",
        error: error || undefined 
      };
      return { data: newData };
    }),

  setCellValues: (updates) =>
    set((state) => {
      const newData = [...state.data];
      for (const update of updates) {
        if (!newData[update.row]) {
          newData[update.row] = [];
        }
        newData[update.row] = [...newData[update.row]];
        newData[update.row][update.col] = {
          ...newData[update.row][update.col],
          value: update.value,
        };
      }
      return { data: newData };
    }),

  // Formula editing actions
  startFormulaEditing: (value, cursorPosition) =>
    set({
      formulaEditing: {
        isEditing: true,
        formulaValue: value,
        cursorPosition,
        rangeStart: null,
      },
    }),

  updateFormulaValue: (value, cursorPosition) =>
    set((state) => ({
      formulaEditing: {
        ...state.formulaEditing,
        formulaValue: value,
        cursorPosition,
      },
    })),

  insertCellReference: (point, isRange, isAdditive) => {
    const state = get();
    const { formulaValue, cursorPosition, rangeStart } = state.formulaEditing;
    const cellRef = pointToCellRef(point);
    
    let newValue: string;
    let newCursorPos: number;
    
    if (isRange && rangeStart) {
      // Create range reference like A1:B3
      const startRef = pointToCellRef(rangeStart);
      const rangeRef = `${startRef}:${cellRef}`;
      
      // Find and replace the start reference with the range
      const beforeCursor = formulaValue.slice(0, cursorPosition);
      const afterCursor = formulaValue.slice(cursorPosition);
      
      // Check if the last thing before cursor is the start reference
      if (beforeCursor.endsWith(startRef)) {
        newValue = beforeCursor.slice(0, -startRef.length) + rangeRef + afterCursor;
        newCursorPos = cursorPosition - startRef.length + rangeRef.length;
      } else {
        // Just insert the range
        newValue = beforeCursor + rangeRef + afterCursor;
        newCursorPos = cursorPosition + rangeRef.length;
      }
    } else if (isAdditive) {
      // Add comma and new reference (Cmd/Ctrl+click)
      const beforeCursor = formulaValue.slice(0, cursorPosition);
      const afterCursor = formulaValue.slice(cursorPosition);
      
      // Check if we need a comma
      const needsComma = beforeCursor.length > 0 && 
        !beforeCursor.endsWith("(") && 
        !beforeCursor.endsWith(",") &&
        !beforeCursor.endsWith(" ");
      
      const insertion = needsComma ? `, ${cellRef}` : cellRef;
      newValue = beforeCursor + insertion + afterCursor;
      newCursorPos = cursorPosition + insertion.length;
    } else {
      // Simple insertion at cursor
      const beforeCursor = formulaValue.slice(0, cursorPosition);
      const afterCursor = formulaValue.slice(cursorPosition);
      newValue = beforeCursor + cellRef + afterCursor;
      newCursorPos = cursorPosition + cellRef.length;
    }
    
    set({
      formulaEditing: {
        isEditing: true,
        formulaValue: newValue,
        cursorPosition: newCursorPos,
        rangeStart: isRange ? null : point, // Set for potential range, clear after range complete
      },
    });
    
    return newValue;
  },

  endFormulaEditing: () =>
    set({
      formulaEditing: {
        isEditing: false,
        formulaValue: "",
        cursorPosition: 0,
        rangeStart: null,
      },
    }),

  setFormulaRangeStart: (point) =>
    set((state) => ({
      formulaEditing: {
        ...state.formulaEditing,
        rangeStart: point,
      },
    })),

  // Computed
  getCell: (row, col) => {
    const state = get();
    return state.data[row]?.[col];
  },

  getCellValue: (row, col) => {
    const state = get();
    return state.data[row]?.[col]?.value || "";
  },

  getSelectedValues: () => {
    const state = get();
    return state.selectedCells.map((cell) => ({
      row: cell.row,
      col: cell.column,
      value: state.data[cell.row]?.[cell.column]?.value || "",
      file: state.data[cell.row]?.[cell.column]?.file,
    }));
  },
}));
