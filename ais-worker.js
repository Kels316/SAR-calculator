/**
 * AIS Proxy — Cloudflare Worker (streaming NDJSON)
 *
 * Deployment steps:
 *   1. Sign up at https://aisstream.io and generate an API key
 *   2. Sign up at https://cloudflare.com (free)
 *   3. Go to Workers & Pages → Create Worker → paste this file
 *   4. Settings → Variables → add Secret: AISSTREAM_API_KEY = <your key>
 *   5. Copy the Worker URL (e.g. https://ais-proxy.yourname.workers.dev)
 *   6. Paste it into marine_sar.html as AIS_WORKER_URL
 *
 * Returns a 25-second stream of NDJSON vessel objects (one per line).
 * Each line is a complete vessel object. Vessels are emitted as positions
 * are received — duplicates are updates, not new entries.
 */

export default {
  async fetch(request, env) {

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    const url = new URL(request.url);
    const lat = parseFloat(url.searchParams.get('lat'));
    const lon = parseFloat(url.searchParams.get('lon'));
    const r   = parseFloat(url.searchParams.get('r') || '25');

    if (isNaN(lat) || isNaN(lon)) {
      return new Response(JSON.stringify({ error: 'Missing lat/lon' }),
        { status: 400, headers: { ...cors(), 'Content-Type': 'application/json' } });
    }
    if (!env.AISSTREAM_API_KEY) {
      return new Response(JSON.stringify({ error: 'AISSTREAM_API_KEY not set' }),
        { status: 500, headers: { ...cors(), 'Content-Type': 'application/json' } });
    }

    const dLat = r / 60;
    const dLon = r / (60 * Math.cos(lat * Math.PI / 180));

    const { readable, writable } = new TransformStream();
    const writer  = writable.getWriter();
    const encoder = new TextEncoder();

    // Stream AIS data asynchronously; return response immediately
    streamAIS(writer, encoder, env.AISSTREAM_API_KEY, lat, lon, dLat, dLon)
      .catch(() => {})
      .finally(() => writer.close().catch(() => {}));

    return new Response(readable, {
      headers: { ...cors(), 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' },
    });
  }
};

async function streamAIS(writer, encoder, apiKey, lat, lon, dLat, dLon) {
  const vessels = new Map();
  const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

  await new Promise(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; try { ws.close(); } catch (_) {} resolve(); } };
    setTimeout(finish, 25000);

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        APIKey:             apiKey,
        BoundingBoxes:      [[[lat - dLat, lon - dLon], [lat + dLat, lon + dLon]]],
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      }));
    });

    ws.addEventListener('message', async ({ data }) => {
      // Normalise blob / arraybuffer / string
      let text;
      if (typeof data === 'string')        text = data;
      else if (data instanceof ArrayBuffer) text = new TextDecoder().decode(data);
      else { try { text = new TextDecoder().decode(await data.arrayBuffer()); } catch (_) { return; } }

      try {
        const msg  = JSON.parse(text);
        const meta = msg.MetaData;
        if (!meta) return;

        if (msg.MessageType === 'PositionReport') {
          const p      = msg.Message.PositionReport;
          const prev   = vessels.get(meta.MMSI) || {};
          const vessel = {
            ...prev,
            mmsi:    meta.MMSI,
            name:    (meta.ShipName || '').trim().replace(/\s+/g, ' ') || prev.name || 'Unknown',
            lat:     meta.latitude,
            lon:     meta.longitude,
            cog:     p.Cog,
            sog:     p.Sog,
            heading: p.TrueHeading < 360 ? p.TrueHeading : p.Cog,
            status:  p.NavigationalStatus,
          };
          vessels.set(meta.MMSI, vessel);
          await writer.write(encoder.encode(JSON.stringify(vessel) + '\n'));

        } else if (msg.MessageType === 'ShipStaticData') {
          const s    = msg.Message.ShipStaticData;
          const prev = vessels.get(meta.MMSI) || {};
          const vessel = {
            ...prev,
            mmsi: meta.MMSI,
            name: (s.Name || '').trim().replace(/\s+/g, ' ') || prev.name || 'Unknown',
            type: s.Type,
            dest: (s.Destination || '').trim(),
          };
          vessels.set(meta.MMSI, vessel);
          // Only emit if we already have a position for this vessel
          if (vessel.lat) await writer.write(encoder.encode(JSON.stringify(vessel) + '\n'));
        }
      } catch (_) {}
    });

    ws.addEventListener('error',  finish);
    ws.addEventListener('close',  finish);
  });
}

function cors() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
