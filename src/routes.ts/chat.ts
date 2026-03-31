import { Router, Request, Response } from "express";
import { agent } from "../agents";
import { HumanMessage } from "@langchain/core/messages";
import { randomUUID } from "node:crypto";

class ChatRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post("/chat", this.chat);
  }

  private async chat(req: Request, res: Response): Promise<void> {
    const { message, threadId } = req.body;

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }
    try {
      const newMessage = new HumanMessage(message);
      const threadIdOrFallback = threadId ?? randomUUID();

      const agentResponse = await agent.execute(newMessage, threadIdOrFallback);

      const content =
        agentResponse.messages[agentResponse.messages.length - 1].content;

      res.json({ content, threadId: threadIdOrFallback });

    } catch (error) {
      res.status(500).json({ error: `Internal server error: ${error}` });
    }
  }
}

export default new ChatRoutes().router;
