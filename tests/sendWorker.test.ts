import { describe, expect, it, vi } from "vitest";
import { SmsClient, TransientSmsError } from "../src/sms/smsClient";

async function sendWithRetryForTest(
  smsClient: SmsClient,
  maxAttempts = 3
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await smsClient.send({
        iccid: "8931234567890123456",
        body: "Hello",
      });

      return result.providerMessageId;
    } catch (error) {
      if (error instanceof TransientSmsError && attempt < maxAttempts) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unexpected retry state");
}

describe("send retry behavior", () => {
  it("retries transient SMS errors and eventually succeeds", async () => {
    const smsClient: SmsClient = {
      send: vi
        .fn()
        .mockRejectedValueOnce(
          new TransientSmsError("Temporary provider failure")
        )
        .mockResolvedValueOnce({
          providerMessageId: "provider_123",
        }),
    };

    await expect(sendWithRetryForTest(smsClient)).resolves.toBe(
      "provider_123"
    );

    expect(smsClient.send).toHaveBeenCalledTimes(2);
  });
});