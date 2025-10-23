'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_NOTIFICATION_PREFERENCE, withPreferenceDefaults } from '@/lib/reminders';
import { COUNTRIES } from '@/lib/countries';

export default function TrainerDashboard() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    bio: '',
    experience: '',
    rating: '',
    hourlyRate: '',
    specialties: '',
    country: '',
  });
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    duration: '60',
    scheduledAt: '',
    studentId: '',
  });
  const [createLessonLoading, setCreateLessonLoading] = useState(false);
  const [createLessonError, setCreateLessonError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarLessons, setCalendarLessons] = useState([]);
  const [availability, setAvailability] = useState({
    monday: { enabled: false, slots: [] },
    tuesday: { enabled: false, slots: [] },
    wednesday: { enabled: false, slots: [] },
    thursday: { enabled: false, slots: [] },
    friday: { enabled: false, slots: [] },
    saturday: { enabled: false, slots: [] },
    sunday: { enabled: false, slots: [] },
  });
  const [availabilitySaveSuccess, setAvailabilitySaveSuccess] = useState(false);
  const [availabilitySaveError, setAvailabilitySaveError] = useState('');
  const [editingNotes, setEditingNotes] = useState(null); // lesson ID being edited
  const [notesText, setNotesText] = useState('');
  const [notesSaveLoading, setNotesSaveLoading] = useState(false);
  const [earningsExportRange, setEarningsExportRange] = useState({ start: '', end: '' });
  const [studentExportRange, setStudentExportRange] = useState({ start: '', end: '' });
  const [exportLoading, setExportLoading] = useState({ earnings: false, students: false });
  const [exportError, setExportError] = useState({ earnings: '', students: '' });
  const [trainingRequests, setTrainingRequests] = useState([]);
  const [trainingRequestsLoading, setTrainingRequestsLoading] = useState(false);
  const [trainingRequestsError, setTrainingRequestsError] = useState('');
  const [trainingRequestAction, setTrainingRequestAction] = useState({ id: '', type: '' });
  const [requestInputs, setRequestInputs] = useState({});
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

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'TRAINER')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

      setEarningsExportRange((prev) => ({
        start: prev.start || firstDay,
        end: prev.end || lastDay,
      }));

      setStudentExportRange((prev) => ({
        start: prev.start || firstDay,
        end: prev.end || lastDay,
      }));
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsRes = await fetch('/api/trainer/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        // Initialize form data
        setFormData({
          title: statsData.profile?.title || '',
          bio: statsData.profile?.bio || '',
          experience: statsData.profile?.experience || '',
          rating: statsData.profile?.rating || '',
          hourlyRate: statsData.stats?.hourlyRate || '',
          specialties: Array.isArray(statsData.profile?.specialties)
            ? statsData.profile.specialties.join(', ')
            : (statsData.profile?.specialties || ''),
          country: statsData.profile?.country || '',
        });

        await fetchTrainingRequests(false);

        // Initialize availability from profile
        if (statsData.profile?.availability) {
          try {
            const parsedAvailability = JSON.parse(statsData.profile.availability);
            setAvailability(parsedAvailability);
          } catch (e) {
            console.error('Failed to parse availability:', e);
          }
        }
      }

      // Fetch upcoming lessons
      const lessonsRes = await fetch('/api/trainer/lessons?status=upcoming&limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (lessonsRes.ok) {
        const lessonsData = await lessonsRes.json();
        setLessons(lessonsData.lessons || []);
      }

      // Fetch students
      const studentsRes = await fetch('/api/trainer/students', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData.students || []);
      }

      // Fetch reviews
      const reviewsRes = await fetch('/api/trainer/reviews', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData.reviews || []);
      }

      // Fetch earnings
      const earningsRes = await fetch('/api/trainer/earnings?period=month', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (earningsRes.ok) {
        const earningsData = await earningsRes.json();
        setEarnings(earningsData);
      }

    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchDashboardData();
      loadNotificationPreferences();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  // Fetch calendar lessons for a specific month
  const fetchCalendarLessons = async (month) => {
    try {
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const response = await fetch(`/api/trainer/lessons?status=all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter lessons for current month
        const monthLessons = (data.lessons || []).filter(lesson => {
          const lessonDate = new Date(lesson.scheduledAt);
          return lessonDate >= startOfMonth && lessonDate <= endOfMonth;
        });
        setCalendarLessons(monthLessons);
      }
    } catch (err) {
      console.error('Failed to fetch calendar lessons:', err);
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getLessonsForDay = (day) => {
    return calendarLessons.filter(lesson => {
      const lessonDate = new Date(lesson.scheduledAt);
      return lessonDate.getDate() === day &&
             lessonDate.getMonth() === currentMonth.getMonth() &&
             lessonDate.getFullYear() === currentMonth.getFullYear();
    });
  };

  const nextMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(next);
  };

  const prevMonth = () => {
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(prev);
  };

  // Fetch calendar lessons when month changes or tab is calendar
  useEffect(() => {
    if (activeTab === 'calendar' && user && token) {
      fetchCalendarLessons(currentMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentMonth, user, token]);

  useEffect(() => {
    if (activeTab === 'requests' && user && token) {
      fetchTrainingRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user, token]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveSuccess(false);
    setSaveError('');

    try {
      const normalizedSpecialties = Array.isArray(formData.specialties)
        ? formData.specialties
        : formData.specialties
            .split(',')
            .map((spec) => spec.trim())
            .filter(Boolean);

      const payload = {
        ...formData,
        specialties: normalizedSpecialties,
      };

      const response = await fetch('/api/trainer/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSaveSuccess(true);
        // Refresh stats
        await fetchDashboardData();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const errorData = await response.json();
        setSaveError(errorData.error || 'Failed to save profile');
      }
    } catch (err) {
      setSaveError('An error occurred while saving');
      console.error(err);
    }
  };

  const toDateTimeLocal = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
  };

  const formatRequestStatus = (value) => value
    ? value
        .split('_')
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ')
    : '';

  const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;

  const pendingTrainerReviewCount = trainingRequests.filter((request) => request.status === 'PENDING_TRAINER_CONFIRMATION').length;
  const awaitingPaymentCount = trainingRequests.filter((request) => request.paymentStatus === 'PENDING').length;
  const scheduledRequestCount = trainingRequests.filter((request) => request.status === 'SCHEDULED').length;

  const fetchTrainingRequests = async (showSpinner = true) => {
    if (!token) return;
    if (showSpinner) {
      setTrainingRequestsLoading(true);
      setTrainingRequestsError('');
    }

    try {
      const response = await fetch('/api/trainer/training-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const requests = data.requests || [];
        setTrainingRequests(requests);
        setRequestInputs((prev) => {
          const next = { ...prev };
          const ids = new Set(requests.map((req) => req.id));
          Object.keys(next).forEach((key) => {
            if (!ids.has(key)) {
              delete next[key];
            }
          });
          requests.forEach((request) => {
            if (!next[request.id]) {
              next[request.id] = {
                scheduledAt: toDateTimeLocal(request.preferredSchedule),
                durationMinutes: request.duration || 60,
                meetingLink: '',
                title: request.focusAreas
                  ? `Training: ${request.focusAreas}`
                  : 'Personalized Chess Training Session',
              };
            }
          });
          return next;
        });
      } else if (showSpinner) {
        setTrainingRequestsError(data.error || 'Failed to load training requests');
      }
    } catch (err) {
      console.error('Fetch trainer requests error:', err);
      if (showSpinner) {
        setTrainingRequestsError('Failed to load training requests');
      }
    } finally {
      if (showSpinner) {
        setTrainingRequestsLoading(false);
      }
    }
  };

  const handleRequestInputChange = (requestId, field, value) => {
    setRequestInputs((prev) => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        [field]: value,
      },
    }));
  };

  const handleAcceptTrainingRequest = async (requestId) => {
    setTrainingRequestsError('');
    setTrainingRequestAction({ id: requestId, type: 'accept' });
    const inputs = requestInputs[requestId] || {};
    const request = trainingRequests.find((req) => req.id === requestId);

    if (!request) {
      setTrainingRequestsError('Unable to find this training request. Please refresh and try again.');
      setTrainingRequestAction({ id: '', type: '' });
      return;
    }

    const trimmedTitle = typeof inputs.title === 'string' ? inputs.title.trim() : '';
    const trimmedMeetingLink = typeof inputs.meetingLink === 'string' ? inputs.meetingLink.trim() : '';

    let isoScheduledAt;
    if (inputs.scheduledAt) {
      const parsedDate = new Date(inputs.scheduledAt);
      if (Number.isNaN(parsedDate.getTime())) {
        setTrainingRequestsError('Please provide a valid scheduled time.');
        setTrainingRequestAction({ id: '', type: '' });
        return;
      }
      isoScheduledAt = parsedDate.toISOString();
    } else if (!request?.preferredSchedule) {
      setTrainingRequestsError('Please select a scheduled time before scheduling this session.');
      setTrainingRequestAction({ id: '', type: '' });
      return;
    }

    let parsedDuration;
    if (inputs.durationMinutes !== undefined && inputs.durationMinutes !== null && inputs.durationMinutes !== '') {
      parsedDuration = Number(inputs.durationMinutes);
      if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
        setTrainingRequestsError('Duration must be a positive number.');
        setTrainingRequestAction({ id: '', type: '' });
        return;
      }
    }

    const payload = {
      ...(isoScheduledAt ? { scheduledAt: isoScheduledAt } : {}),
      ...(parsedDuration ? { durationMinutes: parsedDuration } : {}),
      ...(trimmedMeetingLink ? { meetingLink: trimmedMeetingLink } : {}),
      ...(trimmedTitle ? { title: trimmedTitle } : {}),
    };

    try {
      const response = await fetch(`/api/trainer/training-requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        await fetchTrainingRequests();
        await fetchDashboardData();
      } else {
        setTrainingRequestsError(data.error || 'Failed to accept training request');
      }
    } catch (err) {
      console.error('Accept training request error:', err);
      setTrainingRequestsError('Failed to accept training request');
    } finally {
      setTrainingRequestAction({ id: '', type: '' });
    }
  };

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
      console.error('Trainer reminder preferences load error:', err);
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
        setNotificationPreferencesSuccess('Reminder settings saved');
        setTimeout(() => setNotificationPreferencesSuccess(''), 3000);
      } else {
        setNotificationPreferencesError(data.error || 'Failed to update reminder preferences');
      }
    } catch (err) {
      console.error('Trainer reminder preferences update error:', err);
      setNotificationPreferencesError('Failed to update reminder preferences');
    } finally {
      setNotificationPreferencesSaving(false);
    }
  };

  const handleDeclineTrainingRequest = async (requestId) => {
    setTrainingRequestsError('');
    setTrainingRequestAction({ id: requestId, type: 'decline' });

    try {
      const response = await fetch(`/api/trainer/training-requests/${requestId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        await fetchTrainingRequests();
      } else {
        setTrainingRequestsError(data.error || 'Failed to decline training request');
      }
    } catch (err) {
      console.error('Decline training request error:', err);
      setTrainingRequestsError('Failed to decline training request');
    } finally {
      setTrainingRequestAction({ id: '', type: '' });
    }
  };

  const toggleDayAvailability = (day) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
      }
    }));
  };

  const addTimeSlot = (day) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, { start: '09:00', end: '17:00' }]
      }
    }));
  };

  const updateTimeSlot = (day, index, field, value) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        )
      }
    }));
  };

  const removeTimeSlot = (day, index) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSaveAvailability = async () => {
    setAvailabilitySaveSuccess(false);
    setAvailabilitySaveError('');

    try {
      const response = await fetch('/api/trainer/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          availability: JSON.stringify(availability)
        }),
      });

      if (response.ok) {
        setAvailabilitySaveSuccess(true);
        setTimeout(() => setAvailabilitySaveSuccess(false), 3000);
      } else {
        const errorData = await response.json();
        setAvailabilitySaveError(errorData.error || 'Failed to save availability');
      }
    } catch (err) {
      setAvailabilitySaveError('An error occurred while saving');
      console.error(err);
    }
  };

  const handleEditNotes = (lessonId, currentNotes) => {
    setEditingNotes(lessonId);
    setNotesText(currentNotes || '');
  };

  const handleSaveNotes = async (lessonId) => {
    setNotesSaveLoading(true);

    try {
      const response = await fetch(`/api/trainer/lessons/${lessonId}/notes`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: notesText }),
      });

      if (response.ok) {
        // Update local lessons state
        setLessons(prev => prev.map(lesson =>
          lesson.id === lessonId ? { ...lesson, notes: notesText } : lesson
        ));
        setEditingNotes(null);
        setNotesText('');
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setNotesSaveLoading(false);
    }
  };

  const handleCancelNotes = () => {
    setEditingNotes(null);
    setNotesText('');
  };

  const buildExportUrl = (base, range) => {
    const params = new URLSearchParams();
    if (range.start) params.append('startDate', range.start);
    if (range.end) params.append('endDate', range.end);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const handleExport = async (type) => {
    const range = type === 'earnings' ? earningsExportRange : studentExportRange;
    const baseUrl = type === 'earnings'
      ? '/api/trainer/earnings/export'
      : '/api/trainer/students/export';
    const url = buildExportUrl(baseUrl, range);

    setExportLoading((prev) => ({ ...prev, [type]: true }));
    setExportError((prev) => ({ ...prev, [type]: '' }));

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to export data');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const filename = response.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || `${type}-export.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export error:', err);
      setExportError((prev) => ({
        ...prev,
        [type]: err.message || 'Failed to export data',
      }));
    } finally {
      setExportLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleLessonFormChange = (e) => {
    const { name, value } = e.target;
    setLessonForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    setCreateLessonLoading(true);
    setCreateLessonError('');

    try {
      const response = await fetch('/api/trainer/lessons/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...lessonForm,
          duration: parseInt(lessonForm.duration),
          studentId: lessonForm.studentId || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Reset form and close modal
        setLessonForm({
          title: '',
          description: '',
          duration: '60',
          scheduledAt: '',
          studentId: '',
        });
        setShowCreateLesson(false);
        // Refresh lessons
        await fetchDashboardData();
        setActiveTab('lessons'); // Switch to lessons tab to see the new lesson
      } else {
        setCreateLessonError(data.error || 'Failed to create lesson');
      }
    } catch (err) {
      console.error('Create lesson error:', err);
      setCreateLessonError('Error creating lesson');
    } finally {
      setCreateLessonLoading(false);
    }
  };

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
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Trainer Dashboard</h1>
              <p className="text-purple-100">Welcome back, {user?.name}!</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="gradient"
                onClick={() => setShowCreateLesson(true)}
              >
                + Create Lesson
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/20 border-white/40 text-white hover:bg-white/30"
                onClick={() => router.push('/trainers')}
              >
                View My Profile
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/20 border-white/40 text-white hover:bg-white/30"
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {['overview', 'calendar', 'lessons', 'requests', 'students', 'reviews', 'earnings', 'settings'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab)}
              className="capitalize"
            >
              {tab === 'calendar'
                ? '📅 Calendar'
                : tab === 'lessons'
                ? '🎯 Lessons'
                : tab === 'requests'
                ? '🤝 Requests'
                : tab}
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
              <div className="grid md:grid-cols-4 gap-6">
                <Card className="border-2 border-purple-200/60 hover:shadow-2xl transition-shadow">
                  <CardHeader>
                    <CardDescription>Total Students</CardDescription>
                    <CardTitle className="text-4xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {stats.stats.totalStudents}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Active learners</p>
                  </CardContent>
                </Card>

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

                <Card className="border-2 border-green-200/60 hover:shadow-2xl transition-shadow">
                  <CardHeader>
                    <CardDescription>Total Earnings</CardDescription>
                    <CardTitle className="text-4xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      ${stats.stats.totalEarnings}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      ${stats.stats.hourlyRate}/hr rate
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-yellow-200/60 hover:shadow-2xl transition-shadow">
                  <CardHeader>
                    <CardDescription>Average Rating</CardDescription>
                    <CardTitle className="text-4xl bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                      {stats.stats.averageRating.toFixed(1)} ⭐
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Based on reviews</p>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {/* Upcoming Lessons */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Lessons</CardTitle>
                <CardDescription>Your scheduled lessons for the next few days</CardDescription>
              </CardHeader>
              <CardContent>
                {lessons.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-2">No upcoming lessons</p>
                    <p className="text-sm">Your schedule is clear!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/40"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Student: {lesson.student.name}
                            {lesson.student.studentProfile?.currentRating && (
                              <span className="ml-2 text-purple-600">
                                (Rating: {lesson.student.studentProfile.currentRating})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(lesson.scheduledAt).toLocaleString()} · {lesson.duration} min
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
                              Join
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-6">
            {trainingRequestsError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {trainingRequestsError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-2 border-amber-200/80">
                <CardHeader className="pb-2">
                  <CardDescription>Awaiting Payment</CardDescription>
                  <CardTitle className="text-3xl text-amber-600">{awaitingPaymentCount}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-gray-600">
                  Students who still need to complete payment.
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-200/80">
                <CardHeader className="pb-2">
                  <CardDescription>Needs Your Review</CardDescription>
                  <CardTitle className="text-3xl text-purple-600">{pendingTrainerReviewCount}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-gray-600">
                  Fully paid requests waiting for confirmation.
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200/80">
                <CardHeader className="pb-2">
                  <CardDescription>Scheduled via Requests</CardDescription>
                  <CardTitle className="text-3xl text-emerald-600">{scheduledRequestCount}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-gray-600">
                  Sessions that were created from student requests.
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Training Requests</CardTitle>
                  <CardDescription>Review details, confirm schedules, or decline when unavailable.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => fetchTrainingRequests()}>
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {trainingRequestsLoading ? (
                  <div className="flex items-center justify-center py-12 text-purple-500">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-500"></div>
                  </div>
                ) : trainingRequests.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50/50 p-8 text-center text-sm text-purple-700">
                    No incoming requests at the moment. Encourage students to reach out from their dashboard.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trainingRequests.map((request) => {
                      const inputs = requestInputs[request.id] || {};
                      return (
                        <div
                          key={request.id}
                          className="rounded-2xl border border-purple-200/60 bg-gradient-to-r from-white via-purple-50/30 to-blue-50/30 p-6 shadow-sm"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-3">
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                  {request.student?.name || 'Unknown Student'}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {request.student?.studentProfile?.currentRating
                                    ? `Current rating: ${request.student.studentProfile.currentRating}`
                                    : 'No rating on file'}
                                  {request.student?.studentProfile?.targetRating && (
                                    <span className="ml-2 text-purple-600">
                                      Target: {request.student.studentProfile.targetRating}
                                    </span>
                                  )}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2 text-xs">
                                <Badge variant="secondary" className="bg-purple-100/80 text-purple-700">
                                  {formatRequestStatus(request.status)}
                                </Badge>
                                <Badge variant="secondary" className="bg-emerald-100/80 text-emerald-700">
                                  {formatRequestStatus(request.paymentStatus)}
                                </Badge>
                                <Badge variant="outline" className="border-blue-300 bg-blue-50/70 text-blue-700">
                                  {formatCurrency(request.amount)}
                                </Badge>
                              </div>

                              <div className="space-y-1 text-sm text-gray-600">
                                {request.preferredSchedule && (
                                  <p>
                                    Preferred schedule:{' '}
                                    <span className="font-medium text-gray-800">
                                      {new Date(request.preferredSchedule).toLocaleString()}
                                    </span>
                                  </p>
                                )}
                                {request.duration && (
                                  <p>
                                    Requested duration: <span className="font-medium text-gray-800">{request.duration} minutes</span>
                                  </p>
                                )}
                                {request.focusAreas && (
                                  <p>
                                    Focus areas: <span className="font-medium text-gray-800">{request.focusAreas}</span>
                                  </p>
                                )}
                                {request.message && (
                                  <p className="text-xs italic text-gray-500">“{request.message}”</p>
                                )}
                              </div>

                              {request.lesson && (
                                <div className="rounded-lg border border-green-200 bg-green-50/60 px-4 py-2 text-xs text-green-700">
                                  Session scheduled on {new Date(request.lesson.scheduledAt).toLocaleString()}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 space-y-4 md:max-w-md">
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor={`title-${request.id}`}>Session title</Label>
                                  <Input
                                    id={`title-${request.id}`}
                                    value={inputs.title || ''}
                                    onChange={(e) => handleRequestInputChange(request.id, 'title', e.target.value)}
                                    placeholder="e.g., Dynamic Middlegame Mastery"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`duration-${request.id}`}>Duration (minutes)</Label>
                                  <Input
                                    id={`duration-${request.id}`}
                                    type="number"
                                    min={30}
                                    step={15}
                                    value={inputs.durationMinutes || ''}
                                    onChange={(e) => handleRequestInputChange(request.id, 'durationMinutes', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`schedule-${request.id}`}>Scheduled time</Label>
                                  <Input
                                    id={`schedule-${request.id}`}
                                    type="datetime-local"
                                    value={inputs.scheduledAt || ''}
                                    onChange={(e) => handleRequestInputChange(request.id, 'scheduledAt', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`meeting-${request.id}`}>Meeting link (optional)</Label>
                                  <Input
                                    id={`meeting-${request.id}`}
                                    placeholder="https://..."
                                    value={inputs.meetingLink || ''}
                                    onChange={(e) => handleRequestInputChange(request.id, 'meetingLink', e.target.value)}
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                                <Button
                                  variant="outline"
                                  disabled={trainingRequestAction.id === request.id && trainingRequestAction.type === 'decline'}
                                  onClick={() => handleDeclineTrainingRequest(request.id)}
                                >
                                  {trainingRequestAction.id === request.id && trainingRequestAction.type === 'decline'
                                    ? 'Declining...'
                                    : 'Decline'}
                                </Button>
                                <Button
                                  variant="gradient"
                                  disabled={request.paymentStatus !== 'PAID' || (trainingRequestAction.id === request.id && trainingRequestAction.type === 'accept')}
                                  onClick={() => handleAcceptTrainingRequest(request.id)}
                                >
                                  {request.paymentStatus !== 'PAID'
                                    ? 'Awaiting Payment'
                                    : trainingRequestAction.id === request.id && trainingRequestAction.type === 'accept'
                                    ? 'Scheduling...'
                                    : 'Schedule Session'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lesson Calendar</CardTitle>
                  <CardDescription>View all your lessons in a monthly calendar</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={prevMonth}>
                    ←
                  </Button>
                  <span className="text-lg font-semibold px-4">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500"></div>
                  <span>Scheduled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-500"></div>
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span>Cancelled</span>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center font-semibold text-gray-600 py-2 text-sm">
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {(() => {
                  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
                  const days = [];

                  // Empty cells before first day
                  for (let i = 0; i < startingDayOfWeek; i++) {
                    days.push(
                      <div key={`empty-${i}`} className="min-h-[100px] bg-gray-50 rounded-lg"></div>
                    );
                  }

                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dayLessons = getLessonsForDay(day);
                    const isToday = new Date().getDate() === day &&
                                   new Date().getMonth() === currentMonth.getMonth() &&
                                   new Date().getFullYear() === currentMonth.getFullYear();

                    days.push(
                      <div
                        key={day}
                        className={`min-h-[100px] p-2 rounded-lg border ${
                          isToday
                            ? 'bg-purple-50 border-purple-300 border-2'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-purple-600' : 'text-gray-700'}`}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayLessons.map((lesson) => {
                            const bgColor = 
                              lesson.status === 'COMPLETED' ? 'bg-green-500' :
                              lesson.status === 'CANCELLED' ? 'bg-red-500' :
                              lesson.status === 'PENDING' ? 'bg-yellow-500' :
                              'bg-blue-500';

                            return (
                              <div
                                key={lesson.id}
                                className={`${bgColor} text-white text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity`}
                                title={`${lesson.title} - ${new Date(lesson.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                              >
                                <div className="font-medium truncate">
                                  {new Date(lesson.scheduledAt).toLocaleTimeString('en-US', { 
                                    hour: 'numeric', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                                <div className="truncate opacity-90">
                                  {lesson.student ? lesson.student.name : 'Open Slot'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return days;
                })()}
              </div>

              {/* Calendar Summary */}
              <div className="mt-6 grid md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50/90 to-blue-100/80 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {calendarLessons.filter(l => l.status === 'SCHEDULED').length}
                  </div>
                  <div className="text-sm text-gray-600">Scheduled</div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-green-50/90 to-green-100/80 border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {calendarLessons.filter(l => l.status === 'COMPLETED').length}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-50/90 to-yellow-100/80 border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600">
                    {calendarLessons.filter(l => l.status === 'PENDING').length}
                  </div>
                  <div className="text-sm text-gray-600">Open Slots</div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50/90 to-purple-100/80 border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600">
                    {calendarLessons.length}
                  </div>
                  <div className="text-sm text-gray-600">Total This Month</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lessons Tab */}
        {activeTab === 'lessons' && (
          <Card>
            <CardHeader>
              <CardTitle>All Lessons</CardTitle>
              <CardDescription>Manage your lesson history</CardDescription>
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
                      className="p-4 rounded-lg bg-white/70 backdrop-blur-md border border-purple-200/40 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                            <Badge variant={
                              lesson.status === 'COMPLETED' ? 'success' :
                              lesson.status === 'CANCELLED' ? 'destructive' : 'default'
                            }>
                              {lesson.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {lesson.student?.name || 'Open Slot'} · {new Date(lesson.scheduledAt).toLocaleDateString()} at {new Date(lesson.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                          {lesson.description && (
                            <p className="text-xs text-gray-500 mt-1">{lesson.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Notes Section */}
                      {lesson.status === 'COMPLETED' && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          {editingNotes === lesson.id ? (
                            <div className="space-y-2">
                              <Label htmlFor={`notes-${lesson.id}`} className="text-sm font-medium text-gray-700">
                                Lesson Notes (Private)
                              </Label>
                              <textarea
                                id={`notes-${lesson.id}`}
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg bg-white/70 backdrop-blur-md border border-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 text-sm"
                                placeholder="Add notes about student progress, topics covered, areas for improvement..."
                                value={notesText}
                                onChange={(e) => setNotesText(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <Button
                                  variant="gradient"
                                  size="sm"
                                  onClick={() => handleSaveNotes(lesson.id)}
                                  disabled={notesSaveLoading}
                                >
                                  {notesSaveLoading ? 'Saving...' : 'Save Notes'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelNotes}
                                  disabled={notesSaveLoading}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium text-gray-700">Lesson Notes</Label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditNotes(lesson.id, lesson.notes)}
                                >
                                  {lesson.notes ? 'Edit Notes' : 'Add Notes'}
                                </Button>
                              </div>
                              {lesson.notes ? (
                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                                  {lesson.notes}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-400 italic">No notes added yet</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Students ({students.length})</CardTitle>
                <CardDescription>Students who have booked lessons with you</CardDescription>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No students yet</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="p-4 rounded-lg bg-gradient-to-br from-white/90 to-purple-50/80 backdrop-blur-md border border-purple-200/40 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{student.name}</h4>
                            <p className="text-sm text-gray-600">{student.email}</p>
                          </div>
                          {student.studentProfile?.currentRating && (
                            <Badge variant="outline" className="bg-purple-100/80 text-purple-700 border-purple-300">
                              {student.studentProfile.currentRating} ELO
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Lessons:</span>
                            <span className="font-semibold">{student.totalLessons}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Completed:</span>
                            <span className="font-semibold text-green-600">{student.completedLessons}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Upcoming:</span>
                            <span className="font-semibold text-blue-600">{student.upcomingLessons}</span>
                          </div>
                          {student.studentProfile?.preferredStyle && (
                            <div className="pt-2 border-t border-purple-200/40">
                              <span className="text-gray-600">Style: </span>
                              <span className="font-medium">{student.studentProfile.preferredStyle}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Student Progress Export */}
            <Card>
              <CardHeader>
                <CardTitle>Export Student Progress</CardTitle>
                <CardDescription>Download a CSV with lesson counts, ratings, and goals for each student.</CardDescription>
              </CardHeader>
              <CardContent>
                {exportError.students && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {exportError.students}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="students-start">Start Date</Label>
                    <Input
                      id="students-start"
                      type="date"
                      value={studentExportRange.start}
                      onChange={(e) =>
                        setStudentExportRange((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="students-end">End Date</Label>
                    <Input
                      id="students-end"
                      type="date"
                      value={studentExportRange.end}
                      onChange={(e) =>
                        setStudentExportRange((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    variant="gradient"
                    onClick={() => handleExport('students')}
                    disabled={exportLoading.students}
                  >
                    {exportLoading.students ? 'Generating...' : 'Download Student CSV'}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  CSV includes lesson totals, upcoming sessions, and current vs target ratings. Ideal for progress reviews.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {/* Reviews Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Reviews Overview</CardTitle>
                <CardDescription>What your students say about you</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-5 gap-4">
                  <div className="md:col-span-1 text-center p-4 rounded-lg bg-gradient-to-br from-yellow-50/90 to-orange-50/80 backdrop-blur-md border border-yellow-200/40">
                    <div className="text-4xl font-bold text-yellow-600">{reviews?.stats?.averageRating || '0.0'}</div>
                    <div className="text-sm text-gray-600 mt-1">Average Rating</div>
                    <div className="text-xs text-gray-500 mt-2">{reviews?.stats?.totalReviews || 0} reviews</div>
                  </div>
                  
                  <div className="md:col-span-4 space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviews?.stats?.ratingDistribution?.[star] || 0;
                      const total = reviews?.stats?.totalReviews || 0;
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-16">
                            <span className="text-sm font-medium">{star}</span>
                            <span className="text-yellow-500">★</span>
                          </div>
                          <div className="flex-1 h-3 rounded-full bg-gray-200/80 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Reviews ({reviews?.reviews?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {!reviews?.reviews || reviews.reviews.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No reviews yet</p>
                    <p className="text-sm mt-2">Reviews will appear here after students rate your lessons</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-4 rounded-lg bg-gradient-to-br from-white/90 to-blue-50/80 backdrop-blur-md border border-blue-200/40"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{review.student?.name || 'Anonymous'}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex text-yellow-500">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {review.lesson && (
                            <Badge variant="outline" className="bg-blue-100/80 text-blue-700 border-blue-300">
                              Lesson Review
                            </Badge>
                          )}
                        </div>
                        {review.comment && (
                          <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            {/* Earnings Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-green-50/90 to-emerald-50/80 backdrop-blur-md border-green-200/40">
                <CardHeader className="pb-3">
                  <CardDescription className="text-green-700">Total Earnings</CardDescription>
                  <CardTitle className="text-3xl text-green-600">
                    ${earnings?.summary?.totalEarnings?.toFixed(2) || '0.00'}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50/90 to-cyan-50/80 backdrop-blur-md border-blue-200/40">
                <CardHeader className="pb-3">
                  <CardDescription className="text-blue-700">Total Lessons</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">
                    {earnings?.summary?.totalLessons || 0}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50/90 to-pink-50/80 backdrop-blur-md border-purple-200/40">
                <CardHeader className="pb-3">
                  <CardDescription className="text-purple-700">Total Hours</CardDescription>
                  <CardTitle className="text-3xl text-purple-600">
                    {earnings?.summary?.totalHours?.toFixed(1) || '0.0'}h
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50/90 to-amber-50/80 backdrop-blur-md border-orange-200/40">
                <CardHeader className="pb-3">
                  <CardDescription className="text-orange-700">Avg Per Lesson</CardDescription>
                  <CardTitle className="text-3xl text-orange-600">
                    ${earnings?.summary?.avgEarningsPerLesson?.toFixed(2) || '0.00'}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Earnings Trend</CardTitle>
                <CardDescription>
                  Your earnings breakdown for {earnings?.period?.type === 'month' ? 'this month' : earnings?.period?.type === 'year' ? 'this year' : 'all time'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!earnings?.trend || earnings.trend.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No earnings data yet</p>
                    <p className="text-sm mt-2">Complete lessons to start earning</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {earnings.trend.map((item, index) => {
                      const maxEarnings = Math.max(...earnings.trend.map(t => t.earnings));
                      const percentage = maxEarnings > 0 ? (item.earnings / maxEarnings) * 100 : 0;
                      
                      return (
                        <div
                          key={index}
                          className="p-4 rounded-lg bg-gradient-to-r from-white/90 to-green-50/80 backdrop-blur-md border border-green-200/40 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-gray-900">{item.month}</div>
                            <div className="text-lg font-bold text-green-600">
                              ${item.earnings.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span>{item.lessons} lessons</span>
                            <span>•</span>
                            <span>{(item.minutes / 60).toFixed(1)} hours</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-200/80 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Earnings Export */}
            <Card>
              <CardHeader>
                <CardTitle>Export Earnings Report</CardTitle>
                <CardDescription>Download your earnings data as a CSV file with summary totals.</CardDescription>
              </CardHeader>
              <CardContent>
                {exportError.earnings && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {exportError.earnings}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="earnings-start">Start Date</Label>
                    <Input
                      id="earnings-start"
                      type="date"
                      value={earningsExportRange.start}
                      onChange={(e) =>
                        setEarningsExportRange((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="earnings-end">End Date</Label>
                    <Input
                      id="earnings-end"
                      type="date"
                      value={earningsExportRange.end}
                      onChange={(e) =>
                        setEarningsExportRange((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    variant="gradient"
                    onClick={() => handleExport('earnings')}
                    disabled={exportLoading.earnings}
                  >
                    {exportLoading.earnings ? 'Generating...' : 'Download Earnings CSV'}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  Tip: Use the monthly trend data above to choose the perfect date range for your report.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your trainer profile information</CardDescription>
              </CardHeader>
              <CardContent>
                {saveSuccess && (
                  <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                    ✓ Profile updated successfully!
                  </div>
                )}
                {saveError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    Error: {saveError}
                  </div>
                )}
                
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Professional Title</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g., International Master, FIDE Master"
                      value={formData.title}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg bg-white/70 backdrop-blur-md border border-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800"
                      placeholder="Tell students about yourself..."
                      value={formData.bio}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input
                        id="experience"
                        name="experience"
                        type="number"
                        placeholder="10"
                        value={formData.experience}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rating">Chess Rating (ELO)</Label>
                      <Input
                        id="rating"
                        name="rating"
                        type="number"
                        placeholder="2000"
                        value={formData.rating}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                    <Input
                      id="hourlyRate"
                      name="hourlyRate"
                      type="number"
                      step="0.01"
                      placeholder="50.00"
                      value={formData.hourlyRate}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <select
                      id="country"
                      name="country"
                      className="w-full rounded-lg border border-purple-200 bg-white/80 px-3 py-2 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                      value={formData.country}
                      onChange={handleFormChange}
                    >
                      <option value="">— Select country —</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">We’ll show your flag on your profile and tournament games. Must be an ISO two-letter code; the dropdown ensures valid choices.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialties">Specialties (comma-separated)</Label>
                    <Input
                      id="specialties"
                      name="specialties"
                      placeholder="e.g., Openings, Endgames, Tactics"
                      value={formData.specialties}
                      onChange={handleFormChange}
                    />
                    {formData.specialties && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.specialties.split(',').map((specialty, idx) => (
                          specialty.trim() && (
                            <Badge key={idx} variant="outline" className="bg-purple-100/80 text-purple-700 border-purple-300">
                              {specialty.trim()}
                            </Badge>
                          )
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" variant="gradient" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => {
                      setFormData({
                        title: stats?.profile?.title || '',
                        bio: stats?.profile?.bio || '',
                        experience: stats?.profile?.experience || '',
                        rating: stats?.profile?.rating || '',
                        hourlyRate: stats?.stats?.hourlyRate || '',
                        specialties: stats?.profile?.specialties?.join(', ') || '',
                        country: stats?.profile?.country || '',
                      });
                      setSaveSuccess(false);
                      setSaveError(null);
                    }}>
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Availability Scheduler */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Availability</CardTitle>
                <CardDescription>Set your available hours for each day of the week</CardDescription>
              </CardHeader>
              <CardContent>
                {availabilitySaveSuccess && (
                  <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                    ✓ Availability updated successfully!
                  </div>
                )}
                {availabilitySaveError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {availabilitySaveError}
                  </div>
                )}

                <div className="space-y-4">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <div key={day} className="p-4 rounded-lg bg-gradient-to-br from-white/90 to-purple-50/80 backdrop-blur-md border border-purple-200/40">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`${day}-enabled`}
                            checked={availability[day].enabled}
                            onChange={() => toggleDayAvailability(day)}
                            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <label htmlFor={`${day}-enabled`} className="font-semibold text-gray-900 capitalize cursor-pointer">
                            {day}
                          </label>
                        </div>
                        {availability[day].enabled && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addTimeSlot(day)}
                          >
                            + Add Time Slot
                          </Button>
                        )}
                      </div>

                      {availability[day].enabled && (
                        <div className="space-y-2 ml-8">
                          {availability[day].slots.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No time slots added. Click &ldquo;Add Time Slot&rdquo; to add one.</p>
                          ) : (
                            availability[day].slots.map((slot, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={slot.start}
                                  onChange={(e) => updateTimeSlot(day, index, 'start', e.target.value)}
                                  className="w-32"
                                />
                                <span className="text-gray-600">to</span>
                                <Input
                                  type="time"
                                  value={slot.end}
                                  onChange={(e) => updateTimeSlot(day, index, 'end', e.target.value)}
                                  className="w-32"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeTimeSlot(day, index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                  <Button
                    type="button"
                    variant="gradient"
                    onClick={handleSaveAvailability}
                  >
                    Save Availability
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reminder Preferences</CardTitle>
                <CardDescription>
                  Configure when you&apos;d like to receive automated reminders for upcoming lessons and events.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
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
                          Receive a nudge before each coaching session with your students.
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
                          Stay ahead of tournament start times you&apos;re hosting.
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
                      <Label htmlFor="trainer-reminder-offset">Reminder timing</Label>
                      <select
                        id="trainer-reminder-offset"
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
                        We&apos;ll deliver reminders based on the lead time you choose.
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
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create Lesson Modal */}
      {showCreateLesson && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Create New Lesson</h2>
                <button
                  onClick={() => {
                    setShowCreateLesson(false);
                    setCreateLessonError('');
                  }}
                  className="text-white/80 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateLesson} className="p-6 space-y-5">
              {createLessonError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {createLessonError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="lesson-title">Lesson Title *</Label>
                <Input
                  id="lesson-title"
                  name="title"
                  placeholder="e.g., Opening Theory - King's Indian Defense"
                  value={lessonForm.title}
                  onChange={handleLessonFormChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lesson-description">Description</Label>
                <textarea
                  id="lesson-description"
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/70 backdrop-blur-md border border-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800"
                  placeholder="What will students learn in this lesson?"
                  value={lessonForm.description}
                  onChange={handleLessonFormChange}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lesson-duration">Duration (minutes) *</Label>
                  <select
                    id="lesson-duration"
                    name="duration"
                    className="w-full px-3 py-2 rounded-lg bg-white/70 backdrop-blur-md border border-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800"
                    value={lessonForm.duration}
                    onChange={handleLessonFormChange}
                    required
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                    <option value="120">120 minutes</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lesson-scheduledAt">Date & Time *</Label>
                  <Input
                    id="lesson-scheduledAt"
                    name="scheduledAt"
                    type="datetime-local"
                    value={lessonForm.scheduledAt}
                    onChange={handleLessonFormChange}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lesson-studentId">Assign to Student (Optional)</Label>
                <select
                  id="lesson-studentId"
                  name="studentId"
                  className="w-full px-3 py-2 rounded-lg bg-white/70 backdrop-blur-md border border-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800"
                  value={lessonForm.studentId}
                  onChange={handleLessonFormChange}
                >
                  <option value="">Open Slot (No Student Assigned)</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Leave unassigned to create an open slot that students can book
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="submit"
                  variant="gradient"
                  disabled={createLessonLoading}
                  className="flex-1"
                >
                  {createLessonLoading ? 'Creating...' : 'Create Lesson'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateLesson(false);
                    setCreateLessonError('');
                  }}
                  disabled={createLessonLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
