import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./modules/auth/auth.routes";
import postRoutes from "./modules/posts/posts.routes";
import deviceRoutes from "./modules/devices/devices.routes";
import { errorHandler } from "./middleware/error";
import { notFound } from "./middleware/notFound";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", authRoutes);
app.use("/posts", postRoutes);
app.use("/devices", deviceRoutes);

app.use(notFound);
app.use(errorHandler);
