import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./modules/auth/auth.routes";
import postRoutes from "./modules/posts/posts.routes";
import deviceRoutes from "./modules/devices/devices.routes";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "./middleware/error";
import { notFound } from "./middleware/notFound";
import { openApiSpec } from "./docs/openapi";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", authRoutes);
app.use("/posts", postRoutes);
app.use("/devices", deviceRoutes);

// Must sit before notFound, or the catch-all swallows it.
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use(notFound);
app.use(errorHandler);
