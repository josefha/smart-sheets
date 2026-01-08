"use client";

import React, { useState, useCallback } from "react";
import { Point } from "react-spreadsheet";
import { Sheet, Toolbar, FormulaBar } from "@/components/spreadsheet";
import { LLMFormulaDialog } from "@/components/spreadsheet/LLMFormulaDialog";
import { useSpreadsheetStore } from "@/lib/store";

export default function Home() {
  const [llmDialogOpen, setLlmDialogOpen] = useState(false);
  const [capturedSelection, setCapturedSelection] = useState<Point[]>([]);
  const { selectedCells } = useSpreadsheetStore();

  // Capture current selection when opening the dialog
  const handleOpenLLMDialog = useCallback(() => {
    setCapturedSelection(selectedCells);
    setLlmDialogOpen(true);
  }, [selectedCells]);

  const handleDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setCapturedSelection([]);
    }
    setLlmDialogOpen(open);
  }, []);

  return (
    <main className="h-screen flex flex-col bg-background">
      <Toolbar onApplyLLM={handleOpenLLMDialog} />
      <FormulaBar />
      <div className="flex-1 overflow-hidden">
        <Sheet />
      </div>
      <LLMFormulaDialog 
        open={llmDialogOpen} 
        onOpenChange={handleDialogChange}
        initialSelection={capturedSelection}
      />
    </main>
  );
}
