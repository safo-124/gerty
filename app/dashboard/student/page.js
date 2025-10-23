'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_NOTIFICATION_PREFERENCE, withPreferenceDefaults } from '@/lib/reminders';
import { COUNTRIES } from '@/lib/countries';

export default function StudentDashboard() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableLessons, setAvailableLessons] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [trainerRequests, setTrainerRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');
  const [requestForm, setRequestForm] = useState({
    trainerId: '',
    preferredSchedule: '',
    durationMinutes: 60,
    focusAreas: '',
    message: '',
  });
  const [trainerOptions, setTrainerOptions] = useState([]);
  const [trainerOptionsLoading, setTrainerOptionsLoading] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState('');
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState(() => ({
    ...DEFAULT_NOTIFICATION_PREFERENCE,
  }));
  const [notificationPreferencesDraft, setNotificationPreferencesDraft] = useState(() => ({
    ...DEFAULT_NOTIFICATION_PREFERENCE,
  }));
  const [notificationPreferencesLoading, setNotificationPreferencesLoading] = useState(false);
  const [notificationPreferencesSaving, setNotificationPreferencesSaving] = useState(false);
  const [notificationPreferencesError, setNotificationPreferencesError] = useState('');
  const [notificationPreferencesSuccess, setNotificationPreferencesSuccess] = useState('');
  const [studentCountry, setStudentCountry] = useState('');
  const [studentCountrySaving, setStudentCountrySaving] = useState(false);
  const [studentCountryError, setStudentCountryError] = useState('');
  const [studentCountrySuccess, setStudentCountrySuccess] = useState('');
  const [studentForm, setStudentForm] = useState({
    currentRating: '',
    targetRating: '',
    preferredStyle: '',
    goals: '',
  });

  const fetchAvailableLessons = useCallback(async (trainerId = '') => {
    if (!token) return;
    try {
      let url = '/api/student/available-lessons';
      if (trainerId) {
        url += `?trainerId=${trainerId}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableLessons(data.lessons || []);
      }
    } catch (err) {
      console.error('Failed to fetch available lessons:', err);
    }
  }, [token]);

  const handleBookLesson = async (lessonId) => {
    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess(false);

    try {
      const response = await fetch('/api/student/book-lesson', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lessonId }),
      });

      const data = await response.json();

      if (response.ok) {
        setBookingSuccess(true);
        // Refresh available lessons and dashboard data
        await fetchAvailableLessons(selectedTrainer);
        await fetchDashboardData();
        setTimeout(() => setBookingSuccess(false), 3000);
      } else {
        setBookingError(data.error || 'Failed to book lesson');
      }
    } catch (err) {
      console.error('Book lesson error:', err);
      setBookingError('Error booking lesson');
    } finally {
      setBookingLoading(false);
    }
  };

  const refreshTrainerRequests = useCallback(async (showSpinner = true) => {
    if (!token) return;
    if (showSpinner) {
      setRequestsLoading(true);
      setRequestError('');
    }

    try {
      const response = await fetch('/api/student/training-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setTrainerRequests(data.requests || []);
      } else if (showSpinner) {
        setRequestError(data.error || 'Failed to load trainer requests');
      }
    } catch (err) {
      console.error('Fetch trainer requests error:', err);
      if (showSpinner) {
        setRequestError('Failed to load trainer requests');
      }
    } finally {
      if (showSpinner) {
        setRequestsLoading(false);
      }
    }
  }, [token]);

  const fetchTrainerOptions = useCallback(async () => {
    if (trainerOptionsLoading) return;
    setTrainerOptionsLoading(true);
    try {
      const response = await fetch('/api/trainers?limit=50');
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setTrainerOptions(data.trainers || []);
      }
    } catch (err) {
      console.error('Fetch trainer options error:', err);
    } finally {
      setTrainerOptionsLoading(false);
    }
  }, [trainerOptionsLoading]);

  const loadNotificationPreferences = useCallback(async () => {
    if (!token) return;
    setNotificationPreferencesLoading(true);
    setNotificationPreferencesError('');

    try {
      const response = await fetch('/api/notifications/preferences', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const normalized = withPreferenceDefaults(data.preference || {});
        setNotificationPreferences(normalized);
        setNotificationPreferencesDraft(normalized);
      } else {
        setNotificationPreferencesError(data.error || 'Failed to load reminder preferences');
      }
    } catch (err) {
      console.error('Fetch notification preferences error:', err);
      setNotificationPreferencesError('Failed to load reminder preferences');
    } finally {
      setNotificationPreferencesLoading(false);
    }
  }, [token]);

  const updateNotificationPreferenceDraft = (field, value) => {
    setNotificationPreferencesDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveNotificationPreferences = async () => {
    if (!token) return;
    setNotificationPreferencesSaving(true);
    setNotificationPreferencesError('');
    setNotificationPreferencesSuccess('');

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationPreferencesDraft),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const normalized = withPreferenceDefaults(data.preference || {});
        setNotificationPreferences(normalized);
        setNotificationPreferencesDraft(normalized);
        setNotificationPreferencesSuccess('Reminder preferences saved');
        setTimeout(() => setNotificationPreferencesSuccess(''), 3000);
      } else {
        setNotificationPreferencesError(data.error || 'Failed to update reminder preferences');
      }
    } catch (err) {
      console.error('Update notification preferences error:', err);
      setNotificationPreferencesError('Failed to update reminder preferences');
    } finally {
      setNotificationPreferencesSaving(false);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);

      const statsRes = await fetch('/api/student/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        // Initialize country from profile
        const initialCountry = statsData?.profile?.country || '';
        setStudentCountry((prev) => (prev || prev === '' ? initialCountry : initialCountry));
        // Initialize student form fields
        setStudentForm({
          currentRating: statsData?.stats?.currentRating ?? '',
          targetRating: statsData?.stats?.targetRating ?? '',
          preferredStyle: statsData?.profile?.preferredStyle ?? '',
          goals: statsData?.profile?.goals ?? '',
        });
      }

      const lessonsRes = await fetch('/api/student/lessons?status=upcoming&limit=5', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (lessonsRes.ok) {
        const lessonsData = await lessonsRes.json();
        setLessons(lessonsData.lessons || []);
      }

      const tournamentsRes = await fetch('/api/student/tournaments', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (tournamentsRes.ok) {
        const tournamentsData = await tournamentsRes.json();
        setTournaments(tournamentsData.upcoming || []);
      }

      await refreshTrainerRequests(false);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, refreshTrainerRequests]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && token) {
      fetchDashboardData();
      loadNotificationPreferences();
    }
  }, [user, token, fetchDashboardData, loadNotificationPreferences]);

  const handleSaveStudentCountry = async () => {
    if (!token) return;
    setStudentCountrySaving(true);
    setStudentCountryError('');
    setStudentCountrySuccess('');
    try {
      const response = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ country: studentCountry || '' }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setStudentCountrySuccess('Country updated');
        setTimeout(() => setStudentCountrySuccess(''), 2500);
        await fetchDashboardData();
      } else {
        setStudentCountryError(data.error || 'Failed to update country');
      }
    } catch (err) {
      console.error('Update student country error:', err);
      setStudentCountryError('Failed to update country');
    } finally {
      setStudentCountrySaving(false);
    }
  };

  const handleStudentFormChange = (field, value) => {
    setStudentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveStudentProfile = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStudentCountryError('');
    try {
      const payload = {
        currentRating: studentForm.currentRating !== '' ? Number(studentForm.currentRating) : undefined,
        targetRating: studentForm.targetRating !== '' ? Number(studentForm.targetRating) : undefined,
        preferredStyle: studentForm.preferredStyle || undefined,
        goals: studentForm.goals || undefined,
      };
      const response = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        await fetchDashboardData();
      } else {
        setStudentCountryError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Update student profile error:', err);
      setStudentCountryError('Failed to update profile');
    }
  };

  const handleRequestFormChange = (field, value) => {
    setRequestForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');

    if (!requestForm.trainerId) {
      setRequestError('Please choose a trainer to continue.');
      return;
    }

    if (!requestForm.durationMinutes || Number(requestForm.durationMinutes) <= 0) {
      setRequestError('Duration must be greater than 0.');
      return;
    }

    setCreatingRequest(true);

    try {
      const response = await fetch('/api/student/training-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainerId: requestForm.trainerId,
          preferredSchedule: requestForm.preferredSchedule || null,
          durationMinutes: Number(requestForm.durationMinutes),
          focusAreas: requestForm.focusAreas,
          message: requestForm.message,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setRequestSuccess('Request submitted! Please complete the payment to notify your trainer.');
        setRequestForm(prev => ({
          ...prev,
          preferredSchedule: '',
          focusAreas: '',
          message: '',
        }));
        await refreshTrainerRequests();
      } else {
        setRequestError(data.error || 'Failed to submit request');
      }
    } catch (err) {
      console.error('Create trainer request error:', err);
      setRequestError('Failed to submit request');
    } finally {
      setCreatingRequest(false);
    }
  };

  const handlePayRequest = async (requestId) => {
    setRequestError('');
    setRequestSuccess('');
    setProcessingPaymentId(requestId);

    try {
      const response = await fetch(`/api/student/training-requests/${requestId}/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setRequestSuccess('Payment received! Your trainer will review the request shortly.');
        await refreshTrainerRequests();
      } else {
        setRequestError(data.error || 'Failed to process payment');
      }
    } catch (err) {
      console.error('Trainer request payment error:', err);
      setRequestError('Failed to process payment');
    } finally {
      setProcessingPaymentId('');
    }
  };

  const selectedTrainerProfile = trainerOptions.find((option) => option.user?.id === requestForm.trainerId);
  const estimatedTotal = selectedTrainerProfile?.hourlyRate
    ? ((selectedTrainerProfile.hourlyRate * Number(requestForm.durationMinutes || 0)) / 60).toFixed(2)
    : '0.00';
  const formatStatus = (value) => value
    ? value
        .split('_')
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ')
    : '';

  // Fetch available lessons when tab changes to lessons or when trainer filter changes
  useEffect(() => {
    if (activeTab === 'book-lessons' && user && token) {
      fetchAvailableLessons(selectedTrainer);
    }
  }, [activeTab, selectedTrainer, user, token, fetchAvailableLessons]);

  useEffect(() => {
    if (activeTab === 'requests' && user && token) {
      refreshTrainerRequests();
      if (trainerOptions.length === 0) {
        fetchTrainerOptions();
      }
    }
  }, [activeTab, user, token, trainerOptions.length, refreshTrainerRequests, fetchTrainerOptions]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Learning Journey</h1>
              <p className="text-blue-100">Welcome back, {user?.name}!</p>
              {stats?.stats?.currentRating && (
                <div className="mt-3 flex items-center gap-3">
                  <Badge className="bg-white/20 text-white border-white/40 text-lg px-4 py-1">
                    Current Rating: {stats.stats.currentRating}
                  </Badge>
                  {stats.stats.targetRating && (
                    <Badge className="bg-yellow-400/80 text-yellow-900 text-lg px-4 py-1">
                      Target: {stats.stats.targetRating}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Link href="/trainers">
                <Button 
                  variant="outline" 
                  className="bg-white/20 border-white/40 text-white hover:bg-white/30"
                >
                  Find Trainers
                </Button>
              </Link>
              <Link href="/tournaments">
                <Button 
                  variant="outline" 
                  className="bg-white/20 border-white/40 text-white hover:bg-white/30"
                >
                  Browse Tournaments
                </Button>
              </Link>
              <Link href="/dashboard/student/analytics/puzzles">
                <Button 
                  variant="outline" 
                  className="bg-white/20 border-white/40 text-white hover:bg-white/30"
                >
                  Puzzles Analytics
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {['overview', 'requests', 'book-lessons', 'lessons', 'tournaments', 'progress', 'settings'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'gradient' : 'outline'}
              onClick={() => setActiveTab(tab)}
              className="capitalize whitespace-nowrap"
            >
              {tab === 'progress' ? '📊 Progress' : 
               tab === 'book-lessons' ? '📅 Book Lessons' : 
               tab === 'requests' ? '🤝 Trainer Requests' : 
               tab}
            </Button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 border border-red-200 text-red-800">
            {error}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            {loading ? (
              <div className="grid md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-8 bg-gray-300 rounded w-16"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : stats ? (
              <>
                <div className="grid md:grid-cols-4 gap-6">
                  <Card className="border-2 border-blue-200/60 hover:shadow-2xl transition-shadow">
                    <CardHeader>
                      <CardDescription>Total Lessons</CardDescription>
                      <CardTitle className="text-4xl bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        {stats.stats.totalLessons}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        {stats.stats.completedLessons} completed · {stats.stats.upcomingLessons} upcoming
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-purple-200/60 hover:shadow-2xl transition-shadow">
                    <CardHeader>
                      <CardDescription>Learning Hours</CardDescription>
                      <CardTitle className="text-4xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {stats.stats.totalHours}h
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        {stats.stats.uniqueTrainers} trainer{stats.stats.uniqueTrainers !== 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-green-200/60 hover:shadow-2xl transition-shadow">
                    <CardHeader>
                      <CardDescription>Tournaments</CardDescription>
                      <CardTitle className="text-4xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {stats.stats.enrolledTournaments}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        {stats.stats.upcomingTournaments} upcoming
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-yellow-200/60 hover:shadow-2xl transition-shadow">
                    <CardHeader>
                      <CardDescription>Progress</CardDescription>
                      <CardTitle className="text-4xl bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                        {stats.stats.progressPercentage}%
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        Towards goal
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress Bar */}
                {stats.stats.currentRating && stats.stats.targetRating && (
                  <Card className="border-2 border-purple-200/60">
                    <CardHeader>
                      <CardTitle>Rating Progress</CardTitle>
                      <CardDescription>
                        From {stats.stats.currentRating} to {stats.stats.targetRating}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 transition-all duration-1000 flex items-center justify-end pr-3"
                          style={{ width: `${Math.min(stats.stats.progressPercentage, 100)}%` }}
                        >
                          {stats.stats.progressPercentage > 10 && (
                            <span className="text-white font-bold text-sm">
                              {stats.stats.progressPercentage}%
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Keep training to reach your target rating! 🎯
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}

            {/* Upcoming Lessons */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Lessons</CardTitle>
                <CardDescription>Your scheduled training sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {lessons.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No upcoming lessons</p>
                    <Link href="/trainers">
                      <Button variant="gradient">Book a Lesson</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/40"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Trainer: {lesson.trainer.name}
                            {lesson.trainer.trainerProfile?.title && (
                              <span className="ml-2 text-purple-600">
                                ({lesson.trainer.trainerProfile.title})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            📅 {new Date(lesson.scheduledAt).toLocaleString()} · ⏱️ {lesson.duration} min
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={lesson.status === 'SCHEDULED' ? 'default' : 'secondary'}>
                            {lesson.status}
                          </Badge>
                          {lesson.meetingLink && (
                            <Button
                              size="sm"
                              variant="gradient"
                              onClick={() => window.open(lesson.meetingLink, '_blank')}
                            >
                              Join Lesson
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Tournaments */}
            <Card>
              <CardHeader>
                <CardTitle>Enrolled Tournaments</CardTitle>
                <CardDescription>Tournaments you&apos;re registered for</CardDescription>
              </CardHeader>
              <CardContent>
                {tournaments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No upcoming tournaments</p>
                    <Link href="/tournaments">
                      <Button variant="gradient">Browse Tournaments</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {tournaments.slice(0, 4).map((enrollment) => (
                      <div
                        key={enrollment.enrollmentId}
                        className="p-4 rounded-lg bg-gradient-to-br from-white/90 to-green-50/80 backdrop-blur-md border border-green-200/40 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{enrollment.tournament.name}</h4>
                          <Badge 
                            variant={enrollment.tournament.status === 'UPCOMING' ? 'default' : 'secondary'}
                          >
                            {enrollment.tournament.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          🏆 {enrollment.tournament.format} · ⏱️ {enrollment.tournament.timeControl}
                        </p>
                        <p className="text-xs text-gray-500">
                          📅 {new Date(enrollment.tournament.startDate).toLocaleDateString()}
                        </p>
                        {enrollment.rank && (
                          <div className="mt-2 pt-2 border-t border-green-200/40">
                            <p className="text-sm font-semibold text-green-700">
                              Current Rank: #{enrollment.rank}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-8">
            <Card className="border-2 border-purple-200/60">
              <CardHeader>
                <CardTitle>Request Personalized Training</CardTitle>
                <CardDescription>
                  Pick a coach, share your goals, and secure a dedicated training session.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requestSuccess && (
                  <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    {requestSuccess}
                  </div>
                )}
                {requestError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {requestError}
                  </div>
                )}

                <form onSubmit={handleCreateRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="trainer">Trainer</Label>
                    <select
                      id="trainer"
                      value={requestForm.trainerId}
                      onChange={(e) => handleRequestFormChange('trainerId', e.target.value)}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                    >
                      <option value="">Select a trainer</option>
                      {trainerOptions.map((trainer) => (
                        <option key={trainer.user.id} value={trainer.user.id}>
                          {trainer.user.name} {trainer.title ? `· ${trainer.title}` : ''} {trainer.hourlyRate ? `($${trainer.hourlyRate}/hr)` : ''}
                        </option>
                      ))}
                    </select>
                    {trainerOptionsLoading && (
                      <p className="text-xs text-gray-500">Loading trainers...</p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="preferredSchedule">Preferred date &amp; time</Label>
                      <Input
                        id="preferredSchedule"
                        type="datetime-local"
                        value={requestForm.preferredSchedule}
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={(e) => handleRequestFormChange('preferredSchedule', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                      <Input
                        id="durationMinutes"
                        type="number"
                        min={30}
                        step={15}
                        value={requestForm.durationMinutes}
                        onChange={(e) => handleRequestFormChange('durationMinutes', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="focusAreas">Focus areas</Label>
                    <Input
                      id="focusAreas"
                      placeholder="e.g., Middlegame planning, tactical awareness"
                      value={requestForm.focusAreas}
                      onChange={(e) => handleRequestFormChange('focusAreas', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Additional notes</Label>
                    <textarea
                      id="message"
                      rows={4}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                      placeholder="Share your goals, recent games, or anything else your trainer should know"
                      value={requestForm.message}
                      onChange={(e) => handleRequestFormChange('message', e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-900 md:flex-row md:items-center md:justify-between">
                    <span>
                      Estimated total: <span className="font-semibold">${estimatedTotal} USD</span>
                    </span>
                    {selectedTrainerProfile?.hourlyRate && (
                      <span className="text-xs text-blue-700 md:text-sm">
                        Hourly rate locked at ${selectedTrainerProfile.hourlyRate}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Button type="submit" variant="gradient" disabled={creatingRequest || !requestForm.trainerId}>
                      {creatingRequest ? 'Submitting...' : 'Submit Request'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setRequestForm({
                          trainerId: '',
                          preferredSchedule: '',
                          durationMinutes: 60,
                          focusAreas: '',
                          message: '',
                        });
                        setRequestError('');
                        setRequestSuccess('');
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Trainer Requests</CardTitle>
                <CardDescription>Track payment status and trainer responses in real time.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {requestsLoading ? (
                  <div className="flex items-center justify-center py-8 text-purple-500">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-500"></div>
                  </div>
                ) : trainerRequests.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50/50 p-8 text-center text-sm text-purple-700">
                    No trainer requests yet. Submit one above to get started!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trainerRequests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-xl border border-purple-200/60 bg-gradient-to-r from-white via-purple-50/40 to-blue-50/40 p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              {request.trainer?.name || 'Unknown Trainer'}
                            </h4>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              <Badge variant="secondary" className="bg-blue-100/80 text-blue-700">
                                {formatStatus(request.status)}
                              </Badge>
                              <Badge variant="secondary" className="bg-emerald-100/80 text-emerald-700">
                                {formatStatus(request.paymentStatus)}
                              </Badge>
                              <Badge variant="outline" className="border-purple-300 bg-white/80 text-purple-700">
                                ${Number(request.amount || 0).toFixed(2)} USD
                              </Badge>
                            </div>
                            <div className="mt-3 space-y-1 text-sm text-gray-600">
                              {request.preferredSchedule && (
                                <p>
                                  Preferred time: <span className="font-medium text-gray-800">{new Date(request.preferredSchedule).toLocaleString()}</span>
                                </p>
                              )}
                              {request.duration && (
                                <p>
                                  Duration: <span className="font-medium text-gray-800">{request.duration} minutes</span>
                                </p>
                              )}
                              {request.focusAreas && (
                                <p>
                                  Focus: <span className="font-medium text-gray-800">{request.focusAreas}</span>
                                </p>
                              )}
                              {request.message && (
                                <p className="text-xs text-gray-500">
                                  “{request.message}”
                                </p>
                              )}
                              {request.lesson && (
                                <p className="text-sm text-purple-700">
                                  Lesson scheduled for {new Date(request.lesson.scheduledAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-stretch gap-2 md:items-end">
                            {request.paymentStatus === 'PENDING' && (
                              <Button
                                variant="gradient"
                                onClick={() => handlePayRequest(request.id)}
                                disabled={processingPaymentId === request.id}
                              >
                                {processingPaymentId === request.id
                                  ? 'Processing...'
                                  : `Pay $${Number(request.amount || 0).toFixed(2)}`}
                              </Button>
                            )}
                            {request.paymentStatus === 'PAID' && request.status === 'PENDING_TRAINER_CONFIRMATION' && (
                              <p className="text-xs text-amber-600">
                                Waiting for trainer confirmation
                              </p>
                            )}
                            {request.lesson && (
                              <Button
                                variant="outline"
                                onClick={() => setActiveTab('lessons')}
                              >
                                View Lessons
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Book Lessons Tab */}
        {activeTab === 'book-lessons' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Lessons</CardTitle>
                <CardDescription>Browse and book lessons from trainers</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingSuccess && (
                  <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                    ✓ Lesson booked successfully! Check your &ldquo;Lessons&rdquo; tab.
                  </div>
                )}
                {bookingError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {bookingError}
                  </div>
                )}

                {/* Trainer Filter */}
                <div className="mb-6">
                  <Label htmlFor="trainer-filter">Filter by Trainer</Label>
                  <select
                    id="trainer-filter"
                    className="w-full md:w-64 px-3 py-2 mt-2 rounded-lg bg-white/70 backdrop-blur-md border border-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800"
                    value={selectedTrainer}
                    onChange={(e) => setSelectedTrainer(e.target.value)}
                  >
                    <option value="">All Trainers</option>
                    {/* Get unique trainers from available lessons */}
                    {[...new Set(availableLessons.map(l => l.trainer.id))].map(trainerId => {
                      const trainer = availableLessons.find(l => l.trainer.id === trainerId)?.trainer;
                      return (
                        <option key={trainerId} value={trainerId}>
                          {trainer?.name} {trainer?.trainerProfile?.title ? `- ${trainer.trainerProfile.title}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Available Lessons List */}
                {availableLessons.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-6xl mb-4">📅</div>
                    <p className="text-lg font-medium">No lessons available</p>
                    <p className="text-sm mt-2">Check back later or browse trainers to request a lesson</p>
                    <Link href="/trainers">
                      <Button variant="gradient" className="mt-4">
                        Browse Trainers
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="p-5 rounded-lg bg-gradient-to-br from-white/90 to-blue-50/80 backdrop-blur-md border border-blue-200/40 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{lesson.title}</h3>
                                
                                {/* Trainer Info */}
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                                    {lesson.trainer.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">{lesson.trainer.name}</div>
                                    {lesson.trainer.trainerProfile?.title && (
                                      <div className="text-sm text-gray-600">{lesson.trainer.trainerProfile.title}</div>
                                    )}
                                  </div>
                                </div>

                                {/* Lesson Details */}
                                <div className="grid md:grid-cols-2 gap-3 mb-3">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-600">📅</span>
                                    <span className="font-medium">
                                      {new Date(lesson.scheduledAt).toLocaleDateString('en-US', { 
                                        weekday: 'short', 
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-600">🕐</span>
                                    <span className="font-medium">
                                      {new Date(lesson.scheduledAt).toLocaleTimeString('en-US', { 
                                        hour: 'numeric', 
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-600">⏱️</span>
                                    <span className="font-medium">{lesson.duration} minutes</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-600">💰</span>
                                    <span className="font-medium">
                                      ${((lesson.duration / 60) * (lesson.trainer.trainerProfile?.hourlyRate || 0)).toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Trainer Stats */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {lesson.trainer.trainerProfile?.rating && (
                                    <Badge variant="outline" className="bg-yellow-100/80 text-yellow-700 border-yellow-300">
                                      ⭐ {lesson.trainer.trainerProfile.rating} ELO
                                    </Badge>
                                  )}
                                  {lesson.trainer.trainerProfile?.experience && (
                                    <Badge variant="outline" className="bg-blue-100/80 text-blue-700 border-blue-300">
                                      {lesson.trainer.trainerProfile.experience} years exp
                                    </Badge>
                                  )}
                                  {lesson.trainer.trainerProfile?.hourlyRate && (
                                    <Badge variant="outline" className="bg-green-100/80 text-green-700 border-green-300">
                                      ${lesson.trainer.trainerProfile.hourlyRate}/hr
                                    </Badge>
                                  )}
                                </div>

                                {/* Description */}
                                {lesson.description && (
                                  <p className="text-sm text-gray-700 leading-relaxed">{lesson.description}</p>
                                )}

                                {/* Specialties */}
                                {lesson.trainer.trainerProfile?.specialties && lesson.trainer.trainerProfile.specialties.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {lesson.trainer.trainerProfile.specialties.map((specialty, idx) => (
                                      <span
                                        key={idx}
                                        className="text-xs px-2 py-1 rounded-full bg-purple-100/80 text-purple-700 border border-purple-200"
                                      >
                                        {specialty}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Book Button */}
                          <div className="flex md:flex-col gap-2">
                            <Button
                              variant="gradient"
                              onClick={() => handleBookLesson(lesson.id)}
                              disabled={bookingLoading}
                              className="whitespace-nowrap"
                            >
                              {bookingLoading ? 'Booking...' : 'Book Now'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lessons Tab */}
        {activeTab === 'lessons' && (
          <Card>
            <CardHeader>
              <CardTitle>My Lessons</CardTitle>
              <CardDescription>All your training sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {lessons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No lessons found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/70 backdrop-blur-md border border-purple-200/40 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {lesson.trainer.name} · {new Date(lesson.scheduledAt).toLocaleDateString()}
                        </p>
                        {lesson.description && (
                          <p className="text-xs text-gray-500 mt-1">{lesson.description}</p>
                        )}
                      </div>
                      <Badge variant={
                        lesson.status === 'COMPLETED' ? 'success' :
                        lesson.status === 'CANCELLED' ? 'destructive' : 'default'
                      }>
                        {lesson.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tournaments Tab */}
        {activeTab === 'tournaments' && (
          <Card>
            <CardHeader>
              <CardTitle>My Tournaments ({tournaments.length})</CardTitle>
              <CardDescription>Tournaments you&apos;ve enrolled in</CardDescription>
            </CardHeader>
            <CardContent>
              {tournaments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-4">No tournaments yet</p>
                  <Link href="/tournaments">
                    <Button variant="gradient">Join a Tournament</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {tournaments.map((enrollment) => (
                    <div
                      key={enrollment.enrollmentId}
                      className="p-5 rounded-lg bg-gradient-to-br from-white/90 to-blue-50/80 backdrop-blur-md border border-blue-200/40 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-xl text-gray-900">{enrollment.tournament.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">Organized by {enrollment.tournament.organizer}</p>
                        </div>
                        <Badge 
                          className="text-sm"
                          variant={enrollment.tournament.status === 'UPCOMING' ? 'default' : 'secondary'}
                        >
                          {enrollment.tournament.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-3">{enrollment.tournament.description}</p>
                      
                      <div className="grid md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Format:</span>
                          <span className="ml-2 font-semibold">{enrollment.tournament.format}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Time Control:</span>
                          <span className="ml-2 font-semibold">{enrollment.tournament.timeControl}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Participants:</span>
                          <span className="ml-2 font-semibold">
                            {enrollment.tournament.currentParticipants}/{enrollment.tournament.maxParticipants || '∞'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-blue-200/40 flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-gray-600">Starts:</span>
                          <span className="ml-2 font-semibold">
                            {new Date(enrollment.tournament.startDate).toLocaleDateString()}
                          </span>
                        </div>
                        {enrollment.rank && (
                          <Badge variant="success" className="text-base px-4 py-1">
                            Rank: #{enrollment.rank}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress Overview</CardTitle>
                <CardDescription>Track your chess improvement journey</CardDescription>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-6">
                    {/* Rating Progress */}
                    {stats.stats.currentRating && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">Rating: {stats.stats.currentRating}</span>
                          {stats.stats.targetRating && (
                            <span className="text-sm text-gray-600">Goal: {stats.stats.targetRating}</span>
                          )}
                        </div>
                        <div className="relative w-full h-10 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold transition-all duration-1000"
                            style={{ width: `${Math.min(stats.stats.progressPercentage, 100)}%` }}
                          >
                            {stats.stats.progressPercentage > 15 && `${stats.stats.progressPercentage}%`}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Lessons Progress */}
                    <div>
                      <h4 className="font-semibold mb-3">Lessons Completed</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-sm text-gray-600">Total Lessons</p>
                          <p className="text-3xl font-bold text-blue-600">{stats.stats.totalLessons}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                          <p className="text-sm text-gray-600">Completed</p>
                          <p className="text-3xl font-bold text-green-600">{stats.stats.completedLessons}</p>
                        </div>
                      </div>
                    </div>

                    {/* Learning Hours */}
                    <div className="p-5 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200">
                      <h4 className="font-semibold mb-2">Total Learning Time</h4>
                      <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {stats.stats.totalHours} hours
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        with {stats.stats.uniqueTrainers} different trainer{stats.stats.uniqueTrainers !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Goals */}
                    {stats.profile.goals && (
                      <div>
                        <h4 className="font-semibold mb-2">Your Goals</h4>
                        <p className="text-gray-700 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          {stats.profile.goals}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your learning profile</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSaveStudentProfile}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentRating">Current Rating (ELO)</Label>
                    <Input id="currentRating" type="number" placeholder="1200" value={studentForm.currentRating}
                      onChange={(e) => handleStudentFormChange('currentRating', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetRating">Target Rating</Label>
                    <Input id="targetRating" type="number" placeholder="1800" value={studentForm.targetRating}
                      onChange={(e) => handleStudentFormChange('targetRating', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredStyle">Preferred Playing Style</Label>
                  <Input id="preferredStyle" placeholder="e.g., Aggressive, Positional, Tactical" value={studentForm.preferredStyle}
                    onChange={(e) => handleStudentFormChange('preferredStyle', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goals">Your Chess Goals</Label>
                  <textarea id="goals" rows={4} className="w-full px-3 py-2 rounded-lg bg-white/70 backdrop-blur-md border border-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800" placeholder="What do you want to achieve in your chess journey?" value={studentForm.goals}
                    onChange={(e) => handleStudentFormChange('goals', e.target.value)} />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" variant="gradient">
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </div>
              </form>

              <div className="mt-6 space-y-2">
                <Label htmlFor="student-country">Country</Label>
                <select
                  id="student-country"
                  className="w-full rounded-lg border border-purple-200 bg-white/80 px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={studentCountry}
                  onChange={(e) => setStudentCountry(e.target.value)}
                  disabled={studentCountrySaving}
                >
                  <option value="">— Select country —</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">Must be an ISO two-letter code; the dropdown ensures valid choices.</p>
                {studentCountryError && (
                  <div className="rounded-md border border-red-200 bg-red-50/80 px-3 py-2 text-xs text-red-700">{studentCountryError}</div>
                )}
                {studentCountrySuccess && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-700">{studentCountrySuccess}</div>
                )}
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => setStudentCountry(stats?.profile?.country || '')} disabled={studentCountrySaving}>Reset</Button>
                  <Button type="button" variant="gradient" onClick={handleSaveStudentCountry} disabled={studentCountrySaving}>
                    {studentCountrySaving ? 'Saving...' : 'Save Country'}
                  </Button>
                </div>
              </div>

              <div className="mt-8 border-t border-purple-100 pt-6 space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Reminder Preferences</h3>
                  <p className="text-sm text-gray-600">
                    Decide how and when you&apos;d like to be reminded about upcoming lessons and tournaments.
                  </p>
                </div>

                {notificationPreferencesError && (
                  <div className="rounded-md border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700">
                    {notificationPreferencesError}
                  </div>
                )}

                {notificationPreferencesSuccess && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
                    {notificationPreferencesSuccess}
                  </div>
                )}

                {notificationPreferencesLoading ? (
                  <div className="rounded-lg border border-purple-200 bg-white/60 px-4 py-5 text-sm text-gray-600">
                    Loading your reminder settings...
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 rounded-lg border border-purple-100 bg-white/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Lesson reminders</p>
                        <p className="text-sm text-gray-600">
                          Receive an email before every scheduled lesson.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                          checked={notificationPreferencesDraft.lessonRemindersEnabled}
                          onChange={(event) =>
                            updateNotificationPreferenceDraft('lessonRemindersEnabled', event.target.checked)
                          }
                          disabled={notificationPreferencesSaving}
                        />
                        <span>{notificationPreferencesDraft.lessonRemindersEnabled ? 'On' : 'Off'}</span>
                      </label>
                    </div>

                    <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-white/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Tournament reminders</p>
                        <p className="text-sm text-gray-600">
                          Get notified when a registered tournament is about to begin.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                          checked={notificationPreferencesDraft.tournamentRemindersEnabled}
                          onChange={(event) =>
                            updateNotificationPreferenceDraft('tournamentRemindersEnabled', event.target.checked)
                          }
                          disabled={notificationPreferencesSaving}
                        />
                        <span>{notificationPreferencesDraft.tournamentRemindersEnabled ? 'On' : 'Off'}</span>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reminderOffsetMinutes">Reminder timing</Label>
                      <select
                        id="reminderOffsetMinutes"
                        className="w-full rounded-lg border border-purple-200 bg-white/80 px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:cursor-not-allowed"
                        value={notificationPreferencesDraft.reminderOffsetMinutes}
                        onChange={(event) =>
                          updateNotificationPreferenceDraft(
                            'reminderOffsetMinutes',
                            Number(event.target.value),
                          )
                        }
                        disabled={notificationPreferencesSaving}
                      >
                        {[15, 30, 45, 60, 90, 120, 180, 240, 480, 720, 1440].map((option) => (
                          <option key={option} value={option}>
                            {option === 1440 ? '24 hours before' : `${option} minutes before`}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500">
                        We&apos;ll send reminders based on the selected lead time.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="gradient"
                    disabled={notificationPreferencesSaving || notificationPreferencesLoading}
                    onClick={handleSaveNotificationPreferences}
                  >
                    {notificationPreferencesSaving ? 'Saving...' : 'Save Reminder Settings'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={notificationPreferencesSaving}
                    onClick={() => setNotificationPreferencesDraft({ ...notificationPreferences })}
                  >
                    Reset Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
