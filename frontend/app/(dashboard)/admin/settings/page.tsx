'use client';

import { useState } from 'react';
import {
  Shield,
  Settings,
  Database,
  Bell,
  Calendar,
  Clock,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Server,
  HardDrive,
  Activity,
  FileText,
  Users,
  Target,
  Lock,
  Key,
  Mail,
  Globe,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Input, Spinner, Textarea } from '@/components/ui';
import { useCurrentRole } from '@/lib/useRole';

type TabId = 'general' | 'cycles' | 'integrations' | 'security' | 'maintenance';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: string;
  lastBackup: string;
  dbSize: string;
  activeUsers: number;
}

export default function SystemSettingsPage() {
  const { isAdmin } = useCurrentRole();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // System health data
  const systemHealth: SystemHealth = {
    status: 'healthy',
    uptime: '99.9%',
    lastBackup: '2024-12-13T03:00:00Z',
    dbSize: '2.4 GB',
    activeUsers: 47,
  };

  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    institutionName: 'Community College',
    institutionCode: 'CC',
    academicYear: '2024-2025',
    timezone: 'America/Los_Angeles',
    emailFromName: 'CALIPAR Platform',
    emailFromAddress: 'noreply@ccc.edu',
    supportEmail: 'calipar-support@ccc.edu',
    maintenanceMode: false,
  });

  // Review cycle settings
  const [cycleSettings, setCycleSettings] = useState({
    currentCycle: '2024-2025',
    cycleType: 'comprehensive',
    submissionDeadline: '2025-03-15',
    validationDeadline: '2025-04-30',
    reminderDays: 14,
    allowLateSubmissions: false,
    requireApproval: true,
    autoArchive: true,
  });

  // Integration settings
  const [integrationSettings, setIntegrationSettings] = useState({
    firebaseEnabled: true,
    geminiEnabled: true,
    geminiModel: 'gemini-1.5-pro',
    peoplesoftSync: false,
    elumenSync: false,
    canvasIntegration: false,
    singleSignOn: true,
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpireDays: 90,
    requireMFA: false,
    ipWhitelist: '',
    auditLogRetention: 365,
  });

  const tabs = [
    { id: 'general' as TabId, label: 'General', icon: Settings },
    { id: 'cycles' as TabId, label: 'Review Cycles', icon: Calendar },
    { id: 'integrations' as TabId, label: 'Integrations', icon: Globe },
    { id: 'security' as TabId, label: 'Security', icon: Lock },
    { id: 'maintenance' as TabId, label: 'Maintenance', icon: Server },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSaving(false);
    setSaveSuccess(true);

    // Clear success message after 3 seconds
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Admin check
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="System Settings" subtitle="Configure platform settings and preferences" />

      <div className="p-6">
        {/* System Health Banner */}
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    systemHealth.status === 'healthy'
                      ? 'bg-green-500'
                      : systemHealth.status === 'degraded'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                />
                <span className="font-medium text-gray-900 capitalize">System {systemHealth.status}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Activity className="w-4 h-4" />
                <span>Uptime: {systemHealth.uptime}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <HardDrive className="w-4 h-4" />
                <span>DB Size: {systemHealth.dbSize}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>{systemHealth.activeUsers} Active Users</span>
              </div>
            </div>
            <Badge variant="success">Last backup: {new Date(systemHealth.lastBackup).toLocaleString()}</Badge>
          </div>
        </div>

        {/* Success Banner */}
        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="text-sm text-green-700">Settings have been saved successfully.</p>
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-56 flex-shrink-0">
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
            {/* General Tab */}
            {activeTab === 'general' && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Institution Name</label>
                      <Input
                        value={generalSettings.institutionName}
                        onChange={(e) => setGeneralSettings((s) => ({ ...s, institutionName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Institution Code</label>
                      <Input
                        value={generalSettings.institutionCode}
                        onChange={(e) => setGeneralSettings((s) => ({ ...s, institutionCode: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                      <select
                        value={generalSettings.academicYear}
                        onChange={(e) => setGeneralSettings((s) => ({ ...s, academicYear: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
                      >
                        <option value="2023-2024">2023-2024</option>
                        <option value="2024-2025">2024-2025</option>
                        <option value="2025-2026">2025-2026</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                      <select
                        value={generalSettings.timezone}
                        onChange={(e) => setGeneralSettings((s) => ({ ...s, timezone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
                      >
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Email Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                        <Input
                          value={generalSettings.emailFromName}
                          onChange={(e) => setGeneralSettings((s) => ({ ...s, emailFromName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From Address</label>
                        <Input
                          type="email"
                          value={generalSettings.emailFromAddress}
                          onChange={(e) => setGeneralSettings((s) => ({ ...s, emailFromAddress: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                      <Input
                        type="email"
                        value={generalSettings.supportEmail}
                        onChange={(e) => setGeneralSettings((s) => ({ ...s, supportEmail: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Maintenance Mode</p>
                        <p className="text-sm text-gray-500">
                          When enabled, only administrators can access the platform
                        </p>
                      </div>
                      <button
                        onClick={() => setGeneralSettings((s) => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          generalSettings.maintenanceMode ? 'bg-amber-500' : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            generalSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
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

            {/* Review Cycles Tab */}
            {activeTab === 'cycles' && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Review Cycle Settings</h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Cycle</label>
                      <select
                        value={cycleSettings.currentCycle}
                        onChange={(e) => setCycleSettings((s) => ({ ...s, currentCycle: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
                      >
                        <option value="2023-2024">2023-2024</option>
                        <option value="2024-2025">2024-2025</option>
                        <option value="2025-2026">2025-2026</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Type</label>
                      <select
                        value={cycleSettings.cycleType}
                        onChange={(e) => setCycleSettings((s) => ({ ...s, cycleType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
                      >
                        <option value="comprehensive">Comprehensive (6-Year)</option>
                        <option value="annual">Annual Update</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Submission Deadline</label>
                      <Input
                        type="date"
                        value={cycleSettings.submissionDeadline}
                        onChange={(e) => setCycleSettings((s) => ({ ...s, submissionDeadline: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Validation Deadline</label>
                      <Input
                        type="date"
                        value={cycleSettings.validationDeadline}
                        onChange={(e) => setCycleSettings((s) => ({ ...s, validationDeadline: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reminder Days Before Deadline
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={cycleSettings.reminderDays}
                      onChange={(e) => setCycleSettings((s) => ({ ...s, reminderDays: parseInt(e.target.value) }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Users will receive email reminders this many days before deadlines
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Allow Late Submissions</p>
                        <p className="text-sm text-gray-500">Users can submit reviews after the deadline</p>
                      </div>
                      <button
                        onClick={() =>
                          setCycleSettings((s) => ({ ...s, allowLateSubmissions: !s.allowLateSubmissions }))
                        }
                        className={`w-12 h-6 rounded-full transition-colors ${
                          cycleSettings.allowLateSubmissions ? 'bg-lamc-blue' : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            cycleSettings.allowLateSubmissions ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Require Chair/Dean Approval</p>
                        <p className="text-sm text-gray-500">Reviews must be approved before PROC validation</p>
                      </div>
                      <button
                        onClick={() => setCycleSettings((s) => ({ ...s, requireApproval: !s.requireApproval }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          cycleSettings.requireApproval ? 'bg-lamc-blue' : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            cycleSettings.requireApproval ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Auto-Archive Previous Cycles</p>
                        <p className="text-sm text-gray-500">Automatically archive reviews when a new cycle begins</p>
                      </div>
                      <button
                        onClick={() => setCycleSettings((s) => ({ ...s, autoArchive: !s.autoArchive }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          cycleSettings.autoArchive ? 'bg-lamc-blue' : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            cycleSettings.autoArchive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
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

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <Card>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">AI & Authentication</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Key className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Firebase Authentication</p>
                          <p className="text-sm text-gray-500">User authentication and identity management</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={integrationSettings.firebaseEnabled ? 'success' : 'default'}>
                          {integrationSettings.firebaseEnabled ? 'Connected' : 'Disabled'}
                        </Badge>
                        <button
                          onClick={() =>
                            setIntegrationSettings((s) => ({ ...s, firebaseEnabled: !s.firebaseEnabled }))
                          }
                          className={`w-12 h-6 rounded-full transition-colors ${
                            integrationSettings.firebaseEnabled ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              integrationSettings.firebaseEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Target className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Google Gemini AI</p>
                          <p className="text-sm text-gray-500">AI-powered analysis and Mission-Bot assistant</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={integrationSettings.geminiModel}
                          onChange={(e) => setIntegrationSettings((s) => ({ ...s, geminiModel: e.target.value }))}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
                        >
                          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        </select>
                        <button
                          onClick={() =>
                            setIntegrationSettings((s) => ({ ...s, geminiEnabled: !s.geminiEnabled }))
                          }
                          className={`w-12 h-6 rounded-full transition-colors ${
                            integrationSettings.geminiEnabled ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              integrationSettings.geminiEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Data Integrations</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Connect to external systems for data synchronization
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Database className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">PeopleSoft Integration</p>
                          <p className="text-sm text-gray-500">Sync enrollment and student data</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={integrationSettings.peoplesoftSync ? 'success' : 'warning'}>
                          {integrationSettings.peoplesoftSync ? 'Active' : 'Not Configured'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">eLumen SLO System</p>
                          <p className="text-sm text-gray-500">Import CSLO/PSLO assessment data</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={integrationSettings.elumenSync ? 'success' : 'warning'}>
                          {integrationSettings.elumenSync ? 'Active' : 'Not Configured'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <Globe className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Canvas LMS</p>
                          <p className="text-sm text-gray-500">Course and assignment data integration</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={integrationSettings.canvasIntegration ? 'success' : 'warning'}>
                          {integrationSettings.canvasIntegration ? 'Active' : 'Not Configured'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Spinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Session Timeout (minutes)
                      </label>
                      <Input
                        type="number"
                        min="5"
                        max="480"
                        value={securitySettings.sessionTimeout}
                        onChange={(e) =>
                          setSecuritySettings((s) => ({ ...s, sessionTimeout: parseInt(e.target.value) }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Login Attempts</label>
                      <Input
                        type="number"
                        min="3"
                        max="10"
                        value={securitySettings.maxLoginAttempts}
                        onChange={(e) =>
                          setSecuritySettings((s) => ({ ...s, maxLoginAttempts: parseInt(e.target.value) }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password Expiration (days)
                      </label>
                      <Input
                        type="number"
                        min="30"
                        max="365"
                        value={securitySettings.passwordExpireDays}
                        onChange={(e) =>
                          setSecuritySettings((s) => ({ ...s, passwordExpireDays: parseInt(e.target.value) }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Audit Log Retention (days)
                      </label>
                      <Input
                        type="number"
                        min="30"
                        max="730"
                        value={securitySettings.auditLogRetention}
                        onChange={(e) =>
                          setSecuritySettings((s) => ({ ...s, auditLogRetention: parseInt(e.target.value) }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IP Whitelist</label>
                    <Textarea
                      value={securitySettings.ipWhitelist}
                      onChange={(e) => setSecuritySettings((s) => ({ ...s, ipWhitelist: e.target.value }))}
                      placeholder="Enter IP addresses (one per line) to restrict access..."
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to allow access from any IP address
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Require Multi-Factor Authentication</p>
                        <p className="text-sm text-gray-500">
                          All users must set up MFA to access their accounts
                        </p>
                      </div>
                      <button
                        onClick={() => setSecuritySettings((s) => ({ ...s, requireMFA: !s.requireMFA }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          securitySettings.requireMFA ? 'bg-lamc-blue' : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            securitySettings.requireMFA ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
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

            {/* Maintenance Tab */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <Card>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Database Operations</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Create Backup</p>
                        <p className="text-sm text-gray-500">
                          Download a full backup of the database
                        </p>
                      </div>
                      <Button variant="outline">
                        <Database className="w-4 h-4 mr-2" />
                        Create Backup
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Clear Cache</p>
                        <p className="text-sm text-gray-500">
                          Clear application cache and temporary files
                        </p>
                      </div>
                      <Button variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Clear Cache
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Rebuild Search Index</p>
                        <p className="text-sm text-gray-500">
                          Recreate the search index for faster queries
                        </p>
                      </div>
                      <Button variant="outline">
                        <Activity className="w-4 h-4 mr-2" />
                        Rebuild Index
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="border-red-200">
                  <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    These actions are destructive and cannot be undone.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">Reset All Data</p>
                          <p className="text-sm text-red-700">
                            Permanently delete all program reviews and related data. User accounts will be preserved.
                          </p>
                        </div>
                      </div>
                      <Button variant="danger" size="sm">
                        Reset Data
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">Archive Current Cycle</p>
                          <p className="text-sm text-red-700">
                            Archive all reviews from the current cycle. This action cannot be reversed.
                          </p>
                        </div>
                      </div>
                      <Button variant="danger" size="sm">
                        Archive Cycle
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
