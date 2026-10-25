# When Do the Clocks Go Back

Live countdown to the next daylight saving time "fall back" — US, UK and Europe.

## Features

- Live second-by-second countdown to the next fall-back, per region
- Analog dial showing the selected region's current time (Intl timezone rules)
- Orange wedge marks the repeated hour (US/UK: 1–2 AM ×2, EU: 2–3 AM ×2)
- Dynamic status tags in the dates table (TONIGHT / CHANGED TODAY / NEXT)
- Downloadable .ics calendar reminder (fires 6 PM the evening before)
- FAQ section with JSON-LD (FAQPage) + WebApplication structured data
- Fall-back dates are computed from the official rules (US: 1st Sunday of November · UK/EU: last Sunday of October) — the site stays correct every year, no manual date edits

## Structure

```
index.html        # single-page site (en)
css/style.css     # site styles + shared toolara.dev fleet footer
js/countdown.js   # countdown / clock / tags / FAQ / .ics
sitemap.xml
```

## Local development

```bash
python -m http.server 8123
```

Then open http://localhost:8123

## Deploy

Push to GitHub → Cloudflare Workers static build (repo name = worker name = folder name).
Fleet wiring in tool-proxy:

- `DOMAIN_MAP`: `'clocks.toolara.dev': { binding: 'SITE_CLOCKS_GO_BACK', service: 'clocks-go-back' }`
- `wrangler.toml` `[[services]]`: `binding = "SITE_CLOCKS_GO_BACK"`, `service = "clocks-go-back"`
- `SITE_PATHS`: `'clocks.toolara.dev': ["/"]`

## License

MIT
