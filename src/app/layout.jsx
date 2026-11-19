import './globals.css';

/**
 * Root layout for the Drone Grid app.
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}