import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// In-memory storage (use Redis/DB in production)
const documents = new Map();

export async function POST(request) {
  const { title } = await request.json();

  const doc = {
    id: uuidv4(),
    title: title || "Untitled Document",
    blocks: [],
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  documents.set(doc.id, doc);
  return NextResponse.json(doc);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const doc = documents.get(id);
    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(doc);
  }

  return NextResponse.json([...documents.values()]);
}
