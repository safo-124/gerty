import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function BlogIndexPage() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, publishedAt: true, category: true, tags: true },
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="text-gray-600">Insights, updates, and lessons from our team</p>
      </div>

      {posts.length === 0 && (
        <p className="text-center text-gray-500">No posts yet. Check back soon!</p>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group rounded-2xl border bg-white shadow hover:shadow-lg transition overflow-hidden">
            {post.coverImage && (
              <div className="relative h-44 w-full">
                <Image src={post.coverImage} alt="" fill className="object-cover" />
              </div>
            )}
            <div className="p-5">
              <h3 className="text-xl font-semibold group-hover:text-purple-700">{post.title}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {post.category && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">{post.category}</span>}
                {post.tags?.slice(0, 2).map((t) => (
                  <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">#{t}</span>
                ))}
              </div>
              {post.excerpt && <p className="mt-2 text-gray-600 line-clamp-3">{post.excerpt}</p>}
              <div className="mt-3 text-xs text-gray-500">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
