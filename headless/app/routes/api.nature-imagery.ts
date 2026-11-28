import type {Route} from './+types/api.nature-imagery';

export async function loader({request}: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const base = params.get('layer') === 'base';
  const date = params.get('date');
  if (
    !base &&
    (!date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      date < '2000-02-24' ||
      date > new Date().toISOString().slice(0, 10))
  ) {
    throw new Response('Invalid imagery date', {status: 400});
  }
  const bbox = params.get('bbox');
  const bounds = bbox?.split(',').map(Number);
  if (
    bbox &&
    (!bounds ||
      bounds.length !== 4 ||
      bounds.some((v) => !Number.isFinite(v)) ||
      bounds[0] < -180 ||
      bounds[2] > 180 ||
      bounds[1] < -90 ||
      bounds[3] > 90 ||
      bounds[0] >= bounds[2] ||
      bounds[1] >= bounds[3])
  )
    throw new Response('Invalid bounds', {status: 400});
  const url = new URL(
    'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi',
  );
  url.search = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    LAYERS: base
      ? 'BlueMarble_ShadedRelief_Bathymetry'
      : 'MODIS_Terra_CorrectedReflectance_TrueColor',
    SRS: 'EPSG:4326',
    BBOX: bbox ?? '-180,-90,180,90',
    WIDTH: bbox ? '1024' : '2048',
    HEIGHT: '1024',
    FORMAT: 'image/jpeg',
    ...(base ? {} : {TIME: date!}),
  }).toString();
  try {
    const response = await fetch(url, {signal: AbortSignal.timeout(15000)});
    if (
      !response.ok ||
      !response.headers.get('content-type')?.startsWith('image/jpeg')
    ) {
      throw new Error('Imagery unavailable');
    }
    return new Response(response.body, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Imagery-Date': base ? 'historical-composite' : date!,
        'X-Imagery-Source': base
          ? 'NASA GIBS Blue Marble'
          : 'NASA GIBS MODIS Terra',
      },
    });
  } catch {
    throw new Response('NASA imagery temporarily unavailable', {status: 503});
  }
}
