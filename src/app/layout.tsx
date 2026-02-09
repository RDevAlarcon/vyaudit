import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VyAudit | Auditoría inteligente de sitios web",
  description: "Producto oficial de Vytronix SpA para auditoría web automatizada.",
  icons: {
    icon: "/logo-transparent.png",
    shortcut: "/logo-transparent.png",
    apple: "/logo-transparent.png"
  }
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
