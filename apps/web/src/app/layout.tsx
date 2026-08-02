import './global.css';

export const metadata = {
  title: 'squadup',
  description: 'squadup.in',
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
