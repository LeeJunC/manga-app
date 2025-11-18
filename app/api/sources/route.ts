import { NextResponse } from "next/server";
import { scraperService } from "@/lib/scrapers";

/**
 * GET /api/sources
 * Get available scraper sources
 */
export async function GET() {
  try {
    const sources = scraperService.getAvailableSources();

    return NextResponse.json({
      success: true,
      data: sources,
    });
  } catch (error) {
    console.error("Error fetching sources:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch sources",
      },
      { status: 500 }
    );
  }
}
