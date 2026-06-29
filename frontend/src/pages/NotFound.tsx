import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <h1 className="text-xl font-semibold text-gray-700 mt-4">Page not found</h1>
      <p className="text-sm text-gray-500 mt-2">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
        Back to Dashboard
      </Link>
    </div>
  );
}
