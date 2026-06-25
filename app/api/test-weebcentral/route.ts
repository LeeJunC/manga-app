import { NextResponse } from "next/server";
import { WeebCentralScraper } from "@/lib/scrapers/weebcentral";

export async function GET() {
  try {
    const scraper = new WeebCentralScraper();

    // Test search
    const results = await scraper.searchManga("one piece");

    return NextResponse.json({
      success: true,
      resultsCount: results.length,
      results: results.slice(0, 3), // Show first 3 results
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scrape',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
