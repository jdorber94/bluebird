'use client';

import React, { useState, useEffect } from 'react';
import { Input } from "@/app/ui/input";
import { Button } from "@/app/ui/button";
import { Link, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CRMLinkProps {
  url: string | null;
  onChange: (url: string | null) => void;
  className?: string;
}

export default function CRMLink({ url, onChange, className }: CRMLinkProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(url || '');

  // Update local state when url prop changes
  useEffect(() => {
    console.log('CRMLink: URL prop changed:', { oldValue: inputValue, newValue: url });
    setInputValue(url || '');
  }, [url]);

  const handleSave = () => {
    let finalUrl = inputValue.trim();
    console.log('CRMLink: Starting save process with value:', finalUrl);
    
    // If it's just a number, assume it's a CRM ID and construct the full URL
    if (/^\d+$/.test(finalUrl)) {
      finalUrl = `https://crm.example.com/demo/${finalUrl}`;
      console.log('CRMLink: Converted ID to URL:', finalUrl);
    }
    
    // If it's not empty and doesn't start with http(s), assume https
    if (finalUrl && !finalUrl.startsWith('http')) {
      finalUrl = `https://${finalUrl}`;
      console.log('CRMLink: Added https:// prefix:', finalUrl);
    }
    
    console.log('CRMLink: Calling onChange with final URL:', finalUrl);
    onChange(finalUrl || null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(url || '');
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder="Enter URL or CRM ID"
          className="w-full"
          autoFocus
        />
      </div>
    );
  }

  if (!url) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsEditing(true)}
        className={cn("text-gray-500 hover:text-gray-700", className)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => window.open(url, '_blank')}
      className={cn("text-blue-600 hover:text-blue-800", className)}
    >
      <Link className="h-4 w-4" />
    </Button>
  );
} 