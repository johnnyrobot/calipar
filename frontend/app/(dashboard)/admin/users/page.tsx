'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Edit2,
  Trash2,
  Mail,
  Shield,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ChevronDown,
  AlertTriangle,
  Building,
  Clock,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Modal, Input, Spinner } from '@/components/ui';
import { useCurrentRole } from '@/lib/useRole';

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

export default function UserManagementPage() {
  const { isAdmin } = useCurrentRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock users data
  const users: User[] = [
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
  ];

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
      admin: { label: 'Admin', variant: 'danger' as const },
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
      active: { icon: CheckCircle2, className: 'text-green-600' },
      inactive: { icon: XCircle, className: 'text-gray-400' },
      pending: { icon: Clock, className: 'text-amber-500' },
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

  const handleAddUser = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowAddModal(false);
  };

  const handleEditUser = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowDeleteModal(false);
    setSelectedUser(null);
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
      <Header
        title="User Management"
        subtitle="Manage user accounts and permissions"
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-lamc-light rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-lamc-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                <p className="text-sm text-gray-500">Total Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter((u) => u.status === 'active').length}
                </p>
                <p className="text-sm text-gray-500">Active Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter((u) => u.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-500">Pending Approval</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter((u) => u.role === 'admin').length}
                </p>
                <p className="text-sm text-gray-500">Administrators</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
                />
              </div>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
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
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <Button onClick={() => setShowAddModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            user.role === 'admin'
                              ? 'bg-red-500'
                              : user.role === 'dean'
                              ? 'bg-blue-500'
                              : user.role === 'chair'
                              ? 'bg-amber-500'
                              : user.role === 'proc'
                              ? 'bg-green-500'
                              : 'bg-gray-500'
                          }`}
                        >
                          {user.fullName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.fullName}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building className="w-4 h-4 text-gray-400" />
                        {user.department}
                      </div>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(user.status)}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {formatDate(user.lastLogin)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-lamc-blue hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No users found matching your criteria</p>
            </div>
          )}
        </Card>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New User">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <Input placeholder="Enter full name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <Input type="email" placeholder="user@ccc.edu" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue">
              <option value="faculty">Faculty</option>
              <option value="chair">Department Chair</option>
              <option value="dean">Dean</option>
              <option value="proc">PROC Member</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <Input placeholder="Enter department name" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <Input defaultValue={selectedUser.fullName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <Input type="email" defaultValue={selectedUser.email} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                defaultValue={selectedUser.role}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
              >
                <option value="faculty">Faculty</option>
                <option value="chair">Department Chair</option>
                <option value="dean">Dean</option>
                <option value="proc">PROC Member</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <Input defaultValue={selectedUser.department} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                defaultValue={selectedUser.status}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Are you sure you want to delete this user?</p>
                <p className="text-sm text-red-700 mt-1">
                  This action cannot be undone. All associated data will be permanently removed.
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                    selectedUser.role === 'admin' ? 'bg-red-500' : 'bg-gray-500'
                  }`}
                >
                  {selectedUser.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.fullName}</p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
