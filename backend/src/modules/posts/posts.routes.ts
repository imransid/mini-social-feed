import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createPostSchema, create, list } from "./posts.controller";
import { toggle } from "./likes.controller";
import { createCommentSchema, create as createComment } from "./comments.controller";

const router = Router();
router.use(requireAuth);
router.post("/", validate(createPostSchema), create);
router.get("/", list);
router.post("/:id/like", toggle);
router.post("/:id/comment", validate(createCommentSchema), createComment);
export default router;