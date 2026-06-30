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
    const { profileUrl, html } = body;

    const scraper = new WeebCentralScraper();
    let subscriptions;

    if (html && typeof html === "string") {
      // Option A: User pasted the page HTML from their browser's Inspect /
      // View-Source. Works for logged-in (/users/me/) pages since the
      // browser already rendered the authenticated content for them.
      subscriptions = scraper.parseSubscriptionsFromHtml(html);

      if (subscriptions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No manga found in the pasted HTML. Make sure you copied the full page source from your WeebCentral profile (the part containing your subscription list).",
          },
          { status: 400 }
        );
      }
    } else if (profileUrl && typeof profileUrl === "string") {
      // Option B: User provided a public profile URL (or bare user ID)
      // and we fetch + scrape it ourselves.
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

        // Check if user tried to use the /me/ URL (only works when logged in)
        if (userId === 'me') {
          return NextResponse.json(
            {
              success: false,
              error: "Cannot use '/users/me/profiles' URL. Use the 'Paste HTML' option instead, or provide your actual user ID.",
            },
            { status: 400 }
          );
        }
      } else {
        // It's just the user ID
        userId = profileUrl.trim();
      }

      // Get user's subscriptions by fetching the public profile
      subscriptions = await scraper.getUserSubscriptions(userId);

      if (subscriptions.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No subscriptions found (profile might be private)",
          imported: 0,
          total: 0,
        });
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Provide either 'profileUrl' or 'html'",
        },
        { status: 400 }
      );
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
