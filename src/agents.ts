import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { BaseMessage, createAgent, HumanMessage } from "langchain";
import { newsApi, tellMeAJoke, knowledgeBase } from "./tools";

export default class Agent {
	private agent: ReturnType<typeof createAgent>;
	private memory: MemorySaver;
	private model: ChatOpenAI;

	constructor() {
		this.memory = new MemorySaver();

		this.model = new ChatOpenAI({
			model: "sabiazinho-3",
			maxTokens: 1000,
			temperature: 0,
			configuration: {
				apiKey: process.env.API_KEY,
				baseURL: process.env.API_URL,
			},
		});

		this.agent = createAgent({
			model: this.model,
			tools: [newsApi, tellMeAJoke, knowledgeBase],
			checkpointer: this.memory,
		});
	}

	public async execute(input: HumanMessage | BaseMessage, threadId?: string) {
		return await this.agent.invoke(
			{ messages: [input] },
			{ configurable: { thread_id: threadId } },
		);
	}
}

const agent = new Agent();
export { agent };
