import {
  IScraper,
  ScrapedManga,
  ScrapedChapter,
  MangaWithChapters,
  SearchResult,
  ScraperConfig,
} from "./types";
import { makeRequest, normalizeStatus, RateLimiter } from "./utils";

/**
 * MangaDex API Scraper
 * Documentation: https://api.mangadex.org/docs/
 */
export class MangaDexScraper implements IScraper {
  public readonly sourceName = "mangadex";
  private readonly baseUrl = "https://api.mangadex.org";
  private rateLimiter: RateLimiter;

  constructor(private config: ScraperConfig = {}) {
    // MangaDex rate limit: 5 requests per second per IP
    this.rateLimiter = new RateLimiter(config.rateLimit || 250);
  }

  /**
   * Search for manga by title
   */
  async searchManga(query: string): Promise<SearchResult[]> {
    await this.rateLimiter.wait();

    const url = `${this.baseUrl}/manga`;
    const params = {
      title: query,
      limit: 20,
      includes: ["cover_art"],
      contentRating: ["safe", "suggestive", "erotica"],
      order: { relevance: "desc" },
    };

    try {
      const data = await makeRequest<any>(url, {
        params,
        retries: this.config.retries,
        timeout: this.config.timeout,
      });

      return data.data.map((manga: any) => this.mapSearchResult(manga));
    } catch (error) {
      console.error(`MangaDex search error for "${query}":`, error);
      return [];
    }
  }

  /**
   * Get detailed manga information including all chapters
   */
  async getMangaDetails(sourceId: string): Promise<MangaWithChapters> {
    // Fetch manga details
    const manga = await this.fetchMangaInfo(sourceId);

    // Fetch all chapters (English)
    const chapters = await this.fetchAllChapters(sourceId);

    return { manga, chapters };
  }

  /**
   * Get latest chapters for a specific manga
   */
  async getLatestChapters(
    sourceId: string,
    limit: number = 10
  ): Promise<ScrapedChapter[]> {
    await this.rateLimiter.wait();

    const url = `${this.baseUrl}/manga/${sourceId}/feed`;
    const params = {
      limit,
      translatedLanguage: ["en"],
      includes: ["scanlation_group"],
      order: { publishAt: "desc" },
      contentRating: ["safe", "suggestive", "erotica"],
    };

    try {
      const data = await makeRequest<any>(url, {
        params,
        retries: this.config.retries,
        timeout: this.config.timeout,
      });

      return data.data.map((chapter: any) => this.mapChapter(chapter));
    } catch (error) {
      console.error(`MangaDex getLatestChapters error for ${sourceId}:`, error);
      return [];
    }
  }

  /**
   * Get recently updated manga
   */
  async getRecentUpdates(limit: number = 20): Promise<SearchResult[]> {
    await this.rateLimiter.wait();

    const url = `${this.baseUrl}/manga`;
    const params = {
      limit,
      includes: ["cover_art"],
      contentRating: ["safe", "suggestive", "erotica"],
      order: { latestUploadedChapter: "desc" },
      hasAvailableChapters: "true",
    };

    try {
      const data = await makeRequest<any>(url, {
        params,
        retries: this.config.retries,
        timeout: this.config.timeout,
      });

      return data.data.map((manga: any) => this.mapSearchResult(manga));
    } catch (error) {
      console.error("MangaDex getRecentUpdates error:", error);
      return [];
    }
  }

  /**
   * Fetch detailed manga information
   */
  private async fetchMangaInfo(mangaId: string): Promise<ScrapedManga> {
    await this.rateLimiter.wait();

    const url = `${this.baseUrl}/manga/${mangaId}`;
    const params = {
      includes: ["cover_art", "author", "artist"],
    };

    const data = await makeRequest<any>(url, {
      params,
      retries: this.config.retries,
      timeout: this.config.timeout,
    });

    return this.mapManga(data.data);
  }

  /**
   * Fetch all chapters for a manga (handles pagination)
   */
  private async fetchAllChapters(mangaId: string): Promise<ScrapedChapter[]> {
    const allChapters: ScrapedChapter[] = [];
    let offset = 0;
    const limit = 500;

    while (true) {
      await this.rateLimiter.wait();

      const url = `${this.baseUrl}/manga/${mangaId}/feed`;
      const params = {
        limit,
        offset,
        translatedLanguage: ["en"],
        includes: ["scanlation_group"],
        order: { chapter: "asc" },
        contentRating: ["safe", "suggestive", "erotica"],
      };

      try {
        const data = await makeRequest<any>(url, {
          params,
          retries: this.config.retries,
          timeout: this.config.timeout,
        });

        const chapters = data.data.map((chapter: any) => this.mapChapter(chapter));
        allChapters.push(...chapters);

        // Check if there are more chapters
        if (data.data.length < limit) {
          break;
        }

        offset += limit;
      } catch (error) {
        console.error(`Error fetching chapters at offset ${offset}:`, error);
        break;
      }
    }

    return allChapters;
  }

  /**
   * Map MangaDex manga data to ScrapedManga
   */
  private mapManga(data: any): ScrapedManga {
    const attributes = data.attributes;
    const relationships = data.relationships || [];

    // Get cover art
    const coverArt = relationships.find((rel: any) => rel.type === "cover_art");
    const coverFileName = coverArt?.attributes?.fileName;
    const coverImage = coverFileName
      ? `https://uploads.mangadex.org/covers/${data.id}/${coverFileName}`
      : undefined;

    // Get author and artist
    const author = relationships.find((rel: any) => rel.type === "author");
    const artist = relationships.find((rel: any) => rel.type === "artist");

    // Get title (prefer English)
    const title =
      attributes.title?.en ||
      attributes.title?.["ja-ro"] ||
      Object.values(attributes.title || {})[0] ||
      "Unknown Title";

    // Get alternative titles
    const alternativeTitles = attributes.altTitles
      ?.map((alt: any) => Object.values(alt)[0])
      .filter(Boolean) || [];

    // Get description (prefer English)
    const description =
      attributes.description?.en ||
      Object.values(attributes.description || {})[0] ||
      undefined;

    // Get genres/tags
    const genres = attributes.tags
      ?.filter((tag: any) => tag.attributes?.group === "genre")
      .map((tag: any) => tag.attributes?.name?.en)
      .filter(Boolean) || [];

    return {
      title,
      alternativeTitles,
      author: author?.attributes?.name,
      artist: artist?.attributes?.name,
      description,
      coverImage,
      genres,
      status: normalizeStatus(attributes.status),
      sourceId: data.id,
      sourceUrl: `https://mangadex.org/title/${data.id}`,
    };
  }

  /**
   * Map MangaDex chapter data to ScrapedChapter
   */
  private mapChapter(data: any): ScrapedChapter {
    const attributes = data.attributes;
    const relationships = data.relationships || [];

    // Get scanlation group
    const scanlationGroup = relationships.find(
      (rel: any) => rel.type === "scanlation_group"
    );

    return {
      number: attributes.chapter || "0",
      title: attributes.title || undefined,
      volume: attributes.volume || undefined,
      sourceId: data.id,
      sourceUrl: `https://mangadex.org/chapter/${data.id}`,
      publishedAt: attributes.publishAt
        ? new Date(attributes.publishAt)
        : undefined,
      pages: attributes.pages || undefined,
      translatedLanguage: attributes.translatedLanguage || "en",
      scanlationGroup: scanlationGroup?.attributes?.name,
    };
  }

  /**
   * Map manga to search result
   */
  private mapSearchResult(data: any): SearchResult {
    const attributes = data.attributes;
    const relationships = data.relationships || [];

    const title =
      attributes.title?.en ||
      attributes.title?.["ja-ro"] ||
      Object.values(attributes.title || {})[0] ||
      "Unknown Title";

    const coverArt = relationships.find((rel: any) => rel.type === "cover_art");
    const coverFileName = coverArt?.attributes?.fileName;
    const coverImage = coverFileName
      ? `https://uploads.mangadex.org/covers/${data.id}/${coverFileName}.256.jpg`
      : undefined;

    return {
      sourceId: data.id,
      title,
      coverImage,
      sourceUrl: `https://mangadex.org/title/${data.id}`,
    };
  }
}
