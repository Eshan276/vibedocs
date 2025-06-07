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
You are VibeDocs content generator. Create complete, functional HTML components.

{format_instructions}

User wants: {prompt}
Document context: {context}
Unique timestamp: {timestamp}

CRITICAL REQUIREMENTS:
1. Generate COMPLETE HTML with ALL CSS and JavaScript inline
2. Include full implementation - not just empty containers
3. Dependencies should only be script/CSS URLs, never data APIs
4. Use unique IDs with timestamp {timestamp} to avoid conflicts
5. Wrap JavaScript in IIFE with timestamp-specific variables
6. Include proper styling, error handling, and functionality

For charts:
- Use Chart.js from: https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js
- Generate mock data or use simulated live data
- Include complete chart initialization code

For interactive widgets:
- Include all event handlers and logic
- Use modern CSS styling with gradients/shadows
- Make responsive and beautiful

EXAMPLE OUTPUT for "calculator":
{{
  "type": "interactive",
  "content": "<div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 25px; max-width: 320px; margin: 0 auto;'><h4 style='color: white; text-align: center; margin: 0 0 20px 0;'>Calculator</h4><input type='text' id='display_{timestamp}' readonly style='width: 100%; padding: 15px; border: none; border-radius: 12px; text-align: right; font-size: 1.5em; margin-bottom: 20px; box-sizing: border-box;'><div style='display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;'><button onclick='clear_{timestamp}()' style='padding: 15px; border: none; border-radius: 10px; background: #ff6b6b; color: white; cursor: pointer;'>C</button><!-- more buttons --></div><script>(function(){{ let value_{timestamp} = ''; window.clear_{timestamp} = function(){{ value_{timestamp} = ''; document.getElementById('display_{timestamp}').value = ''; }}; }})();</script></div>",
  "isReactive": false,
  "dependencies": [],
  "updateInterval": null
}}

Generate the complete implementation for: {prompt}
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

    // Generate content with retries
    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        result = await chain.invoke({
          prompt: userPrompt,
          context: documentContext || "No context available",
          timestamp: timestamp,
          format_instructions: `Return JSON with this exact structure:
{
  "type": "interactive" | "text",
  "content": "complete HTML string with inline CSS and JavaScript - must be fully functional",
  "isReactive": boolean,
  "dependencies": ["only CDN URLs for scripts/CSS, no data APIs"],
  "updateInterval": number | null
}

The content field must contain a complete, working implementation with all styling and JavaScript inline.`,
        });
        console.log("Raw result:", result);
        if (result && typeof result === "object" && result.content) {
          console.log("Raw result:", result);
          break;
        }
        throw new Error("Incomplete result");
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          throw error;
        }
        console.log(`Attempt ${attempts} failed, retrying...`);
      }
    }

    // Validate and clean the result
    const validatedResult = {
      type: result.type || "interactive",
      content: result.content || "",
      isReactive: Boolean(result.isReactive),
      dependencies: Array.isArray(result.dependencies)
        ? result.dependencies.filter(
            (dep) =>
              typeof dep === "string" &&
              (dep.includes(".js") || dep.includes(".css")) &&
              dep.startsWith("http")
          )
        : [],
      updateInterval: result.updateInterval || null,
    };

    // Ensure content is substantial
    if (validatedResult.content.length < 100) {
      throw new Error(
        "Generated content too minimal - please be more specific in your request"
      );
    }

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
        "Failed to generate valid content. Please try rephrasing your request.";
    } else if (error.message.includes("API")) {
      errorMessage = "AI service temporarily unavailable. Please try again.";
    } else if (error.message.includes("minimal")) {
      errorMessage = error.message;
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
