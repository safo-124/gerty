import { prisma } from '@/lib/prisma';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const dynamic = 'force-dynamic';

export default async function BlogPostPage({ params }) {
  const { slug } = params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, published: true },
    select: { id: true, title: true, content: true, coverImage: true, publishedAt: true, category: true, tags: true, author: { select: { name: true } } },
  });

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-16">
        <p className="text-center text-gray-500">Post not found.</p>
        <div className="text-center mt-6">
          <Link href="/blog" className="text-purple-700">Back to Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <article className="container mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-4xl font-bold mb-2">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
          {post.publishedAt && <span>{new Date(post.publishedAt).toLocaleDateString()}</span>}
          {post.author?.name && <span>• By {post.author.name}</span>}
          {post.category && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">{post.category}</span>}
        </div>
        {post.tags?.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">#{t}</span>
            ))}
          </div>
        ) : null}
      </header>
      {post.coverImage && (
        <div className="relative mb-8 h-64 w-full rounded-2xl overflow-hidden">
          <Image src={post.coverImage} fill alt="" className="object-cover" />
        </div>
      )}
      <div className="prose max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
      </div>
    </article>
  );
}
