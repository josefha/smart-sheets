"use client";

import React, { useState, useMemo } from "react";
import { Point } from "react-spreadsheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSpreadsheetStore } from "@/lib/store";
import {
  pointToCellRef,
  cellRefToPoint,
  columnIndexToLabel,
  FileData,
  formatFileSize,
} from "@/types/spreadsheet";

type OutputLocation = "next-column" | "replace" | "below" | "custom";

interface LLMFormulaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSelection?: Point[];
}

export function LLMFormulaDialog({
  open,
  onOpenChange,
  initialSelection = [],
}: LLMFormulaDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputLocation, setOutputLocation] =
    useState<OutputLocation>("next-column");
  const [customStartCell, setCustomStartCell] = useState("");

  const { data, setCellValue, setCellLoading, setCellError } =
    useSpreadsheetStore();

  // Use initialSelection passed from parent (captured when dialog opens)
  const selectedCells = initialSelection;

  // Calculate output cell references based on selected option
  const outputCellRefs = useMemo(() => {
    if (selectedCells.length === 0) return [];

    switch (outputLocation) {
      case "next-column":
        return selectedCells.map((cell) => ({
          row: cell.row,
          col: cell.column + 1,
          ref: pointToCellRef({ row: cell.row, column: cell.column + 1 }),
        }));
      case "replace":
        return selectedCells.map((cell) => ({
          row: cell.row,
          col: cell.column,
          ref: pointToCellRef(cell),
        }));
      case "below":
        // Get the last row of selection and place outputs below
        const maxRow = Math.max(...selectedCells.map((c) => c.row));
        return selectedCells.map((cell, index) => ({
          row: maxRow + 1 + index,
          col: cell.column,
          ref: pointToCellRef({ row: maxRow + 1 + index, column: cell.column }),
        }));
      case "custom":
        if (!customStartCell) return [];
        const startPoint = cellRefToPoint(customStartCell.toUpperCase());
        if (!startPoint) return [];
        return selectedCells.map((_, index) => ({
          row: startPoint.row + index,
          col: startPoint.column,
          ref: pointToCellRef({
            row: startPoint.row + index,
            column: startPoint.column,
          }),
        }));
      default:
        return [];
    }
  }, [selectedCells, outputLocation, customStartCell]);

  // Check if any selected cells have files
  const hasFileCells = useMemo(() => {
    return selectedCells.some((cell) => data[cell.row]?.[cell.column]?.file);
  }, [selectedCells, data]);

  // Get cell info for display
  const selectedCellsInfo = useMemo(() => {
    return selectedCells.map((cell) => {
      const cellData = data[cell.row]?.[cell.column];
      return {
        ref: pointToCellRef(cell),
        value: cellData?.value || "",
        file: cellData?.file,
      };
    });
  }, [selectedCells, data]);

  const handleApply = async () => {
    if (
      !prompt.trim() ||
      selectedCells.length === 0 ||
      outputCellRefs.length === 0
    )
      return;

    setIsProcessing(true);

    // Get values from the captured selection, including file data
    const selectedValues = selectedCells.map((cell) => {
      const cellData = data[cell.row]?.[cell.column];
      return {
        row: cell.row,
        col: cell.column,
        value: cellData?.value || "",
        file: cellData?.file,
      };
    });

    // Set loading state for all output cells
    for (const output of outputCellRefs) {
      setCellLoading(output.row, output.col, true);
    }

    try {
      const response = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          cells: selectedValues,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process LLM request");
      }

      const data = await response.json();

      // Update cells with results at the specified output locations
      for (let i = 0; i < data.results.length; i++) {
        const result = data.results[i];
        const output = outputCellRefs[i];

        if (output) {
          setCellLoading(output.row, output.col, false);
          if (result.error) {
            setCellError(output.row, output.col, result.error);
          } else {
            setCellValue(output.row, output.col, result.result);
          }
        }
      }

      setPrompt("");
      onOpenChange(false);
    } catch (error) {
      console.error("LLM processing error:", error);
      // Set error state for all output cells
      for (const output of outputCellRefs) {
        setCellLoading(output.row, output.col, false);
        setCellError(output.row, output.col, "Failed to process");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const outputRefs = outputCellRefs.map((o) => o.ref).join(", ");

  // Suggested output column (next column after first selected cell)
  const suggestedColumn =
    selectedCells.length > 0
      ? columnIndexToLabel(selectedCells[0].column + 1)
      : "B";

  // Count file vs text cells
  const fileCellCount = selectedCellsInfo.filter((c) => c.file).length;
  const textCellCount = selectedCellsInfo.length - fileCellCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            Apply LLM Formula
          </DialogTitle>
          <DialogDescription>
            Enter a prompt to apply to each selected cell and choose where to
            place the results.
            {hasFileCells && (
              <span className="block mt-1 text-primary">
                📎 {fileCellCount} file{fileCellCount !== 1 ? "s" : ""} selected
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Selected Cells */}
          <div className="space-y-2">
            <Label>Selected Cells (Input)</Label>
            <div className="text-sm bg-muted px-3 py-2 rounded-md max-h-32 overflow-auto space-y-1.5">
              {selectedCellsInfo.length === 0 ? (
                <span className="text-muted-foreground">No cells selected</span>
              ) : (
                selectedCellsInfo.map((cell, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground w-8">
                      {cell.ref}
                    </span>
                    {cell.file ? (
                      <div className="flex items-center gap-2 text-primary">
                        {cell.file.type === "image" ? (
                          <>
                            <img
                              src={cell.file.dataUrl}
                              alt={cell.file.name}
                              className="h-6 w-6 object-cover rounded"
                            />
                            <span className="text-xs truncate max-w-[200px]">
                              {cell.file.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <FileIcon className="h-4 w-4" />
                            <span className="text-xs truncate max-w-[200px]">
                              {cell.file.name}
                            </span>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground">
                          ({formatFileSize(cell.file.size)})
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs truncate max-w-[280px] text-foreground">
                        {cell.value || (
                          <span className="text-muted-foreground italic">
                            empty
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
            {selectedCellsInfo.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {textCellCount > 0 &&
                  `${textCellCount} text cell${textCellCount !== 1 ? "s" : ""}`}
                {textCellCount > 0 && fileCellCount > 0 && ", "}
                {fileCellCount > 0 &&
                  `${fileCellCount} file${fileCellCount !== 1 ? "s" : ""}`}
              </p>
            )}
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Input
              id="prompt"
              placeholder='e.g., "Translate to Spanish" or "Summarize in one sentence"'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleApply();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              The prompt will be applied to each cell&apos;s value individually.
            </p>
          </div>

          {/* Output Location */}
          <div className="space-y-2">
            <Label>Output Location</Label>
            <Select
              value={outputLocation}
              onValueChange={(value) =>
                setOutputLocation(value as OutputLocation)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select where to place results" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next-column">
                  <div className="flex items-center gap-2">
                    <ArrowRightIcon className="h-4 w-4" />
                    <span>Next Column (Column {suggestedColumn})</span>
                  </div>
                </SelectItem>
                <SelectItem value="replace">
                  <div className="flex items-center gap-2">
                    <ReplaceIcon className="h-4 w-4" />
                    <span>Replace Selected Cells</span>
                  </div>
                </SelectItem>
                <SelectItem value="below">
                  <div className="flex items-center gap-2">
                    <ArrowDownIcon className="h-4 w-4" />
                    <span>Below Selected Cells</span>
                  </div>
                </SelectItem>
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <TargetIcon className="h-4 w-4" />
                    <span>Custom Starting Cell</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Cell Input */}
          {outputLocation === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customCell">Starting Cell</Label>
              <Input
                id="customCell"
                placeholder="e.g., C1, D5, E10"
                value={customStartCell}
                onChange={(e) =>
                  setCustomStartCell(e.target.value.toUpperCase())
                }
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Results will be placed starting from this cell, one per row.
              </p>
            </div>
          )}

          {/* Output Preview */}
          <div className="space-y-2">
            <Label>Output Cells (Preview)</Label>
            <div className="text-sm font-mono bg-accent/50 px-3 py-2 rounded-md max-h-20 overflow-auto border border-border">
              {outputRefs || (
                <span className="text-muted-foreground">
                  {outputLocation === "custom" && !customStartCell
                    ? "Enter a starting cell above"
                    : "No output cells"}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              !prompt.trim() ||
              selectedCells.length === 0 ||
              outputCellRefs.length === 0 ||
              isProcessing
            }
          >
            {isProcessing ? (
              <>
                <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4 mr-2" />
                Apply to {selectedCells.length} cell
                {selectedCells.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function LoaderIcon({ className }: { className?: string }) {
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
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
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
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
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
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

function ReplaceIcon({ className }: { className?: string }) {
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
      <path d="M14 4a2 2 0 0 1 2-2" />
      <path d="M16 2a2 2 0 0 1 2 2" />
      <path d="M18 4a2 2 0 0 1-2 2" />
      <path d="M16 6a2 2 0 0 1-2-2" />
      <path d="M4 18a2 2 0 0 1 2-2" />
      <path d="M6 16a2 2 0 0 1 2 2" />
      <path d="M8 18a2 2 0 0 1-2 2" />
      <path d="M6 20a2 2 0 0 1-2-2" />
      <path d="m14.5 12.5 2-2" />
      <path d="m11.5 9.5 2-2" />
      <path d="m8.5 6.5 2-2" />
      <path d="m17.5 15.5 2-2" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
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
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
