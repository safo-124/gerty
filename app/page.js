'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';

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

      {/* Latest from the Blog */}
      <section className="py-16 bg-gradient-to-b from-pink-50 to-white">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <Badge variant="outline" className="mb-3 text-sm px-4 py-1">Updates</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Latest from the Blog</h2>
            </div>
            <Link href="/blog" className="text-purple-700 hover:underline">View all</Link>
          </div>
          {latestPosts.length === 0 ? (
            <p className="text-gray-600">No posts yet. Check back soon.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {latestPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group rounded-2xl border bg-white shadow hover:shadow-lg transition overflow-hidden">
                  {post.coverImage && (
                    <div className="relative h-40 w-full">
                      <Image src={post.coverImage} alt="" fill className="object-cover" />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold group-hover:text-purple-700">{post.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {post.category && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">{post.category}</span>}
                      {Array.isArray(post.tags) && post.tags.slice(0,1).map((t) => (
                        <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">#{t}</span>
                      ))}
                    </div>
                    {post.excerpt && <p className="mt-2 text-gray-600 line-clamp-2">{post.excerpt}</p>}
                    <div className="mt-3 text-xs text-gray-500">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}</div>
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
