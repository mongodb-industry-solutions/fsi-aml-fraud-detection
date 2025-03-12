import { GeistSans } from "geist/font/sans";

export const metadata = {
  title: "Example",
  description: "",
};

export default function Example({ children }) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>{children}</body>
    </html>
  );
}
