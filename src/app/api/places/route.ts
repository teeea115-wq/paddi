import { NextResponse } from 'next/server';

// Basic in-memory rate limiting (Note: resets on serverless cold starts)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 20; // 20 requests
const RESET_INTERVAL = 60 * 1000; // per minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || 'restaurant';
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  // 1. Rate Limiting
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const now = Date.now();
  const rateData = rateLimitMap.get(ip) || { count: 0, lastReset: now };

  if (now - rateData.lastReset > RESET_INTERVAL) {
    rateData.count = 0;
    rateData.lastReset = now;
  }

  if (rateData.count >= RATE_LIMIT) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  rateData.count++;
  rateLimitMap.set(ip, rateData);

  // 2. SerpAPI Call
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    console.error('SERPAPI_KEY is not configured on the server');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const serpUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(q)}&ll=@${lat},${lng},15z&api_key=${apiKey}&no_cache=true`;

  try {
    const res = await fetch(serpUrl);
    const data = await res.json();

    if (!data.local_results) {
      return NextResponse.json([]);
    }

    const cleanedResults = data.local_results.map((item: any) => ({
      title: item.title,
      address: item.address,
      rating: item.rating,
      thumbnail: item.thumbnail,
      place_id: item.place_id
    }));

    return NextResponse.json(cleanedResults);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch from SerpAPI' }, { status: 500 });
  }
}
