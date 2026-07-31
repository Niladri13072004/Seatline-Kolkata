import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSeats,
  findSeat,
  getRollingDates,
  getVideoCoverUv,
  measureSightline,
  rateSightline,
  TRAILERS,
  VENUES,
  type SightlineMetrics,
} from "../app/seatlineData.ts";

const expectedVenueOrder = [
  "Nandan",
  "RDB Cinemas Salt Lake",
  "INOX South City Mall",
  "INOX Quest Mall",
  "PVR Avani Riverside",
  "Cinepolis Lake Mall",
];

test("venues retain requested order and dimensions", () => {
  assert.deepEqual(
    VENUES.map((venue) => venue.name),
    expectedVenueOrder,
  );
  assert.equal(VENUES[4].name, "PVR Avani Riverside");
  assert.deepEqual(
    VENUES.map(({ rows, columns, defaultSeat }) => ({
      rows,
      columns,
      defaultSeat,
    })),
    [
      { rows: 14, columns: 22, defaultSeat: "H12" },
      { rows: 10, columns: 16, defaultSeat: "F9" },
      { rows: 12, columns: 18, defaultSeat: "G10" },
      { rows: 7, columns: 10, defaultSeat: "D6" },
      { rows: 9, columns: 14, defaultSeat: "E8" },
      { rows: 9, columns: 14, defaultSeat: "F8" },
    ],
  );
  assert.deepEqual(
    VENUES.map((venue) => venue.trailerId),
    ["ramayana", "ramayana", "spiderman", "spiderman", "dhurandhar", "dhurandhar"],
  );
  assert.match(TRAILERS.ramayana.src, /ramayana-trailer\.mp4$/);
  assert.match(TRAILERS.spiderman.src, /spiderman-trailer\.mp4$/);
  assert.match(TRAILERS.dhurandhar.src, /dhurandhar-trailer\.mp4$/);

  for (const venue of VENUES) {
    assert.equal(venue.screenWidth, venue.roomWidth);
    assert.equal(venue.screenBaseY, 0);
    assert.ok(
      Math.abs(venue.screenWidth / venue.screenAspect - venue.roomHeight) <
        1e-9,
    );
  }
});

test("trailer UVs cover every screen without letterboxing", () => {
  assert.deepEqual(getVideoCoverUv(16 / 9, 16 / 9), {
    repeatX: 1,
    repeatY: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const tallScreen = getVideoCoverUv(16 / 9, 1.43);
  assert.ok(tallScreen.repeatX < 1);
  assert.equal(tallScreen.repeatY, 1);
  assert.equal(tallScreen.offsetX, (1 - tallScreen.repeatX) / 2);

  const wideScreen = getVideoCoverUv(4 / 3, 1.9);
  assert.equal(wideScreen.repeatX, 1);
  assert.ok(wideScreen.repeatY < 1);
  assert.equal(wideScreen.offsetY, (1 - wideScreen.repeatY) / 2);
});

test("seat generation is deterministic, accessible, and keeps defaults open", () => {
  for (const venue of VENUES) {
    const sessionKey = `2026-08-01:${venue.showtimes[0].id}`;
    const first = buildSeats(venue, sessionKey);
    const second = buildSeats(venue, sessionKey);
    assert.equal(first.length, venue.rows * venue.columns);
    assert.deepEqual(first, second);
    assert.equal(findSeat(first, venue.defaultSeat).status, "available");

    const rearRow = first.filter(
      (seat) => seat.rowIndex === venue.rows - 1,
    );
    assert.equal(rearRow[0].status, "accessible");
    assert.equal(rearRow[1].status, "companion");
    assert.equal(rearRow.at(-2)?.status, "companion");
    assert.equal(rearRow.at(-1)?.status, "accessible");

    const ordinarySeats = first.filter(
      (seat) =>
        seat.status !== "accessible" && seat.status !== "companion",
    );
    const occupiedRatio =
      ordinarySeats.filter((seat) => seat.status === "occupied").length /
      ordinarySeats.length;
    assert.ok(occupiedRatio >= 0.12 && occupiedRatio <= 0.24);

    const occupiedRows = new Set(
      ordinarySeats
        .filter((seat) => seat.status === "occupied")
        .map((seat) => seat.rowIndex),
    );
    assert.ok(occupiedRows.size >= Math.min(3, venue.rows));
    for (let rowIndex = 0; rowIndex < venue.rows; rowIndex += 1) {
      const row = ordinarySeats.filter(
        (seat) => seat.rowIndex === rowIndex,
      );
      const rowOccupied = row.filter(
        (seat) => seat.status === "occupied",
      ).length;
      assert.ok(rowOccupied / row.length <= 0.6);
    }
  }
});

test("availability changes deterministically across every date and showtime", () => {
  const dateIds = Array.from(
    { length: 10 },
    (_, index) => `2026-08-${String(index + 1).padStart(2, "0")}`,
  );

  for (const venue of VENUES) {
    const signatures = new Set<string>();
    for (const dateId of dateIds) {
      for (const showtime of venue.showtimes) {
        const sessionKey = `${dateId}:${showtime.id}`;
        const seats = buildSeats(venue, sessionKey);
        assert.deepEqual(seats, buildSeats(venue, sessionKey));
        assert.equal(findSeat(seats, venue.defaultSeat).status, "available");
        signatures.add(
          seats
            .filter((seat) => seat.status === "occupied")
            .map((seat) => seat.id)
            .join(","),
        );
      }
    }
    assert.equal(signatures.size, dateIds.length * venue.showtimes.length);
  }
});

test("venues with matching grids still receive different availability", () => {
  const pvr = VENUES.find((venue) => venue.id === "pvr-avani");
  const cinepolis = VENUES.find(
    (venue) => venue.id === "cinepolis-lake",
  );
  assert.ok(pvr);
  assert.ok(cinepolis);
  assert.equal(pvr.rows, cinepolis.rows);
  assert.equal(pvr.columns, cinepolis.columns);

  const occupied = (venue: (typeof VENUES)[number]) =>
    buildSeats(venue, "2026-08-01:18:00")
      .filter((seat) => seat.status === "occupied")
      .map((seat) => seat.id);
  assert.notDeepEqual(occupied(pvr), occupied(cinepolis));
});

test("sightline metrics share exact seated-camera inputs", () => {
  for (const venue of VENUES) {
    const seats = buildSeats(venue);
    const seat = findSeat(seats, venue.defaultSeat);
    const metrics = measureSightline(venue, seat, seats);
    const screenHeight = venue.screenWidth / venue.screenAspect;

    assert.deepEqual(metrics.eye, [
      seat.x,
      seat.y + 1.18,
      seat.z - 0.15,
    ]);
    assert.deepEqual(metrics.target, [
      0,
      venue.screenBaseY + screenHeight / 2,
      venue.screenZ,
    ]);
    for (const value of [
      metrics.distanceM,
      metrics.horizontalOffsetDeg,
      metrics.verticalAngleDeg,
      metrics.screenAngularWidthDeg,
      metrics.clearanceCm ?? 0,
    ]) {
      assert.ok(Number.isFinite(value));
    }
    assert.ok(metrics.distanceM > 0);
    assert.ok(metrics.screenAngularWidthDeg > 0);

    const firstRow = findSeat(seats, "A1");
    assert.equal(
      measureSightline(venue, firstRow, seats).clearanceCm,
      null,
    );
  }
});

test("rating thresholds remain fixed at their inclusive boundaries", () => {
  const metric = (
    clearanceCm: number | null,
    horizontalOffsetDeg: number,
    screenAngularWidthDeg: number,
    verticalAngleDeg: number,
  ): Omit<SightlineMetrics, "rating"> => ({
    eye: [0, 1.18, 0],
    target: [0, 3, -10],
    distanceM: 10.2,
    clearanceCm,
    horizontalOffsetDeg,
    screenAngularWidthDeg,
    verticalAngleDeg,
  });

  assert.equal(rateSightline(metric(8, 8, 70, 15)), "Exceptional");
  assert.equal(rateSightline(metric(5, 15, 62, 22)), "Great");
  assert.equal(rateSightline(metric(0, 26, 55, 32)), "Good");
  assert.equal(rateSightline(metric(-0.1, 26, 55, 32)), "Compromised");
});

test("each venue produces seat-dependent sightline ratings", () => {
  for (const venue of VENUES) {
    const seats = buildSeats(
      venue,
      `2026-08-01:${venue.showtimes[0].id}`,
    );
    const ratings = new Set(
      seats.map((seat) => measureSightline(venue, seat, seats).rating),
    );
    assert.ok(ratings.size >= 2);
    assert.notEqual(
      measureSightline(
        venue,
        findSeat(seats, venue.defaultSeat),
        seats,
      ).rating,
      "Compromised",
    );
  }
});

test("rolling dates and outbound listings are valid preview data", () => {
  const dates = getRollingDates(new Date("2026-07-31T06:00:00Z"));
  assert.equal(dates.length, 10);
  assert.equal(new Set(dates.map((date) => date.id)).size, 10);
  assert.deepEqual(
    dates.map((date) => date.id),
    [
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
      "2026-08-10",
    ],
  );

  for (const venue of VENUES) {
    const url = new URL(venue.sourceUrl);
    assert.equal(url.protocol, "https:");
    assert.ok(venue.showtimes.length >= 3);
    assert.ok(venue.showtimes.every((showtime) => showtime.price > 0));
  }
});
