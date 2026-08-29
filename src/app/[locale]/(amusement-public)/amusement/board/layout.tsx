// Deliberately NOT wrapped in the authenticated shell (`ILayout`) used by every
// other vertical — this route is meant to be opened with no login at all (a lobby
// TV display or a shared link), so it gets its own minimal layout instead.
export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-950">{children}</div>
}
