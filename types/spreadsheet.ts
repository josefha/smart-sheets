import { CellBase, Matrix, Point } from "react-spreadsheet";

export type FileType = "image" | "pdf" | "document" | "unknown";

export interface FileData {
  name: string;
  type: FileType;
  mimeType: string;
  size: number;
  dataUrl: string; // Base64 encoded data URL
  thumbnail?: string; // For PDFs, we might generate a thumbnail
}

export interface CellData extends CellBase {
  value: string;
  formula?: string;
  isLoading?: boolean;
  error?: string;
  // File support
  file?: FileData;
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
    file?: FileData;
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

// File type detection helpers
export function getFileType(mimeType: string): FileType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.includes("document") ||
    mimeType.includes("text") ||
    mimeType.includes("word") ||
    mimeType.includes("sheet")
  ) {
    return "document";
  }
  return "unknown";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
