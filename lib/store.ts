import { create } from "zustand";
import { CellBase, Matrix, Point } from "react-spreadsheet";
import { CellData, SpreadsheetData, pointToCellRef } from "@/types/spreadsheet";

// Default grid size
const DEFAULT_ROWS = 50;
const DEFAULT_COLS = 26;

// Initialize empty data matrix
function createEmptyMatrix(rows: number, cols: number): SpreadsheetData {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ value: "" }))
  );
}

interface SpreadsheetState {
  // Data
  data: SpreadsheetData;
  
  // Selection state
  selectedCells: Point[];
  activeCell: Point | null;
  
  // Loading states
  loadingCells: Set<string>;
  
  // Actions
  setData: (data: SpreadsheetData) => void;
  setCellValue: (row: number, col: number, value: string) => void;
  setCellFormula: (row: number, col: number, formula: string) => void;
  setSelectedCells: (cells: Point[]) => void;
  setActiveCell: (cell: Point | null) => void;
  setCellLoading: (row: number, col: number, loading: boolean) => void;
  setCellError: (row: number, col: number, error: string | null) => void;
  
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
      newData[row][col] = { ...newData[row][col], formula };
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
      newData[row][col] = { ...newData[row][col], isLoading: loading };
      
      return { loadingCells: newLoadingCells, data: newData };
    }),

  setCellError: (row, col, error) =>
    set((state) => {
      const newData = [...state.data];
      if (!newData[row]) {
        newData[row] = [];
      }
      newData[row] = [...newData[row]];
      newData[row][col] = { 
        ...newData[row][col], 
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
    }));
  },
}));
