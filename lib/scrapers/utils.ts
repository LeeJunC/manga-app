import axios, { AxiosRequestConfig } from "axios";

/**
 * Rate limiter utility
 */
export class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private lastRequestTime = 0;

  constructor(private delayMs: number) {}

  async wait(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.delayMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.delayMs - timeSinceLastRequest)
        );
      }

      const resolve = this.queue.shift();
      this.lastRequestTime = Date.now();
      resolve?.();
    }

    this.processing = false;
  }
}

/**
 * Make an HTTP request with retries and timeout
 */
export async function makeRequest<T>(
  url: string,
  config?: AxiosRequestConfig & { retries?: number }
): Promise<T> {
  const maxRetries = config?.retries ?? 3;
  const timeout = config?.timeout ?? 10000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios({
        url,
        method: config?.method || "GET",
        timeout,
        headers: {
          "User-Agent":
            config?.headers?.["User-Agent"] ||
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...config?.headers,
        },
        ...config,
      });

      return response.data;
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(
          `Failed to fetch ${url} after ${maxRetries + 1} attempts: ${error}`
        );
      }

      // Exponential backoff
      const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Failed to fetch ${url}`);
}

/**
 * Clean and normalize chapter number
 */
export function normalizeChapterNumber(chapter: string | number): string {
  const cleaned = String(chapter).trim().replace(/chapter\s*/i, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? cleaned : String(parsed);
}

/**
 * Parse status from various formats
 */
export function normalizeStatus(
  status?: string
): "ongoing" | "completed" | "hiatus" | "cancelled" {
  if (!status) return "ongoing";

  const normalized = status.toLowerCase().trim();

  if (
    normalized.includes("ongoing") ||
    normalized.includes("publishing") ||
    normalized.includes("releasing")
  ) {
    return "ongoing";
  }

  if (normalized.includes("completed") || normalized.includes("finished")) {
    return "completed";
  }

  if (normalized.includes("hiatus") || normalized.includes("on hold")) {
    return "hiatus";
  }

  if (normalized.includes("cancelled") || normalized.includes("discontinued")) {
    return "cancelled";
  }

  return "ongoing";
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return "";
  }
}
