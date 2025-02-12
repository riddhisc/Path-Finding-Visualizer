import './globals.css'

export const metadata = {
  title: 'Pathfinding Visualizer',
  description: 'Interactive pathfinding algorithm visualization',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}