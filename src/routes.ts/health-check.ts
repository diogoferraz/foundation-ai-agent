import { Router, Request, Response } from "express";

class HealthRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/health-check", this.getHealth);
  }

  private getHealth(req: Request, res: Response): void {
    res.json({ message: "Health check" });
  }
}

export default new HealthRoutes().router;
