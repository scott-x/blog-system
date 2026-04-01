import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetPostsQuery, useDeletePostMutation, useGetTagsQuery } from '../api/api';
import type { Post } from '../api/api';
import { AiOutlineEye, AiOutlineEdit, AiOutlineDelete, AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { ConfirmModal } from '../components/ConfirmModal';

const PAGE_SIZE = 5;

export function PostListPage() {
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pendingSearch, setPendingSearch] = useState('');

  const { data: response, isLoading, refetch } = useGetPostsQuery({
    page,
    page_size: PAGE_SIZE,
    keyword: searchKeyword || undefined,
    tag: selectedTag,
  });

  const [deletePost] = useDeletePostMutation();
  const { data: allTags } = useGetTagsQuery();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);

  const posts = response?.posts || [];
  const total = response?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(page * PAGE_SIZE, total);

  const handleSearch = () => {
    setSearchKeyword(pendingSearch);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deletePost(deleteTarget.id);
    refetch();
    setDeleteTarget(null);
  };

  if (isLoading) return <div className="loading">Loading posts...</div>;

  return (
    <div className="post-list">
      <div className="page-header">
        <h2>All Posts</h2>
        <Link to="/posts/new" className="new-post-btn">+ New Post</Link>
      </div>

      <div className="filter-bar">
        <div className="search-bar">
          <input
            type="text"
            value={pendingSearch}
            onChange={(e) => setPendingSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search posts..."
            className="search-input"
          />
          <button onClick={handleSearch} className="search-btn">Search</button>
        </div>
        <select
          value={selectedTag || ''}
          onChange={(e) => {
            setSelectedTag(e.target.value || undefined);
            setPage(1);
          }}
          className="tag-filter"
        >
          <option value="">All Posts</option>
          {allTags?.map((tag) => (
            <option key={tag.id} value={tag.name}>{tag.name}</option>
          ))}
        </select>
        {(selectedTag || searchKeyword) && (
          <button
            onClick={() => {
              setSelectedTag(undefined);
              setSearchKeyword('');
              setPendingSearch('');
              setPage(1);
            }}
            className="clear-filter"
          >
            Clear Filter
          </button>
        )}
      </div>

      <div className="pagination-info">
        Showing {startItem}-{endItem} of {total} posts
      </div>

      {posts.length === 0 ? (
        <p className="no-posts">No posts found.</p>
      ) : (
        <table className="posts-table">
          <thead>
            <tr>
              <th style={{width: '80px'}}>缩略图</th>
              <th>标题</th>
              <th>标签</th>
              <th style={{width: '120px', textAlign: 'center'}}>日期</th>
              <th style={{width: '150px', textAlign: 'center'}}>操作</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post: Post) => (
              <tr key={post.id}>
                <td className="col-thumbnail">
                  {post.thumbnail_url ? (
                    <img
                      src={post.thumbnail_url}
                      alt={post.title}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="no-thumb">—</span>
                  )}
                </td>
                <td className="col-title">
                  <Link to={`/posts/${post.id}`}>{post.title}</Link>
                </td>
                <td className="col-tags">
                  {post.edges?.tags?.map((tag) => (
                    <span
                      key={tag.id}
                      className="tag-badge"
                      style={{ backgroundColor: tag.background || '#667eea' }}
                      onClick={() => {
                        setSelectedTag(tag.name);
                        setPage(1);
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </td>
                <td className="col-date" style={{textAlign: 'center'}}>
                  {new Date(post.created_at).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                </td>
                <td className="col-actions" style={{textAlign: 'center'}}>
                  <Link to={`/posts/${post.id}`} className="action-btn view-btn" title="查看">
                    <AiOutlineEye size={16} />
                  </Link>
                  <Link to={`/posts/${post.id}/edit`} className="action-btn edit-btn" title="编辑">
                    <AiOutlineEdit size={16} />
                  </Link>
                  <button onClick={() => setDeleteTarget({ id: post.id, title: post.title })} className="action-btn delete-btn" title="删除">
                    <AiOutlineDelete size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 0 && (
        <div className="pagination-controls">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="pagination-btn"
          >
            <AiOutlineLeft size={16} /> Previous
          </button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="pagination-btn"
          >
            Next <AiOutlineRight size={16} />
          </button>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="删除文章"
        message={`确定要删除文章「${deleteTarget?.title}」吗？`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
