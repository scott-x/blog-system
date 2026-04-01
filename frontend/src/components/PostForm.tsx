import { useState } from 'react';
import { useCreatePostMutation, useGetTagsQuery } from '../api/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

type Tab = 'write' | 'preview';

export function PostForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [tab, setTab] = useState<Tab>('write');
  const [createPost, { isLoading }] = useCreatePostMutation();
  const { data: existingTags } = useGetTagsQuery();

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

    await createPost({ title: title.trim(), content: content.trim(), tags });
    setTitle('');
    setContent('');
    setSelectedTags([]);
  };

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      <h2>Create New Post</h2>

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
            placeholder="支持 Markdown 语法：&#10;&#10;**粗体** *斜体*&#10;- 列表&#10;```code block```&#10;[链接](url)&#10;![图片](url)"
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
          支持 <strong>Markdown</strong> 语法：粗体、斜体、代码块、列表、链接、图片等
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
          <p className="no-tags-hint">暂无标签，请先在 Tags 页面创建</p>
        )}
      </div>

      <button type="submit" disabled={isLoading} className="submit-btn">
        {isLoading ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
