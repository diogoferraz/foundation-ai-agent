import { DynamicTool } from "@langchain/core/tools";

class TellMeAJoke {
  private tellMeAJokeTool: DynamicTool;
  constructor() {
    this.tellMeAJokeTool = new DynamicTool({
      name: "tell_me_a_joke",
      description: "This tool tells a joke",
      func: async (query: string) => await this.execute(query),
    });
  }

  public get tool(): DynamicTool {
    return this.tellMeAJokeTool;
  }

  private async execute(query: string): Promise<string> {
		try {
			const response = await fetch("https://official-joke-api.appspot.com/jokes/random_joke");
			const data = await response.json() as { setup: string, punchline: string };
			return `${data.setup}\n${data.punchline}`;
		} catch (error) {
			console.error(`Error telling a joke: ${error}`);
			return "error creating a joke, that worked on my machine :) ";
		}
  }
}

export default new TellMeAJoke().tool;