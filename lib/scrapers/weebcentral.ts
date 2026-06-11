import * as cheerio from "cheerio";
import {
  IScraper,
  ScrapedManga,
  ScrapedChapter,
  MangaWithChapters,
  SearchResult,
  ScraperConfig,
} from "./types";
import { makeRequest, normalizeStatus, normalizeChapterNumber, RateLimiter } from "./utils";

/**
 * WeebCentral Web Scraper
 * Note: This scraper uses web scraping and may need adjustments
 * based on the actual website structure of weebcentral.com
 */
export class WeebCentralScraper implements IScraper {
  public readonly sourceName = "weebcentral";
  private readonly baseUrl = "https://weebcentral.com";
  private rateLimiter: RateLimiter;

  constructor(private config: ScraperConfig = {}) {
    // Be respectful with scraping - 1 request per second
    this.rateLimiter = new RateLimiter(config.rateLimit || 1000);
  }

  /**
   * Search for manga by title
   */
  async searchManga(query: string): Promise<SearchResult[]> {
    await this.rateLimiter.wait();

    try {
      // Common search URL patterns for manga sites
      const searchUrl = `${this.baseUrl}/search`;
      const html = await makeRequest<string>(searchUrl, {
        params: { q: query },
        retries: this.config.retries,
        timeout: this.config.timeout,
      });

      return this.parseSearchResults(html);
    } catch (error) {
      console.error(`WeebCentral search error for "${query}":`, error);
      // Fallback: try alternative search patterns
      try {
        const altSearchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
        const html = await makeRequest<string>(altSearchUrl, {
          retries: this.config.retries,
          timeout: this.config.timeout,
        });
        return this.parseSearchResults(html);
      } catch (altError) {
        console.error("WeebCentral alternative search also failed:", altError);
        return [];
      }
    }
  }

  /**
   * Get detailed manga information including all chapters
   */
  async getMangaDetails(sourceId: string): Promise<MangaWithChapters> {
    await this.rateLimiter.wait();

    const url = `${this.baseUrl}/manga/${sourceId}`;

    try {
      const html = await makeRequest<string>(url, {
        retries: this.config.retries,
        timeout: this.config.timeout,
      });

      const $ = cheerio.load(html);

      // Parse manga details
      const manga = this.parseMangaDetails($, sourceId);

      // Parse chapters list
      const chapters = this.parseChaptersList($, sourceId);

      return { manga, chapters };
    } catch (error) {
      console.error(`WeebCentral getMangaDetails error for ${sourceId}:`, error);
      throw error;
    }
  }

  /**
   * Get latest chapters for a specific manga
   */
  async getLatestChapters(
    sourceId: string,
    limit: number = 10
  ): Promise<ScrapedChapter[]> {
    const { chapters } = await this.getMangaDetails(sourceId);
    return chapters.slice(0, limit);
  }

  /**
   * Get recently updated manga
   */
  async getRecentUpdates(limit: number = 20): Promise<SearchResult[]> {
    await this.rateLimiter.wait();

    try {
      // Common URL patterns for latest updates
      const urls = [
        `${this.baseUrl}/latest`,
        `${this.baseUrl}/latest-updates`,
        `${this.baseUrl}/manga-list`,
        `${this.baseUrl}/`,
      ];

      for (const url of urls) {
        try {
          const html = await makeRequest<string>(url, {
            retries: 1,
            timeout: this.config.timeout,
          });

          const results = this.parseRecentUpdates(html);
          if (results.length > 0) {
            return results.slice(0, limit);
          }
        } catch {
          continue; // Try next URL
        }
      }

      return [];
    } catch (error) {
      console.error("WeebCentral getRecentUpdates error:", error);
      return [];
    }
  }

  /**
   * Parse search results from HTML
   */
  private parseSearchResults(html: string): SearchResult[] {
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    // Common selectors for manga listings
    const selectors = [
      ".manga-item",
      ".search-result",
      ".manga-list-item",
      ".item",
      ".post",
      "article",
    ];

    for (const selector of selectors) {
      const items = $(selector);
      if (items.length > 0) {
        items.each((_, element) => {
          try {
            const $el = $(element);

            // Try to find title and link
            const link = $el.find("a").first();
            const href = link.attr("href");
            const title = link.attr("title") || link.text().trim();

            // Try to find cover image
            const img = $el.find("img").first();
            const coverImage = img.attr("src") || img.attr("data-src");

            if (href && title) {
              const sourceId = this.extractMangaId(href);
              results.push({
                sourceId,
                title,
                coverImage: coverImage
                  ? this.normalizeUrl(coverImage)
                  : undefined,
                sourceUrl: this.normalizeUrl(href),
              });
            }
          } catch (err) {
            // Skip invalid items
          }
        });

        if (results.length > 0) break;
      }
    }

    return results;
  }

  /**
   * Parse manga details from HTML
   */
  private parseMangaDetails(
    $: cheerio.CheerioAPI,
    sourceId: string
  ): ScrapedManga {
    // Try multiple common selectors
    const title =
      $(".manga-title").first().text().trim() ||
      $("h1").first().text().trim() ||
      $(".entry-title").first().text().trim() ||
      "Unknown Title";

    const description =
      $(".manga-description").first().text().trim() ||
      $(".summary").first().text().trim() ||
      $(".description").first().text().trim() ||
      undefined;

    const coverImage =
      $(".manga-cover img").first().attr("src") ||
      $(".cover img").first().attr("src") ||
      $(".thumbnail img").first().attr("src") ||
      undefined;

    const author =
      $(".author a").first().text().trim() ||
      $('[href*="author"]').first().text().trim() ||
      undefined;

    const status =
      $(".status").first().text().trim() ||
      $('[class*="status"]').first().text().trim() ||
      undefined;

    // Try to extract genres
    const genres: string[] = [];
    $(".genre a, .genres a, .tags a").each((_, el) => {
      const genre = $(el).text().trim();
      if (genre) genres.push(genre);
    });

    return {
      title,
      author,
      description,
      coverImage: coverImage ? this.normalizeUrl(coverImage) : undefined,
      genres: genres.length > 0 ? genres : undefined,
      status: normalizeStatus(status),
      sourceId,
      sourceUrl: `${this.baseUrl}/manga/${sourceId}`,
    };
  }

  /**
   * Parse chapters list from HTML
   */
  private parseChaptersList(
    $: cheerio.CheerioAPI,
    mangaSourceId: string
  ): ScrapedChapter[] {
    const chapters: ScrapedChapter[] = [];

    // Common selectors for chapter lists
    const selectors = [
      ".chapter-list li",
      ".chapters li",
      ".chapter-item",
      ".wp-manga-chapter",
      "li[class*='chapter']",
    ];

    for (const selector of selectors) {
      const items = $(selector);
      if (items.length > 0) {
        items.each((_, element) => {
          try {
            const $el = $(element);
            const link = $el.find("a").first();
            const href = link.attr("href");

            if (!href) return;

            // Extract chapter number from text
            const linkText = link.text().trim();
            const chapterMatch = linkText.match(/chapter[:\s]*(\d+\.?\d*)/i);
            const number = chapterMatch
              ? normalizeChapterNumber(chapterMatch[1])
              : normalizeChapterNumber(linkText);

            // Extract chapter title if present
            const titleMatch = linkText.match(/chapter[:\s]*\d+\.?\d*[:\s-]+(.*)/i);
            const title = titleMatch ? titleMatch[1].trim() : undefined;

            // Try to get publish date
            const dateText = $el.find(".date, .time, [class*='date']").text().trim();
            let publishedAt: Date | undefined;
            if (dateText) {
              const parsed = new Date(dateText);
              if (!isNaN(parsed.getTime())) {
                publishedAt = parsed;
              }
            }

            chapters.push({
              number,
              title: title || undefined,
              sourceId: this.extractMangaId(href),
              sourceUrl: this.normalizeUrl(href),
              publishedAt,
            });
          } catch (err) {
            // Skip invalid chapters
          }
        });

        if (chapters.length > 0) break;
      }
    }

    return chapters;
  }

  /**
   * Parse recent updates from HTML
   */
  private parseRecentUpdates(html: string): SearchResult[] {
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    const selectors = [
      ".latest-update .manga-item",
      ".recent-manga",
      ".latest-manga",
      ".updated-manga",
    ];

    for (const selector of selectors) {
      const items = $(selector);
      if (items.length > 0) {
        items.each((_, element) => {
          try {
            const $el = $(element);
            const link = $el.find("a").first();
            const href = link.attr("href");
            const title = link.attr("title") || link.text().trim();
            const img = $el.find("img").first();
            const coverImage = img.attr("src") || img.attr("data-src");

            if (href && title) {
              results.push({
                sourceId: this.extractMangaId(href),
                title,
                coverImage: coverImage
                  ? this.normalizeUrl(coverImage)
                  : undefined,
                sourceUrl: this.normalizeUrl(href),
              });
            }
          } catch (err) {
            // Skip invalid items
          }
        });

        if (results.length > 0) break;
      }
    }

    return results;
  }

  /**
   * Extract manga ID from URL
   */
  private extractMangaId(url: string): string {
    // Extract the last meaningful part of the URL as ID
    const parts = url.split("/").filter((p) => p.length > 0);
    return parts[parts.length - 1] || url;
  }

  /**
   * Normalize relative URLs to absolute
   */
  private normalizeUrl(url: string): string {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    if (url.startsWith("//")) {
      return `https:${url}`;
    }
    if (url.startsWith("/")) {
      return `${this.baseUrl}${url}`;
    }
    return `${this.baseUrl}/${url}`;
  }
}
