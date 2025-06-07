"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Grip, X, Sparkles, Loader2 } from "lucide-react";

// Types
type BlockType = "text" | "generated";

interface GeneratedContent {
  type: "text" | "html" | "interactive";
  content: string;
  isReactive?: boolean;
  dependencies?: string[];
}

interface Block {
  id: string;
  type: BlockType;
  content: string;
  prompt: string;
  generatedContent: GeneratedContent | null;
  isGenerating: boolean;
  isAccepted: boolean; // New field for tracking acceptance
  position: number;
}

interface DocumentType {
  id: string | null;
  title: string;
  blocks: Block[];
}

interface BlockComponentProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
  onGenerate: () => void;
  onAccept: () => void; // New accept handler
  onAddBlock: (type: BlockType) => void;
}

interface AddBlockButtonProps {
  onAdd: (type: BlockType) => void;
}

export default function VibeDocs() {
  const [document, setDocument] = useState<DocumentType>({
    id: null,
    title: "Untitled Document",
    blocks: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    createNewDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createNewDocument = async () => {
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "My VibeDocs Document" }),
      });
      const newDoc = await response.json();
      setDocument(newDoc);
    } catch (error) {
      console.error("Error creating document:", error);
    }
  };

  const addBlock = (
    type: BlockType,
    index: number = document.blocks.length
  ) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: "",
      prompt: "",
      generatedContent: null,
      isGenerating: false,
      isAccepted: false, // Initialize as not accepted
      position: index,
    };

    const newBlocks = [...document.blocks];
    newBlocks.splice(index, 0, newBlock);

    setDocument((prev) => ({
      ...prev,
      blocks: newBlocks,
    }));
  };

  const updateBlock = (blockId: string, updates: Partial<Block>) => {
    setDocument((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) =>
        block.id === blockId ? { ...block, ...updates } : block
      ),
    }));
  };

  const deleteBlock = (blockId: string) => {
    setDocument((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((block) => block.id !== blockId),
    }));
  };

  const generateBlockContent = async (blockId: string) => {
    const block = document.blocks.find((b) => b.id === blockId);
    if (!block || !block.prompt.trim()) return;

    updateBlock(blockId, { isGenerating: true });

    try {
      const documentContext = document.blocks
        .filter((b) => b.type === "text" && b.content)
        .map((b) => b.content)
        .join("\n\n");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: block.prompt,
          documentContext,
        }),
      });

      const data = await response.json();

      if (data.success) {
        updateBlock(blockId, {
          generatedContent: data.result,
          isGenerating: false,
        });

        // Trigger reactive blocks
        triggerReactiveBlocks(documentContext);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      updateBlock(blockId, {
        isGenerating: false,
        generatedContent: {
          type: "text",
          content: `Error: ${error.message}`,
        },
      });
    }
  };

  const acceptBlock = (blockId: string) => {
    updateBlock(blockId, { isAccepted: true });
  };

  const triggerReactiveBlocks = async (documentContext: string) => {
    const reactiveBlocks = document.blocks.filter(
      (block) =>
        block.generatedContent?.isReactive &&
        (block.prompt.toLowerCase().includes("summary") ||
          block.prompt.toLowerCase().includes("citation"))
    );

    for (const block of reactiveBlocks) {
      await generateBlockContent(block.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Input
            value={document.title}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setDocument((prev) => ({ ...prev, title: e.target.value }))
            }
            className="text-3xl font-bold border-none bg-transparent px-0 focus-visible:ring-0 placeholder:text-gray-400"
            placeholder="Untitled Document"
          />
          <p className="text-sm text-gray-500 mt-2">
            ✨ Powered by Groq LLM - Generate anything with natural language
          </p>
        </div>

        {/* Blocks */}
        <div className="space-y-4">
          {document.blocks.map((block, index) => (
            <BlockComponent
              key={block.id}
              block={block}
              onUpdate={(updates) => updateBlock(block.id, updates)}
              onDelete={() => deleteBlock(block.id)}
              onGenerate={() => generateBlockContent(block.id)}
              onAccept={() => acceptBlock(block.id)}
              onAddBlock={(type) => addBlock(type, index + 1)}
            />
          ))}
        </div>

        {/* Add first block */}
        {document.blocks.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-600 mb-4">
              Start creating your dynamic document
            </h3>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => addBlock("text")} variant="outline">
                Add Text Block
              </Button>
              <Button
                onClick={() => addBlock("generated")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Add AI Block
              </Button>
            </div>
          </div>
        )}

        {/* Add block at end */}
        {document.blocks.length > 0 && (
          <div className="mt-6 flex justify-center">
            <AddBlockButton onAdd={(type) => addBlock(type)} />
          </div>
        )}
      </div>
    </div>
  );
}

function BlockComponent({
  block,
  onUpdate,
  onDelete,
  onGenerate,
  onAccept,
  onAddBlock,
}: BlockComponentProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const acceptedContentRef = useRef<HTMLDivElement>(null); // Separate ref for accepted content
  const [scriptsLoaded, setScriptsLoaded] = useState<Set<string>>(new Set());

  // Load external dependencies first
  const loadDependencies = async (dependencies: string[]) => {
    // Filter out non-script URLs (like data APIs)
    const scriptDependencies = dependencies.filter(
      (dep) => dep.includes(".js") || dep.includes(".css")
    );

    for (const dep of scriptDependencies) {
      if (scriptsLoaded.has(dep)) continue;

      try {
        await new Promise<void>((resolve, reject) => {
          // Check if script already exists
          const existingScript = document.querySelector(`script[src="${dep}"]`);
          if (existingScript) {
            setScriptsLoaded((prev) => new Set([...prev, dep]));
            resolve();
            return;
          }

          const element = dep.includes(".css")
            ? document.createElement("link")
            : document.createElement("script");

          if (dep.includes(".css")) {
            (element as HTMLLinkElement).rel = "stylesheet";
            (element as HTMLLinkElement).href = dep;
          } else {
            (element as HTMLScriptElement).src = dep;
            (element as HTMLScriptElement).async = true;
          }

          element.onload = () => {
            setScriptsLoaded((prev) => new Set([...prev, dep]));
            resolve();
          };
          element.onerror = () => {
            console.warn(`Failed to load dependency: ${dep}`);
            // Don't reject - just warn and continue
            resolve();
          };

          document.head.appendChild(element);
        });
      } catch (error) {
        console.warn("Failed to load dependency:", dep, error);
        // Continue with other dependencies
      }
    }
  };

  // Enhanced script execution with proper timing
  const executeScripts = async (container: HTMLElement) => {
    const scripts = container.querySelectorAll("script");

    for (const script of Array.from(scripts)) {
      try {
        if (script.src) {
          // Skip external scripts - they're handled by loadDependencies
          continue;
        } else {
          // Inline script - execute with delay to ensure DOM is ready
          await new Promise<void>((resolve) => {
            setTimeout(() => {
              try {
                const newScript = document.createElement("script");
                newScript.textContent = script.textContent;

                // Replace the old script with new one
                if (script.parentNode) {
                  script.parentNode.replaceChild(newScript, script);
                }
              } catch (error) {
                console.error("Script execution error:", error);
              }
              resolve();
            }, 200); // Increased delay for better stability
          });
        }
      } catch (error) {
        console.error("Script processing error:", error);
      }
    }
  };

  useEffect(() => {
    const renderContent = async () => {
      if (
        (block.generatedContent?.type === "html" ||
          block.generatedContent?.type === "interactive") &&
        block.generatedContent.content
      ) {
        // Choose the right ref based on acceptance status
        const targetRef = block.isAccepted ? acceptedContentRef : contentRef;

        if (!targetRef.current) return;

        // Clear previous content
        targetRef.current.innerHTML = "";

        // Load dependencies first
        if (block.generatedContent.dependencies?.length) {
          try {
            await loadDependencies(block.generatedContent.dependencies);
          } catch (error) {
            console.error("Failed to load dependencies:", error);
          }
        }

        // Set the HTML content
        targetRef.current.innerHTML = block.generatedContent.content;

        // Execute scripts with proper timing
        await executeScripts(targetRef.current);
      }
    };

    renderContent();
  }, [block.generatedContent, block.isAccepted, scriptsLoaded]);

  return (
    <div className="group relative">
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-3">
          <Grip className="w-4 h-4 text-gray-400 cursor-grab hover:text-gray-600" />
        </div>

        {/* Block content */}
        <div className="flex-1">
          {block.type === "text" ? (
            <Textarea
              value={block.content}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                onUpdate({ content: e.target.value })
              }
              placeholder="Start writing your document..."
              className="min-h-[120px] border-none bg-transparent resize-none focus-visible:ring-0 text-base leading-relaxed placeholder:text-gray-400"
            />
          ) : block.isAccepted ? (
            // Show only the clean generated content once accepted
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {block.generatedContent?.type === "text" ? (
                <div className="p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {block.generatedContent.content}
                  </pre>
                </div>
              ) : (
                <div
                  ref={acceptedContentRef}
                  className="generated-content"
                  style={{ minHeight: "100px" }}
                />
              )}
            </div>
          ) : (
            // Show the AI prompt interface with generation and acceptance flow
            <Card className="p-5 border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-800">
                    AI Generated Block
                  </span>
                  {block.generatedContent?.dependencies?.length && (
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                      {block.generatedContent.dependencies.length} dependencies
                    </span>
                  )}
                </div>

                {/* Prompt input */}
                <Input
                  value={block.prompt}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onUpdate({ prompt: e.target.value })
                  }
                  placeholder="Describe what you want to generate... (e.g., 'bitcoin price chart', 'calculator', 'todo list')"
                  className="border-purple-200 focus:border-purple-400"
                />

                {/* Generate button */}
                <Button
                  onClick={onGenerate}
                  disabled={!block.prompt.trim() || block.isGenerating}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {block.isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating with Groq...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {block.generatedContent
                        ? "Regenerate Content"
                        : "Generate Content"}
                    </>
                  )}
                </Button>

                {/* Generated content preview */}
                {block.generatedContent && (
                  <div className="mt-4">
                    <div className="bg-white rounded-lg border border-purple-200 p-4 mb-3">
                      {block.generatedContent.type === "text" ? (
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                          {block.generatedContent.content}
                        </pre>
                      ) : (
                        <div
                          ref={contentRef}
                          className="generated-content"
                          style={{ minHeight: "100px" }}
                        />
                      )}
                    </div>

                    {/* Accept/Regenerate actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={onAccept}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        ✓ Accept & Finalize
                      </Button>
                      <Button
                        onClick={onGenerate}
                        disabled={block.isGenerating}
                        variant="outline"
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        🔄 Try Again
                      </Button>
                    </div>

                    <p className="text-xs text-purple-600 mt-2 text-center">
                      💡 Not happy? Modify your prompt and regenerate, or accept
                      to finalize
                    </p>
                  </div>
                )}

                {/* Helper text when no content */}
                {!block.generatedContent && (
                  <div className="mt-4 text-center text-sm text-purple-600">
                    💡 Describe what you want and click Generate
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Delete button */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Add block menu */}
      {showAddMenu && (
        <div className="absolute left-12 mt-2 z-10">
          <Card className="p-2 shadow-lg border-purple-200">
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onAddBlock("text");
                  setShowAddMenu(false);
                }}
                className="w-full justify-start text-sm"
              >
                Text Block
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onAddBlock("generated");
                  setShowAddMenu(false);
                }}
                className="w-full justify-start text-sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Block
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add block trigger */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="absolute left-12 -bottom-2 h-6 w-6 p-0 rounded-full bg-white border border-purple-200 shadow-sm hover:shadow-md hover:border-purple-300"
        >
          <Plus className="w-3 h-3 text-purple-600" />
        </Button>
      </div>
    </div>
  );
}

function AddBlockButton({ onAdd }: AddBlockButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setShowMenu(!showMenu)}
        className="border-purple-200 text-purple-600 hover:bg-purple-50"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Block
      </Button>

      {showMenu && (
        <Card className="absolute top-full mt-2 p-2 shadow-lg z-10 border-purple-200">
          <div className="space-y-1 min-w-[150px]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onAdd("text");
                setShowMenu(false);
              }}
              className="w-full justify-start text-sm"
            >
              Text Block
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onAdd("generated");
                setShowMenu(false);
              }}
              className="w-full justify-start text-sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Block
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
