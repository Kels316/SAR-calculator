# Marine SAR Calculator

A browser-based Search and Rescue planning tool based on Australian National SAR Manual (AUSSAR) 2023 and IAMSAR procedures.

## Features

- **Drift & datum calculation** — combines ocean current, wind current (3% rule), and leeway vectors to estimate the current position of a search object from its last known position
- **Search area sizing** — probabilistic error ellipse using LKP error, asset GPS error, and drift uncertainty
- **Detection parameters** — sweep width, track spacing, and probability of detection (POD) based on target type, weather, fatigue, and visibility factors
- **Five search patterns** with full waypoint generation:
  - Parallel Track
  - Expanding Square
  - Sector Search
  - Creeping Line Ahead
  - Track Line Search
- **Live marine data** — fetches current ocean conditions from [Open-Meteo](https://open-meteo.com) and auto-populates input fields
- **Print / copy summary** — formatted SAR plan output for briefings

## Live Data (Open-Meteo)

Enter LKP coordinates and click **Fetch Live Marine Data** to pull current conditions for that location:

| Field auto-populated | Source |
|---|---|
| Ocean current speed & direction | Open-Meteo Marine API |
| Wind speed & direction (10 m) | Open-Meteo Forecast API |
| Weather factor (Wf) | Derived from significant wave height |

Additional context displayed (not used in calculations): significant wave height, wave period, wave direction, sea surface temperature, sea level height above MSL.

The Open-Meteo APIs are free and require no API key. Ocean currents and tides are modelled at ~8 km resolution — accuracy is limited in coastal areas and this data does not replace nautical almanac or local tide tables.

## Files

| File | Description |
|---|---|
| `marine_sar.html` | Main calculator (open this in a browser) |
| `index.html` | Identical entry point |

## Usage

Open `marine_sar.html` in any modern browser — no server or installation required.

1. Enter the **Last Known Position** (decimal degrees or DD MM.mmm format)
2. Optionally click **Fetch Live Marine Data** to auto-populate current and wind
3. Review and adjust all inputs across the six steps
4. Click **Calculate SAR Plan**
5. Use **Print / Save PDF** or **Copy Summary** to export the plan

## References

- Australian National Search and Rescue Manual (AUSSAR) 2023
- IAMSAR Manual Vol. II — Mission Co-ordination
- Open-Meteo Marine Weather API — [docs](https://open-meteo.com/en/docs/marine-weather-api)
