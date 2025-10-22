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
  const [causes, setCauses] = useState([]);
  const [causesLoading, setCausesLoading] = useState(false);
  const [createCauseLoading, setCreateCauseLoading] = useState(false);
  const [createCauseError, setCreateCauseError] = useState('');
  const [createCauseForm, setCreateCauseForm] = useState({ title: '', description: '', goalAmount: '', image: '' });
  const [editingCauseId, setEditingCauseId] = useState(null);
  const [editCauseForm, setEditCauseForm] = useState({ title: '', description: '', goalAmount: '', image: '' });
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
  const [editingProductId, setEditingProductId] = useState(null);
  const [editProductForm, setEditProductForm] = useState({ name: '', description: '', price: '', stock: '' });
  const [editLocalFiles, setEditLocalFiles] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

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

  const fetchCauses = useCallback(async () => {
    if (!token) return;
    setCausesLoading(true);
    try {
      const res = await fetch('/api/admin/fund-me/causes', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load causes');
      setCauses(data.causes || []);
    } catch (e) {
      console.error('Load causes error:', e);
      setError(e.message || 'Failed to load causes');
    } finally {
      setCausesLoading(false);
    }
  }, [token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData({ silent: true });
    if (activeTab === 'funds') await fetchCauses();
    setRefreshing(false);
  };

  const fetchStoreProducts = useCallback(async () => {
    setStoreLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/admin/store/products', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load products');
      setStoreProducts(data.products || []);
    } catch (e) {
      setError(e.message || 'Failed to load products');
    } finally {
      setStoreLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'store') {
      fetchStoreProducts();
    }
    if (activeTab === 'funds' && token) {
      fetchCauses();
    }
  }, [activeTab, fetchStoreProducts, fetchCauses, token]);

  const handleProductFieldChange = (field, value) => {
    setCreateProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductFilesChange = (files) => {
    const arr = Array.from(files || []);
    setCreateProductForm((prev) => ({ ...prev, localFiles: arr }));
  };

  const uploadFiles = async (files) => {
    if (!token || !files || files.length === 0) return [];
    const uploaded = [];
    for (const f of files) {
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
  const handleUploadFiles = async () => uploadFiles(createProductForm.localFiles);

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

  const toggleProductActive = async (product) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/store/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !product.active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      await fetchStoreProducts();
    } catch (e) {
      setError(e.message || 'Failed to update status');
    }
  };

  const startEditProduct = (p) => {
    setEditingProductId(p.id);
    setEditProductForm({
      name: p.name || '',
      description: p.description || '',
      price: String(p.price ?? ''),
      stock: String(p.stock ?? ''),
    });
    setEditLocalFiles([]);
  };

  const cancelEditProduct = () => {
    setEditingProductId(null);
    setEditProductForm({ name: '', description: '', price: '', stock: '' });
    setEditLocalFiles([]);
  };

  const saveEditProduct = async () => {
    if (!token || !editingProductId) return;
    try {
      let images;
      if (editLocalFiles.length > 0) {
        images = await uploadFiles(editLocalFiles);
      }
      const payload = {
        name: editProductForm.name.trim() || undefined,
        description: editProductForm.description.trim() || undefined,
        price: editProductForm.price !== '' ? Number(editProductForm.price) : undefined,
        stock: editProductForm.stock !== '' ? Number(editProductForm.stock) : undefined,
        ...(images ? { images } : {}),
      };
      const res = await fetch(`/api/admin/store/products/${editingProductId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update product');
      cancelEditProduct();
      await fetchStoreProducts();
    } catch (e) {
      setError(e.message || 'Failed to update product');
    }
  };

  const handleDeleteProduct = async (product, mode = 'soft') => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/store/products/${product.id}?mode=${mode}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete product');
      await fetchStoreProducts();
    } catch (e) {
      setError(e.message || 'Failed to delete product');
    }
  };

  const toggleSelectProduct = (id, checked) => {
    setSelectedProductIds((prev) => {
      const set = new Set(prev);
      if (checked) set.add(id);
      else set.delete(id);
      return Array.from(set);
    });
  };

  const clearSelected = () => setSelectedProductIds([]);

  const bulkEnableDisable = async (enable = true) => {
    if (!token || selectedProductIds.length === 0) return;
    try {
      const res = await fetch('/api/admin/store/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: selectedProductIds, action: enable ? 'enable' : 'disable' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Bulk action failed');
      clearSelected();
      await fetchStoreProducts();
    } catch (e) {
      setError(e.message || 'Bulk action failed');
    }
  };

  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const bulkSetPriceStock = async () => {
    if (!token || selectedProductIds.length === 0) return;
    try {
      const payload = { ids: selectedProductIds, action: 'set' };
      if (bulkPrice !== '') payload.price = Number(bulkPrice);
      if (bulkStock !== '') payload.stock = Number(bulkStock);
      if (payload.price === undefined && payload.stock === undefined) return;
      const res = await fetch('/api/admin/store/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Bulk update failed');
      setBulkPrice('');
      setBulkStock('');
      clearSelected();
      await fetchStoreProducts();
    } catch (e) {
      setError(e.message || 'Bulk update failed');
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

  const handleCreateCauseField = (field, value) => {
    setCreateCauseForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateCause = async (e) => {
    e.preventDefault();
    if (!token) return;
    setCreateCauseError('');
    setCreateCauseLoading(true);
    try {
      const payload = {
        title: createCauseForm.title.trim(),
        description: createCauseForm.description.trim() || undefined,
        goalAmount: createCauseForm.goalAmount !== '' ? Number(createCauseForm.goalAmount) : undefined,
        image: createCauseForm.image.trim() || undefined,
      };
      if (!payload.title) throw new Error('Title is required');
      const res = await fetch('/api/admin/fund-me/causes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create cause');
      setCreateCauseForm({ title: '', description: '', goalAmount: '', image: '' });
      await fetchCauses();
    } catch (e) {
      setCreateCauseError(e.message || 'Failed to create cause');
    } finally {
      setCreateCauseLoading(false);
    }
  };

  const handleCreateCauseImageFile = async (event) => {
    try {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      const uploaded = await uploadFiles(files);
      if (uploaded[0]?.url) {
        setCreateCauseForm((prev) => ({ ...prev, image: uploaded[0].url }));
      }
    } catch (e) {
      setCreateCauseError(e.message || 'Image upload failed');
    } finally {
      // reset value so same file can be re-selected if needed
      event.target.value = '';
    }
  };

  const toggleCauseActive = async (cause) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/fund-me/causes/${cause.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !cause.active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update cause');
      await fetchCauses();
    } catch (e) {
      setError(e.message || 'Failed to update cause');
    }
  };

  const startEditCause = (cause) => {
    setEditingCauseId(cause.id);
    setEditCauseForm({
      title: cause.title || '',
      description: cause.description || '',
      goalAmount: cause.goalAmount != null ? String(cause.goalAmount) : '',
      image: cause.image || '',
    });
  };

  const cancelEditCause = () => {
    setEditingCauseId(null);
    setEditCauseForm({ title: '', description: '', goalAmount: '', image: '' });
  };

  const saveEditCause = async () => {
    if (!token || !editingCauseId) return;
    try {
      const payload = {
        title: editCauseForm.title.trim() || undefined,
        description: editCauseForm.description.trim() || undefined,
        goalAmount: editCauseForm.goalAmount !== '' ? Number(editCauseForm.goalAmount) : undefined,
        image: editCauseForm.image.trim() || undefined,
      };
      const res = await fetch(`/api/admin/fund-me/causes/${editingCauseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update cause');
      cancelEditCause();
      await fetchCauses();
    } catch (e) {
      setError(e.message || 'Failed to update cause');
    }
  };

  const handleEditCauseImageFile = async (event) => {
    try {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      const uploaded = await uploadFiles(files);
      if (uploaded[0]?.url) {
        setEditCauseForm((prev) => ({ ...prev, image: uploaded[0].url }));
      }
    } catch (e) {
      setError(e.message || 'Image upload failed');
    } finally {
      event.target.value = '';
    }
  };

  const deleteCause = async (cause, mode = 'soft') => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/fund-me/causes/${cause.id}?mode=${mode}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete cause');
      if (editingCauseId === cause.id) cancelEditCause();
      await fetchCauses();
    } catch (e) {
      setError(e.message || 'Failed to delete cause');
    }
  };

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
            
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Causes</CardTitle>
                  <CardDescription>Create and manage donation causes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      {createCauseError && (
                        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{createCauseError}</div>
                      )}
                      <form onSubmit={handleCreateCause} className="space-y-3">
                        <div>
                          <Label htmlFor="ctitle">Title</Label>
                          <Input id="ctitle" value={createCauseForm.title} onChange={(e) => handleCreateCauseField('title', e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="cdesc">Description</Label>
                          <textarea id="cdesc" className="h-24 w-full rounded-xl border border-purple-200/60 bg-white/70 p-3 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400" value={createCauseForm.description} onChange={(e) => handleCreateCauseField('description', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="cgoal">Goal amount (USD)</Label>
                            <Input id="cgoal" type="number" step="0.01" min="0" value={createCauseForm.goalAmount} onChange={(e) => handleCreateCauseField('goalAmount', e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="cimage">Image URL</Label>
                            <Input id="cimage" value={createCauseForm.image} onChange={(e) => handleCreateCauseField('image', e.target.value)} placeholder="https://..." />
                            <div className="mt-2">
                              <input id="cimage-file" type="file" accept="image/*" onChange={handleCreateCauseImageFile} />
                              <p className="mt-1 text-xs text-gray-500">Upload an image file or paste an image URL above.</p>
                            </div>
                          </div>
                        </div>
                        <Button type="submit" disabled={createCauseLoading}>{createCauseLoading ? 'Creating...' : 'Create Cause'}</Button>
                      </form>
                    </div>
                    <div>
                      {causesLoading && <p className="text-sm text-gray-500">Loading causes...</p>}
                      {!causesLoading && causes.length === 0 && <p className="text-sm text-gray-500">No causes yet.</p>}
                      <div className="space-y-3">
                        {causes.map((c) => (
                          <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {c.title} {!c.active && (<span className="ml-1 text-xs text-gray-500">(inactive)</span>)}
                              </p>
                              <p className="text-xs text-gray-600">Raised: {formatCurrency(c?.totals?.totalAmount || 0, 'USD')}{c.goalAmount ? ` of ${formatCurrency(c.goalAmount, 'USD')}` : ''}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant={c.active ? 'outline' : 'secondary'} onClick={() => toggleCauseActive(c)}>
                                {c.active ? 'Deactivate' : 'Activate'}
                              </Button>
                              {editingCauseId === c.id ? (
                                <>
                                  <Button size="sm" variant="secondary" onClick={saveEditCause}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditCause}>Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" onClick={() => startEditCause(c)}>Edit</Button>
                                  <Button size="sm" variant="outline" onClick={() => deleteCause(c, 'soft')}>Soft Delete</Button>
                                  <Button size="sm" variant="destructive" onClick={() => deleteCause(c, 'hard')}>Hard Delete</Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {editingCauseId && (
                        <div className="mt-3 space-y-2 rounded-lg border p-3">
                          <p className="text-sm font-medium">Edit Cause</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <Label htmlFor="ctitle-edit">Title</Label>
                              <Input id="ctitle-edit" value={editCauseForm.title} onChange={(e) => setEditCauseForm((s) => ({ ...s, title: e.target.value }))} />
                            </div>
                            <div className="col-span-2">
                              <Label htmlFor="cdesc-edit">Description</Label>
                              <textarea id="cdesc-edit" className="h-24 w-full rounded-xl border border-purple-200/60 bg-white/70 p-3 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400" value={editCauseForm.description} onChange={(e) => setEditCauseForm((s) => ({ ...s, description: e.target.value }))} />
                            </div>
                            <div>
                              <Label htmlFor="cgoal-edit">Goal amount (USD)</Label>
                              <Input id="cgoal-edit" type="number" step="0.01" min="0" value={editCauseForm.goalAmount} onChange={(e) => setEditCauseForm((s) => ({ ...s, goalAmount: e.target.value }))} />
                            </div>
                            <div>
                              <Label htmlFor="cimage-edit">Image URL</Label>
                              <Input id="cimage-edit" value={editCauseForm.image} onChange={(e) => setEditCauseForm((s) => ({ ...s, image: e.target.value }))} />
                              <div className="mt-2">
                                <input id="cimage-edit-file" type="file" accept="image/*" onChange={handleEditCauseImageFile} />
                                <p className="mt-1 text-xs text-gray-500">Upload an image file or paste an image URL above.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
                    {selectedProductIds.length > 0 && (
                      <div className="mb-2 flex flex-wrap items-end gap-2 rounded-md border border-purple-200/60 bg-purple-50/60 p-2">
                        <span className="text-sm text-gray-700">Selected: {selectedProductIds.length}</span>
                        <Button size="sm" variant="secondary" onClick={() => bulkEnableDisable(true)}>Enable</Button>
                        <Button size="sm" variant="outline" onClick={() => bulkEnableDisable(false)}>Disable</Button>
                        <div className="flex items-end gap-2">
                          <div>
                            <Label htmlFor="bulkPrice" className="text-xs">Set price</Label>
                            <Input id="bulkPrice" type="number" step="0.01" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} className="h-8" />
                          </div>
                          <div>
                            <Label htmlFor="bulkStock" className="text-xs">Set stock</Label>
                            <Input id="bulkStock" type="number" step="1" value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} className="h-8" />
                          </div>
                          <Button size="sm" onClick={bulkSetPriceStock}>Update</Button>
                          <Button size="sm" variant="ghost" onClick={clearSelected}>Clear</Button>
                        </div>
                      </div>
                    )}
                    {storeLoading && <p className="text-sm text-gray-500">Loading...</p>}
                    {!storeLoading && storeProducts.length === 0 && <p className="text-sm text-gray-500">No products yet.</p>}
                    {storeProducts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" className="h-4 w-4" checked={selectedProductIds.includes(p.id)} onChange={(e) => toggleSelectProduct(p.id, e.target.checked)} />
                          {p.images?.[0]?.url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.images[0].url} alt={p.name} className="h-12 w-12 rounded object-cover" />
                          )}
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-gray-500">${'{'}p.price.toFixed(2){'}'} • Stock: {p.stock} • {p.active ? 'Active' : 'Inactive'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant={p.active ? 'outline' : 'secondary'} onClick={() => toggleProductActive(p)}>
                            {p.active ? 'Deactivate' : 'Activate'}
                          </Button>
                          {editingProductId === p.id ? (
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="secondary" onClick={saveEditProduct}>Save</Button>
                              <Button size="sm" variant="outline" onClick={cancelEditProduct}>Cancel</Button>
                            </div>
                          ) : (
                            <>
                              <Button size="sm" onClick={() => startEditProduct(p)}>Edit</Button>
                              <Button size="sm" variant="outline" onClick={() => handleDeleteProduct(p, 'soft')}>Soft Delete</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(p, 'hard')}>Hard Delete</Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {editingProductId && (
                      <div className="mt-3 space-y-2 rounded-lg border p-3">
                        <p className="text-sm font-medium">Edit Product</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="ename">Name</Label>
                            <Input id="ename" value={editProductForm.name} onChange={(e) => setEditProductForm((s) => ({ ...s, name: e.target.value }))} />
                          </div>
                          <div>
                            <Label htmlFor="eprice">Price</Label>
                            <Input id="eprice" type="number" step="0.01" value={editProductForm.price} onChange={(e) => setEditProductForm((s) => ({ ...s, price: e.target.value }))} />
                          </div>
                          <div>
                            <Label htmlFor="estock">Stock</Label>
                            <Input id="estock" type="number" step="1" value={editProductForm.stock} onChange={(e) => setEditProductForm((s) => ({ ...s, stock: e.target.value }))} />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="edesc">Description</Label>
                            <Input id="edesc" value={editProductForm.description} onChange={(e) => setEditProductForm((s) => ({ ...s, description: e.target.value }))} />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="eimages">Replace images (optional)</Label>
                            <Input id="eimages" type="file" accept="image/*" multiple onChange={(e) => setEditLocalFiles(Array.from(e.target.files || []))} />
                            <p className="mt-1 text-xs text-gray-500">If selected, all existing images will be replaced.</p>
                          </div>
                        </div>
                      </div>
                    )}
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
