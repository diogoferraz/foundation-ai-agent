import { Router, Request, Response } from "express";
import { z } from "zod";
import { Document, DocumentService } from "../services/document";
import { ChunkerService } from "../services/chunker";
import { VectorStore } from "../services/vectorStore";
import * as path from "node:path";
import { promises as fs } from "node:fs";

const ingestContentSchema = z.object({
    content: z.string(),
    metadata: z.record(z.string(), z.any()).optional(),
});

const ingestDirectorySchema = z.object({}).optional();

class IngestRoutes {
    public router: Router;
    private vectorStore: VectorStore;

    constructor() {
        this.router = Router();
        this.vectorStore = new VectorStore();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/ingest", this.ingestContent.bind(this));
        this.router.post("/ingest/directory", this.ingestDirectory.bind(this));
    }

    private async ingestContent(req: Request, res: Response): Promise<void> {
        try {
            const parsed = ingestContentSchema.parse(req.body);
            const document = Document.fromContent(parsed.content, parsed.metadata);
            const chunks = ChunkerService.chunkDocument(document);

            // Embed and store chunks in Supabase
            await this.vectorStore.addChunks(chunks);
            const storedCount = await this.vectorStore.count();

            res.status(201).json({
                message: "Document ingested and stored successfully",
                document,
                chunksCreated: chunks.length,
                totalStored: storedCount,
            });

        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: "Validation error", details: error.issues });
            } else {
                res.status(500).json({ error: `Internal server error: ${error.message || error}` });
            }
        }
    }

    private async ingestDirectory(req: Request, res: Response): Promise<void> {
        try {
            // No longer using parsed.directory from request
            const assetsDir = path.join(process.cwd(), "assets");

            // Create directory if it doesn't exist (safety)
            try {
                await fs.access(assetsDir);
            } catch {
                res.status(404).json({
                    message: "You need to create the assets folder",
                });
                return;
            }

            const documents = await DocumentService.loadDocuments(assetsDir, {
                ignore: "**/*_imported.md"
            });

            if (documents.length === 0) {
                res.status(200).json({
                    message: "No new documents found to ingest in assets folder",
                    documentsProcessed: 0
                });
                return;
            }

            let totalChunks = 0;
            const processedFiles: string[] = [];

            for (const doc of documents) {
                const chunks = ChunkerService.chunkDocument(doc);
                await this.vectorStore.addChunks(chunks);
                totalChunks += chunks.length;

                // Rename file after successful ingestion
                const filePath = doc.metadata.source;
                if (filePath) {
                    const parsedPath = path.parse(filePath);
                    const newName = `${parsedPath.name}_imported${parsedPath.ext}`;
                    const newPath = path.join(parsedPath.dir, newName);

                    try {
                        await fs.rename(filePath, newPath);
                        processedFiles.push(newName);
                    } catch (renameError: any) {
                        console.error(`Failed to rename ${filePath}: ${renameError.message}`);
                    }
                }
            }

            const storedCount = await this.vectorStore.count();

            res.status(201).json({
                message: `Ingested ${documents.length} documents (${totalChunks} chunks) into vector store`,
                documentsProcessed: documents.length,
                processedFiles,
                chunksCreated: totalChunks,
                totalStored: storedCount,
            });

        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: "Validation error", details: error.issues });
            } else {
                res.status(500).json({ error: `Internal server error: ${error.message || error}` });
            }
        }
    }
}

export default new IngestRoutes().router;
