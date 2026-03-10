import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'College Hub',
  description: 'Customizable campus information and operations dashboard'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
