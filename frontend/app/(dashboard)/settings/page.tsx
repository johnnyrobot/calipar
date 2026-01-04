'use client';

import { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Mail,
  Save,
  Camera,
  Building,
  Key,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Input, Textarea, Badge, Spinner } from '@/components/ui';
import { useAuthStore } from '@/lib/store';

type TabId = 'profile' | 'notifications' | 'security' | 'appearance';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  inApp: boolean;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    fullName: user?.full_name || 'Demo User',
    email: user?.email || 'user@ccc.edu',
    phone: '(818) 555-0123',
    department: 'Biology Department',
    title: 'Professor',
    bio: 'Faculty member specializing in molecular biology and student success initiatives.',
  });

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: 'review_status',
      label: 'Review Status Changes',
      description: 'Get notified when your program review status changes',
      email: true,
      inApp: true,
    },
    {
      id: 'comments',
      label: 'Comments & Feedback',
      description: 'Receive notifications when someone comments on your review',
      email: true,
      inApp: true,
    },
    {
      id: 'deadlines',
      label: 'Deadline Reminders',
      description: 'Get reminded about upcoming submission deadlines',
      email: true,
      inApp: true,
    },
    {
      id: 'resources',
      label: 'Resource Request Updates',
      description: 'Notifications about funded/approved resource requests',
      email: false,
      inApp: true,
    },
    {
      id: 'system',
      label: 'System Announcements',
      description: 'Important updates about CALIPAR platform',
      email: true,
      inApp: true,
    },
  ]);

  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: 'light',
    sidebarCollapsed: false,
    compactMode: false,
  });

  const tabs = [
    { id: 'profile' as TabId, label: 'Profile', icon: User },
    { id: 'notifications' as TabId, label: 'Notifications', icon: Bell },
    { id: 'security' as TabId, label: 'Security', icon: Shield },
    { id: 'appearance' as TabId, label: 'Appearance', icon: Palette },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSaving(false);
    setSaveSuccess(true);

    // Clear success message after 3 seconds
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleNotificationToggle = (id: string, type: 'email' | 'inApp') => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === id ? { ...n, [type]: !n[type] } : n
      )
    );
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Settings"
        subtitle="Manage your account preferences and notifications"
      />

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Success Banner */}
          {saveSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-700">Your settings have been saved successfully.</p>
            </div>
          )}

          <div className="flex gap-6">
            {/* Sidebar Tabs */}
            <div className="w-48 flex-shrink-0">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-lamc-light text-lamc-blue font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-lamc-blue' : 'text-gray-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <Card>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>

                  {/* Profile Photo */}
                  <div className="flex items-center gap-6 mb-8">
                    <div className="relative">
                      <div className="w-20 h-20 bg-lamc-blue rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                        {profile.fullName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
                        <Camera className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{profile.fullName}</p>
                      <p className="text-sm text-gray-500">{profile.email}</p>
                      <Badge variant="info" className="mt-2 capitalize">
                        {user?.role || 'Faculty'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <Input
                          value={profile.fullName}
                          onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <Input
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                          disabled
                        />
                        <p className="text-xs text-gray-500 mt-1">Contact IT to change email</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <Input
                          value={profile.phone}
                          onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <div className="flex items-center gap-2">
                          <Building className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-900">{profile.department}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title / Position
                      </label>
                      <Input
                        value={profile.title}
                        onChange={(e) => setProfile(p => ({ ...p, title: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bio
                      </label>
                      <Textarea
                        value={profile.bio}
                        onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                        rows={3}
                        placeholder="Tell us a bit about yourself..."
                      />
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? <Spinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </Card>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <Card>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Notification Preferences</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Choose how you want to receive notifications about your program reviews.
                  </p>

                  {/* Header */}
                  <div className="flex items-center justify-end gap-8 mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Bell className="w-4 h-4" />
                      <span>In-App</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{notification.label}</p>
                          <p className="text-sm text-gray-500">{notification.description}</p>
                        </div>
                        <div className="flex items-center gap-8">
                          <button
                            onClick={() => handleNotificationToggle(notification.id, 'email')}
                            className={`w-10 h-6 rounded-full transition-colors ${
                              notification.email ? 'bg-lamc-blue' : 'bg-gray-200'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                notification.email ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => handleNotificationToggle(notification.id, 'inApp')}
                            className={`w-10 h-6 rounded-full transition-colors ${
                              notification.inApp ? 'bg-lamc-blue' : 'bg-gray-200'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                notification.inApp ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? <Spinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Preferences
                    </Button>
                  </div>
                </Card>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Password</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Change your password to keep your account secure.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Current Password
                        </label>
                        <Input type="password" placeholder="Enter current password" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <Input type="password" placeholder="Enter new password" />
                        <p className="text-xs text-gray-500 mt-1">
                          Must be at least 8 characters with one uppercase, one number, and one symbol
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <Input type="password" placeholder="Confirm new password" />
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Spinner size="sm" className="mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                        Update Password
                      </Button>
                    </div>
                  </Card>

                  <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Login Sessions</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Manage devices where you're logged in.
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Current Session</p>
                            <p className="text-xs text-gray-500">Chrome on macOS - Los Angeles, CA</p>
                          </div>
                        </div>
                        <Badge variant="success">Active Now</Badge>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                        Sign Out All Other Sessions
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <Card>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Appearance Settings</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Customize how CALIPAR looks and feels.
                  </p>

                  <div className="space-y-6">
                    {/* Theme */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Theme
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { id: 'light', label: 'Light', preview: 'bg-white border-2' },
                          { id: 'dark', label: 'Dark', preview: 'bg-gray-900' },
                          { id: 'system', label: 'System', preview: 'bg-gradient-to-r from-white to-gray-900' },
                        ].map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => setAppearance(a => ({ ...a, theme: theme.id }))}
                            className={`p-4 rounded-lg border-2 transition-colors ${
                              appearance.theme === theme.id
                                ? 'border-lamc-blue bg-lamc-light'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className={`w-full h-12 rounded ${theme.preview} border border-gray-200 mb-2`} />
                            <p className="text-sm font-medium text-gray-900">{theme.label}</p>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Note: Dark mode is coming soon!
                      </p>
                    </div>

                    {/* Compact Mode */}
                    <div className="flex items-center justify-between py-3 border-t border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">Compact Mode</p>
                        <p className="text-sm text-gray-500">Reduce spacing and make UI more dense</p>
                      </div>
                      <button
                        onClick={() => setAppearance(a => ({ ...a, compactMode: !a.compactMode }))}
                        className={`w-10 h-6 rounded-full transition-colors ${
                          appearance.compactMode ? 'bg-lamc-blue' : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            appearance.compactMode ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Sidebar Default State */}
                    <div className="flex items-center justify-between py-3 border-t border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">Collapse Sidebar by Default</p>
                        <p className="text-sm text-gray-500">Start with the sidebar collapsed on page load</p>
                      </div>
                      <button
                        onClick={() => setAppearance(a => ({ ...a, sidebarCollapsed: !a.sidebarCollapsed }))}
                        className={`w-10 h-6 rounded-full transition-colors ${
                          appearance.sidebarCollapsed ? 'bg-lamc-blue' : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            appearance.sidebarCollapsed ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? <Spinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Preferences
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
