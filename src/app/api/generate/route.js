// src/app/api/generate/route.ts

import { NextResponse } from "next/server";
import { ChatGroq } from "@langchain/groq";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

const GROQ_API_KEY = "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";

// Initialize LangChain with Groq
const model = new ChatGroq({
  apiKey: GROQ_API_KEY,
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  temperature: 0.1, // Lower for more consistent output
});

// JSON output parser
const parser = new JsonOutputParser();

// Prompt template with format instructions
const prompt = PromptTemplate.fromTemplate(`
You are VibeDocs content generator. Create interactive HTML components based on user prompts.

{format_instructions}

Generate content based on:
- User Prompt: {prompt}
- Document Context: {context}

RULES:
1. Generate complete, functional HTML with inline CSS and JavaScript
2. Use unique IDs with timestamp {timestamp} to avoid conflicts
3. For charts, use Chart.js from CDN: https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js
4. Make everything responsive and beautiful
5. Wrap all JavaScript in IIFE to avoid variable conflicts
6. Include proper error handling and retries for external dependencies

EXAMPLES:
- "bitcoin chart" → Interactive Chart.js cryptocurrency price chart
- "calculator" → Functional calculator with modern styling
- "todo list" → Interactive task manager with add/delete/complete
- "weather widget" → Weather display with animations
- "color picker" → HSL/RGB color selection tool
- "timer" → Countdown timer with start/stop functionality

Generate appropriate content for the user's request.
`);

export async function POST(request) {
  try {
    const { prompt: userPrompt, documentContext } = await request.json();

    if (!userPrompt?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Prompt is required",
        },
        { status: 400 }
      );
    }

    const timestamp = Date.now();

    // Create the chain
    const chain = prompt.pipe(model).pipe(parser);

    // Generate content
    const result = await chain.invoke({
      prompt: userPrompt,
      context: documentContext || "No context available",
      timestamp: timestamp,
      format_instructions:
        parser.getFormatInstructions() +
        `

Return JSON with this exact structure:
{
  "type": "interactive" | "text",
  "content": "complete HTML string with inline CSS and JavaScript",
  "isReactive": boolean,
  "dependencies": ["array of CDN URLs"],
  "updateInterval": number | null
}`,
    });

    // Validate the result
    if (!result || typeof result !== "object") {
      throw new Error("Invalid JSON structure returned");
    }

    // Ensure required fields
    const validatedResult = {
      type: result.type || "text",
      content: result.content || "No content generated",
      isReactive: Boolean(result.isReactive),
      dependencies: Array.isArray(result.dependencies)
        ? result.dependencies
        : [],
      updateInterval: result.updateInterval || null,
    };

    console.log("Generated content:", {
      type: validatedResult.type,
      contentLength: validatedResult.content.length,
      dependencies: validatedResult.dependencies,
      isReactive: validatedResult.isReactive,
    });

    return NextResponse.json({ success: true, result: validatedResult });
  } catch (error) {
    console.error("Generation error:", error);

    // Better error messages
    let errorMessage = error.message;
    if (error.message.includes("JSON")) {
      errorMessage =
        "Failed to generate valid content structure. Please try rephrasing your request.";
    } else if (error.message.includes("API")) {
      errorMessage = "AI service temporarily unavailable. Please try again.";
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Package.json dependencies to add:
/*
{
  "dependencies": {
    "@langchain/core": "^0.1.0",
    "@langchain/groq": "^0.1.0",
    "langchain": "^0.1.0"
  }
}
*/
