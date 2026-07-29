import { Response } from "express";
import { z } from "zod";
import * as service from "./devices.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthedRequest } from "../../middleware/auth";

export const registerDeviceSchema = z.object({
  fcmToken: z.string().min(1).max(4096),
});

export const list = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const devices = await service.listDevices(req.userId!);
  res.json({ count: devices.length, devices });
});

export const register = asyncHandler(
  async (req: AuthedRequest, res: Response) => {
    const device = await service.registerDevice(
      req.userId!,
      req.body.fcmToken,
    );
    res.status(201).json({
      id: device.id,
      fcmToken: device.fcmToken,
      userId: device.userId,
    });
  },
);
