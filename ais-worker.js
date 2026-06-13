/**
 * AIS Proxy — Cloudflare Worker
 *
 * Deployment steps:
 *   1. Sign up at https://aisstream.io and generate an API key
 *   2. Sign up at https://cloudflare.com (free)
 *   3. Go to Workers & Pages → Create Worker → paste this file
 *   4. Settings → Variables → add Secret: AISSTREAM_API_KEY = <your key>
 *   5. Copy the Worker URL (e.g. https://ais-proxy.yourname.workers.dev)
 *   6. Paste it into marine_sar.html as AIS_WORKER_URL
 *
 * Usage:
 *   GET https://your-worker.workers.dev?lat=-27.5&lon=153.0&r=25
 *   Returns JSON array of vessel objects.
 *
 *   Debug mode (add &debug=1 to URL):
 *   Returns { vessels: [...], debug: { ... } }
 */

export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    const url   = new URL(request.url);
    const lat   = parseFloat(url.searchParams.get('lat'));
    const lon   = parseFloat(url.searchParams.get('lon'));
    const r     = parseFloat(url.searchParams.get('r') || '25');
    const debug = url.searchParams.get('debug') === '1';

    if (isNaN(lat) || isNaN(lon)) {
      return new Response(JSON.stringify({ error: 'Missing lat/lon' }),
        { status: 400, headers: { ...cors(), 'Content-Type': 'application/json' } });
    }
    if (!env.AISSTREAM_API_KEY) {
      return new Response(JSON.stringify({ error: 'AISSTREAM_API_KEY secret not set' }),
        { status: 500, headers: { ...cors(), 'Content-Type': 'application/json' } });
    }

    // nm → bounding box degrees
    const dLat = r / 60;
    const dLon = r / (60 * Math.cos(lat * Math.PI / 180));

    const vessels = new Map();
    const dbg = {
      connected: false, subscriptionSent: false,
      rawMessages: 0, firstRaw: null,
      closeCode: null, closeReason: null, wsError: null, catchError: null,
    };

    try {
      const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

      await new Promise(resolve => {
        let done = false;
        const finish = () => {
          if (!done) {
            done = true;
            try { ws.close(); } catch (_) {}
            resolve();
          }
        };
        const timer = setTimeout(finish, 8000);

        // Send subscription only after connection is open
        ws.addEventListener('open', () => {
          dbg.connected = true;
          ws.send(JSON.stringify({
            APIKey:             env.AISSTREAM_API_KEY,
            BoundingBoxes:      [[[lat - dLat, lon - dLon], [lat + dLat, lon + dLon]]],
            FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
          }));
          dbg.subscriptionSent = true;
        });

        ws.addEventListener('message', async ({ data }) => {
          dbg.rawMessages++;
          // Normalise to string — CF Workers can deliver text, ArrayBuffer, or Blob
          let text;
          if (typeof data === 'string') {
            text = data;
            dbg.dataType = 'string';
          } else if (data instanceof ArrayBuffer) {
            text = new TextDecoder().decode(data);
            dbg.dataType = 'arraybuffer';
          } else {
            // Blob
            dbg.dataType = 'blob';
            try { text = new TextDecoder().decode(await data.arrayBuffer()); }
            catch (e) { dbg.dataType = 'blob-decode-failed:' + e.message; return; }
          }
          if (dbg.rawMessages === 1) dbg.firstRaw = text.slice(0, 500);

          try {
            const msg  = JSON.parse(text);
            const meta = msg.MetaData;
            if (!meta) return;

            if (msg.MessageType === 'PositionReport') {
              const p = msg.Message.PositionReport;
              vessels.set(meta.MMSI, {
                ...(vessels.get(meta.MMSI) || {}),
                mmsi:    meta.MMSI,
                name:    (meta.ShipName || '').trim().replace(/\s+/g, ' ') || 'Unknown',
                lat:     meta.latitude,
                lon:     meta.longitude,
                cog:     p.Cog,
                sog:     p.Sog,
                heading: p.TrueHeading < 360 ? p.TrueHeading : p.Cog,
                status:  p.NavigationalStatus,
              });
            } else if (msg.MessageType === 'ShipStaticData') {
              const s   = msg.Message.ShipStaticData;
              const ex  = vessels.get(meta.MMSI) || {};
              vessels.set(meta.MMSI, {
                ...ex,
                mmsi: meta.MMSI,
                name: (s.Name || '').trim() || ex.name || 'Unknown',
                type: s.Type,
                dest: (s.Destination || '').trim(),
              });
            }
          } catch (_) {}
        });

        ws.addEventListener('error', (e) => {
          dbg.wsError = e.message || String(e);
          clearTimeout(timer);
          finish();
        });

        ws.addEventListener('close', (e) => {
          dbg.closeCode   = e.code;
          dbg.closeReason = e.reason;
          clearTimeout(timer);
          finish();
        });
      });

    } catch (e) {
      dbg.catchError = e.message;
    }

    const list = [...vessels.values()];
    return new Response(JSON.stringify(list), {
      headers: { ...cors(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
};

function cors() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
