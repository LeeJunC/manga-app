import { NextRequest, NextResponse } from "next/server";
import { WeebCentralScraper } from "@/lib/scrapers/weebcentral";
import { scraperService } from "@/lib/scrapers";

/**
 * POST /api/manga/bulk-import
 * Import all manga from a WeebCentral profile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileUrl } = body;

    if (!profileUrl || typeof profileUrl !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "profileUrl parameter is required",
        },
        { status: 400 }
      );
    }

    // Extract user ID from profile URL or use directly if it's just a username
    // Accepts either:
    // - Full URL: https://weebcentral.com/users/{USER_ID}/profiles
    // - Just the user ID: KQOUqMcPfQcB9guqwmj6K2m8mci1
    let userId: string;

    if (profileUrl.includes('/')) {
      // It's a URL, extract the user ID
      const userIdMatch = profileUrl.match(/\/users\/([^\/]+)/);
      if (!userIdMatch) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid profile URL. Expected format: https://weebcentral.com/users/{USER_ID}/profiles or just the user ID",
          },
          { status: 400 }
        );
      }
      userId = userIdMatch[1];
    } else {
      // It's just the user ID
      userId = profileUrl.trim();
    }

    // Get user's subscriptions
    const scraper = new WeebCentralScraper();
    const subscriptions = await scraper.getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No subscriptions found (profile might be private)",
        imported: 0,
        total: 0,
      });
    }

    // Import all subscriptions
    const imported = [];
    const failed = [];

    for (const manga of subscriptions) {
      try {
        const result = await scraperService.importMangaFromSearch(
          "weebcentral",
          manga.sourceId,
          manga.title,
          manga.coverImage,
          manga.sourceUrl
        );
        imported.push(result);
      } catch (error) {
        console.error(`Failed to import ${manga.title}:`, error);
        failed.push(manga.title);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${imported.length} out of ${subscriptions.length} manga`,
      imported: imported.length,
      failed: failed.length,
      total: subscriptions.length,
      failedTitles: failed,
    });
  } catch (error) {
    console.error("Error bulk importing manga:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to bulk import manga",
      },
      { status: 500 }
    );
  }
}
