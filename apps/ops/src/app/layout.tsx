import './global.css';

export const metadata = {
  title: 'squadup ops',
  description: 'squadup.in operations console',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
