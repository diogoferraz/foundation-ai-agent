import { config } from "dotenv";

config();

import { DynamicTool } from "@langchain/core/tools";

class NewsAPI {
  private newsApiTool: DynamicTool;
  constructor() {
    this.newsApiTool = new DynamicTool({
      name: "news_api",
      description: "This tool fetches the latest news from the API for any subject",
      func: async (query: string) => await this.execute(query),
    });
  }

  public get tool(): DynamicTool {
    return this.newsApiTool;
  }

  private async execute(query: string): Promise<string> {
    try {
      const apiKey = process.env.NEWS_API_KEY;
      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`,
      );
      const data = (await response.json()) as {
        articles: { title: string; description: string }[];
      };
      return JSON.stringify(data.articles?.slice(0, 5));
    } catch (error) {
      console.error(`Error fetching news: ${error}`);
      return "error fetching news";
    }
  }
}

export default new NewsAPI().tool;
