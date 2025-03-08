'use client';

import { useState, useRef, useEffect } from 'react';

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date' | 'time';
  className?: string;
}

export default function EditableCell({ value, onChange, type = 'text', className = '' }: EditableCellProps) {
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
        const date = new Date(val);
        if (isNaN(date.getTime())) return val;
        
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC' // Use UTC to avoid timezone shifts
        });
      } catch (e) {
        return val;
      }
    }
    if (type === 'time') {
      try {
        // Handle both full timestamps and time-only strings
        const timeString = val.includes('T') ? val.split('T')[1] : val;
        const date = new Date(`2000-01-01T${timeString}`);
        if (isNaN(date.getTime())) return val;

        return date.toLocaleTimeString('en-US', {
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
      if (type === 'date') {
        // Ensure we preserve the time portion when updating the date
        try {
          const newDate = new Date(editValue);
          const oldDate = new Date(value);
          
          // If the old value had a time, preserve it
          if (!isNaN(oldDate.getTime())) {
            newDate.setUTCHours(oldDate.getUTCHours());
            newDate.setUTCMinutes(oldDate.getUTCMinutes());
            newDate.setUTCSeconds(oldDate.getUTCSeconds());
          }
          
          onChange(newDate.toISOString());
        } catch (e) {
          onChange(editValue);
        }
      } else if (type === 'time') {
        // Round to nearest 15 minutes
        try {
          const [hours, minutes] = editValue.split(':');
          const date = new Date();
          date.setHours(parseInt(hours));
          date.setMinutes(Math.round(parseInt(minutes) / 15) * 15);
          date.setSeconds(0);
          onChange(date.toTimeString().split(' ')[0]);
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
      className={`cursor-pointer hover:bg-gray-50 px-2 py-1 -mx-2 rounded transition-colors ${className}`}
    >
      {formatDisplayValue(value)}
    </div>
  );
} 