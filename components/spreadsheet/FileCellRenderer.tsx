"use client";

import React from "react";
import { FileData, formatFileSize } from "@/types/spreadsheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileCellRendererProps {
  file: FileData;
  compact?: boolean;
}

export function FileCellRenderer({ file, compact = true }: FileCellRendererProps) {
  if (file.type === "image") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="file-cell file-cell-image">
            <img
              src={file.dataUrl}
              alt={file.name}
              className="file-thumbnail"
            />
            {!compact && <span className="file-name">{file.name}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="p-0">
          <div className="file-preview-tooltip">
            <img
              src={file.dataUrl}
              alt={file.name}
              className="max-w-[300px] max-h-[300px] rounded-md"
            />
            <div className="p-2 text-xs">
              <div className="font-medium truncate max-w-[280px]">{file.name}</div>
              <div className="text-muted-foreground">{formatFileSize(file.size)}</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (file.type === "pdf") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="file-cell file-cell-pdf">
            <PDFIcon className="file-icon" />
            {!compact && <span className="file-name">{file.name}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="p-2 text-xs">
            <div className="font-medium truncate max-w-[200px]">{file.name}</div>
            <div className="text-muted-foreground">{formatFileSize(file.size)}</div>
            <div className="text-muted-foreground mt-1">PDF Document</div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Default file icon for other types
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="file-cell file-cell-default">
          <FileIcon className="file-icon" />
          {!compact && <span className="file-name">{file.name}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <div className="p-2 text-xs">
          <div className="font-medium truncate max-w-[200px]">{file.name}</div>
          <div className="text-muted-foreground">{formatFileSize(file.size)}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function PDFIcon({ className }: { className?: string }) {
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
      <path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1" />
      <path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" />
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
