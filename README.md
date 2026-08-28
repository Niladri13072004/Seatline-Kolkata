# Seatline Kolkata

An original Kolkata-area cinema seat-preview experience with a measured Three.js sightline model.

Choose one of six venue profiles, a rolling Kolkata date, representative showtime, and available seat. The 3D camera moves to the modeled eye point, reports screen distance, horizontal offset, elevation, angular width, and forward-row clearance, then opens a non-binding summary. Seatline is a preview experience; it does not reserve seats or process payment.

## Run locally

From this repository root:

```bash
pnpm install
pnpm dev
```

The local route is `http://127.0.0.1:5194/_experiences/seatline-kolkata/`.

## Verify

```bash
pnpm test
pnpm build
```

## WebMCP

The client exposes five WebMCP tools through `@nekuda/webmcp-sdk`: `ask_site`, `search_venues`, `inspect_seats`, `select_preview`, and `review_summary`. They use the same venue, seat, and sightline data as the visible interface, so an agent can discover and preview a seat without scraping the page. Registration is client-scoped and telemetry is disabled for this experience. There is no booking, payment, or external cinema handoff.

This build is guest-first. Google sign-in is intentionally left as a configuration-dependent follow-up until an OAuth client and secure session layer are supplied; WebMCP seat discovery and preview do not require an account.

## Asset status

Mint MCP generated the seven requested images, but artifact downloads returned `downloads_disabled`. The auditorium pack remains `final_pending` with downloads disabled. With explicit approval, this local build uses clearly labelled SVG image placeholders and native Three.js placeholder auditorium geometry.

Placeholder records live under the stable logical keys in `mint-assets.json`. Replace them with synchronized Mint manifests when downloads become available; browser code never calls Mint MCP.

Mint handoff:

- [Auditorium pack](https://mint.gg/chat/ph73tkcvax5dez5bjnf8skmm6h8bhrva)
- [The Salt Crown artwork](https://mint.gg/chat/ph7fcqkb85phngenzx6cmt04w18bh27r)

## Data disclaimer

Venue geometry, seat availability, showtimes, and prices are representative preview data. Editorial images are not documentary photography or architectural replicas. Seatline does not claim live inventory or create a reservation; users should verify any eventual purchase details with their chosen cinema separately.
