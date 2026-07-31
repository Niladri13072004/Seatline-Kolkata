export type SeatStatus =
  | "available"
  | "occupied"
  | "accessible"
  | "companion";

export type Seat = {
  id: string;
  row: string;
  number: number;
  rowIndex: number;
  columnIndex: number;
  status: SeatStatus;
  x: number;
  y: number;
  z: number;
};

export type Showtime = {
  id: string;
  time: string;
  label: string;
  price: number;
};

export type AuditoriumProfile =
  | "heritage-wide"
  | "compact-tiered"
  | "large-format"
  | "luxury-intimate"
  | "premium-wide";

export type TrailerId = "ramayana" | "spiderman" | "dhurandhar";

export const TRAILERS = {
  ramayana: {
    title: "Ramayana",
    src: "/_experiences/seatline-kolkata/media/ramayana-trailer.mp4",
  },
  spiderman: {
    title: "Spider-Man",
    src: "/_experiences/seatline-kolkata/media/spiderman-trailer.mp4",
  },
  dhurandhar: {
    title: "Dhurandhar",
    src: "/_experiences/seatline-kolkata/media/dhurandhar-trailer.mp4",
  },
} as const satisfies Record<TrailerId, { title: string; src: string }>;

export type Venue = {
  id: string;
  name: string;
  shortName: string;
  neighborhood: string;
  address: string;
  auditorium: string;
  format: string;
  formatNote: string;
  sourceUrl: string;
  imageAssetKey: string;
  trailerId: TrailerId;
  profile: AuditoriumProfile;
  shellArtifactHint: string;
  screenArtifactHint: string;
  chairArtifactHint: string;
  fixtureArtifactHint: string;
  rows: number;
  columns: number;
  aislesAfter: number[];
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  screenWidth: number;
  screenAspect: number;
  screenBaseY: number;
  screenZ: number;
  baseZ: number;
  seatBaseY: number;
  rowSpacing: number;
  rowRise: number;
  seatSpacing: number;
  chairWidth: number;
  seed: number;
  defaultSeat: string;
  showtimes: Showtime[];
};

export type SightlineRating =
  | "Exceptional"
  | "Great"
  | "Good"
  | "Compromised";

export type SightlineMetrics = {
  eye: [number, number, number];
  target: [number, number, number];
  distanceM: number;
  horizontalOffsetDeg: number;
  verticalAngleDeg: number;
  screenAngularWidthDeg: number;
  clearanceCm: number | null;
  rating: SightlineRating;
};

export type ShowDate = {
  id: string;
  weekday: string;
  day: string;
  month: string;
};

const degree = (radians: number) => (radians * 180) / Math.PI;
const round = (value: number, places = 1) =>
  Number(value.toFixed(places));
const rowLabel = (index: number) => String.fromCharCode(65 + index);

export const VENUES: Venue[] = [
  {
    id: "nandan",
    name: "Nandan",
    shortName: "Nandan",
    neighborhood: "Rabindra Sadan",
    address: "1/1 AJC Bose Road, Kolkata",
    auditorium: "Nandan I",
    format: "CULTURAL CINEMA",
    formatNote: "Heritage-wide profile · Representative layout",
    sourceUrl: "https://icad.wb.gov.in/venue-wise-schedule/nandan",
    imageAssetKey: "venue-nandan",
    trailerId: "ramayana",
    profile: "heritage-wide",
    shellArtifactHint: "heritage-wide-shell",
    screenArtifactHint: "wide-projection-screen",
    chairArtifactHint: "standard-oxblood-recliner",
    fixtureArtifactHint: "brass-aisle-beacon",
    rows: 14,
    columns: 22,
    aislesAfter: [7, 15],
    roomWidth: 30,
    roomDepth: 29,
    roomHeight: 13,
    screenWidth: 30,
    screenAspect: 30 / 13,
    screenBaseY: 0,
    screenZ: -10.5,
    baseZ: -1,
    seatBaseY: 0,
    rowSpacing: 1.25,
    rowRise: 0.34,
    seatSpacing: 0.95,
    chairWidth: 0.78,
    seed: 11,
    defaultSeat: "H12",
    showtimes: [
      { id: "nandan-1130", time: "11:30", label: "Matinee", price: 100 },
      { id: "nandan-1530", time: "15:30", label: "Afternoon", price: 100 },
      { id: "nandan-1845", time: "18:45", label: "Evening", price: 120 },
    ],
  },
  {
    id: "rdb-salt-lake",
    name: "RDB Cinemas Salt Lake",
    shortName: "RDB Cinemas",
    neighborhood: "Sector V, Salt Lake",
    address: "Plot K-1, Sector V, Kolkata",
    auditorium: "Screen 2",
    format: "DOLBY 7.1",
    formatNote: "Compact-tiered profile · Representative layout",
    sourceUrl:
      "https://in.bookmyshow.com/cinemas/kolkata/rdb-cinemas-salt-lake-kolkata/buytickets/RDBK",
    imageAssetKey: "venue-rdb",
    trailerId: "ramayana",
    profile: "compact-tiered",
    shellArtifactHint: "compact-tiered-shell",
    screenArtifactHint: "wide-projection-screen",
    chairArtifactHint: "standard-oxblood-recliner",
    fixtureArtifactHint: "brass-step-light",
    rows: 10,
    columns: 16,
    aislesAfter: [5, 11],
    roomWidth: 24,
    roomDepth: 22,
    roomHeight: 10,
    screenWidth: 24,
    screenAspect: 24 / 10,
    screenBaseY: 0,
    screenZ: -8.5,
    baseZ: -1,
    seatBaseY: 0,
    rowSpacing: 1.22,
    rowRise: 0.42,
    seatSpacing: 1,
    chairWidth: 0.82,
    seed: 19,
    defaultSeat: "F9",
    showtimes: [
      { id: "rdb-1050", time: "10:50", label: "Morning", price: 200 },
      { id: "rdb-1420", time: "14:20", label: "Afternoon", price: 220 },
      { id: "rdb-1810", time: "18:10", label: "Evening", price: 260 },
      { id: "rdb-2140", time: "21:40", label: "Late", price: 240 },
    ],
  },
  {
    id: "inox-south-city",
    name: "INOX South City Mall",
    shortName: "INOX South City",
    neighborhood: "Prince Anwar Shah Road",
    address: "South City Mall, Kolkata",
    auditorium: "Large Format House",
    format: "LARGE FORMAT",
    formatNote: "Tall-screen profile · Representative layout",
    sourceUrl:
      "https://www.district.in/movies/pvr-inox-south-city-mall-in-howrah-CD1020717",
    imageAssetKey: "venue-south-city",
    trailerId: "spiderman",
    profile: "large-format",
    shellArtifactHint: "large-format-shell",
    screenArtifactHint: "large-format-screen",
    chairArtifactHint: "standard-oxblood-recliner",
    fixtureArtifactHint: "brass-step-light",
    rows: 12,
    columns: 18,
    aislesAfter: [6, 12],
    roomWidth: 31,
    roomDepth: 27,
    roomHeight: 16,
    screenWidth: 31,
    screenAspect: 31 / 16,
    screenBaseY: 0,
    screenZ: -11,
    baseZ: -1.2,
    seatBaseY: 0,
    rowSpacing: 1.32,
    rowRise: 0.55,
    seatSpacing: 1.04,
    chairWidth: 0.84,
    seed: 29,
    defaultSeat: "G10",
    showtimes: [
      { id: "south-1115", time: "11:15", label: "Large Format", price: 280 },
      { id: "south-1500", time: "15:00", label: "Large Format", price: 320 },
      { id: "south-1900", time: "19:00", label: "Large Format", price: 380 },
      { id: "south-2215", time: "22:15", label: "Large Format", price: 340 },
    ],
  },
  {
    id: "inox-quest",
    name: "INOX Quest Mall",
    shortName: "INOX Quest",
    neighborhood: "Ballygunge",
    address: "Quest Mall, Syed Amir Ali Avenue, Kolkata",
    auditorium: "Insignia House",
    format: "LUXURY RECLINER",
    formatNote: "Intimate luxury profile · Representative layout",
    sourceUrl:
      "https://www.district.in/movies/pvr-inox-quest-mall-ballygunge-in-howrah-CD1020727",
    imageAssetKey: "venue-quest",
    trailerId: "spiderman",
    profile: "luxury-intimate",
    shellArtifactHint: "luxury-intimate-shell",
    screenArtifactHint: "wide-projection-screen",
    chairArtifactHint: "luxury-oxblood-recliner",
    fixtureArtifactHint: "brass-aisle-beacon",
    rows: 7,
    columns: 10,
    aislesAfter: [5],
    roomWidth: 18,
    roomDepth: 17,
    roomHeight: 9,
    screenWidth: 18,
    screenAspect: 18 / 9,
    screenBaseY: 0,
    screenZ: -7,
    baseZ: -0.8,
    seatBaseY: 0,
    rowSpacing: 1.55,
    rowRise: 0.38,
    seatSpacing: 1.4,
    chairWidth: 1.05,
    seed: 37,
    defaultSeat: "D6",
    showtimes: [
      { id: "quest-1200", time: "12:00", label: "Insignia", price: 400 },
      { id: "quest-1600", time: "16:00", label: "Insignia", price: 450 },
      { id: "quest-2000", time: "20:00", label: "Insignia", price: 520 },
      { id: "quest-2245", time: "22:45", label: "Insignia", price: 480 },
    ],
  },
  {
    id: "pvr-avani",
    name: "PVR Avani Riverside",
    shortName: "PVR Avani",
    neighborhood: "Shibpur, Howrah",
    address: "Avani Riverside Mall, Howrah",
    auditorium: "Audi 3",
    format: "PREMIUM DIGITAL",
    formatNote: "Compact standard profile · Representative layout",
    sourceUrl:
      "https://in.bookmyshow.com/cinemas/kolkata/pvr-avani-kolkata/buytickets/PVAK",
    imageAssetKey: "venue-avani",
    trailerId: "dhurandhar",
    profile: "compact-tiered",
    shellArtifactHint: "compact-tiered-shell",
    screenArtifactHint: "wide-projection-screen",
    chairArtifactHint: "standard-oxblood-recliner",
    fixtureArtifactHint: "brass-step-light",
    rows: 9,
    columns: 14,
    aislesAfter: [5, 10],
    roomWidth: 22,
    roomDepth: 20,
    roomHeight: 9.5,
    screenWidth: 22,
    screenAspect: 22 / 9.5,
    screenBaseY: 0,
    screenZ: -8,
    baseZ: -0.9,
    seatBaseY: 0,
    rowSpacing: 1.25,
    rowRise: 0.4,
    seatSpacing: 1.02,
    chairWidth: 0.82,
    seed: 43,
    defaultSeat: "E8",
    showtimes: [
      { id: "avani-1030", time: "10:30", label: "Morning", price: 200 },
      { id: "avani-1405", time: "14:05", label: "Afternoon", price: 240 },
      { id: "avani-1820", time: "18:20", label: "Evening", price: 280 },
      { id: "avani-2155", time: "21:55", label: "Late", price: 260 },
    ],
  },
  {
    id: "cinepolis-lake",
    name: "Cinepolis Lake Mall",
    shortName: "Cinepolis Lake",
    neighborhood: "Rash Behari Avenue",
    address: "Lake Mall, 104 Rash Behari Avenue, Kolkata",
    auditorium: "Laser House",
    format: "2K LASER",
    formatNote: "Premium-wide profile · Representative layout",
    sourceUrl:
      "https://in.bookmyshow.com/cinemas/kolkata/cinepolis-lake-mall-kolkata/buytickets/CLMK",
    imageAssetKey: "venue-cinepolis-lake",
    trailerId: "dhurandhar",
    profile: "premium-wide",
    shellArtifactHint: "premium-wide-shell",
    screenArtifactHint: "wide-projection-screen",
    chairArtifactHint: "luxury-oxblood-recliner",
    fixtureArtifactHint: "brass-aisle-beacon",
    rows: 9,
    columns: 14,
    aislesAfter: [5, 10],
    roomWidth: 23,
    roomDepth: 21,
    roomHeight: 10,
    screenWidth: 23,
    screenAspect: 23 / 10,
    screenBaseY: 0,
    screenZ: -8.6,
    baseZ: -0.9,
    seatBaseY: 0,
    rowSpacing: 1.32,
    rowRise: 0.42,
    seatSpacing: 1.08,
    chairWidth: 0.9,
    seed: 53,
    defaultSeat: "F8",
    showtimes: [
      { id: "lake-1100", time: "11:00", label: "Laser", price: 220 },
      { id: "lake-1440", time: "14:40", label: "Laser", price: 260 },
      { id: "lake-1830", time: "18:30", label: "Laser", price: 300 },
      { id: "lake-2210", time: "22:10", label: "Laser", price: 280 },
    ],
  },
];

export function getVideoCoverUv(sourceAspect: number, screenAspect: number) {
  if (sourceAspect > screenAspect) {
    const repeatX = screenAspect / sourceAspect;
    return {
      repeatX,
      repeatY: 1,
      offsetX: (1 - repeatX) / 2,
      offsetY: 0,
    };
  }

  const repeatY = sourceAspect / screenAspect;
  return {
    repeatX: 1,
    repeatY,
    offsetX: 0,
    offsetY: (1 - repeatY) / 2,
  };
}

function hashSeat(value: string, seed: number) {
  let hash = seed;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

export function getRollingDates(now = new Date()): ShowDate[] {
  return Array.from({ length: 10 }, (_, index) => {
    const date = new Date(now.getTime() + (index + 1) * 86_400_000);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((entry) => entry.type === type)?.value ?? "";
    const monthNumber = part("month");
    const month = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      month: "short",
    }).format(date);

    return {
      id: `${part("year")}-${monthNumber}-${part("day")}`,
      weekday: part("weekday").toUpperCase(),
      day: part("day"),
      month: month.toUpperCase(),
    };
  });
}

export function buildSeats(venue: Venue, sessionKey = "preview"): Seat[] {
  const seats: Seat[] = [];
  const aisleWidth = 0.95;
  const totalWidth =
    (venue.columns - 1) * venue.seatSpacing +
    venue.aislesAfter.length * aisleWidth;

  for (let rowIndex = 0; rowIndex < venue.rows; rowIndex += 1) {
    for (
      let columnIndex = 0;
      columnIndex < venue.columns;
      columnIndex += 1
    ) {
      const number = columnIndex + 1;
      const row = rowLabel(rowIndex);
      const id = `${row}${number}`;
      const isRearRow = rowIndex === venue.rows - 1;
      const accessible =
        isRearRow &&
        (columnIndex === 0 || columnIndex === venue.columns - 1);
      const companion =
        isRearRow &&
        (columnIndex === 1 || columnIndex === venue.columns - 2);
      const aisleOffset =
        venue.aislesAfter.filter((after) => number > after).length *
        aisleWidth;

      seats.push({
        id,
        row,
        number,
        rowIndex,
        columnIndex,
        status: accessible
          ? "accessible"
          : companion
            ? "companion"
            : "available",
        x: columnIndex * venue.seatSpacing + aisleOffset - totalWidth / 2,
        y: venue.seatBaseY + rowIndex * venue.rowRise,
        z: venue.baseZ + rowIndex * venue.rowSpacing,
      });
    }
  }

  const candidates = seats
    .filter(
      (seat) =>
        seat.id !== venue.defaultSeat && seat.status === "available",
    )
    .sort(
      (left, right) =>
        hashSeat(`${venue.id}:${sessionKey}:${left.id}`, venue.seed) -
          hashSeat(`${venue.id}:${sessionKey}:${right.id}`, venue.seed) ||
        left.id.localeCompare(right.id),
    );
  const occupiedIds = new Set(
    candidates
      .slice(0, Math.round(candidates.length * 0.18))
      .map((seat) => seat.id),
  );

  return seats.map((seat) =>
    occupiedIds.has(seat.id) ? { ...seat, status: "occupied" } : seat,
  );
}

export function findSeat(seats: Seat[], id: string) {
  const seat = seats.find((candidate) => candidate.id === id);
  if (!seat) throw new Error(`Unknown seat: ${id}`);
  return seat;
}

function qualifies(
  metrics: Omit<SightlineMetrics, "rating">,
  minimumClearance: number,
  maximumOffset: number,
  minimumWidth: number,
  maximumWidth: number,
  maximumVertical: number,
) {
  return (
    (metrics.clearanceCm === null ||
      metrics.clearanceCm >= minimumClearance) &&
    metrics.horizontalOffsetDeg <= maximumOffset &&
    metrics.screenAngularWidthDeg >= minimumWidth &&
    metrics.screenAngularWidthDeg <= maximumWidth &&
    metrics.verticalAngleDeg <= maximumVertical
  );
}

export function rateSightline(
  metrics: Omit<SightlineMetrics, "rating">,
): SightlineRating {
  return qualifies(metrics, 8, 8, 70, 90, 15)
    ? "Exceptional"
    : qualifies(metrics, 5, 15, 62, 100, 22)
      ? "Great"
      : qualifies(metrics, 0, 26, 55, 112, 32)
        ? "Good"
        : "Compromised";
}

export function measureSightline(
  venue: Venue,
  seat: Seat,
  seats = buildSeats(venue),
): SightlineMetrics {
  const screenHeight = venue.screenWidth / venue.screenAspect;
  const screenCenterY = venue.screenBaseY + screenHeight / 2;
  const eye: [number, number, number] = [
    seat.x,
    seat.y + 1.18,
    seat.z - 0.15,
  ];
  const target: [number, number, number] = [
    0,
    screenCenterY,
    venue.screenZ,
  ];
  const dx = target[0] - eye[0];
  const dy = target[1] - eye[1];
  const dz = target[2] - eye[2];
  const planDistance = Math.max(Math.abs(dz), 0.001);
  const frontSeat =
    seat.rowIndex > 0
      ? seats.find(
          (candidate) =>
            candidate.rowIndex === seat.rowIndex - 1 &&
            candidate.columnIndex === seat.columnIndex,
        )
      : undefined;
  let clearanceCm: number | null = null;

  if (frontSeat) {
    const sightlineDepth = venue.screenZ - eye[2];
    const progress =
      (frontSeat.z - eye[2]) /
      (Math.abs(sightlineDepth) < 0.001 ? -0.001 : sightlineDepth);
    const lineAtFront =
      eye[1] + progress * (venue.screenBaseY - eye[1]);
    clearanceCm = round((lineAtFront - (frontSeat.y + 1.25)) * 100);
  }

  const base = {
    eye,
    target,
    distanceM: round(Math.hypot(dx, dy, dz)),
    horizontalOffsetDeg: round(
      degree(Math.atan2(Math.abs(eye[0]), planDistance)),
    ),
    verticalAngleDeg: round(
      Math.abs(degree(Math.atan2(target[1] - eye[1], planDistance))),
    ),
    screenAngularWidthDeg: round(
      degree(2 * Math.atan(venue.screenWidth / (2 * planDistance))),
    ),
    clearanceCm,
  };
  const rating = rateSightline(base);

  return { ...base, rating };
}

export function getOverviewPose(venue: Venue) {
  const backZ = venue.baseZ + (venue.rows - 1) * venue.rowSpacing;
  return {
    position: [
      venue.roomWidth * 0.34,
      venue.roomHeight * 0.62,
      backZ + venue.roomDepth * 0.3,
    ] as [number, number, number],
    target: [
      0,
      venue.screenBaseY + venue.screenWidth / venue.screenAspect / 2,
      venue.screenZ + venue.roomDepth * 0.38,
    ] as [number, number, number],
  };
}
