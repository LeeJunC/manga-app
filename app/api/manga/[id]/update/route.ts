import { NextRequest, NextResponse } from "next/server";
import { scraperService } from "@/lib/scrapers";

/**
 * POST /api/manga/[id]/update
 * Update chapters for a specific manga from all its sources
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await scraperService.updateMangaChapters(id);

    return NextResponse.json({
      success: true,
      message: "Manga chapters updated successfully",
    });
  } catch (error) {
    console.error("Error updating manga chapters:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update manga chapters",
      },
      { status: error instanceof Error && error.message.includes("not found") ? 404 : 500 }
    );
  }
}
