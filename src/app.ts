import { config } from "dotenv";

config();

import express, { Application } from "express";
import healthRoutes from "./routes.ts/health-check";
import chatRoutes from "./routes.ts/chat";
import ingestRoutes from "./routes.ts/ingest";

class App {
    public app: Application;

    constructor() {
        this.app = express();
        this.middlewares();
        this.setupRoutes();
    }

    private middlewares(): void {
        this.app.use(express.json());
    }

    private setupRoutes(): void {
        this.app.use("/api/v1", healthRoutes);
        this.app.use("/api/v1", chatRoutes);
        this.app.use("/api/v1", ingestRoutes);
    }
}

export default new App().app;
