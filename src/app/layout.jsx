import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { GlobalAudioPlayer } from "@/components/GlobalAudioPlayer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Learn Faster - YouTube to MP3 Summaries",
  description: "Turn videos, links, and files into AI-summarized audio lessons.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-20">
        <NavBar />
        {children}
        <GlobalAudioPlayer />
      </body>
    </html>
  );
}
