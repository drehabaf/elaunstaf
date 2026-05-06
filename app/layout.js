import "./globals.css";

export const metadata = {
  title: "Locum Komisen App",
  description: "Drehab AF",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
