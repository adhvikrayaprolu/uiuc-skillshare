import { LogOut, Shield, Eye, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCurrentProfile, useProfileEditor } from '../hooks/useProfileEditor';
import { useToast } from '../components/ui/ToastProvider';

export function SettingsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const profileQuery = useCurrentProfile();
  const editor = useProfileEditor();

  const profile = profileQuery.data;
  const displayName =
    profile?.display_name ||
    (auth.user ? `${auth.user.firstName} ${auth.user.lastName}`.trim() || auth.user.email : '');
  const email = auth.user?.email ?? '';
  const visibility = profile?.visibility ?? 'public';
  const openToConnect = profile?.open_to_connect ?? true;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Settings</h1>
        <p className="text-[#64748B]">Manage your account and privacy preferences</p>
      </div>

      {profileQuery.isLoading && (
        <div className="mb-6 rounded-2xl border border-[#E2E8F0] bg-white p-6 text-[#64748B]">Loading settings…</div>
      )}

      <div className="space-y-6">
        {/* Account Section */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#E8EEF7] rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-[#13294B]" />
            </div>
            <h2 className="text-xl font-semibold text-[#0F172A]">Account</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-[#E2E8F0]">
              <div>
                <p className="font-medium text-[#0F172A]">Name</p>
                <p className="text-sm text-[#64748B]">{displayName || '—'}</p>
              </div>
              <button onClick={() => navigate('/profile/edit')} className="text-sm text-[#13294B] hover:underline">
                Edit
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-[#E2E8F0]">
              <div>
                <p className="font-medium text-[#0F172A]">Email</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-[#64748B]">{email || '—'}</p>
                  <span className="inline-block rounded border border-[#FF5F05]/30 bg-[#FFF3EA] px-2 py-0.5 text-xs font-semibold text-[#C2410C]">
                    Verified Student
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-[#0F172A]">Student Status</p>
                <p className="text-sm text-[#64748B]">Illinois Student (Verified)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Visibility */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#FFF3EA] rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#FF5F05]" />
            </div>
            <h2 className="text-xl font-semibold text-[#0F172A]">Profile Visibility</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl cursor-pointer">
              <div>
                <p className="font-medium text-[#0F172A]">Public Profile</p>
                <p className="text-sm text-[#64748B]">Make your profile visible to all verified students</p>
              </div>
              <input
                type="checkbox"
                checked={visibility === 'public'}
                onChange={async (e) => {
                  try {
                    await editor.updateProfile.mutateAsync({ visibility: e.target.checked ? 'public' : 'private' });
                    toast.success('Visibility updated.');
                  } catch {
                    toast.error('Could not update visibility.');
                  }
                }}
                className="w-5 h-5 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl cursor-pointer">
              <div>
                <p className="font-medium text-[#0F172A]">Open to Connect</p>
                <p className="text-sm text-[#64748B]">Show that you're available to help other students</p>
              </div>
              <input
                type="checkbox"
                checked={openToConnect}
                onChange={async (e) => {
                  try {
                    await editor.updateProfile.mutateAsync({ open_to_connect: e.target.checked });
                    toast.success('Availability updated.');
                  } catch {
                    toast.error('Could not update availability.');
                  }
                }}
                className="w-5 h-5 rounded"
              />
            </label>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#E8EEF7] rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#13294B]" />
            </div>
            <h2 className="text-xl font-semibold text-[#0F172A]">Privacy</h2>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-[#F8FAFC] rounded-xl">
              <h3 className="font-medium text-[#0F172A] mb-2">Contact Visibility</h3>
              <p className="text-sm text-[#64748B] mb-3">
                You control which contact methods are visible to other students. Update these in your profile settings.
              </p>
              <button className="text-sm text-[#13294B] hover:underline">Manage Contact Methods</button>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl">
              <h3 className="font-medium text-[#0F172A] mb-2">Credentials Visibility</h3>
              <p className="text-sm text-[#64748B] mb-3">
                Choose which credentials (resume, portfolio, etc.) are public, private, or hidden.
              </p>
              <button className="text-sm text-[#13294B] hover:underline">Manage Credentials</button>
            </div>
          </div>
        </div>

        {/* Blocked Users */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <h2 className="text-xl font-semibold text-[#0F172A] mb-4">Blocked Users</h2>
          <p className="text-sm text-[#64748B] text-center py-8">No blocked users</p>
        </div>

        {/* Logout */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <button
            onClick={() => {
              auth.logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#DC2626] text-[#DC2626] font-medium rounded-xl hover:bg-[#DC2626] hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
