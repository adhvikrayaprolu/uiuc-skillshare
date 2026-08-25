import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="w-24 h-24 bg-[#E8EEF7] rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-12 h-12 text-[#13294B]" />
          </div>
          <h1 className="text-6xl font-bold text-[#13294B] mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-[#0F172A] mb-3">Page not found</h2>
          <p className="text-[#64748B] mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#13294B] text-white font-medium rounded-xl hover:bg-[#1a3a6b] transition-colors"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Link>
          <Link
            to="/discover"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#13294B] text-[#13294B] font-medium rounded-xl hover:bg-[#E8EEF7] transition-colors"
          >
            <Search className="w-5 h-5" />
            Discover Students
          </Link>
        </div>
      </div>
    </div>
  );
}
