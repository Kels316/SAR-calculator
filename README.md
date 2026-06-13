# Marine SAR Calculator

A browser-based Search and Rescue planning tool based on the Australian National SAR Manual (AUSSAR) 2023 and IAMSAR procedures.

**Live tool:** https://kels316.github.io/SAR-calculator/

---

## Features

- **Drift & datum calculation** — combines ocean current, wind current (3% rule), and leeway vectors to estimate the current position of a search object from its last known position
- **Search area sizing** — probabilistic error ellipse using LKP error, asset GPS error, and drift uncertainty
- **Detection parameters** — sweep width, track spacing, and probability of detection (POD) based on target type, weather, fatigue, and visibility factors. POD calculated using AUSSAR Figure D-5:13 Marine Probability of Detection curves
- **Manual search radius** — override the calculated radius (2 × total position error) with a user-specified value in nautical miles
- **Five search patterns** with full waypoint generation:
  - Parallel Track — legs parallel to drift; S/2 inset from bounding square
  - Expanding Square — from AUSSAR Table 4-3; N legs and total track distance looked up by radius and track spacing; first leg into the wind
  - Sector Search — two-sweep AUSSAR vessel sector search (Figure 4-10); 120° starboard turns, 9R per sweep, 30° rotation between sweeps
  - Creeping Line Ahead — legs perpendicular to drift direction; advances in drift direction
  - Track Line Search — along a known vessel route
- **Live marine data** — fetches current ocean conditions from [Open-Meteo](https://open-meteo.com) and auto-populates current, wind, and weather factor inputs
- **Live weather panel** — displays wave height/period/direction, swell, wind, air temperature, pressure, humidity, visibility, and sea surface temperature at the LKP
- **Tide chart** — official tidal predictions for the nearest coastal bar to the LKP, drawn from a local database built directly from the Australian National Tide Tables (ANTT) 2026
- **Interactive map** — tap to place a draggable LKP pin, or type coordinates; map shows LKP, search area circle, dotted bounding square (oriented to pattern direction), and calculated search pattern
- **Responsive layout** — works on desktop and tablet; portrait tablet (≤768px) stacks panels into a single scrollable column so the tide chart is always reachable
- **AIS overlay** — toggle live nearby vessel positions onto the map via an aisstream.io Cloudflare Worker proxy; vessels colour-coded by nav status with popup showing name, MMSI, SOG, COG, and destination
- **Waypoint export** — GPX and KML export for upload to Google Earth or GPS devices
- **BOM marine warnings** — fetches active marine weather warnings for the LKP from the Bureau of Meteorology, displayed in the live conditions panel with GMDSS severity colour-coding (strong wind / gale / storm force / hurricane force)
- **Print / Save PDF** — generates a clean monospace SAR plan summary (incident, drift, datum, search parameters, live conditions, tide HW/LW, active warnings with full text, waypoints) and opens the browser print dialog
- **Copy Summary** — copies the full SAR plan text to the clipboard, including live marine conditions, tide extremes, and full BOM warning text if data has been fetched

---

## Live Data Sources

Enter LKP coordinates and click **Fetch Live Marine Data** to pull current conditions:

| Data | Source |
|---|---|
| Ocean current speed & direction | Open-Meteo Marine API (free, no key) |
| Wind speed, direction & gusts | Open-Meteo Forecast API (free, no key) |
| Wave height, period & direction | Open-Meteo Marine API |
| Swell height, period & direction | Open-Meteo Marine API |
| Air temperature, pressure, humidity | Open-Meteo Forecast API |
| Sea surface temperature | Open-Meteo Marine API |
| Weather factor (Wf) | Derived from significant wave height |
| Tide predictions | ANTT 2026 — Australian Hydrographic Office (local DB) |
| Marine warnings | Bureau of Meteorology (BOM) Weather API — location-specific active warnings |

Fields auto-populated from live data are highlighted in green. Editing any field manually removes the green highlight.

Ocean currents are modelled at ~8 km resolution — accuracy is limited in coastal areas and this data supplements but does not replace nautical almanac data or on-scene observations.

---

## Tide Database

Tide predictions are served from `tide-db.js`, a pre-built database parsed directly from the **Australian National Tide Tables (ANTT) 2026**, published by the Australian Hydrographic Office.

**640 stations** across Australia — 79 primary ports and 561 secondary ports.

**Primary ports** — HW/LW times and heights are read directly from the ANTT predicted tide tables (Chapter 3).

**Secondary ports** — calculated from the nearest standard port using the official ANTT method (AHP11):

```
secondary_height = (std_height − std_MSL) × range_ratio + sec_MSL
```

where `range_ratio = (sec_MHWS − sec_MLWS) / (std_MHWS − std_MLWS)`, and time is adjusted by the mean time difference — both sourced from the ANTT secondary port datum tables (Chapter 4).

The database is rebuilt annually by running `build_tide_db.py` against the new ANTT PDF. A GitHub Actions workflow (`refresh-tide-db.yml`) automates this each January.

### Rebuilding the DB

```bash
pip install pypdf
python3 build_tide_db.py /path/to/ANTT_2026.pdf
```

The script writes `tide-db.js` to the same directory. Drop the new PDF alongside the script and re-run for each new year's tables.

---

## Coastal Bar Database

The calculator includes 39 Australian coastal bar locations across QLD, NSW, VIC, SA, WA, and NT. When live data is fetched, the nearest bar to the LKP is identified and its tidal predictions are displayed — relevant to rescue crews who must cross the bar to reach the search area.

The tide chart shows:
- **Teal curve** — tidal predictions from the ANTT 2026 database
- **Labels** — upcoming HW/LW extremes with time (browser local timezone) and height in metres
- **Now line** — current time marker

---

## Usage

Open `marine_sar.html` in any modern browser — no server or installation required.

1. Enter the **Last Known Position** by typing coordinates (decimal, DD MM.mmm, or DMS), or tap the map to drop a pin — the pin can be dragged to refine the position
2. Click **Fetch Live Marine Data** to auto-populate current, wind, and weather conditions
3. Review and adjust all inputs across the six steps
4. Click **Calculate SAR Plan**
5. Export waypoints via **GPX** or **KML**, or use **Print / Save PDF** for briefings

---

## Files

| File | Description |
|---|---|
| `marine_sar.html` | Main calculator — open this in a browser |
| `index.html` | Redirects to `marine_sar.html` |
| `tide-db.js` | Pre-built tide database (640 stations, ANTT 2026) |
| `build_tide_db.py` | Rebuilds `tide-db.js` from an ANTT PDF |
| `check-tides.mjs` | CLI tool to inspect tide DB entries for a named bar |
| `ais-worker.js` | Cloudflare Worker proxy for aisstream.io AIS data |

---

## References

- Australian National Search and Rescue Manual (AUSSAR) 2023
  - Figure 4-10 — Vessel Sector Search pattern geometry
  - Table 4-3 — Number of search legs and total track distance for Expanding Square by radius and track spacing
  - Figure D-5:13 — Marine Probability of Detection curves (First through Fifth search)
- IAMSAR Manual Vol. II — Mission Co-ordination
- Australian National Tide Tables 2026, Australian Hydrographic Office (AHO) — [hydro.gov.au](https://www.hydro.gov.au)
  - AHP11 — Secondary port calculation method
- Open-Meteo Marine & Forecast APIs — [docs](https://open-meteo.com/en/docs/marine-weather-api)
- aisstream.io — WebSocket AIS data stream (requires free API key; accessed via Cloudflare Worker proxy)
