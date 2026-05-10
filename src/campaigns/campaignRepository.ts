import { db } from "../db/database";

export type Campaign = {
  id: number;
  name: string;
  sender: string;
  template: string;
  createdAt: string;
};

type CampaignRow = {
  id: number;
  name: string;
  sender: string;
  template: string;
  created_at: string;
};

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    sender: row.sender,
    template: row.template,
    createdAt: row.created_at,
  };
}

export function createCampaign(input: {
  name: string;
  sender: string;
  template: string;
}): Campaign {
  const result = db
    .prepare(
      `
      INSERT INTO campaigns (name, sender, template)
      VALUES (?, ?, ?)
      `
    )
    .run(input.name, input.sender, input.template);

  const row = db
    .prepare(
      `
      SELECT id, name, sender, template, created_at
      FROM campaigns
      WHERE id = ?
      `
    )
    .get(result.lastInsertRowid) as CampaignRow;

  return mapCampaign(row);
}

export function getCampaignById(id: number): Campaign | null {
  const row = db
    .prepare(
      `
      SELECT id, name, sender, template, created_at
      FROM campaigns
      WHERE id = ?
      `
    )
    .get(id) as CampaignRow | undefined;

  return row ? mapCampaign(row) : null;
}