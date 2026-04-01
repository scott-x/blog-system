import { useState } from 'react';
import { useGetTagsQuery, useCreateTagMutation, useDeleteTagMutation } from '../api/api';
import { ConfirmModal } from './ConfirmModal';

const TAG_COLORS = [
  '#667eea',
  '#e74c3c',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#3498db',
  '#e91e63',
];

export function TagManager() {
  const { data: tags, refetch } = useGetTagsQuery();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [createTag, { isLoading: isCreating }] = useCreateTagMutation();
  const [deleteTag] = useDeleteTagMutation();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    
    await createTag({ name: newTagName.trim(), background: newTagColor });
    setNewTagName('');
    setNewTagColor(TAG_COLORS[0]);
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteTag(deleteTarget.id);
    refetch();
    setDeleteTarget(null);
  };

  return (
    <div className="tag-manager">
      <h3>Manage Tags</h3>
      <form onSubmit={handleCreate} className="tag-form">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="New tag name"
        />
        <div className="tag-color-picker">
          {TAG_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`color-swatch ${newTagColor === color ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setNewTagColor(color)}
              title={color}
            />
          ))}
        </div>
        <button type="submit" disabled={isCreating}>
          {isCreating ? '...' : 'Add'}
        </button>
      </form>
      
      <div className="tags-container">
        {tags?.map((tag) => (
          <span
            key={tag.id}
            className="tag-badge removable"
            style={{ backgroundColor: tag.background || '#667eea' }}
          >
            {tag.name}
            <button type="button" onClick={() => setDeleteTarget({ id: tag.id, name: tag.name })}>×</button>
          </span>
        ))}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="删除标签"
        message={`确定要删除标签「${deleteTarget?.name}」吗？`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
