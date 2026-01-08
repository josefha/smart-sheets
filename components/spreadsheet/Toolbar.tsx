"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSpreadsheetStore } from "@/lib/store";

interface ToolbarProps {
  onApplyLLM: () => void;
  disabled?: boolean;
}

export function Toolbar({ onApplyLLM, disabled }: ToolbarProps) {
  const { selectedCells, setData } = useSpreadsheetStore();
  const hasSelection = selectedCells.length > 0;

  const handleClearSheet = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all data?"
    );
    if (confirmed) {
      setData(
        Array.from({ length: 50 }, () =>
          Array.from({ length: 26 }, () => ({ value: "" }))
        )
      );
    }
  };

  return (
    <div className="toolbar flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <GridIcon className="h-5 w-5 text-primary" />
          <span className="text-base font-semibold tracking-tight">Sheets</span>
        </div>
        <div className="h-5 w-px bg-border" />
      </div>

      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              onClick={onApplyLLM}
              onMouseDown={(e) => {
                // Prevent the spreadsheet from losing focus/selection
                e.preventDefault();
              }}
              disabled={disabled || !hasSelection}
              className="gap-1.5 shadow-sm"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Apply LLM</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Apply LLM formula to selected cells</p>
            {!hasSelection && (
              <p className="text-xs text-muted-foreground mt-1">
                Select cells first
              </p>
            )}
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FunctionIcon className="h-4 w-4" />
              <span>Formulas</span>
              <ChevronDownIcon className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Math Formulas</DropdownMenuLabel>
            <DropdownMenuItem className="font-mono text-xs">
              =SUM(A1:A10)
            </DropdownMenuItem>
            <DropdownMenuItem className="font-mono text-xs">
              =AVERAGE(A1:A10)
            </DropdownMenuItem>
            <DropdownMenuItem className="font-mono text-xs">
              =MIN(A1:A10)
            </DropdownMenuItem>
            <DropdownMenuItem className="font-mono text-xs">
              =MAX(A1:A10)
            </DropdownMenuItem>
            <DropdownMenuItem className="font-mono text-xs">
              =IF(A1&gt;5, &quot;Yes&quot;, &quot;No&quot;)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>LLM Formulas</DropdownMenuLabel>
            <DropdownMenuItem className="font-mono text-xs">
              =LLM(&quot;summarize&quot;, A1)
            </DropdownMenuItem>
            <DropdownMenuItem className="font-mono text-xs">
              =LLM(&quot;translate to Spanish&quot;, A1)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearSheet}
          className="text-muted-foreground hover:text-destructive"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>

      {hasSelection && (
        <div className="ml-auto flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-md">
            <SelectionIcon className="h-3.5 w-3.5" />
            <span className="font-medium">
              {selectedCells.length} cell{selectedCells.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function GridIcon({ className }: { className?: string }) {
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
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>
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

function FunctionIcon({ className }: { className?: string }) {
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
      <path d="M9 17H5" />
      <path d="M12 17h4" />
      <path d="m9.5 3-.5 5.5L5 8" />
      <path d="m14.5 3 .5 5.5 4-.5" />
      <path d="M8 14a4 4 0 1 0 8 0" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function SelectionIcon({ className }: { className?: string }) {
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
      <rect width="8" height="8" x="8" y="8" rx="2" />
    </svg>
  );
}
