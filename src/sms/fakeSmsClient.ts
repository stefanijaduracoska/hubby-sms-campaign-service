import {
  PermanentSmsError,
  SmsClient,
  TransientSmsError,
} from "./smsClient";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class FakeSmsClient implements SmsClient {
  async send(input: {
    iccid: string;
    body: string;
  }): Promise<{ providerMessageId: string }> {
    await sleep(randomInt(50, 200));

    const failureRoll = Math.random();

    if (failureRoll < 0.06) {
      throw new TransientSmsError("SMS provider temporarily unavailable");
    }

    if (failureRoll < 0.1) {
      throw new PermanentSmsError("Recipient cannot receive SMS");
    }

    return {
      providerMessageId: `fake_${input.iccid}_${Date.now()}`,
    };
  }
}