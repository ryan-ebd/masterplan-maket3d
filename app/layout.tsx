import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});
const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Rancang — Generator Maket 3D",
  description:
    "Platform maket 3D berbasis lokasi peta: klien memilih titik, perencana menyusun batas wilayah dibantu AI, sistem membangun maket 3D.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body
        className={`${bricolage.variable} ${instrument.variable} ${plexMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
