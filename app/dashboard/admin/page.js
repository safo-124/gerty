'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/ui/Loading';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trainers', label: 'Trainers' },
  { id: 'students', label: 'Students' },
  { id: 'funds', label: 'Fund Me' },
  { id: 'tournaments', label: 'Tournaments' },
  { id: 'store', label: 'Store' },
];

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatCurrency = (amount, currency = 'USD') => {
  const safeAmount = typeof amount === 'number' ? amount : Number(amount || 0);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(safeAmount);
  } catch (error) {
    return `$${safeAmount.toFixed(2)}`;
  }
};

const statusVariantMap = {
  UPCOMING: 'success',
  ONGOING: 'secondary',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trainers, setTrainers] = useState([]);
  const [students, setStudents] = useState([]);
  const [donations, setDonations] = useState([]);
  const [donationTotals, setDonationTotals] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [approvingId, setApprovingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [createTournamentLoading, setCreateTournamentLoading] = useState(false);
  const [createTournamentError, setCreateTournamentError] = useState('');
  const [stats, setStats] = useState({ trainerCount: 0, studentsPresentToday: 0 });
  const redirectRef = useRef(false);

  // Store state
  const [storeProducts, setStoreProducts] = useState([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [createProductLoading, setCreateProductLoading] = useState(false);
  const [createProductError, setCreateProductError] = useState('');
  const [createProductForm, setCreateProductForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    images: [], // { url, width?, height? }
    localFiles: [], // File objects before upload
  });

  const [createTournamentForm, setCreateTournamentForm] = useState({
    name: '',
    description: '',
    organizerId: '',
    startDate: '',
    endDate: '',
    registrationEnd: '',
    maxParticipants: '',
    entryFee: '',
    prizePool: '',
    format: 'Swiss',
    timeControl: 'Rapid',
    image: '',
    rules: '',
  });

  useEffect(() => {
    if (authLoading || redirectRef.current) return;

    if (!user) {
      redirectRef.current = true;
      router.push('/login');
      return;
    }

    if (user.role !== 'ADMIN') {
      redirectRef.current = true;
      router.push(user.role === 'TRAINER' ? '/dashboard/trainer' : '/dashboard/student');
    }
  }, [authLoading, user, router]);

  const fetchAllData = useCallback(
    async ({ silent = false } = {}) => {
      if (!token) return;

      if (!silent) {
        setLoading(true);
      }
      setError('');

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [trainersRes, studentsRes, fundsRes, tournamentsRes, statsRes] = await Promise.all([
          fetch('/api/admin/trainers', { headers }),
          fetch('/api/admin/students', { headers }),
          fetch('/api/admin/funds', { headers }),
          fetch('/api/admin/tournaments', { headers }),
          fetch('/api/admin/stats', { headers }),
        ]);

        const parseOrThrow = async (response, fallbackMessage) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.error || fallbackMessage);
          }
          return data;
        };

        const trainersData = await parseOrThrow(trainersRes, 'Failed to load trainers');
        const studentsData = await parseOrThrow(studentsRes, 'Failed to load students');
        const fundsData = await parseOrThrow(fundsRes, 'Failed to load donation data');
  const tournamentsData = await parseOrThrow(tournamentsRes, 'Failed to load tournaments');
  const statsData = await parseOrThrow(statsRes, 'Failed to load stats');

        setTrainers(trainersData.trainers || []);
        setStudents(studentsData.students || []);
        setDonations(fundsData.donations || []);
        setDonationTotals(fundsData.totals || []);
        setTournaments(tournamentsData.tournaments || []);
        setStats({
          trainerCount: Number(statsData.trainerCount || 0),
          studentsPresentToday: Number(statsData.studentsPresentToday || 0),
        });
      } catch (err) {
        console.error('Admin dashboard data load error:', err);
        setError(err.message || 'Failed to load admin data');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [token],
  );

  useEffect(() => {
    if (!authLoading && user?.role === 'ADMIN' && token) {
      fetchAllData();
    }
  }, [authLoading, user, token, fetchAllData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData({ silent: true });
    setRefreshing(false);
  };

  const fetchStoreProducts = useCallback(async () => {
    setStoreLoading(true);
    try {
      const res = await fetch('/api/store/products');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load products');
      setStoreProducts(data.products || []);
    } catch (e) {
      setError(e.message || 'Failed to load products');
    } finally {
      setStoreLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'store') {
      fetchStoreProducts();
    }
  }, [activeTab, fetchStoreProducts]);

  const handleProductFieldChange = (field, value) => {
    setCreateProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductFilesChange = (files) => {
    const arr = Array.from(files || []);
    setCreateProductForm((prev) => ({ ...prev, localFiles: arr }));
  };

  const handleUploadFiles = async () => {
    if (!token || createProductForm.localFiles.length === 0) return [];
    const uploaded = [];
    for (const f of createProductForm.localFiles) {
      const form = new FormData();
      form.append('file', f);
      form.append('filename', f.name);
      const res = await fetch('/api/admin/store/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      uploaded.push({ url: data.url });
    }
    return uploaded;
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!token) return;
    setCreateProductError('');
    setCreateProductLoading(true);
    try {
      const images = await handleUploadFiles();
      const payload = {
        name: createProductForm.name.trim(),
        description: createProductForm.description.trim() || undefined,
        price: Number(createProductForm.price),
        stock: Number(createProductForm.stock || 0),
        images,
      };
      if (!payload.name || !payload.price) throw new Error('Name and price are required');

      const res = await fetch('/api/admin/store/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create product');

      setCreateProductForm({ name: '', description: '', price: '', stock: '', images: [], localFiles: [] });
      await fetchStoreProducts();
    } catch (err) {
      console.error('Create product error:', err);
      setCreateProductError(err.message || 'Failed to create product');
    } finally {
      setCreateProductLoading(false);
    }
  };

  const handleApproveTrainer = async (trainerId) => {
    if (!token) return;

    setApprovingId(trainerId);
    setError('');
    try {
      const response = await fetch(`/api/admin/trainers/${trainerId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve trainer');
      }

      setTrainers((prev) =>
        prev.map((trainer) =>
          trainer.id === trainerId ? { ...trainer, approved: true } : trainer,
        ),
      );
    } catch (err) {
      console.error('Approve trainer error:', err);
      setError(err.message || 'Failed to approve trainer');
    } finally {
      setApprovingId(null);
    }
  };

  const handleTournamentFieldChange = (field, value) => {
    setCreateTournamentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateTournament = async (event) => {
    event.preventDefault();
    if (!token) return;

    setCreateTournamentError('');
    setCreateTournamentLoading(true);

    try {
      const payload = {
        name: createTournamentForm.name.trim(),
        description: createTournamentForm.description.trim(),
        organizerId: createTournamentForm.organizerId,
        startDate: createTournamentForm.startDate
          ? new Date(createTournamentForm.startDate).toISOString()
          : null,
        endDate: createTournamentForm.endDate
          ? new Date(createTournamentForm.endDate).toISOString()
          : null,
        registrationEnd: createTournamentForm.registrationEnd
          ? new Date(createTournamentForm.registrationEnd).toISOString()
          : null,
        maxParticipants: createTournamentForm.maxParticipants
          ? Number(createTournamentForm.maxParticipants)
          : undefined,
        entryFee: createTournamentForm.entryFee
          ? Number(createTournamentForm.entryFee)
          : undefined,
        prizePool: createTournamentForm.prizePool
          ? Number(createTournamentForm.prizePool)
          : undefined,
        format: createTournamentForm.format.trim() || 'Swiss',
        timeControl: createTournamentForm.timeControl.trim() || 'Rapid',
        image: createTournamentForm.image.trim() || undefined,
        rules: createTournamentForm.rules.trim() || undefined,
      };

      if (!payload.organizerId) {
        throw new Error('Please select an organizer');
      }

      if (!payload.startDate || !payload.endDate || !payload.registrationEnd) {
        throw new Error('Please provide start, end, and registration end dates');
      }

      const response = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.details?.formErrors?.[0] || data.error || 'Failed to create tournament',
        );
      }

      setCreateTournamentForm({
        name: '',
        description: '',
        organizerId: createTournamentForm.organizerId,
        startDate: '',
        endDate: '',
        registrationEnd: '',
        maxParticipants: '',
        entryFee: '',
        prizePool: '',
        format: createTournamentForm.format,
        timeControl: createTournamentForm.timeControl,
        image: '',
        rules: '',
      });

      await fetchAllData({ silent: true });
    } catch (err) {
      console.error('Create tournament error:', err);
      setCreateTournamentError(err.message || 'Failed to create tournament');
    } finally {
      setCreateTournamentLoading(false);
    }
  };

  const filteredTrainers = useMemo(() => {
    if (trainerFilter === 'pending') {
      return trainers.filter((trainer) => !trainer.approved);
    }
    if (trainerFilter === 'approved') {
      return trainers.filter((trainer) => trainer.approved);
    }
    return trainers;
  }, [trainerFilter, trainers]);

  const pendingTrainerCount = useMemo(
    () => trainers.filter((trainer) => !trainer.approved).length,
    [trainers],
  );

  const approvedTrainerCount = trainers.length - pendingTrainerCount;

  const upcomingTournaments = useMemo(
    () => tournaments.filter((tournament) => tournament.status === 'UPCOMING').length,
    [tournaments],
  );

  const usdTotal = useMemo(
    () => donationTotals.find((entry) => entry.currency === 'USD')?.amount ?? 0,
    [donationTotals],
  );

  const donationCount = donations.length;

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Console</h1>
          <p className="text-sm text-gray-600">
            Review platform health, approve trainers, monitor student outcomes, and steward the Fund Me initiative.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh data'}
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'gradient' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {error && (
        <Card className="mb-6 border-red-300/60 bg-red-50/80 text-red-700">
          <CardHeader>
            <CardTitle>We ran into a problem</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Trainers</CardTitle>
                    <CardDescription>Across all specialties</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold text-gray-900">{stats.trainerCount}</div>
                    <p className="mt-2 text-sm text-gray-500">
                      {pendingTrainerCount} waiting approval • {approvedTrainerCount} live
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Students Present Today</CardTitle>
                    <CardDescription>Distinct students with lessons today</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold text-gray-900">{stats.studentsPresentToday}</div>
                    <p className="mt-2 text-sm text-gray-500">Based on scheduled/completed lessons</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Fund Me Impact</CardTitle>
                    <CardDescription>Total gifts received</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold text-gray-900">
                      {formatCurrency(usdTotal, 'USD')}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{donationCount} donations received</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tournaments</CardTitle>
                    <CardDescription>Upcoming, ongoing, and completed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold text-gray-900">{tournaments.length}</div>
                    <p className="mt-2 text-sm text-gray-500">{upcomingTournaments} upcoming</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Trainer Approvals</CardTitle>
                    <CardDescription>Quickly vet new coaching talent</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pendingTrainerCount === 0 && (
                      <p className="text-sm text-gray-500">No trainers awaiting approval right now.</p>
                    )}
                    {trainers
                      .filter((trainer) => !trainer.approved)
                      .slice(0, 3)
                      .map((trainer) => (
                        <div key={trainer.id} className="flex items-center justify-between rounded-xl border border-purple-100/70 bg-white/80 p-4">
                          <div>
                            <p className="font-medium text-gray-900">{trainer.user?.name || 'Unknown trainer'}</p>
                            <p className="text-sm text-gray-500">Joined {formatDate(trainer.user?.createdAt)}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleApproveTrainer(trainer.id)}
                            disabled={approvingId === trainer.id}
                          >
                            {approvingId === trainer.id ? 'Approving...' : 'Approve'}
                          </Button>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Latest Fund Me Gifts</CardTitle>
                    <CardDescription>Celebrate generosity in the community</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {donations.length === 0 && (
                      <p className="text-sm text-gray-500">No donations received yet.</p>
                    )}
                    {donations.slice(0, 4).map((donation) => (
                      <div key={donation.id} className="rounded-xl border border-amber-100/70 bg-amber-50/70 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{donation.name}</p>
                            <p className="text-xs text-gray-500">{formatDateTime(donation.createdAt)}</p>
                          </div>
                          <Badge variant="warning">{formatCurrency(donation.amount, donation.currency)}</Badge>
                        </div>
                        {donation.message && (
                          <p className="mt-2 max-h-12 overflow-hidden text-ellipsis text-sm text-gray-600">“{donation.message}”</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'trainers' && (
            <Card>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Trainer Directory</CardTitle>
                  <CardDescription>Manage onboarding, approvals, and visibility</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'approved', label: 'Approved' },
                  ].map((filter) => (
                    <Button
                      key={filter.id}
                      variant={trainerFilter === filter.id ? 'gradient' : 'outline'}
                      size="sm"
                      onClick={() => setTrainerFilter(filter.id)}
                    >
                      {filter.label}
                      {filter.id === 'pending' && pendingTrainerCount > 0 && (
                        <span className="ml-1 rounded-full bg-white/30 px-2 py-0.5 text-xs">{pendingTrainerCount}</span>
                      )}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Trainer</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Specialties</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrainers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                          No trainers found for this filter.
                        </td>
                      </tr>
                    )}
                    {filteredTrainers.map((trainer) => (
                      <tr key={trainer.id} className="border-b border-gray-100">
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">{trainer.user?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{trainer.user?.email}</div>
                        </td>
                        <td className="px-4 py-4 text-gray-700">{trainer.title || '—'}</td>
                        <td className="px-4 py-4 text-gray-700">
                          {Array.isArray(trainer.specialties) && trainer.specialties.length > 0
                            ? trainer.specialties.join(', ')
                            : '—'}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={trainer.approved ? 'success' : 'warning'}>
                            {trainer.approved ? 'Approved' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-gray-700">{formatDate(trainer.user?.createdAt)}</td>
                        <td className="px-4 py-4">
                          {!trainer.approved ? (
                            <Button
                              size="sm"
                              onClick={() => handleApproveTrainer(trainer.id)}
                              disabled={approvingId === trainer.id}
                            >
                              {approvingId === trainer.id ? 'Approving...' : 'Approve'}
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">No actions</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {activeTab === 'students' && (
            <Card>
              <CardHeader>
                <CardTitle>Student Community</CardTitle>
                <CardDescription>Track learner growth and ambitions</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Current Rating</th>
                      <th className="px-4 py-3">Target Rating</th>
                      <th className="px-4 py-3">Preferred Style</th>
                      <th className="px-4 py-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          No students enrolled yet.
                        </td>
                      </tr>
                    )}
                    {students.map((student) => (
                      <tr key={student.id} className="border-b border-gray-100">
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-xs text-gray-500">{student.email}</div>
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {student.studentProfile?.currentRating ?? '—'}
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {student.studentProfile?.targetRating ?? '—'}
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {student.studentProfile?.preferredStyle || '—'}
                        </td>
                        <td className="px-4 py-4 text-gray-700">{formatDate(student.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {activeTab === 'funds' && (
            <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Fund Me Summary</CardTitle>
                  <CardDescription>Totals tracked by currency</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {donationTotals.length === 0 && (
                    <p className="text-sm text-gray-500">No donations recorded yet.</p>
                  )}
                  {donationTotals.map((entry) => (
                    <div key={entry.currency} className="flex items-center justify-between rounded-xl border border-purple-100/70 bg-white/80 p-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{entry.currency}</p>
                        <p className="text-xs text-gray-400">Across all time</p>
                      </div>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatCurrency(entry.amount, entry.currency)}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Donation Ledger</CardTitle>
                  <CardDescription>Full audit trail of generosity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 overflow-y-auto">
                  {donations.length === 0 && (
                    <p className="text-sm text-gray-500">No donations have been logged yet.</p>
                  )}
                  {donations.map((donation) => (
                    <div key={donation.id} className="rounded-xl border border-amber-100/70 bg-amber-50/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{donation.name}</p>
                          <p className="text-xs text-gray-500">{donation.email || 'Anonymous donor'}</p>
                        </div>
                        <Badge variant="warning">{formatCurrency(donation.amount, donation.currency)}</Badge>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-wide text-amber-600">
                        {formatDateTime(donation.createdAt)}
                      </p>
                      {donation.message && (
                        <p className="mt-2 text-sm text-gray-700">{donation.message}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'tournaments' && (
            <div className="grid gap-6 lg:grid-cols-[5fr,4fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Pipeline</CardTitle>
                  <CardDescription>All tournaments created by the academy</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tournaments.length === 0 && (
                    <p className="text-sm text-gray-500">No tournaments added yet. Create one using the form.</p>
                  )}
                  {tournaments.map((tournament) => (
                    <div key={tournament.id} className="rounded-2xl border border-blue-100/70 bg-white/80 p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{tournament.name}</h3>
                          <p className="text-sm text-gray-600">
                            Organized by {tournament.organizer?.user?.name || 'Unknown'}
                          </p>
                        </div>
                        <Badge variant={statusVariantMap[tournament.status] || 'secondary'}>
                          {tournament.status}
                        </Badge>
                      </div>
                      <p className="mt-2 max-h-20 overflow-hidden text-ellipsis text-sm text-gray-600">{tournament.description}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Start</p>
                          <p className="text-sm text-gray-700">{formatDateTime(tournament.startDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Registration closes</p>
                          <p className="text-sm text-gray-700">{formatDateTime(tournament.registrationEnd)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Participants</p>
                          <p className="text-sm text-gray-700">{tournament.participantsCount ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Entry fee</p>
                          <p className="text-sm text-gray-700">
                            {tournament.entryFee ? formatCurrency(tournament.entryFee, 'USD') : 'Free'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Launch a New Tournament</CardTitle>
                  <CardDescription>Share opportunities with our students worldwide</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleCreateTournament}>
                    <div className="space-y-2">
                      <Label htmlFor="tournament-name">Tournament name</Label>
                      <Input
                        id="tournament-name"
                        value={createTournamentForm.name}
                        onChange={(event) => handleTournamentFieldChange('name', event.target.value)}
                        placeholder="Global Youth Open"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tournament-description">Description</Label>
                      <textarea
                        id="tournament-description"
                        className="h-24 w-full rounded-xl border border-purple-200/60 bg-white/70 p-3 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        value={createTournamentForm.description}
                        onChange={(event) => handleTournamentFieldChange('description', event.target.value)}
                        placeholder="Highlight the format, the beneficiaries, and what students can expect."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tournament-organizer">Organizer</Label>
                      <select
                        id="tournament-organizer"
                        className="h-10 w-full rounded-xl border border-purple-200/60 bg-white/70 px-3 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        value={createTournamentForm.organizerId}
                        onChange={(event) => handleTournamentFieldChange('organizerId', event.target.value)}
                        required
                      >
                        <option value="">Select an approved trainer</option>
                        {trainers
                          .filter((trainer) => trainer.approved)
                          .map((trainer) => (
                            <option key={trainer.id} value={trainer.id}>
                              {trainer.user?.name || 'Unknown'}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="tournament-start">Start</Label>
                        <Input
                          id="tournament-start"
                          type="datetime-local"
                          value={createTournamentForm.startDate}
                          onChange={(event) => handleTournamentFieldChange('startDate', event.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tournament-end">End</Label>
                        <Input
                          id="tournament-end"
                          type="datetime-local"
                          value={createTournamentForm.endDate}
                          onChange={(event) => handleTournamentFieldChange('endDate', event.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tournament-registration">Registration closes</Label>
                        <Input
                          id="tournament-registration"
                          type="datetime-local"
                          value={createTournamentForm.registrationEnd}
                          onChange={(event) => handleTournamentFieldChange('registrationEnd', event.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="tournament-max">Max participants</Label>
                        <Input
                          id="tournament-max"
                          type="number"
                          min="2"
                          value={createTournamentForm.maxParticipants}
                          onChange={(event) => handleTournamentFieldChange('maxParticipants', event.target.value)}
                          placeholder="32"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tournament-entry">Entry fee (USD)</Label>
                        <Input
                          id="tournament-entry"
                          type="number"
                          step="0.01"
                          min="0"
                          value={createTournamentForm.entryFee}
                          onChange={(event) => handleTournamentFieldChange('entryFee', event.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tournament-prize">Prize pool (USD)</Label>
                        <Input
                          id="tournament-prize"
                          type="number"
                          step="0.01"
                          min="0"
                          value={createTournamentForm.prizePool}
                          onChange={(event) => handleTournamentFieldChange('prizePool', event.target.value)}
                          placeholder="500"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="tournament-format">Format</Label>
                        <Input
                          id="tournament-format"
                          value={createTournamentForm.format}
                          onChange={(event) => handleTournamentFieldChange('format', event.target.value)}
                          placeholder="Swiss"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tournament-time-control">Time control</Label>
                        <Input
                          id="tournament-time-control"
                          value={createTournamentForm.timeControl}
                          onChange={(event) => handleTournamentFieldChange('timeControl', event.target.value)}
                          placeholder="Rapid"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tournament-image">Cover image URL</Label>
                      <Input
                        id="tournament-image"
                        value={createTournamentForm.image}
                        onChange={(event) => handleTournamentFieldChange('image', event.target.value)}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tournament-rules">Tournament rules</Label>
                      <textarea
                        id="tournament-rules"
                        className="h-24 w-full rounded-xl border border-purple-200/60 bg-white/70 p-3 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        value={createTournamentForm.rules}
                        onChange={(event) => handleTournamentFieldChange('rules', event.target.value)}
                        placeholder="Share pairing rules, tie-breakers, and any requirements."
                      />
                    </div>

                    {createTournamentError && (
                      <p className="text-sm text-red-600">{createTournamentError}</p>
                    )}

                    <Button type="submit" className="w-full" disabled={createTournamentLoading}>
                      {createTournamentLoading ? 'Creating tournament...' : 'Create tournament'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'store' && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Product</CardTitle>
                    <CardDescription>Upload images to Blob and create a new item</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {createProductError && (
                      <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{createProductError}</div>
                    )}
                    <form onSubmit={handleCreateProduct} className="space-y-3">
                      <div>
                        <Label htmlFor="pname">Name</Label>
                        <Input id="pname" value={createProductForm.name} onChange={(e) => handleProductFieldChange('name', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="pdesc">Description</Label>
                        <Input id="pdesc" value={createProductForm.description} onChange={(e) => handleProductFieldChange('description', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="pprice">Price (USD)</Label>
                          <Input id="pprice" type="number" min="0" step="0.01" value={createProductForm.price} onChange={(e) => handleProductFieldChange('price', e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="pstock">Stock</Label>
                          <Input id="pstock" type="number" min="0" step="1" value={createProductForm.stock} onChange={(e) => handleProductFieldChange('stock', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="pfiles">Images</Label>
                        <Input id="pfiles" type="file" accept="image/*" multiple onChange={(e) => handleProductFilesChange(e.target.files)} />
                      </div>
                      <Button type="submit" disabled={createProductLoading}>{createProductLoading ? 'Creating...' : 'Create Product'}</Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Products</CardTitle>
                    <CardDescription>Current items in the store</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {storeLoading && <p className="text-sm text-gray-500">Loading...</p>}
                    {!storeLoading && storeProducts.length === 0 && <p className="text-sm text-gray-500">No products yet.</p>}
                    {storeProducts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          {p.images?.[0]?.url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.images[0].url} alt={p.name} className="h-12 w-12 rounded object-cover" />
                          )}
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-gray-500">${'{'}p.price.toFixed(2){'}'} • Stock: {p.stock}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
