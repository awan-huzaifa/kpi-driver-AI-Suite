import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input') ?? ''

  if (!input.trim() || input.length < 3) {
    return NextResponse.json({ predictions: [] })
  }

  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'Places API not configured' }, { status: 500 })
  }

  // New Places API (v1)
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'X-Goog-Api-Key':  key,
    },
    body: JSON.stringify({
      input,
      includedRegionCodes:  ['us'],
      includedPrimaryTypes: ['street_address', 'route', 'premise', 'subpremise'],
    }),
  })

  const data = await res.json()

  console.log('[Places API v1] status:', res.status, '| suggestions:', data.suggestions?.length ?? 0, '| error:', data.error?.message ?? 'none')

  // Map new response shape → same { place_id, description } shape the frontend expects
  const predictions = (data.suggestions ?? []).map((s: {
    placePrediction: { placeId: string; text: { text: string } }
  }) => ({
    place_id:    s.placePrediction.placeId,
    description: s.placePrediction.text.text,
  }))

  return NextResponse.json({ predictions })
}
