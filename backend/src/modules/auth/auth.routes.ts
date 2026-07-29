import { Router } from "express";
import { validate } from "../../middleware/validate";
import { credentialsSchema, signup, login } from "./auth.controller";

const router = Router();
router.post("/signup", validate(credentialsSchema), signup);
router.post("/login", validate(credentialsSchema), login);
export default router;