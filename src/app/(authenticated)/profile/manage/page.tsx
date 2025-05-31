'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfileManagementPage() {
  const { user, updateProfile, updateEmail, updatePassword, deleteAccount } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/signin');
    } else {
      setDisplayName(user.displayName || '');
      setNewEmail(user.email || '');
    }
  }, [user, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile(displayName, null);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateEmail(newEmail, currentPassword);
      setSuccess('Email updated successfully!');
      setCurrentPassword('');
    } catch (err) {
      setError('Failed to update email. Please check your current password and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      await updatePassword(currentPassword, newPassword);
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('Failed to update password. Please check your current password and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteAccount(currentPassword);
      router.push('/signin');
    } catch (err) {
      setError('Failed to delete account. Please check your password and try again.');
      console.error(err);
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center pt-16">
        <div className="text-[#0B1423] text-xl [font-family:var(--font-mplus-rounded)]">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl [font-family:var(--font-mplus-rounded)] py-8">
      <div className="flex flex-col gap-8">
        <div className="w-full">
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0B1423]">
              Manage Account
            </h1>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 px-6 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-2 border-green-300 text-green-700 px-6 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          <div className="grid gap-8">
            {/* Update Profile Section */}
            <section className="bg-white rounded-lg p-6 border-2 border-gray-300 shadow-[0_4px_0px] shadow-gray-300">
              <h2 className="text-2xl font-bold text-[#0B1423] mb-4">Update Profile</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-[#0B1423] mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-[#4792ba] focus:ring-2 focus:ring-[#a8dcfd] outline-none transition-all duration-200 text-black"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 font-semibold rounded-lg border-2 border-[#4792ba] bg-[#67b9e7] text-white shadow-[0_4px_0px] shadow-[#4792ba] hover:bg-[#5aa8d6] active:translate-y-[1px] active:shadow-[0_2px_0px] shadow-[#4792ba]/50 transition-all duration-150"
                >
                  Update Profile
                </button>
              </form>
            </section>

            {/* Update Email Section */}
            <section className="bg-white rounded-lg p-6 border-2 border-gray-300 shadow-[0_4px_0px] shadow-gray-300">
              <h2 className="text-2xl font-bold text-[#0B1423] mb-4">Update Email</h2>
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div>
                  <label htmlFor="newEmail" className="block text-sm font-medium text-[#0B1423] mb-1">
                    New Email
                  </label>
                  <input
                    type="email"
                    id="newEmail"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-[#4792ba] focus:ring-2 focus:ring-[#a8dcfd] outline-none transition-all duration-200 text-black"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="currentPasswordEmail" className="block text-sm font-medium text-[#0B1423] mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPasswordEmail"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-[#4792ba] focus:ring-2 focus:ring-[#a8dcfd] outline-none transition-all duration-200 text-black"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 font-semibold rounded-lg border-2 border-[#4792ba] bg-[#67b9e7] text-white shadow-[0_4px_0px] shadow-[#4792ba] hover:bg-[#5aa8d6] active:translate-y-[1px] active:shadow-[0_2px_0px] shadow-[#4792ba]/50 transition-all duration-150"
                >
                  Update Email
                </button>
              </form>
            </section>

            {/* Update Password Section */}
            <section className="bg-white rounded-lg p-6 border-2 border-gray-300 shadow-[0_4px_0px] shadow-gray-300">
              <h2 className="text-2xl font-bold text-[#0B1423] mb-4">Update Password</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-[#0B1423] mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-[#4792ba] focus:ring-2 focus:ring-[#a8dcfd] outline-none transition-all duration-200 text-black"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-[#0B1423] mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-[#4792ba] focus:ring-2 focus:ring-[#a8dcfd] outline-none transition-all duration-200 text-black"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#0B1423] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-[#4792ba] focus:ring-2 focus:ring-[#a8dcfd] outline-none transition-all duration-200 text-black"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 font-semibold rounded-lg border-2 border-[#4792ba] bg-[#67b9e7] text-white shadow-[0_4px_0px] shadow-[#4792ba] hover:bg-[#5aa8d6] active:translate-y-[1px] active:shadow-[0_2px_0px] shadow-[#4792ba]/50 transition-all duration-150"
                >
                  Update Password
                </button>
              </form>
            </section>

            {/* Delete Account Section */}
            <section className="bg-white rounded-lg p-6 border-2 border-red-300 shadow-[0_4px_0px] shadow-red-300">
              <h2 className="text-2xl font-bold text-red-700 mb-4">Delete Account</h2>
              <p className="text-red-700 mb-4">
                Warning: This action cannot be undone. All your data will be permanently deleted.
              </p>
              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div>
                  <label htmlFor="deletePassword" className="block text-sm font-medium text-[#0B1423] mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="deletePassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all duration-200 text-black"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 font-semibold rounded-lg border-2 border-red-500 bg-red-500 text-white shadow-[0_4px_0px] shadow-red-500 hover:bg-red-600 active:translate-y-[1px] active:shadow-[0_2px_0px] shadow-red-500/50 transition-all duration-150"
                >
                  Delete Account
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 