import { MangaDexScraper } from "./mangadex";
import { WeebCentralScraper } from "./weebcentral";
import { IScraper, SourceName, SearchResult } from "./types";
import connectDB from "../mongodb";
import Manga, { IManga } from "../models/Manga";
import Chapter, { IChapter } from "../models/Chapter";
import mongoose from "mongoose";

/**
 * Service to coordinate multiple manga scrapers and manage data
 */
export class ScraperService {
  private scrapers: Map<SourceName, IScraper>;

  constructor() {
    this.scrapers = new Map();
    this.scrapers.set("mangadex", new MangaDexScraper());
    this.scrapers.set("weebcentral", new WeebCentralScraper());
  }

  /**
   * Get scraper by source name
   */
  getScraper(source: SourceName): IScraper | undefined {
    return this.scrapers.get(source);
  }

  /**
   * Get all available sources
   */
  getAvailableSources(): SourceName[] {
    return Array.from(this.scrapers.keys());
  }

  /**
   * Search across all sources
   */
  async searchAllSources(query: string): Promise<{
    [key in SourceName]?: SearchResult[];
  }> {
    const results: { [key in SourceName]?: SearchResult[] } = {};

    await Promise.allSettled(
      Array.from(this.scrapers.entries()).map(async ([source, scraper]) => {
        try {
          const searchResults = await scraper.searchManga(query);
          results[source] = searchResults;
        } catch (error) {
          console.error(`Search failed for ${source}:`, error);
          results[source] = [];
        }
      })
    );

    return results;
  }

  /**
   * Search in a specific source
   */
  async searchSource(
    source: SourceName,
    query: string
  ): Promise<SearchResult[]> {
    const scraper = this.getScraper(source);
    if (!scraper) {
      throw new Error(`Scraper not found for source: ${source}`);
    }

    return await scraper.searchManga(query);
  }

  /**
   * Import manga from a source into the database
   */
  async importManga(source: SourceName, sourceId: string): Promise<IManga> {
    await connectDB();

    const scraper = this.getScraper(source);
    if (!scraper) {
      throw new Error(`Scraper not found for source: ${source}`);
    }

    // Fetch manga details and chapters from the source
    const { manga, chapters } = await scraper.getMangaDetails(sourceId);

    // Check if manga already exists with this source
    let existingManga = await Manga.findOne({
      "sources.name": source,
      "sources.id": sourceId,
    });

    if (existingManga) {
      // Update existing manga
      existingManga.title = manga.title;
      existingManga.alternativeTitles = manga.alternativeTitles;
      existingManga.author = manga.author;
      existingManga.artist = manga.artist;
      existingManga.description = manga.description;
      existingManga.coverImage = manga.coverImage;
      existingManga.genres = manga.genres;
      existingManga.status = manga.status;

      // Update latest chapter if newer
      if (chapters.length > 0) {
        const latestChapter = chapters[chapters.length - 1];
        existingManga.latestChapter = {
          number: latestChapter.number,
          title: latestChapter.title,
          source,
          updatedAt: new Date(),
        };
      }

      await existingManga.save();
    } else {
      // Create new manga entry
      existingManga = await Manga.create({
        title: manga.title,
        alternativeTitles: manga.alternativeTitles,
        author: manga.author,
        artist: manga.artist,
        description: manga.description,
        coverImage: manga.coverImage,
        genres: manga.genres,
        status: manga.status,
        sources: [
          {
            name: source,
            id: sourceId,
            url: manga.sourceUrl,
          },
        ],
        latestChapter:
          chapters.length > 0
            ? {
                number: chapters[chapters.length - 1].number,
                title: chapters[chapters.length - 1].title,
                source,
                updatedAt: new Date(),
              }
            : undefined,
      });
    }

    // Import chapters
    await this.importChapters(existingManga._id as mongoose.Types.ObjectId, source, chapters);

    return existingManga;
  }

  /**
   * Import chapters for a manga
   */
  private async importChapters(
    mangaId: mongoose.Types.ObjectId,
    source: SourceName,
    chapters: any[]
  ): Promise<void> {
    // Use bulk operations for better performance
    const bulkOps = chapters.map((chapter) => ({
      updateOne: {
        filter: {
          mangaId,
          "source.name": source,
          "source.id": chapter.sourceId,
        },
        update: {
          $set: {
            mangaId,
            number: chapter.number,
            title: chapter.title,
            volume: chapter.volume,
            source: {
              name: source,
              id: chapter.sourceId,
              url: chapter.sourceUrl,
            },
            publishedAt: chapter.publishedAt,
            pages: chapter.pages,
            translatedLanguage: chapter.translatedLanguage,
            scanlationGroup: chapter.scanlationGroup,
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await Chapter.bulkWrite(bulkOps);
    }
  }

  /**
   * Update latest chapters for a manga from all its sources
   */
  async updateMangaChapters(mangaId: string): Promise<void> {
    await connectDB();

    const manga = await Manga.findById(mangaId);
    if (!manga) {
      throw new Error(`Manga not found: ${mangaId}`);
    }

    // Update from each source
    for (const source of manga.sources) {
      const scraper = this.getScraper(source.name as SourceName);
      if (!scraper) continue;

      try {
        const latestChapters = await scraper.getLatestChapters(source.id, 50);
        await this.importChapters(
          manga._id as mongoose.Types.ObjectId,
          source.name as SourceName,
          latestChapters
        );

        // Update latest chapter info
        if (latestChapters.length > 0) {
          const latest = latestChapters[0];
          if (
            !manga.latestChapter ||
            parseFloat(latest.number) > parseFloat(manga.latestChapter.number)
          ) {
            manga.latestChapter = {
              number: latest.number,
              title: latest.title,
              source: source.name,
              updatedAt: new Date(),
            };
          }
        }
      } catch (error) {
        console.error(
          `Failed to update chapters from ${source.name} for manga ${manga.title}:`,
          error
        );
      }
    }

    await manga.save();
  }

  /**
   * Get recent updates from a source
   */
  async getRecentUpdates(
    source: SourceName,
    limit: number = 20
  ): Promise<SearchResult[]> {
    const scraper = this.getScraper(source);
    if (!scraper) {
      throw new Error(`Scraper not found for source: ${source}`);
    }

    return await scraper.getRecentUpdates(limit);
  }

  /**
   * Sync recent updates from a source to database
   */
  async syncRecentUpdates(source: SourceName, limit: number = 20): Promise<void> {
    const updates = await this.getRecentUpdates(source, limit);

    for (const update of updates) {
      try {
        // Check if manga already exists
        const existing = await Manga.findOne({
          "sources.name": source,
          "sources.id": update.sourceId,
        });

        if (existing) {
          // Update existing manga's latest chapter info
          await this.updateMangaChapters(existing._id.toString());
        } else {
          // Import new manga
          await this.importManga(source, update.sourceId);
        }
      } catch (error) {
        console.error(`Failed to sync manga ${update.title}:`, error);
      }
    }
  }

  /**
   * Get all manga from database with latest chapter info
   */
  async getAllManga(limit: number = 50, skip: number = 0): Promise<IManga[]> {
    await connectDB();
    return await Manga.find()
      .sort({ "latestChapter.updatedAt": -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get manga by ID with all chapters
   */
  async getMangaWithChapters(mangaId: string): Promise<{
    manga: IManga;
    chapters: IChapter[];
  }> {
    await connectDB();

    const manga = await Manga.findById(mangaId);
    if (!manga) {
      throw new Error(`Manga not found: ${mangaId}`);
    }

    const chapters = await Chapter.find({ mangaId })
      .sort({ number: 1 })
      .exec();

    return { manga, chapters };
  }
}

// Export singleton instance
export const scraperService = new ScraperService();
