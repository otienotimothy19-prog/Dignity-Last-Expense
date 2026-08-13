import { promises as fs } from "fs";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * Generated quotation/policy PDFs need to survive redeploys and be
 * reachable from every app instance — a local filesystem can't do either
 * on App Platform (ephemeral per-instance disk). When DO_SPACES_* env vars
 * are set, documents are stored in a DigitalOcean Space (S3-compatible);
 * otherwise this falls back to local disk under storage/documents, which
 * is all local dev needs and requires zero extra config.
 */
const LOCAL_DIR = path.join(process.cwd(), "storage", "documents");

function getSpacesClient(): { client: S3Client; bucket: string } | null {
  const key = process.env.DO_SPACES_KEY;
  const secret = process.env.DO_SPACES_SECRET;
  const endpoint = process.env.DO_SPACES_ENDPOINT;
  const bucket = process.env.DO_SPACES_BUCKET;
  if (!key || !secret || !endpoint || !bucket) return null;

  const client = new S3Client({
    endpoint,
    region: process.env.DO_SPACES_REGION || "us-east-1", // Spaces doesn't use AWS regions, but the SDK requires a value
    credentials: { accessKeyId: key, secretAccessKey: secret },
  });
  return { client, bucket };
}

export async function saveDocument(fileName: string, buffer: Buffer): Promise<void> {
  const spaces = getSpacesClient();
  if (spaces) {
    await spaces.client.send(
      new PutObjectCommand({
        Bucket: spaces.bucket,
        Key: fileName,
        Body: buffer,
        ContentType: "application/pdf",
        ACL: "private",
      })
    );
    return;
  }

  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, fileName), buffer);
}

export async function readDocument(fileName: string): Promise<Buffer> {
  const spaces = getSpacesClient();
  if (spaces) {
    const result = await spaces.client.send(new GetObjectCommand({ Bucket: spaces.bucket, Key: fileName }));
    const chunks: Buffer[] = [];
    for await (const chunk of result.Body as AsyncIterable<Buffer | Uint8Array>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  return fs.readFile(path.join(LOCAL_DIR, fileName));
}
