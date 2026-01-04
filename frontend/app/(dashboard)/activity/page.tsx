'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Filter,
  Search,
  ChevronRight,
  Send,
  Edit3,
  Eye,
  Target,
  DollarSign,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Input } from '@/components/ui';
import { useAuthStore } from '@/lib/store';

type ActivityType =
  | 'review_updated'
  | 'review_submitted'
  | 'review_approved'
  | 'status_changed'
  | 'comment_added'
  | 'action_plan_created'
  | 'resource_funded'
  | 'deadline_reminder';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  metadata?: {
    reviewId?: string;
    reviewName?: string;
    status?: string;
    amount?: number;
  };
}

export default function ActivityPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Mock activity data
  const activities: Activity[] = [
    {
      id: '1',
      type: 'review_updated',
      title: 'Biology Program Review Updated',
      description: 'Student Success section was updated with new enrollment data',
      timestamp: '2024-12-12T14:30:00Z',
      user: { name: 'Dr. Sarah Martinez', role: 'Faculty' },
      metadata: { reviewId: '1', reviewName: 'Biology Department' },
    },
    {
      id: '2',
      type: 'comment_added',
      title: 'New Comment on Nursing Review',
      description: 'Dean Williams left feedback on the resource allocation section',
      timestamp: '2024-12-12T11:15:00Z',
      user: { name: 'Dean Williams', role: 'Dean' },
      metadata: { reviewId: '3', reviewName: 'Nursing Program' },
    },
    {
      id: '3',
      type: 'status_changed',
      title: 'Computer Science Review Status Changed',
      description: 'Review moved from Draft to In Review',
      timestamp: '2024-12-11T16:45:00Z',
      user: { name: 'Prof. Michael Johnson', role: 'Chair' },
      metadata: { reviewId: '2', reviewName: 'Computer Science & IT', status: 'In Review' },
    },
    {
      id: '4',
      type: 'review_submitted',
      title: 'Mathematics Review Submitted',
      description: 'Annual review submitted for PROC validation',
      timestamp: '2024-12-10T09:30:00Z',
      user: { name: 'Dr. James Chen', role: 'Faculty' },
      metadata: { reviewId: '4', reviewName: 'Mathematics Department' },
    },
    {
      id: '5',
      type: 'resource_funded',
      title: 'Resource Request Approved',
      description: 'Laboratory Equipment Upgrade request was funded ($12,000)',
      timestamp: '2024-12-09T14:00:00Z',
      user: { name: 'Budget Committee', role: 'Admin' },
      metadata: { amount: 12000 },
    },
    {
      id: '6',
      type: 'action_plan_created',
      title: 'New Action Plan Created',
      description: 'Created: "Faculty Professional Development on Equity-Minded Pedagogy"',
      timestamp: '2024-12-08T10:20:00Z',
      user: { name: 'Dr. Sarah Martinez', role: 'Faculty' },
    },
    {
      id: '7',
      type: 'review_approved',
      title: 'English Department Review Approved',
      description: 'Comprehensive review has been approved by the Dean',
      timestamp: '2024-12-07T16:00:00Z',
      user: { name: 'Dean Williams', role: 'Dean' },
      metadata: { reviewId: '5', reviewName: 'English Department' },
    },
    {
      id: '8',
      type: 'deadline_reminder',
      title: 'Deadline Approaching',
      description: 'Biology Program Review due in 34 days (January 15, 2025)',
      timestamp: '2024-12-06T08:00:00Z',
      user: { name: 'System', role: 'System' },
      metadata: { reviewId: '1', reviewName: 'Biology Department' },
    },
    {
      id: '9',
      type: 'comment_added',
      title: 'PROC Feedback Added',
      description: 'PROC Committee provided rubric scores and feedback',
      timestamp: '2024-12-05T13:45:00Z',
      user: { name: 'PROC Committee', role: 'PROC' },
      metadata: { reviewId: '4', reviewName: 'Mathematics Department' },
    },
    {
      id: '10',
      type: 'review_updated',
      title: 'Nursing Program Review Updated',
      description: 'Equity Analysis section completed with disproportionate impact data',
      timestamp: '2024-12-04T11:30:00Z',
      user: { name: 'Dr. Emily Williams', role: 'Faculty' },
      metadata: { reviewId: '3', reviewName: 'Nursing Program' },
    },
  ];

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'review_updated':
        return <Edit3 className="w-5 h-5 text-blue-500" />;
      case 'review_submitted':
        return <Send className="w-5 h-5 text-purple-500" />;
      case 'review_approved':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'status_changed':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'comment_added':
        return <MessageSquare className="w-5 h-5 text-indigo-500" />;
      case 'action_plan_created':
        return <Target className="w-5 h-5 text-teal-500" />;
      case 'resource_funded':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'deadline_reminder':
        return <Clock className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActivityBadge = (type: ActivityType) => {
    switch (type) {
      case 'review_updated':
        return <Badge variant="info">Updated</Badge>;
      case 'review_submitted':
        return <Badge variant="warning">Submitted</Badge>;
      case 'review_approved':
        return <Badge variant="success">Approved</Badge>;
      case 'status_changed':
        return <Badge variant="warning">Status Change</Badge>;
      case 'comment_added':
        return <Badge variant="info">Comment</Badge>;
      case 'action_plan_created':
        return <Badge variant="info">New Plan</Badge>;
      case 'resource_funded':
        return <Badge variant="success">Funded</Badge>;
      case 'deadline_reminder':
        return <Badge variant="error">Deadline</Badge>;
      default:
        return <Badge>Activity</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} minutes ago`;
      }
      return `${hours} hours ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      searchQuery === '' ||
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.user.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || activity.type === typeFilter;

    // Date filtering
    if (dateFilter !== 'all') {
      const activityDate = new Date(activity.timestamp);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dateFilter === 'today' && diffDays > 0) return false;
      if (dateFilter === 'week' && diffDays > 7) return false;
      if (dateFilter === 'month' && diffDays > 30) return false;
    }

    return matchesSearch && matchesType;
  });

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = new Date(activity.timestamp);
    const dateKey = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);

  return (
    <div className="min-h-screen">
      <Header
        title="Activity Feed"
        subtitle="Track all recent activity across program reviews"
      />

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search activity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
              >
                <option value="all">All Types</option>
                <option value="review_updated">Updates</option>
                <option value="review_submitted">Submissions</option>
                <option value="review_approved">Approvals</option>
                <option value="status_changed">Status Changes</option>
                <option value="comment_added">Comments</option>
                <option value="action_plan_created">Action Plans</option>
                <option value="resource_funded">Resources</option>
                <option value="deadline_reminder">Deadlines</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
              <p className="text-sm text-gray-500">Total Activities</p>
            </Card>
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-blue-600">
                {activities.filter(a => a.type === 'review_updated').length}
              </p>
              <p className="text-sm text-gray-500">Updates</p>
            </Card>
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-green-600">
                {activities.filter(a => a.type === 'review_approved').length}
              </p>
              <p className="text-sm text-gray-500">Approved</p>
            </Card>
            <Card className="text-center py-4">
              <p className="text-2xl font-bold text-indigo-600">
                {activities.filter(a => a.type === 'comment_added').length}
              </p>
              <p className="text-sm text-gray-500">Comments</p>
            </Card>
          </div>

          {/* Activity Timeline */}
          {filteredActivities.length === 0 ? (
            <Card className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity found</h3>
              <p className="text-gray-500">
                {searchQuery || typeFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Activity will appear here as you work on reviews'}
              </p>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedActivities).map(([dateKey, dateActivities]) => (
                <div key={dateKey}>
                  <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {dateKey}
                  </h3>
                  <div className="space-y-3">
                    {dateActivities.map((activity) => (
                      <Card
                        key={activity.id}
                        className="hover:border-lamc-blue transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-gray-900">
                                    {activity.title}
                                  </h4>
                                  {getActivityBadge(activity.type)}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {activity.description}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {activity.user.name}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTimestamp(activity.timestamp)}
                                  </span>
                                </div>
                              </div>
                              {activity.metadata?.reviewId && (
                                <Link
                                  href={`/reviews/${activity.metadata.reviewId}`}
                                  className="flex items-center gap-1 text-sm text-lamc-blue hover:underline flex-shrink-0"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
