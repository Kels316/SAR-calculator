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
- **Tide chart** — real tidal height predictions for the nearest coastal bar to the LKP; past tidal curve from calibrated Open-Meteo data, future from BOM official HW/LW predictions via [austides](https://austides.vercel.app), joined by a cubic spline for a smooth continuous curve
- **Interactive map** — tap to place a draggable LKP pin, or type coordinates; map shows LKP, search area circle, dotted bounding square (oriented to pattern direction), and calculated search pattern
- **Waypoint export** — GPX and KML export for upload to Google Earth or GPS devices
- **Print / Save PDF** — generates a clean monospace SAR plan summary (incident, drift, datum, search parameters, live conditions, tide HW/LW, waypoints) and opens the browser print dialog
- **Copy Summary** — copies the full SAR plan text to the clipboard, including live marine conditions and tide extremes if data has been fetched

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
| Tide chart — past curve | Open-Meteo Marine API (calibrated against BOM extremes) |
| Tide chart — future curve | BOM official HW/LW predictions via austides proxy |

Fields auto-populated from live data are highlighted in green. Editing any field manually removes the green highlight.

Ocean currents are modelled at ~8 km resolution — accuracy is limited in coastal areas and this data supplements but does not replace nautical almanac data or on-scene observations.

---

## Coastal Bar Database

The calculator includes 39 Australian coastal bar locations across QLD, NSW, VIC, SA, WA, and NT. When live data is fetched, the nearest bar to the LKP is identified and its tidal predictions are displayed — relevant to rescue crews who must cross the bar to reach the search area.

The tide chart shows:
- **Grey curve** — calibrated past tidal heights (Open-Meteo, height-corrected against BOM official extremes)
- **Teal curve** — future tidal predictions from BOM official HW/LW data
- **Labels** — 2 past and 4 future HW/LW extremes with time (browser local timezone) and height in metres; duplicates near the past/future boundary are automatically removed
- **Now line** — current time marker; has no effect on the curve itself

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

---

## References

- Australian National Search and Rescue Manual (AUSSAR) 2023
  - Figure 4-10 — Vessel Sector Search pattern geometry
  - Table 4-3 — Number of search legs and total track distance for Expanding Square by radius and track spacing
  - Figure D-5:13 — Marine Probability of Detection curves (First through Fifth search)
- IAMSAR Manual Vol. II — Mission Co-ordination
- Open-Meteo Marine & Forecast APIs — [docs](https://open-meteo.com/en/docs/marine-weather-api)
- austides BOM tide proxy — [austides.vercel.app](https://austides.vercel.app)
