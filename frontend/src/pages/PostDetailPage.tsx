import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGetPostQuery, useDeletePostMutation } from '../api/api';
import { ConfirmModal } from '../components/ConfirmModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { AiOutlineCopy as Copy, AiOutlineCheck as Check, AiOutlineToTop } from 'react-icons/ai';
import 'highlight.js/styles/github.css';

interface TocItem {
  level: number;
  text: string;
  id: string;
}

function extractToc(content: string): TocItem[] {
  const lines = content.split('\n');
  const toc: TocItem[] = [];
  for (const line of lines) {
    const m2 = line.match(/^## (.+)/);
    const m3 = line.match(/^### (.+)/);
    if (m2) {
      const text = m2[1].trim();
      const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
      toc.push({ level: 2, text, id });
    } else if (m3) {
      const text = m3[1].trim();
      const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
      toc.push({ level: 3, text, id });
    }
  }
  return toc;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
}

function Heading({ level, children }: { level: number; children: React.ReactNode }) {
  const text = String(children);
  const id = slugify(text);
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
  return <Tag id={id}>{children}</Tag>;
}

function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  // Extract language from className like "language-js"
  const langMatch = className?.match(/language-(\w+)/);
  const lang = langMatch ? langMatch[1] : '';

  const handleCopy = () => {
    const text = codeRef.current?.textContent || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        {lang && <span className="code-lang-badge">{lang}</span>}
        <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy} title="复制代码">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre ref={codeRef as React.Ref<HTMLPreElement>}>{children}</pre>
    </div>
  );
}

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const navigate = useNavigate();

  const { data: post, isLoading, error } = useGetPostQuery(postId);
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();
  const [showBackTop, setShowBackTop] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);

  useEffect(() => {
    if (post?.content) {
      setToc(extractToc(post.content));
    }
  }, [post?.content]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDelete = async () => {
    setShowDeleteModal(false);
    await deletePost(postId);
    navigate('/');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) return <div className="loading">Loading post...</div>;
  if (error || !post) return <div className="error">Post not found.</div>;

  return (
    <div className="post-detail-page">
      <div className="page-header">
        <Link to="/" className="back-btn">← Back to List</Link>
      </div>

      {/* 目录居中固定在顶部导航栏下方 */}
      {toc.length > 2 && (
        <aside className="toc-sidebar">
          <div className="toc-sidebar-header">
            <span>📑 目录</span>
          </div>
          <nav className="toc-sidebar-nav">
            <ul>
              {toc.map((item, i) => (
                <li key={i} className={`toc-item level-${item.level}`}>
                  <a href={`#${item.id}`} className="toc-link">
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      )}

      <article className="post-detail">
        {post.thumbnail_url && (
          <div className="post-detail-thumbnail">
            <img
              src={post.thumbnail_url}
              alt={post.title}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="post-detail-body">
          <h1 className="post-detail-title">{post.title}</h1>

          <div className="post-detail-meta">
            <span className="post-date">
              Created: {new Date(post.created_at).toLocaleDateString()}
            </span>
            {post.updated_at !== post.created_at && (
              <span className="post-date">
                Updated: {new Date(post.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {post.edges?.tags && post.edges.tags.length > 0 && (
            <div className="post-detail-tags">
              {post.edges.tags.map((tag) => (
                <span key={tag.id} className="tag-badge" style={{ backgroundColor: tag.background || '#667eea' }}>{tag.name}</span>
              ))}
            </div>
          )}

          <div className="post-detail-content markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                h1: ({ children }) => <Heading level={1}>{children}</Heading>,
                h2: ({ children }) => <Heading level={2}>{children}</Heading>,
                h3: ({ children }) => <Heading level={3}>{children}</Heading>,
                pre: ({ children, className }) => <CodeBlock className={className}>{children}</CodeBlock>,
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          <div className="post-detail-actions">
            <Link to={`/posts/${postId}/edit`} className="edit-btn">
              Edit Post
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="delete-btn"
            >
              {isDeleting ? 'Deleting...' : 'Delete Post'}
            </button>
          </div>
        </div>
      </article>

      {/* 回到顶部 */}
      <button
        className={`back-to-top ${showBackTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        title="回到顶部"
      >
        <AiOutlineToTop size={20} />
      </button>

      <ConfirmModal
        open={showDeleteModal}
        title="删除文章"
        message={`确定要删除文章「${post?.title}」吗？`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
