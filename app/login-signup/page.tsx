"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";

export default function LoginSignupPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Show loading while redirecting
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!password.trim()) {
      setError("Password is required");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (mode === 'signup' && !name.trim()) {
      setError("Name is required for signup");
      return false;
    }
    if (!email.includes('@')) {
      setError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: mode,
          email: email.trim(),
          password: password.trim(),
          name: name.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred');
        return;
      }

      if (data.success) {
        if (mode === 'login' && data.userId) {
          // Login successful
          login({
            userId: data.userId,
            email: data.email,
            name: data.name
          });
          router.push('/');
        } else if (mode === 'signup') {
          // Signup successful, switch to login mode
          setMode('login');
          setPassword("");
          setError("");
          alert('Account created successfully! Please log in.');
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setError("");
  };

  const handleModeChange = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    clearForm();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h1>
        
        <div className="flex justify-center mb-6">
          <button
            className={`px-4 py-2 rounded-l-lg font-semibold transition-all ${
              mode === 'login' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 text-blue-700 hover:bg-gray-200'
            }`}
            onClick={() => handleModeChange('login')}
            disabled={loading}
          >
            Login
          </button>
          <button
            className={`px-4 py-2 rounded-r-lg font-semibold transition-all ${
              mode === 'signup' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 text-blue-700 hover:bg-gray-200'
            }`}
            onClick={() => handleModeChange('signup')}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
              minLength={6}
            />
            {mode === 'signup' && (
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters long
              </p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full font-semibold py-3 rounded-lg shadow transition-all ${
              loading
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
              </div>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {mode === 'login' ? (
                          <p>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => handleModeChange('signup')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={loading}
                >
                  Sign up here
                </button>
              </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => handleModeChange('login')}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={loading}
              >
                Sign in here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 