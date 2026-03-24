import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Resume Builder
        </h1>
        <p className="text-lg text-gray-600">
          Paste a job description and get a tailored resume and cover letter
          in seconds. Download both as PDFs, ready to apply.
        </p>
        <div className="flex gap-4 justify-center">
          {userId ? (
            <Link
              href="/applications"
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <SignInButton mode="modal" forceRedirectUrl="/applications" />
          )}
        </div>
      </div>
    </main>
  );
}
