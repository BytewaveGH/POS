// The customer-facing eatery site: no sign-in, no dashboard shell.
import '@/components/eatery/fonts'

export const metadata = {
  title: 'Sellix Eats — order from local restaurants, bars and cafés',
  description: 'Browse menus and order for pickup, delivery or at your table.',
}

export default function EatLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] bg-[#FAF7F2]">{children}</div>
}
