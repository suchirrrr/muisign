import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IGN 2026 | MUISS x SASS International Games Night",
  description: "Live scoring, team flow, station availability and event map for MUISS International Games Night.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
