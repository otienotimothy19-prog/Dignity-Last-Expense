import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STORAGE_DIR = path.join(process.cwd(), "storage", "documents");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(STORAGE_DIR, document.filePath);
  const buffer = await fs.readFile(filePath);

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DOCUMENT_DOWNLOADED",
      entityType: "Document",
      entityRef: document.referenceCode,
    },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.referenceCode}.pdf"`,
    },
  });
}
