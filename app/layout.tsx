import { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/utils/providers";
import { Bricolage_Grotesque } from "next/font/google";

export const metadata: Metadata = {
  title: "Nurse Assistant",
  description: "",
};

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bricolage.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
