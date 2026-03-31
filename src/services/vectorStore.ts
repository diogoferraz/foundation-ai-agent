import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Chunk } from "./chunker";
import { OllamaEmbeddings, OllamaEmbeddingsOptions } from "./embedder";

export interface VectorStoreOptions {
    /** Supabase table name. Defaults to "documents". */
    tableName?: string;
    /** Supabase URL. Defaults to SUPABASE_URL env var. */
    supabaseUrl?: string;
    /** Supabase anon key. Defaults to SUPABASE_ANON_KEY env var. */
    supabaseKey?: string;
    /** Options forwarded to OllamaEmbeddings. */
    embeddingOptions?: OllamaEmbeddingsOptions;
}

export interface SearchResult {
    id: string;
    content: string;
    metadata: Record<string, any>;
    similarity: number;
}

export class VectorStore {
    private supabase: SupabaseClient;
    private embedder: OllamaEmbeddings;
    private tableName: string;

    constructor(options: VectorStoreOptions = {}) {
        const url = options.supabaseUrl ?? process.env.SUPABASE_URL;
        const key = options.supabaseKey ?? process.env.SUPABASE_ANON_KEY;

        if (!url || !key) {
            throw new Error(
                "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY env vars."
            );
        }

        this.supabase = createClient(url, key);
        this.embedder = new OllamaEmbeddings(options.embeddingOptions);
        this.tableName = options.tableName ?? "documents";
    }

    /**
     * Embed and upsert chunks into the Supabase vector table.
     */
    async addChunks(chunks: Chunk[]): Promise<void> {
        if (!chunks.length) return;

        // Generate embeddings for all chunks
        const embeddedChunks = await this.embedder.embedChunks(chunks);

        // Build rows for upsert
        const rows = embeddedChunks.map((ec) => ({
            id: ec.chunk_id,
            content: ec.content,
            metadata: ec.metadata,
            embedding: ec.embedding,
            doc_id: ec.doc_id,
        }));

        // Upsert in batches of 500 to avoid payload limits
        const batchSize = 500;
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);

            const { error } = await this.supabase
                .from(this.tableName)
                .upsert(batch, { onConflict: "id" });

            if (error) {
                throw new Error(`Supabase upsert failed: ${error.message}`);
            }
        }
    }

    /**
     * Search for similar chunks using cosine similarity.
     *
     * Calls the `match_documents` Postgres RPC function.
     */
    async search(
        query: string,
        nResults: number = 5,
        filter: Record<string, any> = {}
    ): Promise<SearchResult[]> {
        // Embed the query
        const queryEmbedding = await this.embedder.embedQuery(query);

        const { data, error } = await this.supabase.rpc("match_documents", {
            query_embedding: queryEmbedding,
            match_count: nResults,
            filter,
        });

        if (error) {
            throw new Error(`Supabase search failed: ${error.message}`);
        }

        return (data ?? []) as SearchResult[];
    }

    /**
     * Delete all rows from the documents table.
     */
    async deleteAll(): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .delete()
            .neq("id", "");

        if (error) {
            throw new Error(`Supabase delete failed: ${error.message}`);
        }
    }

    /**
     * Get total number of stored chunks.
     */
    async count(): Promise<number> {
        const { count, error } = await this.supabase
            .from(this.tableName)
            .select("*", { count: "exact", head: true });

        if (error) {
            throw new Error(`Supabase count failed: ${error.message}`);
        }

        return count ?? 0;
    }
}
