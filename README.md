# Smart Sheets - LLM-Powered Spreadsheet

A Google Sheets-like application built with Next.js, TypeScript, and React. Features both mathematical formulas and LLM-powered formulas using OpenAI.

## Features

- **Spreadsheet Interface**: Full-featured spreadsheet with cell editing, navigation, and selection
- **Math Formulas**: Excel-compatible formulas like `=SUM(A1:A5)`, `=AVERAGE(B1:B10)`, `=IF(A1>5, "yes", "no")`
- **LLM Formulas**: AI-powered formulas using OpenAI, e.g., `=LLM("summarize", A1)`
- **Batch LLM Processing**: Select multiple cells and apply LLM operations to all of them
- **Modern UI**: Built with Shadcn UI components and Tailwind CSS

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **UI**: Shadcn UI, Tailwind CSS
- **Spreadsheet**: react-spreadsheet
- **Formula Parsing**: hot-formula-parser
- **State Management**: Zustand
- **LLM Integration**: OpenAI API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository and install dependencies:

```bash
cd smart-sheets
npm install
```

2. Set up environment variables:

```bash
cp env.example .env.local
```

Then edit `.env.local` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-api-key-here
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Basic Cell Editing

- Click on any cell to select it
- Start typing to enter a value
- Press Enter to confirm and move to the next row
- Use arrow keys to navigate between cells

### Math Formulas

Enter formulas starting with `=`:

- `=SUM(A1:A5)` - Sum of cells A1 through A5
- `=AVERAGE(A1:A10)` - Average of cells
- `=MIN(A1:A10)` - Minimum value
- `=MAX(A1:A10)` - Maximum value
- `=IF(A1>5, "Yes", "No")` - Conditional logic
- `=A1+B1*2` - Mathematical expressions

### LLM Formulas

Use the `=LLM()` function for AI-powered operations:

- `=LLM("summarize this text")` - Direct prompt
- `=LLM("translate to Spanish", A1)` - Process cell A1 with the prompt

### Batch LLM Processing

1. Select multiple cells containing data (click and drag)
2. Click the "Apply LLM" button in the toolbar
3. Enter a prompt (e.g., "translate to French")
4. Click Apply - results will appear in the adjacent column

## Project Structure

```
smart-sheets/
├── app/
│   ├── api/llm/route.ts      # OpenAI API endpoint
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page
├── components/
│   ├── spreadsheet/
│   │   ├── Sheet.tsx         # Main spreadsheet component
│   │   ├── Toolbar.tsx       # Toolbar with actions
│   │   ├── FormulaBar.tsx    # Formula input bar
│   │   └── LLMFormulaDialog.tsx  # LLM batch dialog
│   └── ui/                   # Shadcn UI components
├── lib/
│   ├── store.ts              # Zustand state management
│   ├── formulas/
│   │   ├── parser.ts         # Formula parser
│   │   ├── llm-formulas.ts   # LLM formula processing
│   │   └── types.ts          # Formula types
│   └── utils.ts              # Utility functions
└── types/
    └── spreadsheet.ts        # TypeScript types
```

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
npm start
```

## License

MIT
