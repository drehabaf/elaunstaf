import "./globals.css";

export const metadata = {
  title: "myStaf V1",
  description: "KOMISEN & ELAUN STAF - Pusat Kesihatan Drehab AF",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
