"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import {
  Plus,
  GripVertical,
  X,
  Sparkles,
  Loader2,
  Type,
  Hash,
} from "lucide-react";

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
  isAccepted: boolean;
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
  onAccept: () => void;
  onAddBlock: (type: BlockType) => void;
}

interface AddBlockButtonProps {
  onAdd: (type: BlockType) => void;
}

export default function VibeDocs() {
  const [document, setDocument] = useState<DocumentType>({
    id: null,
    title: "Untitled",
    blocks: [],
  });

  useEffect(() => {
    createNewDocument();
  }, []);

  const createNewDocument = async () => {
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
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
      isAccepted: false,
      position: index,
    };

    const newBlocks = [...document.blocks];
    newBlocks.splice(index, 0, newBlock);
    setDocument((prev) => ({ ...prev, blocks: newBlocks }));
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Notion-style header */}
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Title */}
        <div className="mb-12">
          <input
            value={document.title}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setDocument((prev) => ({ ...prev, title: e.target.value }))
            }
            className="text-5xl font-bold bg-transparent border-none outline-none text-white placeholder-gray-500 w-full"
            placeholder="Untitled"
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              lineHeight: 1.2,
              backgroundColor: "transparent",
              color: "#ffffff",
            }}
          />
        </div>

        {/* Blocks */}
        <div className="space-y-2">
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

        {/* Empty state */}
        {document.blocks.length === 0 && (
          <div className="py-16">
            <div className="text-center">
              <div className="text-gray-400 mb-6">
                <Hash className="w-12 h-12 mx-auto mb-4" />
                <p className="text-lg">Start writing or add a block</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => addBlock("text")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <Type className="w-4 h-4" />
                  Text
                </button>
                <button
                  onClick={() => addBlock("generated")}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  AI Block
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add block at end */}
        {document.blocks.length > 0 && (
          <div className="mt-4">
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
  const [isHovered, setIsHovered] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const acceptedContentRef = useRef<HTMLDivElement>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState<Set<string>>(new Set());

  const loadDependencies = async (dependencies: string[]) => {
    const scriptDependencies = dependencies.filter(
      (dep) => dep.includes(".js") || dep.includes(".css")
    );

    for (const dep of scriptDependencies) {
      if (scriptsLoaded.has(dep)) continue;

      try {
        await new Promise<void>((resolve) => {
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
            resolve();
          };

          document.head.appendChild(element);
        });
      } catch (error) {
        console.warn("Failed to load dependency:", dep, error);
      }
    }
  };

  const executeScripts = async (container: HTMLElement) => {
    const scripts = container.querySelectorAll("script");

    for (const script of Array.from(scripts)) {
      try {
        if (!script.src) {
          await new Promise<void>((resolve) => {
            setTimeout(() => {
              try {
                const newScript = document.createElement("script");
                newScript.textContent = script.textContent;
                if (script.parentNode) {
                  script.parentNode.replaceChild(newScript, script);
                }
              } catch (error) {
                console.error("Script execution error:", error);
              }
              resolve();
            }, 200);
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
        const targetRef = block.isAccepted ? acceptedContentRef : contentRef;
        if (!targetRef.current) return;

        targetRef.current.innerHTML = "";

        if (block.generatedContent.dependencies?.length) {
          try {
            await loadDependencies(block.generatedContent.dependencies);
          } catch (error) {
            console.error("Failed to load dependencies:", error);
          }
        }

        targetRef.current.innerHTML = block.generatedContent.content;
        await executeScripts(targetRef.current);
      }
    };

    renderContent();
  }, [block.generatedContent, block.isAccepted, scriptsLoaded]);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start">
        {/* Notion-style drag handle */}
        <div
          className={`flex items-center justify-center w-6 h-8 mt-1 transition-opacity ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <GripVertical className="w-4 h-4 text-gray-500 cursor-grab hover:text-gray-300" />
        </div>

        {/* Block content */}
        <div className="flex-1 min-w-0">
          {block.type === "text" ? (
            <textarea
              value={block.content}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                onUpdate({ content: e.target.value })
              }
              placeholder="Type '/' for commands"
              className="w-full bg-transparent border-none outline-none resize-none text-white placeholder-gray-500 text-base leading-relaxed py-2"
              style={{
                minHeight: "2.5rem",
                fontSize: "16px",
                lineHeight: "1.6",
                backgroundColor: "transparent",
                color: "#ffffff",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
            />
          ) : block.isAccepted ? (
            // Clean accepted content
            <div className="py-2">
              {block.generatedContent?.type === "text" ? (
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-gray-300 bg-gray-800 p-4 rounded-lg font-mono text-sm">
                    {block.generatedContent.content}
                  </pre>
                </div>
              ) : (
                <div
                  ref={acceptedContentRef}
                  className="generated-content notion-content"
                />
              )}
            </div>
          ) : (
            // AI generation interface
            <div className="py-2">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-gray-300">
                    AI Block
                  </span>
                  {block.generatedContent?.dependencies?.length && (
                    <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                      {block.generatedContent.dependencies.length} deps
                    </span>
                  )}
                </div>

                {/* Prompt input */}
                <input
                  value={block.prompt}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onUpdate({ prompt: e.target.value })
                  }
                  placeholder="Describe what you want to generate..."
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 mb-4"
                />

                {/* Generate button */}
                <button
                  onClick={onGenerate}
                  disabled={!block.prompt.trim() || block.isGenerating}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {block.isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {block.generatedContent ? "Regenerate" : "Generate"}
                    </>
                  )}
                </button>

                {/* Preview */}
                {block.generatedContent && (
                  <div className="mt-4">
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-600 mb-3">
                      {block.generatedContent.type === "text" ? (
                        <pre className="whitespace-pre-wrap text-gray-300 text-sm font-mono">
                          {block.generatedContent.content}
                        </pre>
                      ) : (
                        <div
                          ref={contentRef}
                          className="generated-content notion-content"
                        />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={onAccept}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                      >
                        ✓ Accept
                      </button>
                      <button
                        onClick={onGenerate}
                        disabled={block.isGenerating}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        🔄 Retry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Delete button */}
        <div
          className={`flex items-center justify-center w-6 h-8 mt-1 ml-2 transition-opacity ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={onDelete}
            className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add block menu */}
      {showAddMenu && (
        <div className="absolute left-6 mt-1 z-10">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-1 min-w-[140px]">
            <button
              onClick={() => {
                onAddBlock("text");
                setShowAddMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center gap-2"
            >
              <Type className="w-4 h-4" />
              Text
            </button>
            <button
              onClick={() => {
                onAddBlock("generated");
                setShowAddMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Block
            </button>
          </div>
        </div>
      )}

      {/* Add block trigger */}
      <div
        className={`transition-opacity ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="absolute left-6 -bottom-1 w-5 h-5 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 flex items-center justify-center transition-colors"
        >
          <Plus className="w-3 h-3 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

function AddBlockButton({ onAdd }: AddBlockButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative pl-6">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
      >
        <Plus className="w-4 h-4" />
        Add a block
      </button>

      {showMenu && (
        <div className="absolute top-full mt-1 left-6 z-10">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-1 min-w-[140px]">
            <button
              onClick={() => {
                onAdd("text");
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center gap-2"
            >
              <Type className="w-4 h-4" />
              Text
            </button>
            <button
              onClick={() => {
                onAdd("generated");
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Block
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
