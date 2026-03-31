import { DynamicTool } from "@langchain/core/tools";
import { VectorStore, SearchResult } from "../services/vectorStore";

class KnowledgeBase {
    private tool: DynamicTool;
    private vectorStore: VectorStore;

    constructor() {
        this.vectorStore = new VectorStore();

        this.tool = new DynamicTool({
            name: "knowledge_base",
            description:
                "Searches the internal knowledge base of ingested documents for relevant information. " +
                "Use this tool when the user asks a question that may be answered by previously ingested documents.",
            func: async (query: string) => await this.execute(query),
        });
    }

    public get dynamicTool(): DynamicTool {
        return this.tool;
    }

    private async execute(query: string): Promise<string> {
        try {
            const results: SearchResult[] = await this.vectorStore.search(query, 5);

            if (!results.length) {
                return "No relevant documents found in the knowledge base.";
            }

            return results
                .map((r, i) => {
                    const source = r.metadata?.source ?? "unknown";
                    return `[${i + 1}] (source: ${source}, similarity: ${r.similarity.toFixed(3)})\n${r.content}`;
                })
                .join("\n\n");
        } catch (error) {
            console.error(`Error searching knowledge base: ${error}`);
            return "Error searching the knowledge base.";
        }
    }
}

export default new KnowledgeBase().dynamicTool;
