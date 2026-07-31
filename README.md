# Seatline Kolkata

An original Kolkata-area cinema seat-preview experience with a measured Three.js sightline model.

Choose one of six venue profiles, a rolling Kolkata date, representative showtime, and available seat. The 3D camera moves to the modeled eye point, reports screen distance, horizontal offset, elevation, angular width, and forward-row clearance, then opens a non-binding summary before the external venue listing.

## Run locally

From the `mint-playground` repository root:

```bash
npx pnpm@10.6.2 install
npx pnpm@10.6.2 --dir experiences/seatline-kolkata dev
```

The local route is `http://127.0.0.1:5194/_experiences/seatline-kolkata/`.

## Verify

```bash
npx pnpm@10.6.2 --dir experiences/seatline-kolkata test
npx pnpm@10.6.2 --dir experiences/seatline-kolkata build
```

## Asset status

Mint MCP generated the seven requested images, but artifact downloads returned `downloads_disabled`. The auditorium pack remains `final_pending` with downloads disabled. With explicit approval, this local build uses clearly labelled SVG image placeholders and native Three.js placeholder auditorium geometry.

Placeholder records live under the stable logical keys in `mint-assets.json`. Replace them with synchronized Mint manifests when downloads become available; browser code never calls Mint MCP.

Mint handoff:

- [Auditorium pack](https://mint.gg/chat/ph73tkcvax5dez5bjnf8skmm6h8bhrva)
- [The Salt Crown artwork](https://mint.gg/chat/ph7fcqkb85phngenzx6cmt04w18bh27r)

## Data disclaimer

Venue geometry, seat availability, showtimes, and prices are representative preview data. Editorial images are not documentary photography or architectural replicas. Actual inventory, fees, accessibility, formats, and purchase terms come from each venue listing.
