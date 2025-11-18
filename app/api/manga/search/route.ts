import { NextRequest, NextResponse } from "next/server";
import { scraperService } from "@/lib/scrapers";
import { SourceName } from "@/lib/scrapers/types";

/**
 * POST /api/manga/search
 * Search for manga across sources
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, source } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Query parameter is required",
        },
        { status: 400 }
      );
    }

    let results;

    if (source) {
      // Search in specific source
      if (!scraperService.getScraper(source as SourceName)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid source: ${source}`,
          },
          { status: 400 }
        );
      }

      results = await scraperService.searchSource(source as SourceName, query);
      return NextResponse.json({
        success: true,
        source,
        data: results,
      });
    } else {
      // Search across all sources
      results = await scraperService.searchAllSources(query);
      return NextResponse.json({
        success: true,
        data: results,
      });
    }
  } catch (error) {
    console.error("Error searching manga:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to search manga",
      },
      { status: 500 }
    );
  }
}
