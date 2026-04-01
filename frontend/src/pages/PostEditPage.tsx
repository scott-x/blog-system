import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGetPostQuery, useUpdatePostMutation, useGetTagsQuery } from '../api/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

type Tab = 'write' | 'preview';

export function PostEditPage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const navigate = useNavigate();

  const { data: post, isLoading: isLoadingPost } = useGetPostQuery(postId);
  const [updatePost, { isLoading: isUpdating }] = useUpdatePostMutation();
  const { data: existingTags } = useGetTagsQuery();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [tab, setTab] = useState<Tab>('write');

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      setSelectedTags(post.tags?.map((t: { id: number }) => t.id) || []);
    }
  }, [post]);

  const handleCheckboxChange = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tags = existingTags
      ?.filter((t) => selectedTags.includes(t.id))
      .map((t) => t.name) || [];

    await updatePost({
      id: postId,
      data: { title: title.trim(), content: content.trim(), tags },
    });
    navigate(`/posts/${postId}`);
  };

  if (isLoadingPost) return <div className="loading">Loading post...</div>;
  if (!post) return <div className="error">Post not found.</div>;

  return (
    <div className="post-edit-page">
      <div className="page-header">
        <h2>Edit Post</h2>
        <Link to={`/posts/${postId}`} className="back-btn">← Cancel</Link>
      </div>

      <form className="post-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title"
            required
          />
        </div>

        <div className="form-group">
          <label>Content</label>
          <div className="md-editor-tabs">
            <button
              type="button"
              className={`md-tab ${tab === 'write' ? 'active' : ''}`}
              onClick={() => setTab('write')}
            >
              编辑
            </button>
            <button
              type="button"
              className={`md-tab ${tab === 'preview' ? 'active' : ''}`}
              onClick={() => setTab('preview')}
            >
              预览
            </button>
          </div>

          {tab === 'write' ? (
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="支持 Markdown 语法"
              rows={14}
              required
              className="md-textarea"
            />
          ) : (
            <div className="md-preview markdown-body">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {content}
                </ReactMarkdown>
              ) : (
                <p className="md-preview-empty">暂无内容</p>
              )}
            </div>
          )}
          <div className="md-hint">
            支持 <strong>Markdown</strong> 语法
          </div>
        </div>

        <div className="form-group">
          <label>Tags（可多选）</label>
          {existingTags && existingTags.length > 0 ? (
            <div className="tag-checkbox-list">
              {existingTags.map((tag) => (
                <label key={tag.id} className="tag-checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.id)}
                    onChange={() => handleCheckboxChange(tag.id)}
                  />
                  <span
                    className="tag-checkbox-badge"
                    style={{ backgroundColor: tag.background || '#667eea' }}
                  >
                    {tag.name}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="no-tags-hint">暂无标签</p>
          )}
        </div>

        <div className="form-actions">
          <Link to={`/posts/${postId}`} className="cancel-btn">Cancel</Link>
          <button type="submit" disabled={isUpdating} className="submit-btn">
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
