// src/app/api/generate/route.ts

import { NextResponse } from "next/server";
import { ChatGroq } from "@langchain/groq";
import {
  StructuredOutputParser,
  OutputFixingParser,
} from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";



// Define the exact schema we want
const outputSchema = z.object({
  type: z
    .enum(["interactive", "text"])
    .describe("The type of content generated"),
  content: z
    .string()
    .min(50)
    .describe("Complete HTML with inline CSS and JavaScript"),
  isReactive: z
    .boolean()
    .describe("Whether this block should update when document changes"),
  dependencies: z
    .array(z.string().url())
    .describe("Array of CDN URLs for scripts/CSS only"),
  updateInterval: z
    .number()
    .nullable()
    .describe("Update interval in milliseconds or null"),
});

// Initialize LangChain with Groq
const model = new ChatGroq({
  apiKey: GROQ_API_KEY,
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  temperature: 0, // Zero temperature for maximum consistency
  maxTokens: 4000,
});

// Create structured output parser with schema
const parser = StructuredOutputParser.fromZodSchema(outputSchema);

// Create output fixing parser as fallback
const outputFixingParser = OutputFixingParser.fromLLM(model, parser);

// Enhanced prompt template
const prompt = PromptTemplate.fromTemplate(`
You are VibeDocs content generator. You MUST return valid JSON matching the exact schema.

TASK: Generate complete, functional HTML component for: "{userPrompt}"

REQUIREMENTS:
1. Return ONLY valid JSON - no explanations, no markdown, no extra text
2. Generate complete HTML with ALL styling and JavaScript inline
3. Use unique IDs with timestamp {timestamp} to avoid conflicts
4. Dependencies must be valid CDN URLs only (no data APIs)
5. Content must be substantial and fully functional

SCHEMA:
{format_instructions}

EXAMPLES OF VALID RESPONSES:

For "calculator":
{{
  "type": "interactive",
  "content": "<div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 25px; max-width: 320px; margin: 0 auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2);'><h4 style='margin: 0 0 20px 0; text-align: center; color: white; font-size: 1.3em; font-weight: 600;'>🧮 Calculator</h4><input type='text' id='calcDisplay_{timestamp}' readonly style='width: 100%; padding: 15px; border: none; border-radius: 12px; text-align: right; font-size: 1.5em; margin-bottom: 20px; background: rgba(255,255,255,0.9); box-sizing: border-box; font-family: monospace; color: #333;'><div style='display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;'><button onclick='clearCalc_{timestamp}()' style='grid-column: span 2; padding: 15px; border: none; border-radius: 10px; background: #ff6b6b; color: white; cursor: pointer; font-size: 16px; font-weight: 600;'>Clear</button><button onclick='calcInput_{timestamp}(\"/\")' style='padding: 15px; border: none; border-radius: 10px; background: #4ecdc4; color: white; cursor: pointer; font-size: 18px; font-weight: 600;'>÷</button><button onclick='calcInput_{timestamp}(\"*\")' style='padding: 15px; border: none; border-radius: 10px; background: #4ecdc4; color: white; cursor: pointer; font-size: 18px; font-weight: 600;'>×</button><button onclick='calcInput_{timestamp}(\"7\")' style='padding: 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-size: 18px; font-weight: 600;'>7</button><button onclick='calcInput_{timestamp}(\"8\")' style='padding: 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-size: 18px; font-weight: 600;'>8</button><button onclick='calcInput_{timestamp}(\"9\")' style='padding: 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-size: 18px; font-weight: 600;'>9</button><button onclick='calcInput_{timestamp}(\"-\")' style='padding: 15px; border: none; border-radius: 10px; background: #4ecdc4; color: white; cursor: pointer; font-size: 20px; font-weight: 600;'>-</button><button onclick='calcInput_{timestamp}(\"4\")' style='padding: 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-size: 18px; font-weight: 600;'>4</button><button onclick='calcInput_{timestamp}(\"5\")' style='padding: 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-size: 18px; font-weight: 600;'>5</button><button onclick='calcInput_{timestamp}(\"6\")' style='padding: 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-size: 18px; font-weight: 600;'>6</button><button onclick='calcInput_{timestamp}(\"+\")' style='padding: 15px; border: none; border-radius: 10px; background: #4ecdc4; color: white; cursor: pointer; font-size: 20px; font-weight: 600;'>+</button><button onclick='calcInput_{timestamp}(\"1\")' style='padding: 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-size: 18px; font-weight: 600;'>1</button><button onclick='calcInput_{timestamp}(\"2\")' style='padding: 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-size: 18px; font-weight: 600;'>2</button><button onclick='calcInput_{timestamp}(\"3\")' style='padding: 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-size: 18px; font-weight: 600;'>3</button><button onclick='calculate_{timestamp}()' style='grid-row: span 2; padding: 15px; border: none; border-radius: 10px; background: #45b7d1; color: white; cursor: pointer; font-size: 24px; font-weight: 600;'>=</button><button onclick='calcInput_{timestamp}(\"0\")' style='grid-column: span 2; padding: 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-size: 18px; font-weight: 600;'>0</button><button onclick='calcInput_{timestamp}(\".\")' style='padding: 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-size: 20px; font-weight: 600;'>.</button></div><script>(function(){{ let calcValue_{timestamp} = ''; window.calcInput_{timestamp} = function(value) {{ calcValue_{timestamp} += value; const display = document.getElementById('calcDisplay_{timestamp}'); if (display) display.value = calcValue_{timestamp}; }}; window.clearCalc_{timestamp} = function() {{ calcValue_{timestamp} = ''; const display = document.getElementById('calcDisplay_{timestamp}'); if (display) display.value = ''; }}; window.calculate_{timestamp} = function() {{ try {{ calcValue_{timestamp} = eval(calcValue_{timestamp}).toString(); const display = document.getElementById('calcDisplay_{timestamp}'); if (display) display.value = calcValue_{timestamp}; }} catch(e) {{ const display = document.getElementById('calcDisplay_{timestamp}'); if (display) display.value = 'Error'; calcValue_{timestamp} = ''; }} }}; }})();</script></div>",
  "isReactive": false,
  "dependencies": [],
  "updateInterval": null
}}

USER REQUEST: {userPrompt}
DOCUMENT CONTEXT: {context}
TIMESTAMP: {timestamp}

Return valid JSON for this request:
`);

// JSON cleaning function
function cleanJsonString(str) {
  // Remove any text before the first {
  const startIndex = str.indexOf("{");
  if (startIndex === -1) throw new Error("No JSON object found");

  // Find the last }
  const endIndex = str.lastIndexOf("}");
  if (endIndex === -1) throw new Error("No closing brace found");

  let cleanStr = str.substring(startIndex, endIndex + 1);

  // Fix common issues
  cleanStr = cleanStr
    .replace(/```json\s*/g, "") // Remove markdown
    .replace(/```\s*/g, "") // Remove markdown
    .replace(/\n\s*\/\/.*$/gm, "") // Remove comments
    .replace(/,(\s*[}\]])/g, "$1") // Remove trailing commas
    .replace(/\\\"/g, '"') // Fix escaped quotes
    .replace(/\\\\/g, "\\"); // Fix double escapes

  return cleanStr;
}

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

    // Create the chain with structured output
    const chain = prompt.pipe(model);

    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Generation attempt ${attempts} for: ${userPrompt}`);

        // Get raw response
        const response = await chain.invoke({
          userPrompt,
          context: documentContext || "No context available",
          timestamp: timestamp,
          format_instructions: parser.getFormatInstructions(),
        });

        const rawContent = response.content;
        console.log(`Raw response length: ${rawContent.length}`);

        // Try structured parser first
        try {
          result = await parser.parse(rawContent);
          console.log("✅ Structured parser succeeded");
          break;
        } catch (parseError) {
          console.log(
            "❌ Structured parser failed, trying output fixing parser..."
          );

          // Try output fixing parser
          try {
            result = await outputFixingParser.parse(rawContent);
            console.log("✅ Output fixing parser succeeded");
            break;
          } catch (fixError) {
            console.log(
              "❌ Output fixing parser failed, trying manual cleaning..."
            );

            // Try manual JSON cleaning
            try {
              const cleanedJson = cleanJsonString(rawContent);
              result = JSON.parse(cleanedJson);

              // Validate against schema
              const validatedResult = outputSchema.parse(result);
              result = validatedResult;
              console.log("✅ Manual cleaning succeeded");
              break;
            } catch (cleanError) {
              console.log(`❌ Manual cleaning failed: ${cleanError.message}`);

              if (attempts === maxAttempts) {
                throw new Error(
                  `Failed to parse after ${maxAttempts} attempts. Last error: ${cleanError.message}`
                );
              }
            }
          }
        }
      } catch (error) {
        console.log(`Attempt ${attempts} failed: ${error.message}`);
        if (attempts === maxAttempts) {
          throw error;
        }
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Final validation
    if (!result || !result.content || result.content.length < 50) {
      throw new Error("Generated content is too minimal or empty");
    }

    // Clean dependencies
    const cleanDependencies = (result.dependencies || []).filter(
      (dep) =>
        typeof dep === "string" &&
        dep.startsWith("http") &&
        (dep.includes(".js") || dep.includes(".css"))
    );

    const finalResult = {
      type: result.type || "interactive",
      content: result.content,
      isReactive: Boolean(result.isReactive),
      dependencies: cleanDependencies,
      updateInterval: result.updateInterval || null,
    };

    console.log("✅ Generation successful:", {
      type: finalResult.type,
      contentLength: finalResult.content.length,
      dependencies: finalResult.dependencies.length,
      attempts,
    });

    return NextResponse.json({ success: true, result: finalResult });
  } catch (error) {
    console.error("❌ Final generation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: `Generation failed: ${error.message}. Please try rephrasing your request.`,
      },
      { status: 500 }
    );
  }
}

// Install these dependencies:
// npm install zod langchain @langchain/core @langchain/groq
