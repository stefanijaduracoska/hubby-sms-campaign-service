import { getCampaignById } from "../campaigns/campaignRepository";
import { createRecipient } from "./recipientRepository";
import { findMissingTemplateVariables } from "../templates/templateEngine";

export type UploadRecipientsResult = {
  accepted: number;
  skipped: number;
};

export function processRecipientRows(
  campaignId: number,
  rows: Array<Record<string, string>>
): UploadRecipientsResult {
  const campaign = getCampaignById(campaignId);

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  if (rows.length === 0) {
    throw new Error("CSV contains no recipient rows");
  }

  const availableColumns = Object.keys(rows[0]);

  if (!availableColumns.includes("iccid")) {
    throw new Error("CSV must contain required column: iccid");
  }

  const missingVariables = findMissingTemplateVariables(
    campaign.template,
    availableColumns
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `CSV is missing template variables: ${missingVariables.join(", ")}`
    );
  }

  let accepted = 0;
  let skipped = 0;

  for (const row of rows) {
    const iccid = row.iccid;

    if (!iccid) {
      continue;
    }

    const recipient = createRecipient({
      campaignId,
      iccid,
      variables: row,
    });

    if (recipient) {
      accepted++;
    } else {
      skipped++;
    }
  }

  return {
    accepted,
    skipped,
  };
}