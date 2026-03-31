import { Document, DocumentMetadata } from "./document";

export interface Chunk {
    content: string;
    metadata: DocumentMetadata & { chunk_index: number };
    chunk_id: string;
    doc_id: string;
}

export interface ChunkerStrategy {
    chunk(doc: Document): Chunk[];
}

export interface RecursiveChunkerOptions {
    chunkSize?: number;
    overlap?: number;
    separators?: string[];
}

export class RecursiveChunker implements ChunkerStrategy {
    private chunkSize: number;
    private overlap: number;
    private separators: string[];

    constructor(options: RecursiveChunkerOptions = {}) {
        this.chunkSize = options.chunkSize || 1000;
        this.overlap = options.overlap || 200;
        this.separators = options.separators || ["\n\n", "\n", ". ", " ", ""];
    }

    private splitText(text: string, sepIndex: number = 0): string[] {
        if (sepIndex >= this.separators.length) {
            return [text];
        }

        const separator = this.separators[sepIndex] as string;
        if (separator === "") {
            // Last resort: split by characters
            const chars: string[] = [];
            const step = Math.max(1, this.chunkSize - this.overlap);
            for (let i = 0; i < text.length; i += step) {
                chars.push(text.slice(i, i + this.chunkSize));
            }
            return chars;
        }

        const splits = text.split(separator);
        const result: string[] = [];
        let current = "";

        for (const split of splits) {
            const testChunk = current ? current + separator + split : split;

            if (testChunk.length <= this.chunkSize) {
                current = testChunk;
            } else {
                if (current) {
                    result.push(current);
                }
                // If single split is too large, recurse with next separator
                if (split.length > this.chunkSize) {
                    result.push(...this.splitText(split, sepIndex + 1));
                    current = ""; // Reset current, otherwise it gets duplicated
                } else {
                    current = split;
                }
            }
        }

        if (current) {
            result.push(current);
        }

        return result;
    }

    chunk(doc: Document): Chunk[] {
        const textChunks = this.splitText(doc.content);
        const chunks: Chunk[] = [];

        textChunks.forEach((content, i) => {
            const strippedContent = content.trim();
            if (strippedContent) {
                chunks.push({
                    content: strippedContent,
                    metadata: {
                        ...doc.metadata,
                        chunk_index: i,
                    },
                    chunk_id: `${doc.doc_id}_${i}`,
                    doc_id: doc.doc_id,
                });
            }
        });

        return chunks;
    }
}

export class MarkdownChunker implements ChunkerStrategy {
    private maxChunkSize: number;
    private fallbackChunker: RecursiveChunker;

    constructor(maxChunkSize: number = 1500) {
        this.maxChunkSize = maxChunkSize;
        // Use recursive chunker as a fallback for sections that exceed maxChunkSize
        this.fallbackChunker = new RecursiveChunker({ chunkSize: maxChunkSize, overlap: 200 });
    }

    chunk(doc: Document): Chunk[] {
        const headerPattern = /^(#{1,6})\s+(.+)$/;
        const lines = doc.content.split('\n');

        type HeaderLevel = { level: number; title: string };
        type Section = { headers: HeaderLevel[]; content: string[] };

        const sections: Section[] = [];
        let currentSection: Section = { headers: [], content: [] };

        for (const line of lines) {
            const match = line.match(headerPattern);
            if (match) {
                // Save previous section
                if (currentSection.content.length > 0) {
                    sections.push(currentSection);
                }
                // Start new section
                const level = match[1]!.length;
                const title = match[2] as string;
                currentSection = {
                    headers: [{ level, title }],
                    content: [line]
                };
            } else {
                currentSection.content.push(line);
            }
        }

        // Don't forget last section
        if (currentSection.content.length > 0) {
            sections.push(currentSection);
        }

        const chunks: Chunk[] = [];

        for (const section of sections) {
            const content = section.content.join('\n').trim();
            if (!content) continue;

            const sectionHeaders = section.headers.map(h => h.title);

            if (content.length <= this.maxChunkSize) {
                const chunk: Chunk = {
                    content,
                    metadata: {
                        ...doc.metadata,
                        chunk_index: chunks.length,
                        section_headers: sectionHeaders,
                    },
                    chunk_id: `${doc.doc_id}_${chunks.length}`,
                    doc_id: doc.doc_id,
                };
                chunks.push(chunk);
            } else {
                // Section too large, use fixed-size within it (via fallback chunker)
                const fallbackDoc = Document.fromContent(content, doc.metadata);
                // Override the generated document ID to use the parent's
                fallbackDoc.doc_id = doc.doc_id;

                const subChunks = this.fallbackChunker.chunk(fallbackDoc);
                for (const sub of subChunks) {
                    sub.metadata.section_headers = sectionHeaders;
                    // Recalculate index correctly later after extending
                }
                chunks.push(...subChunks);
            }
        }

        // Renumber chunk indices and ids
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (chunk) {
                chunk.metadata.chunk_index = i;
                chunk.chunk_id = `${doc.doc_id}_${i}`;
            }
        }

        return chunks;
    }
}

export class ChunkerService {
    /**
     * Factory method to get the appropriate chunker strategy based on document metadata or other context.
     * Uses MarkdownChunker for .md files.
     */
    static getStrategy(doc: Document): ChunkerStrategy {
        if (doc.metadata && doc.metadata.extension === '.md') {
            return new MarkdownChunker();
        }
        return new RecursiveChunker();
    }

    /**
     * Chunk a document using the appropriate strategy.
     */
    static chunkDocument(doc: Document): Chunk[] {
        const strategy = this.getStrategy(doc);
        return strategy.chunk(doc);
    }
}
