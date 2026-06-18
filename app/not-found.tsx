import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <p className="text-6xl font-bold text-red-500 mb-4">404</p>
                <h1 className="text-2xl font-semibold text-white mb-3">Page not found</h1>
                <p className="text-zinc-400 text-sm mb-6">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <Link
                    href="/"
                    className="inline-block px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                    Go home
                </Link>
            </div>
        </div>
    );
}
