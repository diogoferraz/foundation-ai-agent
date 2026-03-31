import { RecursiveChunker } from "../../src/services/chunker";
import { Document } from "../../src/services/document";

describe("RecursiveChunker", () => {
    it("should split text into chunks of specified size", () => {
        const chunker = new RecursiveChunker({ chunkSize: 50, overlap: 10 });
        const content = "This is a long piece of text that should be split into multiple chunks because it exceeds the fifty character limit.";
        const doc = Document.fromContent(content, { source: "test.txt", extension: ".txt" });

        const chunks = chunker.chunk(doc);

        expect(chunks.length).toBeGreaterThan(1);
        chunks.forEach(chunk => {
            expect(chunk.content.length).toBeLessThanOrEqual(50);
        });
    });

    it("should handle small text without splitting", () => {
        const chunker = new RecursiveChunker({ chunkSize: 100, overlap: 0 });
        const content = "Short text.";
        const doc = Document.fromContent(content, { source: "test.txt", extension: ".txt" });

        const chunks = chunker.chunk(doc);

        expect(chunks.length).toBe(1);
        expect(chunks[0]?.content).toBe("Short text.");
    });
});
