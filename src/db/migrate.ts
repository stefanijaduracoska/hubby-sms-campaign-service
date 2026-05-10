import { db } from "./database";

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sender TEXT NOT NULL,
      template TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      iccid TEXT NOT NULL,
      variables_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (
        status IN ('queued', 'sending', 'sent', 'failed')
      ),
      attempts INTEGER NOT NULL DEFAULT 0,
      provider_message_id TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      UNIQUE (campaign_id, iccid)
    );

    CREATE INDEX IF NOT EXISTS idx_recipients_campaign_status
    ON recipients(campaign_id, status);
  `);

  db.exec(`
    UPDATE recipients
    SET status = 'queued',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'sending';
  `);
}