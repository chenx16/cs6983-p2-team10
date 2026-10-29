import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForecastHub",
  description: "A community prediction platform for friendly forecasting.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
