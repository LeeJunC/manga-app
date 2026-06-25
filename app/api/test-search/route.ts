import { NextRequest, NextResponse } from "next/server";
import { MangaDexScraper } from "@/lib/scrapers/mangadex";

/**
 * POST /api/test-search
 * Test search without database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Query parameter is required",
        },
        { status: 400 }
      );
    }

    const scraper = new MangaDexScraper();
    const results = await scraper.searchManga(query);

    return NextResponse.json({
      success: true,
      data: results,
    });
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
