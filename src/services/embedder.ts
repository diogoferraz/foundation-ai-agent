import { Ollama } from "ollama";
import { Chunk } from "./chunker";

/**
 * Supported Ollama embedding models.
 *
 * nomic-embed-text  → 768 dimensions  (best balance of speed & quality)
 * mxbai-embed-large → 1024 dimensions (higher quality, larger)
 * all-minilm        → 384 dimensions  (very fast, lightweight)
 *
 * Pull model before use:
 *   ollama pull nomic-embed-text
 */
export type OllamaEmbeddingModel =
    | "nomic-embed-text"
    | "mxbai-embed-large"
    | "all-minilm"
    | (string & {}); // allow arbitrary model names while keeping the above as autocomplete hints

const MODEL_DIMENSIONS: Record<string, number> = {
    "nomic-embed-text": 768,
    "mxbai-embed-large": 1024,
    "all-minilm": 384,
};

export interface EmbeddedChunk extends Chunk {
    embedding: number[];
}

export interface OllamaEmbeddingsOptions {
    /** Ollama model to use for embeddings. Defaults to "nomic-embed-text". */
    model?: OllamaEmbeddingModel;
    /** Base URL of the Ollama server. Defaults to http://localhost:11434. */
    host?: string;
    /** Number of texts to embed in a single API call. Defaults to 100. */
    batchSize?: number;
}

export class OllamaEmbeddings {
    private client: Ollama;
    readonly model: string;
    readonly dimension: number;
    private batchSize: number;

    constructor(options: OllamaEmbeddingsOptions = {}) {
        this.model = options.model ?? "nomic-embed-text";
        this.batchSize = options.batchSize ?? 100;
        this.dimension = MODEL_DIMENSIONS[this.model] ?? 768;

        this.client = new Ollama({
            host: options.host ?? "http://localhost:11434",
        });
    }

    /**
     * Embed an array of texts in batches.
     * Mirrors Python's `embed_documents(texts, batch_size)`.
     */
    async embedDocuments(texts: string[]): Promise<number[][]> {
        const allEmbeddings: number[][] = [];

        for (let i = 0; i < texts.length; i += this.batchSize) {
            const batch = texts.slice(i, i + this.batchSize);

            const response = await this.client.embed({
                model: this.model,
                input: batch,
            });

            allEmbeddings.push(...response.embeddings);
        }

        return allEmbeddings;
    }

    /**
     * Embed a single query string.
     * Mirrors Python's `embed_query(text)`.
     */
    async embedQuery(text: string): Promise<number[]> {
        const response = await this.client.embed({
            model: this.model,
            input: text,
        });

        const embedding = response.embeddings[0];
        if (!embedding) {
            throw new Error("Ollama returned no embedding for query.");
        }

        return embedding;
    }

    /**
     * Convenience: embed an array of Chunk objects and return EmbeddedChunks.
     */
    async embedChunks(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
        const texts = chunks.map((c) => c.content);
        const embeddings = await this.embedDocuments(texts);

        return chunks.map((chunk, i) => ({
            ...chunk,
            embedding: embeddings[i]!,
        }));
    }
}
