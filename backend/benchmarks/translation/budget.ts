import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface ModelPrice {
  provider: 'groq' | 'openai';
  model: string;
  inputPerMillion: number;
  outputPerMillion: number;
  source: string;
  verifiedAt: string;
}
interface Reservation {
  id: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  usd: number;
  status: 'reserved' | 'reconciled' | 'usage_unreported';
}
interface Ledger {
  version: 1;
  capUsd: number;
  prices: ModelPrice[];
  reservations: Reservation[];
}
export class BudgetExceeded extends Error {
  constructor() {
    super('Evaluation budget exhausted; no HTTP request was sent.');
  }
}

/** Persist the reservation before sending. Missing usage/failures retain the full reservation. */
export class EvaluationBudget {
  private ledger: Ledger;
  private lock: string;
  constructor(
    private file: string,
    capUsd: number,
    prices: ModelPrice[],
  ) {
    if (!Number.isFinite(capUsd) || capUsd <= 0 || capUsd > 10)
      throw new Error('Evaluation cap must be >0 and <=10 USD');
    if (!Array.isArray(prices) || !prices.length)
      throw new Error('Verified model prices are required');
    for (const price of prices) {
      const age = Date.now() - Date.parse(price.verifiedAt);
      const host = new URL(price.source).hostname;
      const official =
        price.provider === 'openai'
          ? ['openai.com', 'platform.openai.com', 'developers.openai.com']
          : ['groq.com', 'console.groq.com'];
      if (
        !official.includes(host) ||
        !Number.isFinite(age) ||
        age < 0 ||
        age > 30 * 86400000 ||
        ![price.inputPerMillion, price.outputPerMillion].every(
          (value) => Number.isFinite(value) && value >= 0,
        )
      )
        throw new Error(
          'Prices need an official source, nonnegative rates and verification within 30 days',
        );
    }
    if (new Set(prices.map((price) => `${price.provider}:${price.model}`)).size !== prices.length)
      throw new Error('Duplicate model prices');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.lock = `${file}.lock`;
    try {
      fs.writeFileSync(this.lock, String(process.pid), { flag: 'wx', mode: 0o600 });
    } catch {
      throw new Error(
        'Budget ledger is locked; another run may be active. Inspect the lock before resuming.',
      );
    }
    try {
      this.ledger = fs.existsSync(file)
        ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Ledger)
        : { version: 1, capUsd, prices, reservations: [] };
      if (
        this.ledger.version !== 1 ||
        this.ledger.capUsd !== capUsd ||
        JSON.stringify(this.ledger.prices) !== JSON.stringify(prices) ||
        !Array.isArray(this.ledger.reservations) ||
        this.ledger.reservations.some((row) => !Number.isFinite(row.usd) || row.usd < 0)
      )
        throw new Error('Resume requires the same cap and price snapshot and a valid ledger');
      if (this.totalUsd > capUsd) throw new Error('Existing ledger exceeds the requested cap');
      this.save();
    } catch (error) {
      this.close();
      throw error;
    }
  }
  get totalUsd() {
    return this.ledger.reservations.reduce((sum, row) => sum + row.usd, 0);
  }
  summary() {
    return {
      capUsd: this.ledger.capUsd,
      accountedUsd: this.totalUsd,
      requests: this.ledger.reservations.length,
      unresolvedRequests: this.ledger.reservations.filter((row) => row.status !== 'reconciled')
        .length,
    };
  }
  assertModels(models: Array<{ provider: string; model: string }>) {
    for (const model of models)
      if (
        !this.ledger.prices.some(
          (price) => price.provider === model.provider && price.model === model.model,
        )
      )
        throw new Error(`Missing verified price: ${model.provider}/${model.model}`);
  }
  reserve(provider: 'groq' | 'openai', body: Record<string, unknown>) {
    const price = this.ledger.prices.find(
      (price) => price.provider === provider && price.model === body.model,
    );
    if (!price) throw new Error(`Missing verified price: ${provider}/${String(body.model)}`);
    // UTF-8 bytes conservatively bound text tokens; 4096 covers chat/template overhead.
    const inputTokens = Buffer.byteLength(JSON.stringify(body), 'utf8') + 4096;
    const outputTokens = Number(body.max_tokens ?? body.max_completion_tokens);
    if (!Number.isInteger(outputTokens) || outputTokens <= 0)
      throw new Error('A bounded output token budget is required');
    const cost = (input: number, output: number) =>
      (input * price.inputPerMillion + output * price.outputPerMillion) / 1_000_000;
    const usd = cost(inputTokens, outputTokens);
    if (this.totalUsd + usd > this.ledger.capUsd + 1e-12) throw new BudgetExceeded();
    const row: Reservation = {
      id: randomUUID(),
      provider,
      model: price.model,
      inputTokens,
      outputTokens,
      usd,
      status: 'reserved',
    };
    this.ledger.reservations.push(row);
    this.save();
    let reconciled = false;
    return (usage?: { prompt_tokens?: number; completion_tokens?: number }) => {
      if (reconciled) return;
      reconciled = true;
      const input = usage?.prompt_tokens,
        output = usage?.completion_tokens;
      if (
        !Number.isInteger(input) ||
        !Number.isInteger(output) ||
        input! < 0 ||
        output! < 0 ||
        input! > inputTokens ||
        output! > outputTokens
      )
        row.status = 'usage_unreported';
      else {
        row.usd = cost(input!, output!);
        row.status = 'reconciled';
      }
      this.save();
    };
  }
  close() {
    if (this.lock && fs.existsSync(this.lock)) fs.unlinkSync(this.lock);
  }
  private save() {
    const temporary = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(this.ledger, null, 2), { mode: 0o600 });
    fs.renameSync(temporary, this.file);
  }
}
