import Link from 'next/link';

/**
 * Admin layout with sidebar navigation.
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-gray-100 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-800">
          <h1 className="text-xl font-bold text-brand-400">Drone Grid Admin</h1>
        </div>
        <nav className="flex-grow py-4 space-y-1">
          <Link href="/admin/dashboard" className="block px-6 py-2 hover:bg-gray-800">Dashboard</Link>
          <Link href="/admin/fleet" className="block px-6 py-2 hover:bg-gray-800">Fleet</Link>
          <Link href="/admin/analytics" className="block px-6 py-2 hover:bg-gray-800">Analytics</Link>
          <Link href="/admin/health" className="block px-6 py-2 hover:bg-gray-800">System Health</Link>
        </nav>
        <div className="px-6 py-4 border-t border-gray-800">
          <a href="/api/auth/logout" className="text-sm text-gray-400 hover:text-white">Logout</a>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}