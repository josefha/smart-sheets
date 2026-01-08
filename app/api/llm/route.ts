import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionContentPart } from "openai/resources/chat/completions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface FileData {
  name: string;
  type: "image" | "pdf" | "document" | "unknown";
  mimeType: string;
  size: number;
  dataUrl: string;
}

interface CellInput {
  row: number;
  col: number;
  value: string;
  file?: FileData;
}

interface LLMRequestBody {
  prompt: string;
  cells: CellInput[];
}

interface CellResult {
  row: number;
  col: number;
  result: string;
  error?: string;
}

// Helper to check if any cell has a file
function hasFiles(cells: CellInput[]): boolean {
  return cells.some(cell => cell.file);
}

// Helper to build message content for a cell
function buildMessageContent(prompt: string, cell: CellInput): ChatCompletionContentPart[] {
  const content: ChatCompletionContentPart[] = [];

  // Add the text prompt
  if (cell.file) {
    content.push({
      type: "text",
      text: `${prompt}${cell.value ? `\n\nAdditional context: ${cell.value}` : ""}`,
    });

    // Add image if it's an image file
    if (cell.file.type === "image" && cell.file.dataUrl) {
      content.push({
        type: "image_url",
        image_url: {
          url: cell.file.dataUrl,
          detail: "auto",
        },
      });
    } else if (cell.file.type === "pdf") {
      // For PDFs, we'll extract what we can from the data URL description
      // Note: GPT-4 Vision doesn't directly support PDFs, so we mention it
      content.push({
        type: "text",
        text: `[PDF File: ${cell.file.name}, Size: ${(cell.file.size / 1024).toFixed(1)}KB]`,
      });
    }
  } else {
    content.push({
      type: "text",
      text: cell.value ? `${prompt}\n\nInput: ${cell.value}` : prompt,
    });
  }

  return content;
}

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const body: LLMRequestBody = await request.json();
    const { prompt, cells } = body;

    if (!prompt || !cells || !Array.isArray(cells)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Model selection (as of Jan 2026):
    // - gpt-4o: Best for vision/image analysis (multimodal)
    // - gpt-4o-mini: Cost-effective for text-only tasks
    // - o1-mini: Advanced reasoning (use for complex analysis)
    // - gpt-5: Latest flagship (if available in your API tier)
    const needsVision = hasFiles(cells);
    
    // Use gpt-4o for vision tasks, gpt-4o-mini for text (fast & cheap)
    // You can change to "o1-mini" for better reasoning on complex prompts
    const model = needsVision ? "gpt-4o" : "gpt-4o-mini";

    // Process each cell in parallel
    const results: CellResult[] = await Promise.all(
      cells.map(async (cell) => {
        try {
          const messages: ChatCompletionMessageParam[] = [
            {
              role: "system",
              content:
                "You are a helpful assistant that processes spreadsheet data. Provide concise, direct responses suitable for spreadsheet cells. Do not include explanations unless asked. When analyzing images, describe or extract the requested information directly.",
            },
          ];

          // Build the user message based on whether there's a file
          if (cell.file && cell.file.type === "image") {
            messages.push({
              role: "user",
              content: buildMessageContent(prompt, cell),
            });
          } else {
            // Text-only message
            const fullPrompt = cell.value
              ? `${prompt}\n\nInput: ${cell.value}`
              : prompt;
            messages.push({
              role: "user",
              content: fullPrompt,
            });
          }

          const completion = await openai.chat.completions.create({
            model,
            messages,
            max_tokens: 500,
            temperature: 0.7,
          });

          const result =
            completion.choices[0]?.message?.content?.trim() || "";

          return {
            row: cell.row,
            col: cell.col,
            result,
          };
        } catch (error) {
          console.error(`Error processing cell [${cell.row}, ${cell.col}]:`, error);
          return {
            row: cell.row,
            col: cell.col,
            result: "",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("LLM API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
