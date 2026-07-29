import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { registerDeviceSchema, register } from "./devices.controller";

const router = Router();
router.use(requireAuth);
router.post("/", validate(registerDeviceSchema), register);
export default router;
