import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Welcome to ShowRate Manager
        </h1>
        <p className="text-xl mb-8 text-center">
          A web application designed to help SDRs improve their demo show rates
        </p>
        <div className="flex justify-center gap-4">
          <Link 
            href="/login" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Login
          </Link>
          <Link 
            href="/register" 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
} 