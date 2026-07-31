import type { Metadata } from "next";
import SeatlineKolkata from "./SeatlineKolkata";

export const metadata: Metadata = {
  title: "Seatline Kolkata — The Salt Crown",
  description:
    "Preview modeled screen distance, offset, angular width, and row clearance from six Kolkata-area cinemas.",
};

export default function Home() {
  return <SeatlineKolkata />;
}
