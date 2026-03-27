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
        showSuccess('Login successful! Redirecting to dashboard...');
        // Extract token and user data from response
        const token = response.data.access || response.data.access;
        // Try to get user object, fallback to entire response if no user object
        const userData = response.data.employee;

        // Store token in localStorage
        if (token) {
          localStorage.setItem('token', token);
        }

        // Store user in AuthContext
        if (authLogin && userData) {
          authLogin(userData, token);
        }

        setIsLoading(false);
        // Redirect to the correct dashboard based on user role
        if (userData.must_reset_password) {
          navigate('/set-password');
        } else {
          navigate(getCorrectDashboardPath(userData));
        }
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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 antialiased font-sans">
      <div className="w-full max-w-md sm:max-w-lg bg-white rounded-xl sm:rounded-3xl shadow-lg sm:shadow-2xl overflow-hidden border border-slate-200">

        <div className="w-full p-6 sm:p-12 flex flex-col items-center justify-center bg-white">
          <div className="w-full">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Team Impact Christian University</h2>
            <p className="text-slate-500 mb-6 sm:mb-8 text-sm sm:text-base"> Please enter your credentials to proceed.</p>

            <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Email address</label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  className="w-full px-3 sm:px-4 py-3 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-black outline-none transition-all text-sm sm:text-base"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="password"
                    className="w-full px-3 sm:px-4 py-3 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-black outline-none transition-all text-sm sm:text-base"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-slate-600 hover:text-slate-900 min-h-[44px]"
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
                className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-3 px-4 rounded-lg sm:rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]">
                {isLoading ? 'Signing In...' : 'Sign In'} {!isLoading && <span className="text-lg sm:text-xl">→</span>}
              </button>
            </form>

            <div className="flex justify-center mt-4 sm:mt-6">
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-xs sm:text-sm text-slate-600 hover:text-slate-900 font-semibold transition-colors py-2 px-4 rounded-lg hover:bg-slate-100"
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