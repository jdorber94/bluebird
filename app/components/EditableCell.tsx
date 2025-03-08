'use client';

import { useState, useRef, useEffect } from 'react';

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date' | 'time';
}

export default function EditableCell({ value, onChange, type = 'text' }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Format the display value
  const formatDisplayValue = (val: string) => {
    if (type === 'date') {
      try {
        return new Date(val).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch (e) {
        return val;
      }
    }
    if (type === 'time') {
      try {
        return new Date(`2000-01-01T${val}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      } catch (e) {
        return val;
      }
    }
    return val;
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      if (type === 'time') {
        // Round to nearest 15 minutes
        try {
          const [hours, minutes] = editValue.split(':');
          const date = new Date();
          date.setHours(parseInt(hours));
          date.setMinutes(Math.round(parseInt(minutes) / 15) * 15);
          date.setSeconds(0);
          const roundedTime = date.toTimeString().split(' ')[0];
          onChange(roundedTime);
        } catch (e) {
          onChange(editValue);
        }
      } else {
        onChange(editValue);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        step={type === 'time' ? '900' : undefined} // 15 minutes in seconds
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer hover:bg-gray-50 px-2 py-1 -mx-2 rounded transition-colors"
    >
      {formatDisplayValue(value)}
    </div>
  );
} 