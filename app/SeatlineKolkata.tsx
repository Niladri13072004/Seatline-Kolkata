"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import TheaterPreview, { type CameraMode } from "./TheaterPreview";
import {
  getMintArtifactUrl,
  PLACEHOLDER_ASSETS_ACTIVE,
  POSTER_ASSET_KEY,
} from "./mintAssets";
import {
  buildSeats,
  findSeat,
  getRollingDates,
  measureSightline,
  VENUES,
  type Seat,
  type ShowDate,
} from "./seatlineData";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function metricWidth(value: number, minimum: number, maximum: number) {
  return `${Math.min(
    100,
    Math.max(8, ((value - minimum) / (maximum - minimum)) * 100),
  )}%`;
}

function seatLabel(seat: Seat) {
  const status =
    seat.status === "occupied"
      ? "occupied"
      : seat.status === "accessible"
        ? "wheelchair accessible"
        : seat.status === "companion"
          ? "companion"
          : "available";
  return `Seat ${seat.id}, ${status}`;
}

export default function SeatlineKolkata() {
  const [introVisible, setIntroVisible] = useState(true);
  const [venueId, setVenueId] = useState(VENUES[0].id);
  const venue = VENUES.find((candidate) => candidate.id === venueId) ?? VENUES[0];
  const [showtimeId, setShowtimeId] = useState(venue.showtimes[0].id);
  const [selectedSeatId, setSelectedSeatId] = useState(venue.defaultSeat);
  const [cameraMode, setCameraMode] = useState<CameraMode>("overview");
  const [dates, setDates] = useState<ShowDate[]>([]);
  const [dateId, setDateId] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const showtime =
    venue.showtimes.find((candidate) => candidate.id === showtimeId) ??
    venue.showtimes[0];
  const seats = useMemo(
    () => buildSeats(venue, `${dateId}:${showtime.id}`),
    [dateId, showtime.id, venue],
  );
  const selectedSeat = findSeat(seats, selectedSeatId);
  const date = dates.find((candidate) => candidate.id === dateId) ?? dates[0];
  const metrics = measureSightline(venue, selectedSeat, seats);
  const posterUrl = getMintArtifactUrl(POSTER_ASSET_KEY);

  useEffect(() => {
    const refreshDates = () => {
      const rollingDates = getRollingDates();
      setDates((current) =>
        current[0]?.id === rollingDates[0].id ? current : rollingDates,
      );
      setDateId((current) =>
        current && rollingDates.some((date) => date.id === current)
          ? current
          : rollingDates[0].id,
      );
    };
    refreshDates();
    const timer = window.setInterval(refreshDates, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => setIntroVisible(false),
      reducedMotion ? 0 : 2600,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (summaryOpen && !dialog.open) dialog.showModal();
    if (!summaryOpen && dialog.open) dialog.close();
  }, [summaryOpen]);

  useEffect(() => {
    setSummaryOpen(false);
    const selected = seats.find(
      (candidate) => candidate.id === selectedSeatId,
    );
    if (!selected || selected.status === "occupied") {
      setSelectedSeatId(venue.defaultSeat);
      setCameraMode("overview");
    }
  }, [seats, selectedSeatId, venue.defaultSeat]);

  const chooseVenue = useCallback((id: string) => {
    const nextVenue =
      VENUES.find((candidate) => candidate.id === id) ?? VENUES[0];
    setVenueId(nextVenue.id);
    setShowtimeId(nextVenue.showtimes[0].id);
    setSelectedSeatId(nextVenue.defaultSeat);
    setCameraMode("overview");
    setSummaryOpen(false);
  }, []);

  const chooseSeat = useCallback(
    (seatId: string) => {
      const seat = seats.find((candidate) => candidate.id === seatId);
      if (!seat || seat.status === "occupied") return;
      setSelectedSeatId(seat.id);
      setCameraMode("seated");
    },
    [seats],
  );

  const handleSeatKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    seat: Seat,
  ) => {
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    let rowIndex = seat.rowIndex + offset[0];
    let columnIndex = seat.columnIndex + offset[1];
    while (
      rowIndex >= 0 &&
      rowIndex < venue.rows &&
      columnIndex >= 0 &&
      columnIndex < venue.columns
    ) {
      const target = seats.find(
        (candidate) =>
          candidate.rowIndex === rowIndex &&
          candidate.columnIndex === columnIndex,
      );
      if (!target) return;
      if (target.status !== "occupied") {
        document
          .getElementById(`seat-${venue.id}-${target.id}`)
          ?.focus({ preventScroll: true });
        return;
      }
      rowIndex += offset[0];
      columnIndex += offset[1];
    }
  };

  return (
    <>
      <div
        className={`film-intro ${introVisible ? "is-visible" : ""}`}
        aria-hidden={!introVisible}
        style={{ "--poster-image": `url("${posterUrl}")` } as CSSProperties}
      >
        <div className="intro-vignette" />
        <div className="intro-copy">
          <span>A Seatline presentation</span>
          <h1>The Salt Crown</h1>
          <p>A mythic sea feature · Kolkata preview</p>
          {PLACEHOLDER_ASSETS_ACTIVE ? (
            <em className="intro-placeholder">Local placeholder artwork</em>
          ) : null}
        </div>
        <button
          className="intro-skip"
          type="button"
          tabIndex={introVisible ? 0 : -1}
          onClick={() => setIntroVisible(false)}
        >
          Skip intro
        </button>
      </div>

      <main className="seatline-app">
        <aside className="control-rail" aria-label="Seat preview controls">
          <header className="seatline-brand">
            <div className="brand-mark" aria-hidden="true">
              <span />
              <i />
            </div>
            <div>
              <p>Seatline</p>
              <strong>Kolkata</strong>
            </div>
            <span className="model-chip">MODELED 3D</span>
          </header>

          <div className="rail-scroll">
            <section className="control-section venue-section">
              <div className="section-heading">
                <span>01</span>
                <div>
                  <p>Choose venue</p>
                  <small>Six Kolkata-area profiles</small>
                </div>
              </div>
              <div className="venue-list">
                {VENUES.map((candidate, index) => (
                  <button
                    type="button"
                    className={`venue-card ${
                      candidate.id === venue.id ? "is-selected" : ""
                    }`}
                    key={candidate.id}
                    aria-pressed={candidate.id === venue.id}
                    onClick={() => chooseVenue(candidate.id)}
                  >
                    <img
                      src={getMintArtifactUrl(candidate.imageAssetKey)}
                      alt={`${
                        PLACEHOLDER_ASSETS_ACTIVE
                          ? "Local placeholder"
                          : "Original editorial"
                      } illustration representing ${candidate.name}`}
                    />
                    <span className="venue-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="venue-copy">
                      <strong>{candidate.shortName}</strong>
                      <small>{candidate.neighborhood}</small>
                    </span>
                    <span className="venue-check" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <p className="editorial-note">
                {PLACEHOLDER_ASSETS_ACTIVE
                  ? "Local placeholder illustrations, not venue photography."
                  : "Original editorial interpretations, not venue photography."}
              </p>
            </section>

            <section className="control-section">
              <div className="section-heading">
                <span>02</span>
                <div>
                  <p>Choose date</p>
                  <small>Next 10 days · Asia/Kolkata</small>
                </div>
              </div>
              <div className="date-grid" aria-label="Preview dates">
                {dates.length
                  ? dates.map((candidate) => (
                      <button
                        type="button"
                        key={candidate.id}
                        aria-pressed={candidate.id === dateId}
                        className={candidate.id === dateId ? "is-selected" : ""}
                        onClick={() => setDateId(candidate.id)}
                      >
                        <span>{candidate.weekday}</span>
                        <strong>{candidate.day}</strong>
                        <small>{candidate.month}</small>
                      </button>
                    ))
                  : Array.from({ length: 10 }, (_, index) => (
                      <span className="date-skeleton" key={index} />
                    ))}
              </div>
            </section>

            <section className="control-section">
              <div className="section-heading">
                <span>03</span>
                <div>
                  <p>Choose showtime</p>
                  <small>Representative preview data</small>
                </div>
              </div>
              <div className="showtime-grid">
                {venue.showtimes.map((candidate) => (
                  <button
                    type="button"
                    key={candidate.id}
                    className={
                      candidate.id === showtime.id ? "is-selected" : ""
                    }
                    aria-pressed={candidate.id === showtime.id}
                    onClick={() => setShowtimeId(candidate.id)}
                  >
                    <strong>{candidate.time}</strong>
                    <span>{candidate.label}</span>
                    <small>from {inr.format(candidate.price)}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="control-section seat-section">
              <div className="section-heading">
                <span>04</span>
                <div>
                  <p>Choose seat</p>
                  <small>Arrow keys move focus</small>
                </div>
              </div>
              <div className="screen-guide" aria-hidden="true">
                <span>SCREEN</span>
              </div>
              <div className="seat-map" aria-label={`${venue.name} seat map`}>
                {Array.from({ length: venue.rows }, (_, rowIndex) => {
                  const rowSeats = seats.filter(
                    (seat) => seat.rowIndex === rowIndex,
                  );
                  return (
                    <div
                      className="seat-map-row"
                      key={rowSeats[0]?.row ?? rowIndex}
                    >
                      <span className="row-label">{rowSeats[0]?.row}</span>
                      {rowSeats.map((seat) => (
                        <Fragment key={seat.id}>
                          <button
                            id={`seat-${venue.id}-${seat.id}`}
                            type="button"
                            className={`seat-dot seat-${seat.status} ${
                              seat.id === selectedSeat.id ? "is-selected" : ""
                            }`}
                            aria-label={seatLabel(seat)}
                            aria-pressed={seat.id === selectedSeat.id}
                            disabled={seat.status === "occupied"}
                            onClick={() => chooseSeat(seat.id)}
                            onKeyDown={(event) =>
                              handleSeatKeyDown(event, seat)
                            }
                          >
                            {seat.status === "accessible"
                              ? "A"
                              : seat.status === "companion"
                                ? "C"
                                : ""}
                          </button>
                          {venue.aislesAfter.includes(seat.number) ? (
                            <span className="aisle-gap" aria-hidden="true" />
                          ) : null}
                        </Fragment>
                      ))}
                      <span className="row-label">{rowSeats[0]?.row}</span>
                    </div>
                  );
                })}
              </div>
              <div className="seat-legend">
                <span><i className="legend-available" />Available</span>
                <span><i className="legend-selected" />Selected</span>
                <span><i className="legend-occupied" />Occupied</span>
                <span><i className="legend-accessible">A</i>Accessible</span>
              </div>
            </section>

            <section className="selection-card" aria-live="polite">
              <div>
                <span>Selected seat</span>
                <strong>{selectedSeat.id}</strong>
              </div>
              <div>
                <span>Sightline</span>
                <strong data-rating={metrics.rating}>{metrics.rating}</strong>
              </div>
              <p>
                Geometric estimate from representative room dimensions. Not a
                venue-certified survey.
              </p>
            </section>
          </div>

          <div className="rail-action">
            <button type="button" onClick={() => setSummaryOpen(true)}>
              Review summary
              <span aria-hidden="true">↗</span>
            </button>
            <small>No reservation is created</small>
          </div>
        </aside>

        <section className="auditorium-panel" aria-label="3D auditorium preview">
          {PLACEHOLDER_ASSETS_ACTIVE ? (
            <div className="placeholder-flag" role="status">
              Local placeholder assets
            </div>
          ) : null}
          <TheaterPreview
            venue={venue}
            seats={seats}
            selectedSeatId={selectedSeat.id}
            cameraMode={cameraMode}
            onSelectSeat={chooseSeat}
          />

          <div className="canvas-heading">
            <div>
              <span>{venue.auditorium}</span>
              <h2>{venue.name}</h2>
              <p>{venue.format} · {venue.formatNote}</p>
            </div>
            <div className="canvas-controls">
              <span>1 UNIT = 1 M</span>
              {cameraMode === "seated" ? (
                <button
                  type="button"
                  onClick={() => setCameraMode("overview")}
                >
                  Back to auditorium
                </button>
              ) : (
                <span>SELECT A SEAT</span>
              )}
            </div>
          </div>

          <div className="metric-panel" aria-label="Modeled sightline metrics">
            <div className="metric-panel-head">
              <span>{selectedSeat.id}</span>
              <strong>{metrics.rating}</strong>
            </div>
            <div className="metric-row">
              <span>Screen distance</span>
              <strong>{metrics.distanceM.toFixed(1)} m</strong>
              <i style={{ width: metricWidth(metrics.distanceM, 5, 28) }} />
            </div>
            <div className="metric-row">
              <span>Horizontal offset</span>
              <strong>{metrics.horizontalOffsetDeg.toFixed(1)}°</strong>
              <i
                style={{
                  width: metricWidth(metrics.horizontalOffsetDeg, 0, 24),
                }}
              />
            </div>
            <div className="metric-row">
              <span>Angular screen width</span>
              <strong>{metrics.screenAngularWidthDeg.toFixed(1)}°</strong>
              <i
                style={{
                  width: metricWidth(metrics.screenAngularWidthDeg, 55, 112),
                }}
              />
            </div>
            <div className="metric-row">
              <span>Vertical angle</span>
              <strong>{metrics.verticalAngleDeg.toFixed(1)}°</strong>
              <i
                style={{
                  width: metricWidth(metrics.verticalAngleDeg, 0, 30),
                }}
              />
            </div>
            <div className="metric-row">
              <span>Forward-row clearance</span>
              <strong>
                {metrics.clearanceCm === null
                  ? "Open"
                  : `${metrics.clearanceCm.toFixed(1)} cm`}
              </strong>
              <i
                style={{
                  width:
                    metrics.clearanceCm === null
                      ? "100%"
                      : metricWidth(metrics.clearanceCm, -10, 20),
                }}
              />
            </div>
          </div>

          <div className="canvas-caption">
            <span>CHARCOAL / BRASS / OXBLOOD</span>
            <p>
              {cameraMode === "seated"
                ? `Camera placed at ${selectedSeat.id} modeled eye point`
                : "Overview camera · Click any available 3D seat"}
            </p>
          </div>
        </section>
      </main>

      <dialog
        ref={dialogRef}
        className="summary-dialog"
        onCancel={() => setSummaryOpen(false)}
        onClose={() => setSummaryOpen(false)}
      >
        <button
          className="dialog-close"
          type="button"
          aria-label="Close summary"
          onClick={() => setSummaryOpen(false)}
        >
          ×
        </button>
        <span className="dialog-kicker">NON-BINDING PREVIEW</span>
        <h2>Your Seatline</h2>
        <p className="dialog-lede">
          Review modeled view before opening venue listing.
        </p>
        <div className="ticket-rule" />
        <dl className="summary-list">
          <div>
            <dt>Venue</dt>
            <dd>{venue.name}</dd>
          </div>
          <div>
            <dt>Profile</dt>
            <dd>{venue.format}</dd>
          </div>
          <div>
            <dt>Date & time</dt>
            <dd>
              {date ? `${date.weekday}, ${date.day} ${date.month}` : "Today"} ·{" "}
              {showtime.time}
            </dd>
          </div>
          <div>
            <dt>Seat</dt>
            <dd>{selectedSeat.id}</dd>
          </div>
          <div>
            <dt>Preview price</dt>
            <dd>{inr.format(showtime.price)}</dd>
          </div>
          <div>
            <dt>Modeled rating</dt>
            <dd>{metrics.rating}</dd>
          </div>
        </dl>
        <div className="dialog-metrics">
          <span><b>{metrics.distanceM.toFixed(1)} m</b> distance</span>
          <span><b>{metrics.horizontalOffsetDeg.toFixed(1)}°</b> offset</span>
          <span><b>{metrics.screenAngularWidthDeg.toFixed(1)}°</b> screen</span>
          <span><b>{metrics.verticalAngleDeg.toFixed(1)}°</b> elevation</span>
          <span>
            <b>
              {metrics.clearanceCm === null
                ? "Open"
                : `${metrics.clearanceCm.toFixed(1)} cm`}
            </b>{" "}
            clearance
          </span>
        </div>
        <p className="dialog-disclaimer">
          Preview data, price, room geometry, and availability are
          representative. Actual inventory, fees, format, accessibility, and
          booking terms come from venue listing.
        </p>
        <a
          className="listing-link"
          href={venue.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open live venue listing
          <span aria-hidden="true">↗</span>
        </a>
      </dialog>
    </>
  );
}
