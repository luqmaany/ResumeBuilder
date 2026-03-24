import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/applications" className="font-semibold text-lg">
              Resume Builder
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link
                href="/profile"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Profile
              </Link>
              <Link
                href="/applications"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Applications
              </Link>
              <Link
                href="/settings"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>
          <UserButton />
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
}
