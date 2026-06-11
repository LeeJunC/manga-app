import { NextRequest, NextResponse } from "next/server";
import { scraperService } from "@/lib/scrapers";

/**
 * GET /api/manga/[id]
 * Get specific manga with all its chapters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { manga, chapters } = await scraperService.getMangaWithChapters(id);

    return NextResponse.json({
      success: true,
      data: {
        manga,
        chapters,
      },
    });
  } catch (error) {
    console.error("Error fetching manga details:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch manga details",
      },
      { status: error instanceof Error && error.message.includes("not found") ? 404 : 500 }
    );
  }
}
