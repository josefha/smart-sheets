import { CellBase, Matrix, Point } from "react-spreadsheet";

export interface CellData extends CellBase {
  value: string;
  formula?: string;
  isLoading?: boolean;
  error?: string;
}

export type SpreadsheetData = Matrix<CellData>;

export interface Selection {
  start: Point;
  end: Point;
}

export interface SelectedRange {
  cells: Point[];
  values: string[];
}

export interface LLMRequest {
  prompt: string;
  cellValue: string;
}

export interface LLMResponse {
  result: string;
  error?: string;
}

export interface LLMBatchRequest {
  prompt: string;
  cells: Array<{
    row: number;
    col: number;
    value: string;
  }>;
}

export interface LLMBatchResponse {
  results: Array<{
    row: number;
    col: number;
    result: string;
    error?: string;
  }>;
}

// Column utilities
export function columnIndexToLabel(index: number): string {
  let label = "";
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

export function columnLabelToIndex(label: string): number {
  let index = 0;
  for (let i = 0; i < label.length; i++) {
    index = index * 26 + (label.charCodeAt(i) - 64);
  }
  return index - 1;
}

export function cellRefToPoint(ref: string): Point | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const col = columnLabelToIndex(match[1]);
  const row = parseInt(match[2], 10) - 1;
  return { row, column: col };
}

export function pointToCellRef(point: Point): string {
  return `${columnIndexToLabel(point.column)}${point.row + 1}`;
}
