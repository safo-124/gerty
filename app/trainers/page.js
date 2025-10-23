'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import LoadingSpinner from '@/components/ui/Loading';
import { COUNTRIES, countryCodeToFlagEmoji } from '@/lib/countries';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function TrainersPage() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    specialty: '',
    minRating: '',
    featured: false,
    country: '',
  });
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const initializedRef = useRef(false);

  const buildParams = (f, pageNum) => {
    const params = new URLSearchParams({ page: String(pageNum) });
    if (f.search) params.set('search', f.search);
    if (f.specialty) params.set('specialty', f.specialty);
    if (f.minRating) params.set('minRating', f.minRating);
    if (f.featured) params.set('featured', 'true');
    if (f.country) params.set('country', f.country);
    return params;
  };

  const fetchTrainers = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams(filters, pagination.page);

      const response = await fetch(`/api/trainers?${params}`);
      const data = await response.json();
      setTrainers(data.trainers);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch trainers:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page]);

  // Initialize filters from URL and keep in sync when navigating back/forward
  useEffect(() => {
    const urlParams = new URLSearchParams(search?.toString() || '');
    const parsed = {
      search: urlParams.get('search') || '',
      specialty: urlParams.get('specialty') || '',
      minRating: urlParams.get('minRating') || '',
      featured: (urlParams.get('featured') || '') === 'true',
      country: (urlParams.get('country') || '').toUpperCase(),
    };
    const pageFromUrl = parseInt(urlParams.get('page') || '1', 10) || 1;

    const differs =
      parsed.search !== filters.search ||
      parsed.specialty !== filters.specialty ||
      parsed.minRating !== filters.minRating ||
      parsed.featured !== filters.featured ||
      parsed.country !== filters.country ||
      pageFromUrl !== pagination.page;

    if (differs) {
      setFilters(parsed);
      setSearchTerm(parsed.search);
      setPagination(prev => ({ ...prev, page: pageFromUrl }));
    }
    if (!initializedRef.current) initializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Sync state to URL when filters or page change
  useEffect(() => {
    if (!initializedRef.current) return;
    const params = buildParams(filters, pagination.page);
    const next = params.toString();
    const current = search?.toString() || '';
    if (next !== current) {
      router.replace(`${pathname}?${next}`);
    }
  }, [filters, pagination.page, pathname, router, search]);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  const handleSearch = (e) => {
    e.preventDefault();
    const normalized = searchTerm.trim();
    setFilters(prev => ({ ...prev, search: normalized }));
    setSearchTerm(normalized);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const specialties = ['Openings', 'Endgames', 'Tactics', 'Strategy', 'Blitz', 'Classical'];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-300/10 rounded-full blur-3xl"></div>
        </div>
        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl drop-shadow-lg">
              Find Your Perfect Chess Trainer
            </h1>
            <p className="mb-8 text-xl md:text-2xl drop-shadow-md">
              Connect with world-class trainers and elevate your chess game
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search trainers by name, title, or specialty..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 bg-white/10 border-white/20 text-white placeholder:text-blue-200 backdrop-blur-sm"
                />
                <Button type="submit" size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                  Search
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Refine your search</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Specialty Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Specialty</label>
                  <select
                    value={filters.specialty}
                    onChange={(e) => handleFilterChange('specialty', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">All Specialties</option>
                    {specialties.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Country Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <select
                    value={filters.country}
                    onChange={(e) => handleFilterChange('country', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">All Countries</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                {/* Rating Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Minimum Rating</label>
                  <select
                    value={filters.minRating}
                    onChange={(e) => handleFilterChange('minRating', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Any Rating</option>
                    <option value="1200">1200+</option>
                    <option value="1500">1500+</option>
                    <option value="1800">1800+</option>
                    <option value="2000">2000+</option>
                    <option value="2200">2200+</option>
                    <option value="2500">2500+</option>
                  </select>
                </div>

                <Separator />

                {/* Featured Only */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={filters.featured}
                    onChange={(e) => handleFilterChange('featured', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="featured" className="text-sm font-medium cursor-pointer">
                    Featured trainers only
                  </label>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFilters({ search: '', specialty: '', minRating: '', featured: false, country: '' });
                    setSearchTerm('');
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Platform Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Trainers</span>
                  <span className="font-bold">{pagination.total || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Featured</span>
                  <span className="font-bold text-yellow-600">⭐ {trainers.filter(t => t.featured).length}</span>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Trainers Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="py-20">
                <LoadingSpinner size="lg" className="mx-auto" />
              </div>
            ) : trainers.length === 0 ? (
              <Card className="p-12">
                <div className="text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-2xl font-bold mb-2">No trainers found</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your filters</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilters({ search: '', specialty: '', minRating: '', featured: false, country: '' });
                      setSearchTerm('');
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {/* Results Count */}
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{trainers.length}</span> of{' '}
                    <span className="font-semibold text-foreground">{pagination.total}</span> trainers
                  </p>
                </div>

                {/* Active Country Tag */}
                {filters.country && (
                  <div className="mb-6">
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs text-gray-700 dark:text-gray-200">
                      <span>{countryCodeToFlagEmoji(filters.country)}</span>
                      <span>
                        {COUNTRIES.find(c => c.code === filters.country)?.name || filters.country}
                      </span>
                      <button
                        aria-label="Clear country filter"
                        className="ml-1 rounded-full px-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                        onClick={() => handleFilterChange('country', '')}
                      >
                        ×
                      </button>
                    </span>
                  </div>
                )}

                {/* Trainers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {trainers.map((trainer) => (
                    <Card key={trainer.id} className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                      {/* Card Header with Gradient */}
                      <div className="h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
                        {trainer.featured && (
                          <Badge className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 hover:bg-yellow-500">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Featured
                          </Badge>
                        )}
                      </div>

                      <CardHeader className="relative pb-3">
                        {/* Avatar */}
                        <Avatar className="absolute -top-12 left-6 h-24 w-24 border-4 border-background shadow-xl bg-gradient-to-br from-blue-400 to-purple-400">
                          <AvatarFallback className="text-3xl font-bold text-white bg-transparent">
                            {trainer.user.name[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="pt-14">
                          <CardTitle className="text-xl mb-1 group-hover:text-primary transition-colors">
                            {trainer.country && (
                              <span className="mr-1 align-[1px]" title={trainer.country}>
                                {countryCodeToFlagEmoji(trainer.country)}
                              </span>
                            )}
                            {trainer.user.name}
                          </CardTitle>
                          {trainer.title && (
                            <CardDescription className="text-blue-600 dark:text-blue-400 font-semibold">
                              {trainer.title}
                            </CardDescription>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm">
                          {trainer.rating && (
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">♔</span>
                              <span className="font-semibold">{trainer.rating}</span>
                            </div>
                          )}
                          {trainer.averageRating > 0 && (
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="font-semibold">{trainer.averageRating.toFixed(1)}</span>
                            </div>
                          )}
                          {trainer.totalStudents > 0 && (
                            <div className="text-muted-foreground">
                              {trainer.totalStudents} students
                            </div>
                          )}
                        </div>

                        {/* Bio */}
                        {trainer.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {trainer.bio}
                          </p>
                        )}

                        {/* Specialties */}
                        {trainer.specialties && trainer.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {trainer.specialties.slice(0, 3).map((spec, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {trainer.specialties.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{trainer.specialties.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Price */}
                        {trainer.hourlyRate && (
                          <div className="pt-2 border-t">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold">${trainer.hourlyRate}</span>
                              <span className="text-sm text-muted-foreground">/hour</span>
                            </div>
                          </div>
                        )}

                        {/* View Profile Button */}
                        <Link href={`/trainers/${trainer.id}`}>
                          <Button variant="gradient" className="w-full">
                            View Profile
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-12">
                    <Button
                      variant="outline"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page <span className="font-semibold text-foreground">{pagination.page}</span> of{' '}
                      <span className="font-semibold text-foreground">{pagination.totalPages}</span>
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
