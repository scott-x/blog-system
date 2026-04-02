import { useState } from 'react';
import { useGetPostsQuery, useDeletePostMutation, useGetTagsQuery } from '../api/api';
import type { Post } from '../api/api';

const PAGE_SIZE = 10;

export function PostList() {
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

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this post?')) {
      await deletePost(id);
      refetch();
    }
  };

  if (isLoading) return <div className="loading">Loading posts...</div>;

  return (
    <div className="post-list">
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
        <div className="posts-grid">
          {posts.map((post: Post) => (
            <article key={post.id} className="post-card">
              <h2 className="post-title">{post.title}</h2>
              <p className="post-content">{post.content.substring(0, 150)}...</p>
              <div className="post-tags">
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
              </div>
              <div className="post-meta">
                <span className="post-date">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
                <button onClick={() => handleDelete(post.id)} className="delete-btn">
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="pagination-btn"
          >
            Previous
          </button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
