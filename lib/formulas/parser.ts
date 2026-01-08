import { Parser } from "hot-formula-parser";
import { CellBase, Matrix } from "react-spreadsheet";
import { 
  cellRefToPoint, 
  columnLabelToIndex 
} from "@/types/spreadsheet";
import { isFormula, isLLMFormula } from "./types";

// Create a formula parser with cell reference support
export function createFormulaParser(data: Matrix<CellBase>) {
  const parser = new Parser();

  // Handle cell references (e.g., A1, B2)
  parser.on("callCellValue", (cellCoord, done) => {
    const { row, column } = cellCoord;
    // hot-formula-parser uses 1-based row indices and column objects
    const rowIndex = row.index;
    const colIndex = column.index;
    
    const cell = data[rowIndex]?.[colIndex];
    let value = cell?.value ?? "";
    
    // If the referenced cell contains a formula, evaluate it recursively
    if (typeof value === "string" && isFormula(value) && !isLLMFormula(value)) {
      const result = evaluateFormula(value, data);
      value = result.error ? "#ERROR" : String(result.value);
    }
    
    // Try to convert to number if possible
    const numValue = parseFloat(value);
    done(isNaN(numValue) ? value : numValue);
  });

  // Handle range references (e.g., A1:B5)
  parser.on("callRangeValue", (startCellCoord, endCellCoord, done) => {
    const startRow = startCellCoord.row.index;
    const endRow = endCellCoord.row.index;
    const startCol = startCellCoord.column.index;
    const endCol = endCellCoord.column.index;

    const values: (string | number)[][] = [];

    for (let row = startRow; row <= endRow; row++) {
      const rowValues: (string | number)[] = [];
      for (let col = startCol; col <= endCol; col++) {
        const cell = data[row]?.[col];
        let value = cell?.value ?? "";
        
        // Evaluate formulas in range
        if (typeof value === "string" && isFormula(value) && !isLLMFormula(value)) {
          const result = evaluateFormula(value, data);
          value = result.error ? "#ERROR" : String(result.value);
        }
        
        const numValue = parseFloat(value);
        rowValues.push(isNaN(numValue) ? value : numValue);
      }
      values.push(rowValues);
    }

    done(values);
  });

  return parser;
}

export interface FormulaEvaluationResult {
  value: string | number;
  error?: string;
}

export function evaluateFormula(
  formula: string,
  data: Matrix<CellBase>
): FormulaEvaluationResult {
  if (!isFormula(formula)) {
    return { value: formula };
  }

  // Skip LLM formulas - they need async processing
  if (isLLMFormula(formula)) {
    return { value: formula, error: "LLM formulas require async processing" };
  }

  const parser = createFormulaParser(data);
  const expression = formula.slice(1); // Remove the '=' prefix

  try {
    const result = parser.parse(expression);
    
    if (result.error) {
      return { value: "#ERROR", error: result.error };
    }
    
    return { value: result.result ?? "" };
  } catch (error) {
    return { 
      value: "#ERROR", 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// Extract cell references from a formula
export function extractCellRefs(formula: string): string[] {
  const cellRefPattern = /\b([A-Z]+)(\d+)\b/g;
  const refs: string[] = [];
  let match;
  
  while ((match = cellRefPattern.exec(formula)) !== null) {
    refs.push(match[0]);
  }
  
  return refs;
}

// Parse cell reference string to row/col indices
export function parseCellRef(ref: string): { row: number; col: number } | null {
  const point = cellRefToPoint(ref);
  if (!point) return null;
  return { row: point.row, col: point.column };
}

// Parse a range reference like A1:B5
export function parseRangeRef(range: string): { 
  start: { row: number; col: number }; 
  end: { row: number; col: number }; 
} | null {
  const parts = range.split(":");
  if (parts.length !== 2) return null;
  
  const start = parseCellRef(parts[0]);
  const end = parseCellRef(parts[1]);
  
  if (!start || !end) return null;
  
  return { start, end };
}
