import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-white">
      <div className="max-w-5xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold mb-6 text-center text-gray-900">
          Welcome to ShowRate Manager
        </h1>
        <p className="text-xl mb-8 text-center text-gray-700">
          A web application designed to help SDRs improve their demo show rates
        </p>
        <div className="flex justify-center gap-4">
          <Link 
            href="/login" 
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Login
          </Link>
          <Link 
            href="/register" 
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
} 