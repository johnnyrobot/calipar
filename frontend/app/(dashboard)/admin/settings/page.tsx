'use client';

import { useState } from 'react';
import {
  Shield,
  Settings,
  Database,
  Calendar,
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
          <Shield className="w-16 h-16 text-brand-line mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-brand-ink font-display tracking-tight mb-2">Access Denied</h2>
          <p className="text-brand-muted">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="System Settings" subtitle="Configure platform settings and preferences" />

      <div className="p-6">
        {/* System Health Banner */}
        <div className="mb-6 p-4 bg-surface border border-brand-line rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    systemHealth.status === 'healthy'
                      ? 'bg-status-approved'
                      : systemHealth.status === 'degraded'
                      ? 'bg-status-review'
                      : 'bg-destructive'
                  }`}
                />
                <span className="font-medium text-brand-ink capitalize">System {systemHealth.status}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-muted">
                <Activity className="w-4 h-4" />
                <span>Uptime: {systemHealth.uptime}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-muted">
                <HardDrive className="w-4 h-4" />
                <span>DB Size: {systemHealth.dbSize}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-muted">
                <Users className="w-4 h-4" />
                <span>{systemHealth.activeUsers} Active Users</span>
              </div>
            </div>
            <Badge variant="success">Last backup: {new Date(systemHealth.lastBackup).toLocaleString()}</Badge>
          </div>
        </div>

        {/* Success Banner */}
        {saveSuccess && (
          <div className="mb-6 p-4 bg-brand-success-bg border border-brand-line rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-status-approved" />
            <p className="text-sm text-status-approved">Settings have been saved successfully.</p>
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
                      ? 'bg-brand-primary-bg text-brand-primary font-medium'
                      : 'text-brand-muted hover:bg-surface-2'
                  }`}
                >
                  <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-brand-primary' : 'text-brand-muted'}`} />
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
                <h2 className="text-lg font-semibold text-brand-ink font-display tracking-tight mb-6">General Settings</h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-1">Institution Name</label>
                      <Input
                        value={generalSettings.institutionName}
                        onChange={(e) => setGeneralSettings((s) => ({ ...s, institutionName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-1">Institution Code</label>
                      <Input
                        value={generalSettings.institutionCode}
                        onChange={(e) => setGeneralSettings((s) => ({ ...s, institutionCode: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-1">Academic Year</label>
                      <select
                        value={generalSettings.academicYear}
                        onChange={(e) => setGeneralSettings((s) => ({ ...s, academicYear: e.target.value }))}
                        className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
                      >
                        <option value="2023-2024">2023-2024</option>
                        <option value="2024-2025">2024-2025</option>
                        <option value="2025-2026">2025-2026</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-1">Timezone</label>
                      <select
                        value={generalSettings.timezone}
                        onChange={(e) => setGeneralSettings((s) => ({ ...s, timezone: e.target.value }))}
                        className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
                      >
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-brand-line pt-6">
                    <h3 className="text-sm font-semibold text-brand-ink font-display tracking-tight mb-4">Email Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-brand-text mb-1">From Name</label>
                        <Input
                          value={generalSettings.emailFromName}
                          onChange={(e) => setGeneralSettings((s) => ({ ...s, emailFromName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-text mb-1">From Address</label>
                        <Input
                          type="email"
                          value={generalSettings.emailFromAddress}
                          onChange={(e) => setGeneralSettings((s) => ({ ...s, emailFromAddress: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-brand-text mb-1">Support Email</label>
                      <Input
                        type="email"
                        value={generalSettings.supportEmail}
                        onChange={(e) => setGeneralSettings((s) => ({ ...s, supportEmail: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="border-t border-brand-line pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-brand-ink">Maintenance Mode</p>
                        <p className="text-sm text-brand-muted">
                          When enabled, only administrators can access the platform
                        </p>
                      </div>
                      <button
                        onClick={() => setGeneralSettings((s) => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          generalSettings.maintenanceMode ? 'bg-status-review' : 'bg-surface-2'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-surface rounded-full shadow transition-transform ${
                            generalSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-brand-line flex justify-end">
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
                <h2 className="text-lg font-semibold text-brand-ink font-display tracking-tight mb-6">Review Cycle Settings</h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-1">Current Cycle</label>
                      <select
                        value={cycleSettings.currentCycle}
                        onChange={(e) => setCycleSettings((s) => ({ ...s, currentCycle: e.target.value }))}
                        className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
                      >
                        <option value="2023-2024">2023-2024</option>
                        <option value="2024-2025">2024-2025</option>
                        <option value="2025-2026">2025-2026</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-1">Cycle Type</label>
                      <select
                        value={cycleSettings.cycleType}
                        onChange={(e) => setCycleSettings((s) => ({ ...s, cycleType: e.target.value }))}
                        className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
                      >
                        <option value="comprehensive">Comprehensive (6-Year)</option>
                        <option value="annual">Annual Update</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-1">Submission Deadline</label>
                      <Input
                        type="date"
                        value={cycleSettings.submissionDeadline}
                        onChange={(e) => setCycleSettings((s) => ({ ...s, submissionDeadline: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-1">Validation Deadline</label>
                      <Input
                        type="date"
                        value={cycleSettings.validationDeadline}
                        onChange={(e) => setCycleSettings((s) => ({ ...s, validationDeadline: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-text mb-1">
                      Reminder Days Before Deadline
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={cycleSettings.reminderDays}
                      onChange={(e) => setCycleSettings((s) => ({ ...s, reminderDays: parseInt(e.target.value) }))}
                    />
                    <p className="text-xs text-brand-muted mt-1">
                      Users will receive email reminders this many days before deadlines
                    </p>
                  </div>

                  <div className="border-t border-brand-line pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-brand-ink">Allow Late Submissions</p>
                        <p className="text-sm text-brand-muted">Users can submit reviews after the deadline</p>
                      </div>
                      <button
                        onClick={() =>
                          setCycleSettings((s) => ({ ...s, allowLateSubmissions: !s.allowLateSubmissions }))
                        }
                        className={`w-12 h-6 rounded-full transition-colors ${
                          cycleSettings.allowLateSubmissions ? 'bg-brand-primary' : 'bg-surface-2'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-surface rounded-full shadow transition-transform ${
                            cycleSettings.allowLateSubmissions ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-brand-ink">Require Chair/Dean Approval</p>
                        <p className="text-sm text-brand-muted">Reviews must be approved before PROC validation</p>
                      </div>
                      <button
                        onClick={() => setCycleSettings((s) => ({ ...s, requireApproval: !s.requireApproval }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          cycleSettings.requireApproval ? 'bg-brand-primary' : 'bg-surface-2'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-surface rounded-full shadow transition-transform ${
                            cycleSettings.requireApproval ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-brand-ink">Auto-Archive Previous Cycles</p>
                        <p className="text-sm text-brand-muted">Automatically archive reviews when a new cycle begins</p>
                      </div>
                      <button
                        onClick={() => setCycleSettings((s) => ({ ...s, autoArchive: !s.autoArchive }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          cycleSettings.autoArchive ? 'bg-brand-primary' : 'bg-surface-2'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-surface rounded-full shadow transition-transform ${
                            cycleSettings.autoArchive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-brand-line flex justify-end">
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
                  <h2 className="text-lg font-semibold text-brand-ink font-display tracking-tight mb-6">AI & Authentication</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-review-bg rounded-lg flex items-center justify-center">
                          <Key className="w-6 h-6 text-status-review" />
                        </div>
                        <div>
                          <p className="font-medium text-brand-ink">Firebase Authentication</p>
                          <p className="text-sm text-brand-muted">User authentication and identity management</p>
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
                            integrationSettings.firebaseEnabled ? 'bg-status-approved' : 'bg-surface-2'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-surface rounded-full shadow transition-transform ${
                              integrationSettings.firebaseEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-primary-bg rounded-lg flex items-center justify-center">
                          <Target className="w-6 h-6 text-brand-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-brand-ink">Google Gemini AI</p>
                          <p className="text-sm text-brand-muted">AI-powered analysis and Mission-Bot assistant</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={integrationSettings.geminiModel}
                          onChange={(e) => setIntegrationSettings((s) => ({ ...s, geminiModel: e.target.value }))}
                          className="px-3 py-1.5 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
                        >
                          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        </select>
                        <button
                          onClick={() =>
                            setIntegrationSettings((s) => ({ ...s, geminiEnabled: !s.geminiEnabled }))
                          }
                          className={`w-12 h-6 rounded-full transition-colors ${
                            integrationSettings.geminiEnabled ? 'bg-status-approved' : 'bg-surface-2'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-surface rounded-full shadow transition-transform ${
                              integrationSettings.geminiEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h2 className="text-lg font-semibold text-brand-ink font-display tracking-tight mb-6">Data Integrations</h2>
                  <p className="text-sm text-brand-muted mb-4">
                    Connect to external systems for data synchronization
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-brand-line rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#F3E7FB] rounded-lg flex items-center justify-center">
                          <Database className="w-6 h-6 text-[#7A3FA0]" />
                        </div>
                        <div>
                          <p className="font-medium text-brand-ink">PeopleSoft Integration</p>
                          <p className="text-sm text-brand-muted">Sync enrollment and student data</p>
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

                    <div className="flex items-center justify-between p-4 border border-brand-line rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-success-bg rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-status-approved" />
                        </div>
                        <div>
                          <p className="font-medium text-brand-ink">eLumen SLO System</p>
                          <p className="text-sm text-brand-muted">Import CSLO/PSLO assessment data</p>
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

                    <div className="flex items-center justify-between p-4 border border-brand-line rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#FBEAEA] rounded-lg flex items-center justify-center">
                          <Globe className="w-6 h-6 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium text-brand-ink">Canvas LMS</p>
                          <p className="text-sm text-brand-muted">Course and assignment data integration</p>
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
                <h2 className="text-lg font-semibold text-brand-ink font-display tracking-tight mb-6">Security Settings</h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-1">
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
                      <label className="block text-sm font-medium text-brand-text mb-1">Max Login Attempts</label>
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
                      <label className="block text-sm font-medium text-brand-text mb-1">
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
                      <label className="block text-sm font-medium text-brand-text mb-1">
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
                    <label className="block text-sm font-medium text-brand-text mb-1">IP Whitelist</label>
                    <Textarea
                      value={securitySettings.ipWhitelist}
                      onChange={(e) => setSecuritySettings((s) => ({ ...s, ipWhitelist: e.target.value }))}
                      placeholder="Enter IP addresses (one per line) to restrict access..."
                      rows={3}
                    />
                    <p className="text-xs text-brand-muted mt-1">
                      Leave empty to allow access from any IP address
                    </p>
                  </div>

                  <div className="border-t border-brand-line pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-brand-ink">Require Multi-Factor Authentication</p>
                        <p className="text-sm text-brand-muted">
                          All users must set up MFA to access their accounts
                        </p>
                      </div>
                      <button
                        onClick={() => setSecuritySettings((s) => ({ ...s, requireMFA: !s.requireMFA }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          securitySettings.requireMFA ? 'bg-brand-primary' : 'bg-surface-2'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-surface rounded-full shadow transition-transform ${
                            securitySettings.requireMFA ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-brand-line flex justify-end">
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
                  <h2 className="text-lg font-semibold text-brand-ink font-display tracking-tight mb-6">Database Operations</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                      <div>
                        <p className="font-medium text-brand-ink">Create Backup</p>
                        <p className="text-sm text-brand-muted">
                          Download a full backup of the database
                        </p>
                      </div>
                      <Button variant="outline">
                        <Database className="w-4 h-4 mr-2" />
                        Create Backup
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                      <div>
                        <p className="font-medium text-brand-ink">Clear Cache</p>
                        <p className="text-sm text-brand-muted">
                          Clear application cache and temporary files
                        </p>
                      </div>
                      <Button variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Clear Cache
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                      <div>
                        <p className="font-medium text-brand-ink">Rebuild Search Index</p>
                        <p className="text-sm text-brand-muted">
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

                <Card className="border-destructive">
                  <h2 className="text-lg font-semibold text-destructive font-display tracking-tight mb-2">Danger Zone</h2>
                  <p className="text-sm text-brand-muted mb-6">
                    These actions are destructive and cannot be undone.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[#FBEAEA] border border-destructive rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-destructive">Reset All Data</p>
                          <p className="text-sm text-destructive">
                            Permanently delete all program reviews and related data. User accounts will be preserved.
                          </p>
                        </div>
                      </div>
                      <Button variant="danger" size="sm">
                        Reset Data
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#FBEAEA] border border-destructive rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-destructive">Archive Current Cycle</p>
                          <p className="text-sm text-destructive">
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
