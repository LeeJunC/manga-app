/**
 * Common types and interfaces for manga scrapers
 */

export type SourceName = "mangadex" | "weebcentral" | "other";

export interface ScrapedManga {
  title: string;
  alternativeTitles?: string[];
  author?: string;
  artist?: string;
  description?: string;
  coverImage?: string;
  genres?: string[];
  status?: "ongoing" | "completed" | "hiatus" | "cancelled";

  sourceId: string;
  sourceUrl: string;
}

export interface ScrapedChapter {
  number: string;
  title?: string;
  volume?: string;
  sourceId: string;
  sourceUrl: string;
  publishedAt?: Date;
  pages?: number;
  translatedLanguage?: string;
  scanlationGroup?: string;
}

export interface MangaWithChapters {
  manga: ScrapedManga;
  chapters: ScrapedChapter[];
}

export interface SearchResult {
  sourceId: string;
  title: string;
  coverImage?: string;
  sourceUrl: string;
}

/**
 * Base scraper interface that all scrapers must implement
 */
export interface IScraper {
  sourceName: SourceName;

  /**
   * Search for manga by title
   */
  searchManga(query: string): Promise<SearchResult[]>;

  /**
   * Get detailed manga information including all chapters
   */
  getMangaDetails(sourceId: string): Promise<MangaWithChapters>;

  /**
   * Get latest chapters for a specific manga
   */
  getLatestChapters(sourceId: string, limit?: number): Promise<ScrapedChapter[]>;

  /**
   * Get recently updated manga (for tracking updates)
   */
  getRecentUpdates(limit?: number): Promise<SearchResult[]>;
}

/**
 * Scraper configuration
 */
export interface ScraperConfig {
  rateLimit?: number; // Milliseconds between requests
  timeout?: number; // Request timeout in milliseconds
  userAgent?: string;
  retries?: number;
}
