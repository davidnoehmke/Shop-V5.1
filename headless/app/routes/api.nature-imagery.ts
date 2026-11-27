import type {Route} from './+types/api.nature-imagery';

export async function loader({request}: Route.LoaderArgs) {
  const date = new URL(request.url).searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) ||
    date < '2000-02-24' || date > new Date().toISOString().slice(0, 10)) {
    throw new Response('Invalid imagery date', {status: 400});
  }
  const url = new URL('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi');
  url.search = new URLSearchParams({SERVICE: 'WMS', VERSION: '1.1.1', REQUEST: 'GetMap',
    LAYERS: 'MODIS_Terra_CorrectedReflectance_TrueColor', SRS: 'EPSG:4326',
    BBOX: '-180,-90,180,90', WIDTH: '2048', HEIGHT: '1024', FORMAT: 'image/jpeg', TIME: date}).toString();
  try {
    const response = await fetch(url, {signal: AbortSignal.timeout(15000)});
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/jpeg')) {
      throw new Error('Imagery unavailable');
    }
    return new Response(response.body, {headers: {
      'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Imagery-Date': date, 'X-Imagery-Source': 'NASA GIBS MODIS Terra',
    }});
  } catch {throw new Response('NASA imagery temporarily unavailable', {status: 503});}
}
