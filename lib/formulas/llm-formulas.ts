import { CellBase, Matrix } from "react-spreadsheet";
import { isLLMFormula } from "./types";
import { cellRefToPoint } from "@/types/spreadsheet";

export interface LLMFormulaParams {
  prompt: string;
  cellRefs: string[];
}

// Parse an LLM formula to extract prompt and cell references
// Formats: =LLM("prompt") or =LLM("prompt", A1) or =LLM("prompt", A1:B5)
export function parseLLMFormula(formula: string): LLMFormulaParams | null {
  if (!isLLMFormula(formula)) {
    return null;
  }

  // Remove =LLM( prefix and trailing )
  const inner = formula.slice(5, -1).trim();
  
  // Parse the arguments
  // Handle quoted strings and cell references
  const args: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];
    
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
    } else if (char === "," && !inQuotes) {
      args.push(current.trim());
      current = "";
      continue;
    }
    
    current += char;
  }
  
  if (current.trim()) {
    args.push(current.trim());
  }

  if (args.length === 0) {
    return null;
  }

  // First argument is always the prompt (remove quotes)
  let prompt = args[0];
  if ((prompt.startsWith('"') && prompt.endsWith('"')) ||
      (prompt.startsWith("'") && prompt.endsWith("'"))) {
    prompt = prompt.slice(1, -1);
  }

  // Remaining arguments are cell references
  const cellRefs = args.slice(1);

  return { prompt, cellRefs };
}

// Get values for cell references
export function getCellRefValues(
  cellRefs: string[],
  data: Matrix<CellBase>
): string[] {
  const values: string[] = [];

  for (const ref of cellRefs) {
    if (ref.includes(":")) {
      // Range reference
      const [startRef, endRef] = ref.split(":");
      const start = cellRefToPoint(startRef);
      const end = cellRefToPoint(endRef);
      
      if (start && end) {
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);
        const minCol = Math.min(start.column, end.column);
        const maxCol = Math.max(start.column, end.column);

        for (let row = minRow; row <= maxRow; row++) {
          for (let col = minCol; col <= maxCol; col++) {
            const cell = data[row]?.[col];
            values.push(cell?.value?.toString() ?? "");
          }
        }
      }
    } else {
      // Single cell reference
      const point = cellRefToPoint(ref);
      if (point) {
        const cell = data[point.row]?.[point.column];
        values.push(cell?.value?.toString() ?? "");
      }
    }
  }

  return values;
}

// Build the full prompt for LLM with cell values
export function buildLLMPrompt(
  prompt: string,
  cellValues: string[]
): string {
  if (cellValues.length === 0) {
    return prompt;
  }

  const valuesText = cellValues.join(", ");
  return `${prompt}\n\nInput values: ${valuesText}`;
}

// Process an LLM formula and return the result
export async function processLLMFormula(
  formula: string,
  data: Matrix<CellBase>,
  currentRow: number,
  currentCol: number
): Promise<{ result: string; error?: string }> {
  const parsed = parseLLMFormula(formula);
  
  if (!parsed) {
    return { result: "", error: "Invalid LLM formula syntax" };
  }

  // Get cell reference values
  const cellValues = getCellRefValues(parsed.cellRefs, data);
  
  // If no cell refs provided, use the value from the current cell's input context
  // This would be set by the calling code for batch operations
  const fullPrompt = buildLLMPrompt(parsed.prompt, cellValues);

  try {
    const response = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: fullPrompt,
        cells: [{ row: currentRow, col: currentCol, value: "" }],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to process LLM request");
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return { result: data.results[0].result };
    }
    
    return { result: "", error: "No result returned" };
  } catch (error) {
    return { 
      result: "", 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
