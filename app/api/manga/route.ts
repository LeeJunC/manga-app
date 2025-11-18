import { NextRequest, NextResponse } from "next/server";
import { scraperService } from "@/lib/scrapers";

/**
 * GET /api/manga
 * Get all manga from database
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    const manga = await scraperService.getAllManga(limit, skip);

    return NextResponse.json({
      success: true,
      data: manga,
      count: manga.length,
    });
  } catch (error) {
    console.error("Error fetching manga:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch manga",
      },
      { status: 500 }
    );
  }
}
