'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Clock,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Modal, Input, Spinner } from '@/components/ui';
import { useCurrentRole } from '@/lib/useRole';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'faculty' | 'chair' | 'dean' | 'admin' | 'proc';
  department: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string | null;
  createdAt: string;
}

// Shape of a user record as returned by the backend admin users API.
interface ApiUser {
  id: string;
  email: string;
  full_name: string;
  role?: string;
  department?: string;
  department_id?: string;
  is_active?: boolean;
  last_login?: string | null;
  created_at?: string;
}

// The backend uses an `is_active` boolean rather than a tri-state status,
// so active -> is_active true, everything else -> false.
function mapApiUser(u: ApiUser): User {
  return {
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: (u.role || 'faculty').toLowerCase() as User['role'],
    department: u.department || u.department_id || '—',
    status: u.is_active === false ? 'inactive' : 'active',
    lastLogin: u.last_login ?? null,
    createdAt: u.created_at ?? '',
  };
}

interface UserFormState {
  fullName: string;
  email: string;
  role: User['role'];
  department: string;
  status: 'active' | 'inactive';
}

const EMPTY_FORM: UserFormState = {
  fullName: '',
  email: '',
  role: 'faculty',
  department: '',
  status: 'active',
};

export default function UserManagementPage() {
  const { isAdmin } = useCurrentRole();
  const { token } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UserFormState>(EMPTY_FORM);

  // Mock users data (graceful fallback for the initial load only)
  const mockUsers: User[] = useMemo<User[]>(() => [
    {
      id: '1',
      fullName: 'Michael Williams',
      email: 'michael.williams@ccc.edu',
      role: 'admin',
      department: 'Administration',
      status: 'active',
      lastLogin: '2024-12-13T10:30:00Z',
      createdAt: '2023-01-15T08:00:00Z',
    },
    {
      id: '2',
      fullName: 'Sarah Johnson',
      email: 'sarah.johnson@ccc.edu',
      role: 'dean',
      department: 'Academic Affairs',
      status: 'active',
      lastLogin: '2024-12-12T14:45:00Z',
      createdAt: '2023-02-20T09:30:00Z',
    },
    {
      id: '3',
      fullName: 'Robert Chen',
      email: 'robert.chen@ccc.edu',
      role: 'chair',
      department: 'Mathematics',
      status: 'active',
      lastLogin: '2024-12-11T16:20:00Z',
      createdAt: '2023-03-10T11:00:00Z',
    },
    {
      id: '4',
      fullName: 'Maria Garcia',
      email: 'maria.garcia@ccc.edu',
      role: 'faculty',
      department: 'Biology',
      status: 'active',
      lastLogin: '2024-12-10T09:15:00Z',
      createdAt: '2023-04-05T10:30:00Z',
    },
    {
      id: '5',
      fullName: 'James Thompson',
      email: 'james.thompson@ccc.edu',
      role: 'faculty',
      department: 'English',
      status: 'active',
      lastLogin: '2024-12-09T11:00:00Z',
      createdAt: '2023-05-12T14:00:00Z',
    },
    {
      id: '6',
      fullName: 'Jennifer Martinez',
      email: 'jennifer.martinez@ccc.edu',
      role: 'proc',
      department: 'Office of Institutional Effectiveness',
      status: 'active',
      lastLogin: '2024-12-13T08:45:00Z',
      createdAt: '2023-06-01T09:00:00Z',
    },
    {
      id: '7',
      fullName: 'David Lee',
      email: 'david.lee@ccc.edu',
      role: 'chair',
      department: 'Computer Science',
      status: 'inactive',
      lastLogin: '2024-10-15T10:00:00Z',
      createdAt: '2023-07-20T08:30:00Z',
    },
    {
      id: '8',
      fullName: 'Lisa Anderson',
      email: 'lisa.anderson@ccc.edu',
      role: 'faculty',
      department: 'Chemistry',
      status: 'pending',
      lastLogin: null,
      createdAt: '2024-12-01T15:30:00Z',
    },
    {
      id: '9',
      fullName: 'Kevin Brown',
      email: 'kevin.brown@ccc.edu',
      role: 'faculty',
      department: 'Physics',
      status: 'active',
      lastLogin: '2024-12-08T13:20:00Z',
      createdAt: '2023-08-10T11:15:00Z',
    },
    {
      id: '10',
      fullName: 'Amanda Wilson',
      email: 'amanda.wilson@ccc.edu',
      role: 'dean',
      department: 'Student Services',
      status: 'active',
      lastLogin: '2024-12-12T09:30:00Z',
      createdAt: '2023-09-05T10:00:00Z',
    },
  ], []);

  const [users, setUsers] = useState<User[]>(mockUsers);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (token) {
          api.setToken(token);
          const data = await api.listUsers() as ApiUser[];
          setUsers(data.map(mapApiUser));
        }
      } catch (error) {
        console.error('Failed to load users:', error);
        // Keep existing mock fallback (initial load only)
      }
    };
    fetchUsers();
  }, [token]);

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'dean', label: 'Dean' },
    { value: 'chair', label: 'Department Chair' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'proc', label: 'PROC Member' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ];

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, selectedRole, selectedStatus]);

  const getRoleBadge = (role: User['role']) => {
    const roleConfig = {
      admin: { label: 'Admin', variant: 'error' as const },
      dean: { label: 'Dean', variant: 'info' as const },
      chair: { label: 'Chair', variant: 'warning' as const },
      faculty: { label: 'Faculty', variant: 'default' as const },
      proc: { label: 'PROC', variant: 'success' as const },
    };
    const config = roleConfig[role];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: User['status']) => {
    const statusConfig = {
      active: { icon: CheckCircle2, className: 'text-status-approved' },
      inactive: { icon: XCircle, className: 'text-brand-muted' },
      pending: { icon: Clock, className: 'text-status-review' },
    };
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <div className={`flex items-center gap-1.5 ${config.className}`}>
        <Icon className="w-4 h-4" />
        <span className="capitalize text-sm">{status}</span>
      </div>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const openAddModal = () => {
    setFormData(EMPTY_FORM);
    setShowAddModal(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department === '—' ? '' : user.department,
      status: user.status === 'inactive' ? 'inactive' : 'active',
    });
    setShowEditModal(true);
  };

  const handleAddUser = async () => {
    setIsLoading(true);
    try {
      if (token) {
        api.setToken(token);
        const created = await api.createUser({
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role,
          department_id: formData.department || undefined,
          is_active: formData.status === 'active',
        }) as ApiUser;
        setUsers((prev) => [...prev, mapApiUser(created)]);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
      setShowAddModal(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setIsLoading(true);
    try {
      if (token) {
        api.setToken(token);
        const updated = await api.updateUser(selectedUser.id, {
          full_name: formData.fullName,
          role: formData.role,
          department_id: formData.department || undefined,
          is_active: formData.status === 'active',
        }) as ApiUser;
        setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? mapApiUser(updated) : u)));
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsLoading(false);
      setShowEditModal(false);
      setSelectedUser(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsLoading(true);
    try {
      if (token) {
        api.setToken(token);
        await api.deleteUser(selectedUser.id);
        setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setSelectedUser(null);
    }
  };

  // Admin check
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-brand-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-brand-ink font-display tracking-tight mb-2">Access Denied</h2>
          <p className="text-brand-muted">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title="User Management"
        subtitle="Manage user accounts and permissions"
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-primary-bg rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-brand-ink" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-ink font-mono tabular-nums">{users.length}</p>
                <p className="text-sm text-brand-muted">Total Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-success-bg rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-status-approved" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-ink font-mono tabular-nums">
                  {users.filter((u) => u.status === 'active').length}
                </p>
                <p className="text-sm text-brand-muted">Active Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-review-bg rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-status-review" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-ink font-mono tabular-nums">
                  {users.filter((u) => u.status === 'pending').length}
                </p>
                <p className="text-sm text-brand-muted">Pending Approval</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-primary-bg rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-brand-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-ink font-mono tabular-nums">
                  {users.filter((u) => u.role === 'admin').length}
                </p>
                <p className="text-sm text-brand-muted">Administrators</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
                />
              </div>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <Button onClick={openAddModal}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-brand-line">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-muted uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-muted uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-muted uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-muted uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-brand-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-line">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                            user.role === 'admin'
                              ? 'bg-brand-primary text-white'
                              : user.role === 'dean'
                              ? 'bg-brand-ink text-brand-on-ink'
                              : user.role === 'chair'
                              ? 'bg-brand-ink text-brand-on-ink'
                              : user.role === 'proc'
                              ? 'bg-[#F3E7FB] text-[#7A3FA0]'
                              : 'bg-brand-ink text-brand-accent'
                          }`}
                        >
                          {user.fullName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <p className="font-medium text-brand-ink">{user.fullName}</p>
                          <p className="text-sm text-brand-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm text-brand-muted">
                        <Building className="w-4 h-4 text-brand-muted" />
                        {user.department}
                      </div>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(user.status)}</td>
                    <td className="px-4 py-4 text-sm text-brand-muted">
                      {formatDate(user.lastLogin)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-brand-muted hover:text-brand-primary hover:bg-surface-2 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-brand-muted hover:text-destructive hover:bg-[#FBEAEA] rounded-lg transition-colors"
                          title="Delete user"
                          disabled={user.role === 'admin'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-brand-muted mx-auto mb-3" />
              <p className="text-brand-muted">No users found matching your criteria</p>
            </div>
          )}
        </Card>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New User">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">Full Name</label>
            <Input
              placeholder="Enter full name"
              value={formData.fullName}
              onChange={(e) => setFormData((f) => ({ ...f, fullName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">Email Address</label>
            <Input
              type="email"
              placeholder="user@ccc.edu"
              value={formData.email}
              onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value as User['role'] }))}
              className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
            >
              <option value="faculty">Faculty</option>
              <option value="chair">Department Chair</option>
              <option value="dean">Dean</option>
              <option value="proc">PROC Member</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">Department</label>
            <Input
              placeholder="Enter department name"
              value={formData.department}
              onChange={(e) => setFormData((f) => ({ ...f, department: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-line">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={isLoading}>
              {isLoading ? <Spinner size="sm" className="mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Add User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        title="Edit User"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Full Name</label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Email Address</label>
              <Input type="email" value={formData.email} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value as User['role'] }))}
                className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
              >
                <option value="faculty">Faculty</option>
                <option value="chair">Department Chair</option>
                <option value="dean">Dean</option>
                <option value="proc">PROC Member</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Department</label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData((f) => ({ ...f, department: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value as UserFormState['status'] }))}
                className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-brand-line">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleEditUser} disabled={isLoading}>
                {isLoading ? <Spinner size="sm" className="mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title="Delete User"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-[#FBEAEA] border border-destructive rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Are you sure you want to delete this user?</p>
                <p className="text-sm text-destructive mt-1">
                  This action cannot be undone. All associated data will be permanently removed.
                </p>
              </div>
            </div>

            <div className="p-4 bg-surface-2 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                    selectedUser.role === 'admin' ? 'bg-brand-primary' : 'bg-brand-ink'
                  }`}
                >
                  {selectedUser.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <p className="font-medium text-brand-ink">{selectedUser.fullName}</p>
                  <p className="text-sm text-brand-muted">{selectedUser.email}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-brand-line">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteUser}
                disabled={isLoading || selectedUser.role === 'admin'}
              >
                {isLoading ? <Spinner size="sm" className="mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete User
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
