import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, Lora } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-serif-title",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const lora = Lora({
  variable: "--font-serif-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Biblioteca Clarice Assis | Acervo Literário & Café",
  description:
    "Explore obras clássicas e contemporâneas, descubra edições em PDF de domínio público, onde comprar e opiniões de leitores na Biblioteca Clarice Assis.",
  icons: {
    icon: "/logo-emblem.png",
    shortcut: "/logo-emblem.png",
    apple: "/logo-emblem.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${lora.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FBF8F3] text-[#2C1E16] selection:bg-[#C89D54]/30 selection:text-[#2C1E16]">
        {children}
      </body>
    </html>
  );
}
