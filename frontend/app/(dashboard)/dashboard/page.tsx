'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Target,
  ChevronRight,
  Calendar,
  Users,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, StatCard, Badge, StatusBadge, Spinner } from '@/components/ui';
import { useAuthStore } from '@/lib/store';

interface DashboardStats {
  activeReviews: number;
  pendingApproval: number;
  completedThisYear: number;
  upcomingDeadlines: number;
}

interface RecentActivity {
  id: string;
  type: 'review_updated' | 'comment_added' | 'status_changed' | 'review_submitted';
  title: string;
  description: string;
  timestamp: string;
  user: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    activeReviews: 3,
    pendingApproval: 2,
    completedThisYear: 15,
    upcomingDeadlines: 4,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'review_updated',
      title: 'Biology Program Review',
      description: 'Student Success section updated',
      timestamp: '2 hours ago',
      user: 'Dr. Martinez',
    },
    {
      id: '2',
      type: 'status_changed',
      title: 'Computer Science Review',
      description: 'Status changed to In Review',
      timestamp: '5 hours ago',
      user: 'Prof. Johnson',
    },
    {
      id: '3',
      type: 'comment_added',
      title: 'Nursing Program Review',
      description: 'Dean added feedback on resource requests',
      timestamp: '1 day ago',
      user: 'Dean Williams',
    },
    {
      id: '4',
      type: 'review_submitted',
      title: 'Mathematics Review',
      description: 'Submitted for validation',
      timestamp: '2 days ago',
      user: 'Dr. Chen',
    },
  ]);

  const quickActions = [
    {
      title: 'Start New Review',
      description: 'Begin a new program review',
      href: '/reviews/new',
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'View My Reviews',
      description: 'Continue working on drafts',
      href: '/reviews',
      icon: Clock,
      color: 'bg-amber-500',
    },
    {
      title: 'Action Plans',
      description: 'Manage your action plans',
      href: '/planning',
      icon: Target,
      color: 'bg-green-500',
    },
    {
      title: 'Data Analytics',
      description: 'Explore enrollment & success data',
      href: '/data',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ];

  const upcomingDeadlines = [
    { program: 'Biology', deadline: 'Jan 15, 2025', daysLeft: 34 },
    { program: 'Computer Science', deadline: 'Jan 20, 2025', daysLeft: 39 },
    { program: 'English', deadline: 'Feb 1, 2025', daysLeft: 51 },
    { program: 'Mathematics', deadline: 'Feb 15, 2025', daysLeft: 65 },
  ];

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'review_updated':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'comment_added':
        return <Users className="w-4 h-4 text-green-500" />;
      case 'status_changed':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'review_submitted':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'Guest'}!`}
        subtitle="Here's what's happening with your program reviews"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Reviews"
            value={stats.activeReviews}
            icon={<FileText className="w-6 h-6" />}
            trend={{ value: 2, isPositive: true }}
            color="blue"
          />
          <StatCard
            title="Pending Approval"
            value={stats.pendingApproval}
            icon={<Clock className="w-6 h-6" />}
            color="amber"
          />
          <StatCard
            title="Completed This Year"
            value={stats.completedThisYear}
            icon={<CheckCircle2 className="w-6 h-6" />}
            trend={{ value: 5, isPositive: true }}
            color="green"
          />
          <StatCard
            title="Upcoming Deadlines"
            value={stats.upcomingDeadlines}
            icon={<Calendar className="w-6 h-6" />}
            color="red"
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group bg-white rounded-xl border border-gray-200 p-4 hover:border-lamc-blue hover:shadow-md transition-all"
              >
                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-medium text-gray-900 group-hover:text-lamc-blue transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <Link
                href="/activity"
                className="text-sm text-lamc-blue hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-500">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {activity.user} &middot; {activity.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Upcoming Deadlines */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h2>
              <Link
                href="/reviews"
                className="text-sm text-lamc-blue hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingDeadlines.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.program}</p>
                    <p className="text-sm text-gray-500">{item.deadline}</p>
                  </div>
                  <Badge
                    variant={item.daysLeft <= 30 ? 'error' : item.daysLeft <= 60 ? 'warning' : 'info'}
                  >
                    {item.daysLeft} days left
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ISMP Goals Progress */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            ISMP Strategic Goals Alignment
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Action plans mapped to the 5 ISMP Strategic Goals
          </p>
          <div className="space-y-4">
            {[
              { goal: '1. Expand Access', count: 8, total: 12, color: 'bg-blue-500' },
              { goal: '2. Student-Centered Institution', count: 15, total: 20, color: 'bg-green-500' },
              { goal: '3. Student Success and Equity', count: 22, total: 25, color: 'bg-amber-500' },
              { goal: '4. Organizational Effectiveness', count: 6, total: 10, color: 'bg-purple-500' },
              { goal: '5. Financial Stability', count: 4, total: 8, color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.goal}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{item.goal}</span>
                  <span className="text-sm text-gray-500">
                    {item.count}/{item.total} plans
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${(item.count / item.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
