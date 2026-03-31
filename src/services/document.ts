import { promises as fs } from "node:fs";
import * as path from "node:path";
import crypto from "node:crypto";
import { glob, GlobOptions } from "glob";

export interface DocumentMetadata {
    source?: string;
    filename?: string;
    extension?: string;
    [key: string]: any;
}

export class Document {
    content: string;
    metadata: DocumentMetadata;
    doc_id: string;

    constructor(content: string, metadata: DocumentMetadata, doc_id: string) {
        this.content = content;
        this.metadata = metadata;
        this.doc_id = doc_id;
    }

    static generateId(content: string): string {
        return crypto.createHash("md5").update(content, "utf-8").digest("hex").slice(0, 12);
    }

    static fromContent(content: string, metadata: DocumentMetadata = {}): Document {
        const doc_id = Document.generateId(content);
        return new Document(content, metadata, doc_id);
    }

    static async fromFile(filePath: string): Promise<Document> {
        const content = await fs.readFile(filePath, { encoding: "utf-8" });
        const doc_id = Document.generateId(content);

        const parsedPath = path.parse(filePath);
        const metadata: DocumentMetadata = {
            source: filePath,
            filename: parsedPath.base,
            extension: parsedPath.ext,
        };

        return new Document(content, metadata, doc_id);
    }
}

export class DocumentService {
    /**
     * Load all matching .md documents from a directory.
     */
    static async loadDocuments(directory: string, options: { ignore?: string | string[] } = {}): Promise<Document[]> {
        const docs: Document[] = [];

        // We navigate to the directory and run glob there, or we can use absolute path
        // glob handles patterns. We can join directory and pattern, but need to ensure it uses forwards slashes
        const searchPattern = path.posix.join(directory.split(path.sep).join(path.posix.sep), "**/*.md");

        const globOptions: GlobOptions = { absolute: true };
        if (options.ignore) {
            globOptions.ignore = options.ignore;
        }

        const matchedPaths = await glob(searchPattern, globOptions);

        for (const match of matchedPaths) {
            const matchPath = typeof match === "string" ? match : match.fullpath();
            try {
                const stat = await fs.stat(matchPath);
                if (stat.isFile()) {
                    const doc = await Document.fromFile(matchPath);
                    docs.push(doc);
                }
            } catch (e: any) {
                console.error(`Failed to load ${matchPath}: ${e.message}`);
            }
        }

        return docs;
    }
}
