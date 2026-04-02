import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, loadCredentialsFromProfile } from "@/lib/api-helpers";
import { fetchCategories } from "@/lib/bigcommerce/client";

export interface CategoryTreeNode {
  id: number;
  name: string;
  children: CategoryTreeNode[];
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;

  const creds = await loadCredentialsFromProfile(uid);
  if (creds.error) return creds.error;

  try {
    const categories = await fetchCategories(creds.config);

    // Build tree from flat list using parent_id
    const nodeMap = new Map<number, CategoryTreeNode>();
    for (const cat of categories) {
      nodeMap.set(cat.id, { id: cat.id, name: cat.name, children: [] });
    }

    const roots: CategoryTreeNode[] = [];
    for (const cat of categories) {
      const node = nodeMap.get(cat.id)!;
      if (cat.parent_id === 0 || !nodeMap.has(cat.parent_id)) {
        roots.push(node);
      } else {
        nodeMap.get(cat.parent_id)!.children.push(node);
      }
    }

    // Sort children alphabetically at each level
    const sortTree = (nodes: CategoryTreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      for (const node of nodes) {
        if (node.children.length > 0) sortTree(node.children);
      }
    };
    sortTree(roots);

    return NextResponse.json({ categories: roots });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch categories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
