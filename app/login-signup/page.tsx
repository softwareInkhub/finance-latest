"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginSignupPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: mode,
        email,
        password,
        name: mode === 'signup' ? name : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Something went wrong");
    else {
      setSuccess(mode === 'signup' ? "Signup successful!" : "Login successful!");
      if (mode === 'login') {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userId", data.user?.userId || "");
        setTimeout(() => router.push('/'), 800);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <button
            className={`px-4 py-2 rounded-l-lg font-semibold transition-all ${mode === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-blue-700'}`}
            onClick={() => setMode('login')}
            disabled={mode === 'login'}
          >
            Login
          </button>
          <button
            className={`px-4 py-2 rounded-r-lg font-semibold transition-all ${mode === 'signup' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-blue-700'}`}
            onClick={() => setMode('signup')}
            disabled={mode === 'signup'}
          >
            Sign Up
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Name"
              className="border px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="border px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="border px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded shadow transition-all disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (mode === 'login' ? 'Logging in...' : 'Signing up...') : (mode === 'login' ? 'Login' : 'Sign Up')}
          </button>
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          {success && <div className="text-green-600 text-sm text-center">{success}</div>}
        </form>
      </div>
    </div>
  );
} 