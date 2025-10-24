'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import LiveSpotlight from '@/components/home/LiveSpotlight';

export default function HomePage() {
  const [latestPosts, setLatestPosts] = useState([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/blog?limit=3')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => { if (!cancelled) setLatestPosts(d.items || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-300 via-pink-200 to-blue-300 text-gray-800 py-20 md:py-32 px-4 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-96 h-96 bg-white/60 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute top-20 right-10 w-96 h-96 bg-cyan-200/60 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-purple-200/60 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md rounded-full mb-6 border border-white/60 shadow-lg">
            <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white">New</Badge>
            <span className="text-sm font-medium text-gray-700">Join 10,000+ players improving their game</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in text-gray-900">
            Master Chess with
            <span className="block bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent">
              World-Class Trainers
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-gray-700 animate-fade-in animation-delay-200">
            Connect with expert coaches, compete in tournaments, and elevate your chess journey to new heights
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in animation-delay-400">
            <Link href="/trainers">
              <Button size="xl" variant="gradient" className="shadow-2xl">
                Find a Trainer
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </Link>
            <Link href="/tournaments">
              <Button size="xl" variant="outline" className="border-2 shadow-lg">
                View Tournaments
              </Button>
            </Link>
          </div>
        </div>
      </section>

  {/* Live Spotlight (rotates every N seconds per admin settings) */}
  <LiveSpotlight />

      {/* Latest from the Blog */}
      <section className="relative py-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-pink-50/50 via-purple-50/30 to-white"></div>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 mb-4">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                  <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
                </svg>
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Blog Updates</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Latest from the Blog
              </h2>
              <p className="text-gray-600 mt-2 text-lg">Stay updated with chess insights and news</p>
            </div>
            <Link href="/blog" className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              View all posts
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          {latestPosts.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-gray-300 bg-white/80 backdrop-blur-sm p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
              <p className="text-gray-600">Check back soon for exciting chess content!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {latestPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group rounded-3xl border-2 border-purple-100 bg-white/90 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                  {post.coverImage && (
                    <div className="relative h-48 w-full overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10"></div>
                      <Image src={post.coverImage} alt={post.title || ''} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute top-4 right-4 z-20">
                        <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-purple-700 border border-purple-200">
                          New
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.category && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 px-3 py-1 text-xs font-bold text-purple-700 uppercase tracking-wide">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                          {post.category}
                        </span>
                      )}
                      {Array.isArray(post.tags) && post.tags.slice(0,2).map((t) => (
                        <span key={t} className="rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 group-hover:bg-clip-text group-hover:text-transparent transition-all mb-3 line-clamp-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                      </div>
                      <div className="inline-flex items-center gap-2 text-purple-700 font-semibold group-hover:gap-3 transition-all">
                        <span className="text-sm">Read more</span>
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-b from-white to-purple-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10,000+', label: 'Active Students', icon: '👥' },
              { value: '500+', label: 'Expert Trainers', icon: '🎓' },
              { value: '50,000+', label: 'Lessons Completed', icon: '📚' },
              { value: '1,000+', label: 'Tournaments Hosted', icon: '🏆' }
            ].map((stat, i) => (
              <Card key={i} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="text-4xl mb-2">{stat.icon}</div>
                  <div className="text-3xl font-bold mb-1 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-purple-50 to-pink-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">Features</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Everything You Need to
              <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Become a Chess Master
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform provides all the tools and resources you need to improve your chess skills
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Expert Trainers',
                description: 'Learn from grandmasters and international masters with proven track records',
                icon: '👨‍🏫',
                gradient: 'from-blue-500 to-cyan-500'
              },
              {
                title: 'Personalized Lessons',
                description: 'Get one-on-one coaching tailored to your skill level and learning style',
                icon: '🎯',
                gradient: 'from-purple-500 to-pink-500'
              },
              {
                title: 'Live Tournaments',
                description: 'Compete in regular tournaments and test your skills against players worldwide',
                icon: '🏆',
                gradient: 'from-orange-500 to-red-500'
              },
              {
                title: 'Flexible Scheduling',
                description: 'Book lessons at your convenience with our easy-to-use scheduling system',
                icon: '📅',
                gradient: 'from-green-500 to-emerald-500'
              },
              {
                title: 'Progress Tracking',
                description: 'Monitor your improvement with detailed analytics and performance metrics',
                icon: '📊',
                gradient: 'from-indigo-500 to-blue-500'
              },
              {
                title: 'Community Support',
                description: 'Join a vibrant community of chess enthusiasts and share your journey',
                icon: '🤝',
                gradient: 'from-pink-500 to-rose-500'
              }
            ].map((feature, i) => (
              <Card key={i} className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary/50">
                <CardHeader>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-2xl group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">Simple Process</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes with our simple three-step process
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '1',
                title: 'Create Account',
                description: 'Sign up as a student and complete your profile in seconds',
                icon: '📝'
              },
              {
                step: '2',
                title: 'Find Your Trainer',
                description: 'Browse our curated list of expert trainers and choose the perfect match',
                icon: '🔍'
              },
              {
                step: '3',
                title: 'Start Learning',
                description: 'Book your first lesson and begin your journey to chess mastery',
                icon: '🚀'
              }
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/4 left-full w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600 opacity-20 -z-10" />
                )}
                <Card className="text-center hover:shadow-xl transition-shadow h-full">
                  <CardHeader>
                    <div className="relative mx-auto mb-4">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-4xl">
                        {item.icon}
                      </div>
                      <Badge className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center bg-yellow-400 text-yellow-900 text-lg font-bold">
                        {item.step}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl mb-2">{item.title}</CardTitle>
                    <CardDescription className="text-base">{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-300 to-blue-400"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto text-center relative z-10 text-gray-800">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Take Your Chess to the Next Level?
          </h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto text-gray-700">
            Join thousands of players who have already transformed their game with our platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register">
              <Button size="xl" variant="gradient" className="shadow-2xl">
                Get Started Free
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </Link>
            <Link href="/trainers">
              <Button size="xl" variant="outline" className="border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm">
                Browse Trainers
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-blue-50 to-purple-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">Testimonials</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">What Our Students Say</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Don&apos;t just take our word for it - hear from our community
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Sarah Johnson',
                role: 'Intermediate Player',
                rating: '1850',
                text: 'This platform helped me improve my rating by 300 points in just 3 months! The trainers are incredibly knowledgeable and patient.',
                avatar: 'SJ'
              },
              {
                name: 'Michael Chen',
                role: 'Advanced Player',
                rating: '2100',
                text: 'The tournament system is fantastic. I love competing with players from around the world and the level of competition is perfect.',
                avatar: 'MC'
              },
              {
                name: 'Emma Williams',
                role: 'Beginner',
                rating: '1200',
                text: 'As a complete beginner, I was nervous to start. But my trainer made learning chess fun and easy to understand. Highly recommend!',
                avatar: 'EW'
              }
            ].map((testimonial, i) => (
              <Card key={i} className="hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                      <CardDescription>{testimonial.role}</CardDescription>
                    </div>
                  </div>
                  <div className="flex text-yellow-400 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground italic">&ldquo;{testimonial.text}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="secondary">Rating: {testimonial.rating}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
