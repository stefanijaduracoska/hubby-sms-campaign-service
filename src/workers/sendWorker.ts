import { getCampaignById } from "../campaigns/campaignRepository";
import {
  getQueuedRecipientsForCampaign,
  markRecipientFailed,
  markRecipientQueued,
  markRecipientSending,
  markRecipientSent,
  Recipient,
} from "../recipients/recipientRepository";
import {
  isPermanentSmsError,
  isTransientSmsError,
  SmsClient,
} from "../sms/smsClient";
import { renderTemplate } from "../templates/templateEngine";
import { MAX_ATTEMPTS, RETRY_DELAYS_MS, CONCURRENCY } from "./constans";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<void>
): Promise<void> {
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    const promise = task(item).finally(() => {
      executing.delete(promise);
    });

    executing.add(promise);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}

export async function sendRecipient(
  recipient: Recipient,
  template: string,
  smsClient: SmsClient
): Promise<void> {
  const body = renderTemplate(template, recipient.variables);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    markRecipientSending(recipient.id);

    try {
      const result = await smsClient.send({
        iccid: recipient.iccid,
        body,
      });

      markRecipientSent(recipient.id, result.providerMessageId);
      return;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown SMS error";

      if (isPermanentSmsError(error)) {
        markRecipientFailed(recipient.id, message);
        return;
      }

      if (isTransientSmsError(error) && attempt < MAX_ATTEMPTS) {
        markRecipientQueued(recipient.id);
        await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 1000);
        continue;
      }

      markRecipientFailed(recipient.id, message);
      return;
    }
  }
}

export async function sendCampaignRecipients(
  campaignId: number,
  smsClient: SmsClient
): Promise<void> {
  const campaign = getCampaignById(campaignId);

  if (!campaign) {
    return;
  }

  const queuedRecipients = getQueuedRecipientsForCampaign(campaignId);

  await runWithConcurrency(
    queuedRecipients,
    CONCURRENCY,
    async (recipient) => {
      await sendRecipient(recipient, campaign.template, smsClient);
    }
  );
}