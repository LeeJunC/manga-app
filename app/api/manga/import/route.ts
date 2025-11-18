import { NextRequest, NextResponse } from "next/server";
import { scraperService } from "@/lib/scrapers";
import { SourceName } from "@/lib/scrapers/types";

/**
 * POST /api/manga/import
 * Import manga from a source into the database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, sourceId } = body;

    if (!source || !sourceId) {
      return NextResponse.json(
        {
          success: false,
          error: "source and sourceId parameters are required",
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

    const manga = await scraperService.importManga(source as SourceName, sourceId);

    return NextResponse.json({
      success: true,
      message: "Manga imported successfully",
      data: manga,
    });
  } catch (error) {
    console.error("Error importing manga:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to import manga",
      },
      { status: 500 }
    );
  }
}
