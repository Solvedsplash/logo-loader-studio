import "./globals.css";

export const metadata = {
  title: "Logo Loader Studio",
  description: "Create logo-based loading animations and export GIFs."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
