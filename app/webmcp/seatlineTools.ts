import { defineTool, type WebMCPTool } from "@nekuda/webmcp-sdk";
import {
  buildSeats,
  findSeat,
  getRollingDates,
  measureSightline,
  rateSightline,
  VENUES,
  type Seat,
  type SightlineRating,
} from "../seatlineData.ts";

export type SeatlineContext = {
  venueId: string;
  dateId: string;
  showtimeId: string;
  selectedSeatId: string;
  cameraMode: "overview" | "seated";
  summaryOpen: boolean;
};

export type SeatlineSelection = {
  venueId: string;
  dateId: string;
  showtimeId: string;
  seatId: string;
};

export type SeatlineWebMcpBridge = {
  getContext: () => SeatlineContext;
  applySelection: (selection: SeatlineSelection) => void;
  openSummary: () => void;
};

let activeBridge: SeatlineWebMcpBridge | null = null;

export function setSeatlineWebMcpBridge(
  bridge: SeatlineWebMcpBridge | null,
) {
  activeBridge = bridge;
}

function requireBridge() {
  if (!activeBridge) {
    throw new Error("Seatline is not ready for agent actions yet.");
  }
  return activeBridge;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

const askStopWords = new Set([
  "a",
  "about",
  "an",
  "and",
  "can",
  "does",
  "for",
  "how",
  "i",
  "is",
  "me",
  "of",
  "on",
  "please",
  "tell",
  "the",
  "what",
  "which",
]);

function resolveVenue(venueId: string) {
  const venue = VENUES.find((candidate) => candidate.id === venueId);
  if (!venue) throw new Error(`Unknown venue: ${venueId}`);
  return venue;
}

function resolveDate(dateId: string) {
  const date = getRollingDates().find((candidate) => candidate.id === dateId);
  if (!date) {
    throw new Error(
      `Unknown preview date: ${dateId}. Use one of the next ten Kolkata dates.`,
    );
  }
  return date;
}

function resolveSelection(input: {
  venueId?: string;
  dateId?: string;
  showtimeId?: string;
  seatId?: string;
}) {
  const context = requireBridge().getContext();
  const venueId = input.venueId ?? context.venueId;
  const venue = resolveVenue(venueId);
  const dateId = (input.dateId ?? context.dateId) || getRollingDates()[0].id;
  const showtimeId = input.showtimeId ?? context.showtimeId;
  const showtime = venue.showtimes.find(
    (candidate) => candidate.id === showtimeId,
  );
  if (!showtime && input.showtimeId) {
    throw new Error(`Unknown showtime ${showtimeId} for ${venue.name}.`);
  }
  const resolvedShowtime = showtime ?? venue.showtimes[0];
  const date = resolveDate(dateId);
  const seats = buildSeats(venue, `${date.id}:${resolvedShowtime.id}`);
  return { context, date, venue, showtime: resolvedShowtime, seats };
}

function metricSummary(seat: Seat, metrics: ReturnType<typeof measureSightline>) {
  return {
    id: seat.id,
    status: seat.status,
    rating: metrics.rating,
    distanceM: metrics.distanceM,
    horizontalOffsetDeg: metrics.horizontalOffsetDeg,
    verticalAngleDeg: metrics.verticalAngleDeg,
    screenAngularWidthDeg: metrics.screenAngularWidthDeg,
    clearanceCm: metrics.clearanceCm,
  };
}

const ratingRank: Record<SightlineRating, number> = {
  Exceptional: 0,
  Great: 1,
  Good: 2,
  Compromised: 3,
};

type AskSiteInput = { question: string };
type SearchVenuesInput = { query?: string; maxResults?: number };
type InspectSeatsInput = {
  venueId?: string;
  dateId?: string;
  showtimeId?: string;
  rating?: SightlineRating;
  limit?: number;
};
type SelectPreviewInput = {
  venueId?: string;
  dateId?: string;
  showtimeId?: string;
  seatId: string;
};
type ReviewSummaryInput = Record<string, never>;

type SiteContent = {
  title: string;
  sourcePath: string;
  keywords: string[];
  text: string;
};

const siteContent: SiteContent[] = [
  {
    title: "Seatline Kolkata overview",
    sourcePath: "app/SeatlineKolkata.tsx",
    keywords: ["seatline", "kolkata", "preview", "sightline", "cinema"],
    text:
      "Seatline Kolkata is an interactive, non-binding cinema seat preview. It combines a semantic seat map with a modeled Three.js auditorium so visitors can inspect a selected seat before deciding what to do next.",
  },
  {
    title: "Modeled metrics",
    sourcePath: "app/seatlineData.ts",
    keywords: [
      "metric",
      "distance",
      "offset",
      "vertical",
      "angle",
      "clearance",
      "rating",
      "sightline",
    ],
    text:
      "Each seat receives modeled screen distance, horizontal offset, vertical angle, angular screen width, forward-row clearance, and a rating of Exceptional, Great, Good, or Compromised. These are representative geometric estimates, not venue-certified surveys.",
  },
  {
    title: "Preview data disclaimer",
    sourcePath: "app/SeatlineKolkata.tsx",
    keywords: ["disclaimer", "price", "availability", "inventory", "booking"],
    text:
      "Venue profiles, showtimes, prices, room geometry, and seat occupancy are representative preview data. Seatline does not create a reservation, collect payment, or guarantee live inventory.",
  },
  {
    title: "The Salt Crown",
    sourcePath: "app/SeatlineKolkata.tsx",
    keywords: ["salt", "crown", "film", "movie", "poster", "trailer"],
    text:
      "The Salt Crown is the fictional feature used by this Seatline presentation. Venue scenes play one of the local trailer files assigned to that venue profile.",
  },
  ...VENUES.map((venue) => ({
    title: venue.name,
    sourcePath: "app/seatlineData.ts",
    keywords: [
      venue.id,
      venue.name,
      venue.shortName,
      venue.neighborhood,
      venue.format,
      venue.profile,
      venue.trailerId,
    ].map(normalize),
    text: `${venue.name} is a ${venue.format.toLowerCase()} ${venue.profile} profile in ${venue.neighborhood}. It has a ${venue.rows} by ${venue.columns} representative seat grid, default preview seat ${venue.defaultSeat}, and ${venue.showtimes.length} representative showtimes.`,
  })),
];

export const askSite = defineTool<AskSiteInput>({
  stableKey: "seatline.site.ask",
  name: "ask_site",
  title: "Ask Seatline",
  description:
    "Answer a visitor's question using Seatline Kolkata's own venue, film, sightline, and preview-disclaimer content. Return relevant content sections and source paths; do not invent live inventory or booking information.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: { question: { type: "string", minLength: 1 } },
    required: ["question"],
  },
  annotations: { readOnlyHint: true },
  source: "merchant_authored",
  intent: "answer",
  version: "1.0.0",
  execute(input) {
    const question = normalize(input.question);
    if (!question) throw new Error("Ask a non-empty Seatline question.");
    const terms = question
      .split(/\s+/)
      .filter((term) => term.length > 1 && !askStopWords.has(term));
    const matches = siteContent
      .map((entry) => {
        const score = terms.reduce(
          (total, term) =>
            total +
            (entry.keywords.some(
              (keyword) => keyword.includes(term) || term.includes(keyword),
            )
              ? 1
              : 0),
          0,
        );
        return { entry, score };
      })
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 4)
      .map(({ entry }) => ({
        title: entry.title,
        sourcePath: entry.sourcePath,
        excerpt: entry.text,
      }));

    if (!matches.length) {
      return {
        answer:
          "I could not find that in Seatline's published preview content.",
        suggestedTopics: [
          "venues",
          "modeled sightline metrics",
          "preview data and availability",
          "The Salt Crown",
        ],
        previewOnly: true,
      };
    }
    return { matches, previewOnly: true };
  },
});

export const searchVenues = defineTool<SearchVenuesInput>({
  stableKey: "seatline.venues.search",
  name: "search_venues",
  title: "Search venues",
  description:
    "Find Kolkata cinema profiles in Seatline's six-venue directory by name, neighborhood, format, auditorium profile, or trailer. Return concise preview records; availability and prices are representative only.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      query: { type: "string" },
      maxResults: { type: "integer", minimum: 1, maximum: 6 },
    },
  },
  annotations: { readOnlyHint: true },
  source: "merchant_authored",
  intent: "answer",
  version: "1.0.0",
  execute(input) {
    const query = normalize(input.query ?? "");
    const terms = query.split(/\s+/).filter(Boolean);
    const matches = VENUES.filter((venue) => {
      if (!terms.length) return true;
      const haystack = normalize(
        [
          venue.id,
          venue.name,
          venue.shortName,
          venue.neighborhood,
          venue.format,
          venue.profile,
          venue.trailerId,
        ].join(" "),
      );
      return terms.every((term) => haystack.includes(term));
    })
      .slice(0, Math.min(input.maxResults ?? 6, 6))
      .map((venue) => ({
        id: venue.id,
        name: venue.name,
        neighborhood: venue.neighborhood,
        format: venue.format,
        profile: venue.profile,
        trailerId: venue.trailerId,
        grid: `${venue.rows} × ${venue.columns}`,
        defaultSeat: venue.defaultSeat,
        previewOnly: true,
      }));

    return {
      query: input.query ?? "",
      venues: matches,
      note: matches.length
        ? "Results are Seatline preview profiles, not live cinema inventory."
        : "No matching Seatline venue profile was found.",
    };
  },
});

export const inspectSeats = defineTool<InspectSeatsInput>({
  stableKey: "seatline.seats.inspect",
  name: "inspect_seats",
  title: "Inspect preview seats",
  description:
    "Inspect available modeled seats for a Seatline venue, preview date, and showtime. Return seat IDs, accessibility status, sightline ratings, and measured metrics so an agent can recommend a seat. This is modeled preview occupancy, not live inventory.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      venueId: { type: "string" },
      dateId: { type: "string" },
      showtimeId: { type: "string" },
      rating: {
        type: "string",
        enum: ["Exceptional", "Great", "Good", "Compromised"],
      },
      limit: { type: "integer", minimum: 1, maximum: 24 },
    },
  },
  annotations: { readOnlyHint: true },
  source: "merchant_authored",
  intent: "answer",
  version: "1.0.0",
  execute(input) {
    const { context, date, venue, showtime, seats } = resolveSelection(input);
    const available = seats.filter((seat) => seat.status !== "occupied");
    const inspected = available
      .map((seat) => ({ seat, metrics: measureSightline(venue, seat, seats) }))
      .filter(({ metrics }) => !input.rating || metrics.rating === input.rating)
      .sort(
        (left, right) =>
          ratingRank[left.metrics.rating] - ratingRank[right.metrics.rating] ||
          left.metrics.horizontalOffsetDeg - right.metrics.horizontalOffsetDeg ||
          left.metrics.verticalAngleDeg - right.metrics.verticalAngleDeg ||
          left.seat.id.localeCompare(right.seat.id),
      )
      .slice(0, Math.min(input.limit ?? 12, 24))
      .map(({ seat, metrics }) => metricSummary(seat, metrics));

    return {
      venue: { id: venue.id, name: venue.name },
      date: { id: date.id, weekday: date.weekday, day: date.day, month: date.month },
      showtime: { id: showtime.id, time: showtime.time, label: showtime.label, price: showtime.price },
      currentSelection: context.selectedSeatId,
      availableCount: available.length,
      occupiedCount: seats.length - available.length,
      seats: inspected,
      note: inspected.length
        ? "Seat status and metrics are modeled preview data."
        : "No seats matched that preview filter; try another rating or context.",
    };
  },
});

export const selectPreview = defineTool<SelectPreviewInput>({
  stableKey: "seatline.preview.select",
  name: "select_preview",
  title: "Select a seat preview",
  description:
    "Select a venue, preview date, showtime, and non-occupied seat in the visible Seatline interface. The page updates its controls and moves the Three.js camera to the modeled eye point. This changes preview state only and creates no reservation.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      venueId: { type: "string" },
      dateId: { type: "string" },
      showtimeId: { type: "string" },
      seatId: { type: "string", minLength: 2 },
    },
    required: ["seatId"],
  },
  source: "merchant_authored",
  intent: "act",
  version: "1.0.0",
  execute(input) {
    const { date, venue, showtime, seats } = resolveSelection(input);
    const seat = findSeat(seats, input.seatId);
    if (seat.status === "occupied") {
      throw new Error(
        `${seat.id} is occupied in this modeled preview. Choose another seat.`,
      );
    }
    const metrics = measureSightline(venue, seat, seats);
    requireBridge().applySelection({
      venueId: venue.id,
      dateId: date.id,
      showtimeId: showtime.id,
      seatId: seat.id,
    });
    return {
      selected: metricSummary(seat, metrics),
      venue: venue.name,
      date: `${date.weekday}, ${date.day} ${date.month}`,
      showtime: showtime.time,
      uiEffect: "Seatline now shows the seated camera preview.",
      previewOnly: true,
    };
  },
});

export const reviewSummary = defineTool<ReviewSummaryInput>({
  stableKey: "seatline.preview.review",
  name: "review_summary",
  title: "Review seat preview summary",
  description:
    "Open Seatline's existing non-binding summary dialog for the current venue, date, showtime, seat, and modeled metrics. Use after selecting a preview; no booking or payment is started.",
  inputSchema: { type: "object", additionalProperties: false, properties: {} },
  source: "merchant_authored",
  intent: "act",
  version: "1.0.0",
  execute() {
    const bridge = requireBridge();
    bridge.openSummary();
    const context = bridge.getContext();
    return {
      selectedSeat: context.selectedSeatId,
      uiEffect: "Seatline's non-binding summary dialog is open.",
      previewOnly: true,
    };
  },
});

export const SEATLINE_WEBMCP_TOOLS: readonly WebMCPTool[] = [
  askSite,
  searchVenues,
  inspectSeats,
  selectPreview,
  reviewSummary,
];
