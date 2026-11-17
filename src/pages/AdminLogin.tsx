import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { ASSETS } from '../data/demoSeed';
import { useRestaurant } from '../context/RestaurantContext';
import {
  onboardAuthorizedAdmin,
  signInWithGoogle,
  signOutAdmin,
} from '../services/authentication';

export function AdminLogin() {
  const navigate = useNavigate();
  const { user, adminProfile, authReady, isAdmin, refreshAdminProfile } = useRestaurant();
  const [authorizedEmail, setAuthorizedEmail] = useState<string>('official.zexuna@gmail.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bootstrap-status')
      .then((r) => r.json())
      .then((d) => {
        if (d.authorizedBootstrapEmail) setAuthorizedEmail(d.authorizedBootstrapEmail);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (authReady && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [authReady, isAdmin, navigate]);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      await refreshAdminProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteOnboarding() {
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      await onboardAuthorizedAdmin(user);
      await refreshAdminProfile();
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Administrator onboarding failed');
    } finally {
      setLoading(false);
    }
  }

  const isBootstrapCandidate =
    Boolean(user) &&
    Boolean(user?.emailVerified) &&
    user?.email?.toLowerCase() === authorizedEmail.toLowerCase() &&
    !adminProfile;

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-[#121212] border border-[#C9A45C]/35 p-8 sm:p-10 space-y-6">
        <div className="text-center space-y-3">
          <img
            src={ASSETS.logo}
            alt="ZEXUNA Logo"
            className="w-16 h-16 mx-auto object-contain"
          />
          <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C]">
            Protected Operations Portal
          </p>
          <h1 className="font-display text-3xl text-white">Administrator Access</h1>
          <p className="text-xs text-[#B8B8B8] leading-relaxed">
            Sign in with an authorized Google account to manage menu pricing, promotional offers, table reservations, and restaurant settings.
          </p>
        </div>

        {!user ? (
          <button
            type="button"
            disabled={loading || !authReady}
            onClick={handleGoogleSignIn}
            className="w-full py-3.5 px-5 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        ) : isBootstrapCandidate ? (
          <div className="space-y-4">
            <div className="bg-[#090909] border border-[#C9A45C]/40 p-4 text-xs text-[#E6CC91] space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#C9A45C]" />
                <span>Verified Owner Account Detected</span>
              </div>
              <p className="text-[#B8B8B8]">
                Signed in as <span className="text-white">{user.email}</span>. Complete initial owner enrollment to activate your administrator role in Cloud Firestore.
              </p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleCompleteOnboarding}
              className="w-full py-3.5 px-5 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] transition-colors disabled:opacity-50"
            >
              {loading ? 'Enrolling Owner...' : 'Complete Secure Admin Onboarding'}
            </button>
            <button
              type="button"
              onClick={() => void signOutAdmin()}
              className="w-full py-2.5 border border-white/15 text-xs text-[#B8B8B8] hover:text-white"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-950/30 border border-red-500/40 p-4 text-xs text-red-200 space-y-1">
              <p className="font-semibold">Access Not Authorized</p>
              <p>
                Signed in as <span className="text-white">{user.email}</span>, which does not have active administrator privileges.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signOutAdmin()}
              className="w-full py-3 border border-white/20 text-xs text-white uppercase tracking-wider hover:border-[#C9A45C]"
            >
              Sign out & Switch Account
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3 bg-red-950/40 border border-red-500/40 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
