import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/authhook';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { login } from '../services/ApiClient';
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import { useAlert } from '../hooks/alerthook';
import { getCorrectDashboardPath } from '../utils/authorize';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const { showError, showSuccess, showWarning, showInfo } = useAlert();

  const handleLogin = (e) => {
    e.preventDefault();
    // validate if fields are empty first
    if (!email || !password) {
      showWarning('Please enter both email and password.');
      return;
    }
    showInfo('Attempting to log in...');
    setIsLoading(true);
    login(email, password)
      .then((response) => {
        showSuccess(JSON.stringify(response));
        // Extract token and user data from response
        const token = response.data.access || response.data.access;
        // Try to get user object, fallback to entire response if no user object
        const userData = response.data.employee;
        console.log('Login successful. User data:', userData);

        // Store token in localStorage
        if (token) {
          localStorage.setItem('token', token);
        }

        // Store user in AuthContext
        if (authLogin && userData) {
          authLogin(userData, token);
        }

        showSuccess(response.data.message);
        setIsLoading(false);
        // Redirect to the correct dashboard based on user role
        navigate(getCorrectDashboardPath(userData));

      })
      .catch((error) => {
        const message = error?.message || 'An unexpected error occurred during login. Please try again later.';
        if (message) {
          showError(message);
        } else {
          showError('An unexpected error occurred during login. Please try again later.');
        }
        // Clear sensitive information on failed login
        setPassword('');
        setEmail('');
        setIsLoading(false);
      });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 antialiased font-sans">
      <div className="flex w-full max-w-5xl h-[650px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">

        <div className="w-full p-16 flex flex-col items-center justify-center bg-white">
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Team Impact University</h2>
            <p className="text-slate-500 mb-8"> Please enter your credentials to proceed.</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email address</label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                  </button>
                </div>
              </div>
              {/**sign in button to lead to the dashboard**/}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                {isLoading ? 'Signing In...' : 'Sign In'} {!isLoading && <span className="text-xl">→</span>}
              </button>
            </form>

            <div className=" flex justify-content items-center mt-6">
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-sm text-slate-600 hover:text-slate-900 font-semibold transition-colors"
              >
                Forgot password?
              </button>
            </div>


          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        userEmail={email}
      />
    </div>
  );
}