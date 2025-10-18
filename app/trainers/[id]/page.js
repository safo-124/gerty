'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/CardOld';
import Button from '@/components/ui/ButtonOld';
import { PageLoader } from '@/components/ui/Loading';
import Link from 'next/link';

export default function TrainerProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTrainer = useCallback(async (trainerId) => {
    try {
      const response = await fetch(`/api/trainers/${trainerId}`);
      const data = await response.json();
      setTrainer(data.trainer);
    } catch (error) {
      console.error('Failed to fetch trainer:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    fetchTrainer(params.id);
  }, [params?.id, fetchTrainer]);

  if (loading) return <PageLoader />;
  if (!trainer) return <div className="text-center py-20">Trainer not found</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header Card */}
          <Card className="mb-8 overflow-hidden">
            {/* Cover */}
            <div className="h-48 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

            <div className="px-8 pb-8">
              {/* Profile Image & Basic Info */}
              <div className="flex flex-col md:flex-row md:items-end md:space-x-8 -mt-20 mb-6">
                <div className="w-40 h-40 rounded-full border-4 border-white dark:border-gray-800 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-6xl font-bold text-white shadow-2xl mb-4 md:mb-0">
                  {trainer.user.name[0]}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {trainer.user.name}
                      </h1>
                      {trainer.title && (
                        <p className="text-xl text-blue-600 dark:text-blue-400 font-semibold mb-3">
                          {trainer.title}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {trainer.rating && (
                          <div className="flex items-center bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
                            <span className="text-yellow-600 dark:text-yellow-400 mr-1">♔</span>
                            <span className="font-bold text-gray-900 dark:text-white">Rating: {trainer.rating}</span>
                          </div>
                        )}
                        {trainer.experience && (
                          <div className="flex items-center bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                            <span className="font-bold text-gray-900 dark:text-white">{trainer.experience} years experience</span>
                          </div>
                        )}
                        {trainer.totalStudents > 0 && (
                          <div className="flex items-center bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                            <span className="font-bold text-gray-900 dark:text-white">{trainer.totalStudents} students</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {user && user.role === 'STUDENT' && (
                      <Link href={`/lessons/book?trainerId=${trainer.id}`}>
                        <Button variant="primary" size="lg">
                          Book Lesson
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Price */}
              {trainer.hourlyRate && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-6">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">${trainer.hourlyRate}</span>
                  <span className="text-gray-600 dark:text-gray-400 text-lg">/hour</span>
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              {trainer.bio && (
                <Card className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">About</h2>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{trainer.bio}</p>
                </Card>
              )}

              {/* Specialties */}
              {trainer.specialties && trainer.specialties.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Specialties</h2>
                  <div className="flex flex-wrap gap-3">
                    {trainer.specialties.map((spec, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Reviews */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reviews</h2>
                  {trainer.averageRating > 0 && (
                    <div className="flex items-center space-x-2">
                      <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {trainer.averageRating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {trainer.reviews && trainer.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {trainer.reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{review.reviewerName}</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No reviews yet</p>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upcoming Tournaments */}
              {trainer.tournaments && trainer.tournaments.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Organizing Tournaments</h3>
                  <div className="space-y-3">
                    {trainer.tournaments.map((tournament) => (
                      <Link
                        key={tournament.id}
                        href={`/tournaments/${tournament.id}`}
                        className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{tournament.name}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {new Date(tournament.startDate).toLocaleDateString()}
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>
              )}

              {/* Contact */}
              <Card className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Get in Touch</h3>
                {user && user.role === 'STUDENT' ? (
                  <Link href={`/lessons/book?trainerId=${trainer.id}`}>
                    <Button variant="primary" className="w-full mb-3">
                      Schedule Lesson
                    </Button>
                  </Link>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Sign in as a student to book lessons
                  </p>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
