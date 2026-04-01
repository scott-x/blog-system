import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCreatePostMutation, useGetTagsQuery } from '../api/api';

export function PostCreatePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const navigate = useNavigate();

  const [createPost, { isLoading }] = useCreatePostMutation();
  const { data: existingTags } = useGetTagsQuery();

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    await createPost({ title: title.trim(), content: content.trim(), tags });
    navigate('/');
  };

  return (
    <div className="post-create-page">
      <div className="page-header">
        <h2>Create New Post</h2>
        <Link to="/" className="back-btn">← Back to List</Link>
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
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your post content..."
            rows={8}
            required
          />
        </div>

        <div className="form-group">
          <label>Tags</label>
          <div className="tag-input-container">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add a tag"
              list="existing-tags-create"
            />
            <datalist id="existing-tags-create">
              {existingTags?.map((tag) => (
                <option key={tag.id} value={tag.name} />
              ))}
            </datalist>
            <button type="button" onClick={handleAddTag} className="add-tag-btn">
              Add
            </button>
          </div>

          <div className="tags-list">
            {tags.map((tagName) => {
              const existingTag = existingTags?.find((t) => t.name === tagName);
              return (
                <span
                  key={tagName}
                  className="tag-badge removable"
                  style={{ backgroundColor: existingTag?.background || '#667eea' }}
                >
                  {tagName}
                  <button type="button" onClick={() => handleRemoveTag(tagName)}>×</button>
                </span>
              );
            })}
          </div>
        </div>

        <div className="form-actions">
          <Link to="/" className="cancel-btn">Cancel</Link>
          <button type="submit" disabled={isLoading} className="submit-btn">
            {isLoading ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
