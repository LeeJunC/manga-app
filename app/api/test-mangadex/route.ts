import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Test 1: Minimal query
    const test1 = await fetch('https://api.mangadex.org/manga?title=kingdom&limit=5');
    const data1 = await test1.json();

    return NextResponse.json({
      success: true,
      test1Status: test1.status,
      test1Data: data1,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed',
    });
  }
}
