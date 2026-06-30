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
   * Get user's subscriptions from their public profile
   */
  async getUserSubscriptions(userId: string): Promise<SearchResult[]> {
    await this.rateLimiter.wait();

    try {
      // WeebCentral profile URL with subscriptions tab
      const profileUrl = `${this.baseUrl}/users/${userId}/profiles`;

      const html = await makeRequest<string>(profileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        },
        retries: this.config.retries,
        timeout: this.config.timeout,
      });

      return this.parseProfileSubscriptions(html);
    } catch (error) {
      console.error(`WeebCentral profile scrape error for userId "${userId}":`, error);
      return [];
    }
  }

  /**
   * Parse subscriptions from raw HTML (e.g. pasted from the browser
   * Inspect/View-Source of a logged-in profile page). This bypasses the
   * need for the user's ID or login cookies entirely.
   */
  parseSubscriptionsFromHtml(html: string): SearchResult[] {
    return this.parseProfileSubscriptions(html);
  }

  /**
   * Parse subscriptions from user profile page
   */
  private parseProfileSubscriptions(html: string): SearchResult[] {
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    // Look for manga cards/links in the subscriptions section
    // Try multiple selectors that might contain subscription links
    const selectors = [
      'a[href*="/series/"]',  // Any link containing /series/
      '.subscription-item a',
      '.manga-card a',
      'img[alt*="cover"]',     // Images with "cover" in alt
    ];

    const foundLinks = new Set<string>();

    for (const selector of selectors) {
      $(selector).each((_, element) => {
        try {
          const $el = $(element);
          let href = $el.attr('href');

          // If it's an img, get the parent link
          if (!href && element.name === 'img') {
            href = $el.parent('a').attr('href');
          }

          if (!href || !href.includes('/series/')) return;

          // Avoid duplicates
          if (foundLinks.has(href)) return;
          foundLinks.add(href);

          // Extract series ID from URL: /series/{ID}/{SLUG}
          const urlMatch = href.match(/\/series\/([^\/]+)(?:\/([^\/]+))?/);
          if (!urlMatch) return;

          const sourceId = urlMatch[1];
          const slug = urlMatch[2] || '';

          // Try to find title - could be in alt text, title attr, or link text
          const title =
            $el.attr('alt') ||
            $el.attr('title') ||
            $el.text().trim() ||
            slug.replace(/-/g, ' ');

          // Try to find cover image
          let coverImage: string | undefined;
          if (element.name === 'img') {
            coverImage = $el.attr('src') || $el.attr('srcset');
          } else {
            const img = $el.find('img').first();
            coverImage = img.attr('src') || img.attr('srcset');
          }

          if (sourceId) {
            results.push({
              sourceId,
              title: title || 'Unknown Title',
              coverImage,
              sourceUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
            });
          }
        } catch (err) {
          console.error('Error parsing subscription item:', err);
        }
      });

      if (results.length > 0) break; // Found results with this selector
    }

    return results;
  }

  /**
   * Search for manga by title
   */
  async searchManga(query: string): Promise<SearchResult[]> {
    await this.rateLimiter.wait();

    try {
      // WeebCentral search API endpoint
      const searchUrl = `${this.baseUrl}/search/simple?location=main`;

      const html = await makeRequest<string>(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
          'Referer': 'https://weebcentral.com/',
          'Origin': 'https://weebcentral.com',
          'Hx-Request': 'true',
          'Hx-Target': 'quick-search-result',
          'Hx-Trigger': 'quick-search-input',
          'Hx-Trigger-Name': 'text',
          'Hx-Current-Url': 'https://weebcentral.com/',
          'Sec-Ch-Ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
        },
        data: `text=${encodeURIComponent(query)}`,
        retries: this.config.retries,
        timeout: this.config.timeout,
      });

      return this.parseSearchResults(html);
    } catch (error) {
      console.error(`WeebCentral search error for "${query}":`, error);
      return [];
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

    // WeebCentral specific: results are <a> tags inside #quick-search-result
    $('#quick-search-result a').each((_, element) => {
      try {
        const $el = $(element);
        const href = $el.attr('href');

        if (!href) return;

        // Extract title from the text div
        const title = $el.find('div.flex-1').text().trim();

        // Extract cover image from picture > source or img
        const coverSrcset = $el.find('picture source').attr('srcset');
        const coverImg = $el.find('picture img').attr('src');
        const coverImage = coverSrcset || coverImg;

        // Extract series ID from URL: /series/{ID}/{SLUG}
        const urlMatch = href.match(/\/series\/([^\/]+)\//);
        const sourceId = urlMatch ? urlMatch[1] : this.extractMangaId(href);

        if (title && href) {
          results.push({
            sourceId,
            title,
            coverImage: coverImage || undefined,
            sourceUrl: href,
          });
        }
      } catch (err) {
        // Skip invalid items
        console.error('Error parsing search result:', err);
      }
    });

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
