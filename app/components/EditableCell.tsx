'use client';

import { useState, useRef, useEffect } from 'react';

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date' | 'time';
  className?: string;
  url?: string | null;
  onUrlChange?: (url: string) => void;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onChange,
  type = 'text',
  className = '',
  url,
  onUrlChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [editUrl, setEditUrl] = useState(url || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
    setEditUrl(url || '');
  }, [value, url]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value);
      setEditUrl(url || '');
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
    if (onUrlChange && editUrl !== url) {
      onUrlChange(editUrl);
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const formatTimeDisplay = (timeStr: string) => {
    try {
      // Handle both HH:mm:ss and HH:mm formats
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0);
      return date.toLocaleTimeString(undefined, { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      });
    } catch (e) {
      return timeStr;
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type={type}
          value={type === 'date' ? formatDateForInput(editValue) : editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={`w-full px-2 py-1 border rounded ${className}`}
        />
        {onUrlChange && (
          <input
            type="url"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Enter URL"
            className={`w-full px-2 py-1 border rounded text-sm text-gray-600`}
          />
        )}
      </div>
    );
  }

  if (onUrlChange && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onDoubleClick={handleDoubleClick}
        className={`${className} hover:text-blue-600 hover:underline cursor-pointer`}
      >
        {value}
      </a>
    );
  }

  return (
    <div onDoubleClick={handleDoubleClick} className={className}>
      {type === 'time' ? formatTimeDisplay(value) : value}
    </div>
  );
};

export default EditableCell; 