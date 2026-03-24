// Bare layout for the render page — strips ALL Next.js chrome
// including the root layout header/nav so Puppeteer gets a clean 420x420 canvas
export default function RenderLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "transparent", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
