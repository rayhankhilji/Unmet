import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});
