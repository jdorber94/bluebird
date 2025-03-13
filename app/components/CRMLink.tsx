'use client';

import React, { useState, useEffect } from 'react';
import { Input } from "@/app/ui/input";
import { Button } from "@/app/ui/button";
import { Link, Plus, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/app/ui/popover";

interface CRMLinkProps {
  url: string | null;
  onChange: (url: string | null) => void;
  className?: string;
}

export default function CRMLink({ url, onChange, className }: CRMLinkProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(url || '');
  const [showEditIcon, setShowEditIcon] = useState(false);

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

  const handleRemove = () => {
    onChange(null);
    setInputValue('');
    setIsEditing(false);
  };

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
    <div 
      className="flex items-center gap-1 relative group"
      onMouseEnter={() => setShowEditIcon(true)}
      onMouseLeave={() => setShowEditIcon(false)}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.open(url, '_blank')}
        className={cn("text-blue-600 hover:text-blue-800", className)}
      >
        <Link className="h-4 w-4" />
      </Button>

      <Popover open={isEditing} onOpenChange={setIsEditing}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              "absolute right-0 -mr-6 text-gray-400 hover:text-gray-600",
              className
            )}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter URL or CRM ID"
                className="w-full"
                autoFocus
              />
            </div>
            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="text-red-600 hover:text-red-700"
              >
                Remove
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 