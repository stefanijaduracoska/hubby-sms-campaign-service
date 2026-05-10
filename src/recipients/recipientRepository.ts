import { db } from "../db/database";

export type RecipientStatus =
  | "queued"
  | "sending"
  | "sent"
  | "failed";

export type Recipient = {
  id: number;
  campaignId: number;
  iccid: string;
  variables: Record<string, string>;
  status: RecipientStatus;
  attempts: number;
  providerMessageId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type RecipientRow = {
  id: number;
  campaign_id: number;
  iccid: string;
  variables_json: string;
  status: RecipientStatus;
  attempts: number;
  provider_message_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

function mapRecipient(row: RecipientRow): Recipient {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    iccid: row.iccid,
    variables: JSON.parse(row.variables_json),
    status: row.status,
    attempts: row.attempts,
    providerMessageId: row.provider_message_id,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createRecipient(input: {
  campaignId: number;
  iccid: string;
  variables: Record<string, string>;
}): Recipient | null {
  try {
    const result = db
      .prepare(
        `
        INSERT INTO recipients (
          campaign_id,
          iccid,
          variables_json,
          status
        )
        VALUES (?, ?, ?, 'queued')
        `
      )
      .run(
        input.campaignId,
        input.iccid,
        JSON.stringify(input.variables)
      );

    const row = db
      .prepare(
        `
        SELECT *
        FROM recipients
        WHERE id = ?
        `
      )
      .get(result.lastInsertRowid) as RecipientRow;

    return mapRecipient(row);
  } catch {
    return null;
  }
}

export function markRecipientSending(id: number): void {
  db.prepare(
    `
    UPDATE recipients
    SET status = 'sending',
        attempts = attempts + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `
  ).run(id);
}

export function markRecipientSent(
  id: number,
  providerMessageId: string
): void {
  db.prepare(
    `
    UPDATE recipients
    SET status = 'sent',
        provider_message_id = ?,
        last_error = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `
  ).run(providerMessageId, id);
}

export function markRecipientFailed(
  id: number,
  errorMessage: string
): void {
  db.prepare(
    `
    UPDATE recipients
    SET status = 'failed',
        last_error = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `
  ).run(errorMessage, id);
}

export function markRecipientQueued(id: number): void {
  db.prepare(
    `
    UPDATE recipients
    SET status = 'queued',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `
  ).run(id);
}

export function getQueuedRecipientsForCampaign(
  campaignId: number
): Recipient[] {
  const rows = db
    .prepare(
      `
      SELECT *
      FROM recipients
      WHERE campaign_id = ?
        AND status = 'queued'
      ORDER BY id ASC
      `
    )
    .all(campaignId) as RecipientRow[];

  return rows.map(mapRecipient);
}

export function getCampaignRecipientStats(campaignId: number): {
  total: number;
  queued: number;
  sending: number;
  sent: number;
  failed: number;
} {
  const rows = db
    .prepare(
      `
      SELECT status, COUNT(*) as count
      FROM recipients
      WHERE campaign_id = ?
      GROUP BY status
      `
    )
    .all(campaignId) as { status: RecipientStatus; count: number }[];

  const stats = {
    total: 0,
    queued: 0,
    sending: 0,
    sent: 0,
    failed: 0,
  };

  for (const row of rows) {
    stats[row.status] = row.count;
    stats.total += row.count;
  }

  return stats;
}

export function getLastRecipientError(
  campaignId: number
): string | null {
  const row = db
    .prepare(
      `
      SELECT last_error
      FROM recipients
      WHERE campaign_id = ?
        AND last_error IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 1
      `
    )
    .get(campaignId) as { last_error: string } | undefined;

  return row?.last_error ?? null;
}