import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 sm:p-20 font-[family-name:var(--font-geist-sans)] text-gray-900">
      <main className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          CV Generator
        </h1>
        <p className="text-lg leading-8 text-gray-600">
          The CV Generator helps you maintain a verified master profile of your career facts and
          generate tailored, honest CVs for any job description.
        </p>

        <div className="pt-4">
          <Link
            href="/profile"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Manage Master Profile
          </Link>
        </div>

        <div className="pt-8">
          <p className="text-sm font-medium text-gray-500">
            Coming soon: Evidence-based job-fit scoring, AI-assisted CV generation, and verified
            claim tracking.
          </p>
        </div>
      </main>
    </div>
  )
}
