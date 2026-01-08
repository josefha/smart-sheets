import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CellInput {
  row: number;
  col: number;
  value: string;
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

    // Process each cell in parallel
    const results: CellResult[] = await Promise.all(
      cells.map(async (cell) => {
        try {
          const fullPrompt = cell.value
            ? `${prompt}\n\nInput: ${cell.value}`
            : prompt;

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant that processes spreadsheet data. Provide concise, direct responses suitable for spreadsheet cells. Do not include explanations unless asked.",
              },
              {
                role: "user",
                content: fullPrompt,
              },
            ],
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
