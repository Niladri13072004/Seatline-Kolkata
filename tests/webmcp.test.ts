import assert from "node:assert/strict";
import test from "node:test";
import { registerTools } from "@nekuda/webmcp-sdk";
import {
  askSite,
  inspectSeats,
  reviewSummary,
  searchVenues,
  selectPreview,
  setSeatlineWebMcpBridge,
  type SeatlineContext,
  type SeatlineSelection,
} from "../app/webmcp/seatlineTools.ts";
import { getRollingDates, VENUES } from "../app/seatlineData.ts";

const dateId = getRollingDates()[0].id;
const initialContext: SeatlineContext = {
  venueId: VENUES[0].id,
  dateId,
  showtimeId: VENUES[0].showtimes[0].id,
  selectedSeatId: VENUES[0].defaultSeat,
  cameraMode: "overview",
  summaryOpen: false,
};

test("WebMCP tools have durable keys and strict object schemas", () => {
  const tools = [askSite, searchVenues, inspectSeats, selectPreview, reviewSummary];
  assert.deepEqual(
    tools.map((tool) => tool.stableKey),
    [
      "seatline.site.ask",
      "seatline.venues.search",
      "seatline.seats.inspect",
      "seatline.preview.select",
      "seatline.preview.review",
    ],
  );
  for (const tool of tools) {
    assert.equal(tool.inputSchema?.type, "object");
    assert.equal(tool.inputSchema?.additionalProperties, false);
    assert.ok(tool.description.length > 40);
  }
});

test("WebMCP read tools use Seatline's data layer", () => {
  const venueResult = searchVenues.execute({ query: "PVR Avani" }) as {
    venues: Array<{ id: string }>;
  };
  assert.equal(venueResult.venues[0].id, "pvr-avani");

  setSeatlineWebMcpBridge({
    getContext: () => initialContext,
    applySelection: () => {},
    openSummary: () => {},
  });

  const seatResult = inspectSeats.execute({
    venueId: "nandan",
    dateId,
    showtimeId: "nandan-1130",
    limit: 4,
  }) as {
    venue: { id: string };
    date: { id: string };
    seats: Array<{ distanceM: number }>;
    availableCount: number;
  };
  assert.equal(seatResult.venue.id, "nandan");
  assert.equal(seatResult.date.id, dateId);
  assert.ok(seatResult.seats.length <= 4);
  assert.ok(seatResult.availableCount > 0);
  assert.ok(seatResult.seats.every((seat) => Number.isFinite(seat.distanceM)));

  const answer = askSite.execute({ question: "What does clearance mean?" }) as {
    matches: Array<unknown>;
  };
  assert.ok(answer.matches.length > 0);
  const unknown = askSite.execute({ question: "Tell me about the weather" }) as {
    answer: string;
  };
  assert.match(unknown.answer, /could not find/i);
  setSeatlineWebMcpBridge(null);
});

test("state-changing tools call the visible Seatline bridge", () => {
  let context = { ...initialContext };
  let summaryOpened = false;
  let appliedSeatId = "";
  setSeatlineWebMcpBridge({
    getContext: () => context,
    applySelection: (selection) => {
      appliedSeatId = selection.seatId;
      context = {
        ...context,
        ...selection,
        selectedSeatId: selection.seatId,
        cameraMode: "seated",
      };
    },
    openSummary: () => {
      summaryOpened = true;
      context = { ...context, summaryOpen: true };
    },
  });

  const selected = selectPreview.execute({
    venueId: "nandan",
    dateId,
    showtimeId: "nandan-1130",
    seatId: "H12",
  }) as { selected: { id: string } };
  assert.equal(appliedSeatId, "H12");
  assert.equal(selected.selected.id, "H12");
  assert.equal(context.cameraMode, "seated");

  reviewSummary.execute({});
  assert.equal(summaryOpened, true);
  assert.equal(context.summaryOpen, true);
  setSeatlineWebMcpBridge(null);
});

test("SDK registration is a clean, telemetry-disabled batch", async () => {
  const registered: string[] = [];
  const registration = registerTools(
    [askSite, searchVenues, inspectSeats, selectPreview, reviewSummary],
    {
      telemetry: false,
      modelContext: {
        async registerTool(tool) {
          registered.push(tool.name);
        },
      },
    },
  );
  const results = await registration.ready;
  assert.deepEqual(
    results.map((result) => result.state),
    ["registered", "registered", "registered", "registered", "registered"],
  );
  assert.equal(registered.length, 5);
  registration.unregister();
  assert.equal(registration.signal.aborted, true);
});
