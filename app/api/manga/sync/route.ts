import { NextRequest, NextResponse } from "next/server";
import { scraperService } from "@/lib/scrapers";
import { SourceName } from "@/lib/scrapers/types";

/**
 * POST /api/manga/sync
 * Sync recent updates from a source
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, limit = 20 } = body;

    if (!source) {
      return NextResponse.json(
        {
          success: false,
          error: "source parameter is required",
          availableSources: scraperService.getAvailableSources(),
        },
        { status: 400 }
      );
    }

    if (!scraperService.getScraper(source as SourceName)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid source: ${source}`,
          availableSources: scraperService.getAvailableSources(),
        },
        { status: 400 }
      );
    }

    await scraperService.syncRecentUpdates(source as SourceName, limit);

    return NextResponse.json({
      success: true,
      message: `Successfully synced recent updates from ${source}`,
    });
  } catch (error) {
    console.error("Error syncing manga updates:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to sync manga updates",
      },
      { status: 500 }
    );
  }
}
