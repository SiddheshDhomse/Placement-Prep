import "./globals.css";

export const metadata = {
  title: "Siddhesh Trackers",
  description: "Daily and revision trackers backed by Vercel Postgres."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
