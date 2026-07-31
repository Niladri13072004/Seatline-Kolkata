import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seatline Kolkata — Measured Cinema Sightlines",
  description:
    "Choose a Kolkata cinema, showtime, and seat, then inspect its modeled 3D sightline before opening the live venue listing.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
