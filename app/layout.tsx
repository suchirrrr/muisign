import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Murder Masquerade | October IGN 2026",
  description: "Live booth availability for the MUISS × SASS October International Games Night.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
