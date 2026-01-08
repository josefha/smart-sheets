import { Point } from "react-spreadsheet";

export interface FormulaResult {
  value: string | number;
  error?: string;
}

export interface ParsedFormula {
  type: "math" | "llm" | "value";
  expression?: string;
  prompt?: string;
  cellRefs?: Point[];
}

export interface CellReference {
  row: number;
  col: number;
  value: string;
}

export function isFormula(value: string): boolean {
  return typeof value === "string" && value.startsWith("=");
}

export function isLLMFormula(value: string): boolean {
  return isFormula(value) && value.toUpperCase().startsWith("=LLM(");
}

export function isMathFormula(value: string): boolean {
  return isFormula(value) && !isLLMFormula(value);
}
