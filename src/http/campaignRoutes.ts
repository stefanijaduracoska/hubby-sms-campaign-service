import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  createCampaign,
  getCampaignById,
} from "../campaigns/campaignRepository";
import {
  getCampaignRecipientStats,
  getLastRecipientError,
} from "../recipients/recipientRepository";
import { processRecipientRows } from "../recipients/recipientService";
import { parseCsvFile } from "../utils/parseCsvFile";
import { FakeSmsClient } from "../sms/fakeSmsClient";
import { sendCampaignRecipients } from "../workers/sendWorker";

export const campaignRoutes = Router();

const upload = multer({
  dest: "data/uploads",
});

const smsClient = new FakeSmsClient();

const createCampaignSchema = z.object({
  name: z.string().min(1),
  sender: z.string().min(1),
  template: z.string().min(1),
});

campaignRoutes.post("/campaigns", (req, res) => {
  const parsed = createCampaignSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  const campaign = createCampaign(parsed.data);

  return res.status(201).json(campaign);
});

campaignRoutes.post(
  "/campaigns/:id/recipients",
  upload.single("file"),
  async (req, res) => {
    const campaignId = Number(req.params.id);

    if (!Number.isInteger(campaignId)) {
      return res.status(400).json({
        error: "Campaign id must be a number",
      });
    }

    const campaign = getCampaignById(campaignId);

    if (!campaign) {
      return res.status(404).json({
        error: "Campaign not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "CSV file is required. Upload it as multipart field 'file'.",
      });
    }

    try {
      const rows = await parseCsvFile(req.file.path);

      const result = processRecipientRows(campaignId, rows);

      void sendCampaignRecipients(campaignId, smsClient).catch((error) => {
        console.error("Background sending failed", error);
      });

      return res.status(202).json({
        campaignId,
        accepted: result.accepted,
        skipped: result.skipped,
        skippedReasons: result.skipped > 0
        ? "Recipients already exist for this campaign and were not resent."
        : null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process CSV";

      return res.status(400).json({
        error: message,
      });
    } finally {
      fs.unlink(req.file.path, () => {});
    }
  }
);

campaignRoutes.get("/campaigns/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      error: "Campaign id must be a number",
    });
  }

  const campaign = getCampaignById(id);

  if (!campaign) {
    return res.status(404).json({
      error: "Campaign not found",
    });
  }

  const stats = getCampaignRecipientStats(id);
  const lastError = getLastRecipientError(id);

  return res.json({
    ...campaign,
    stats,
    lastError,
  });
});