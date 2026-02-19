'use client';

import { Search, Command, ArrowRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  category: 'Navigation' | 'Action' | 'System';
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      category: 'Navigation',
      action: () => router.push('/project-leader/dashboard'),
    },
    {
      id: 'nav-projects',
      label: 'Go to Projects',
      category: 'Navigation',
      action: () => router.push('/project-leader/projects'),
    },
    {
      id: 'nav-participants',
      label: 'Go to Participants',
      category: 'Navigation',
      action: () => router.push('/project-leader/participants'),
    },
    {
      id: 'act-new-project',
      label: 'Create New Project',
      shortcut: 'Ctrl+N',
      category: 'Action',
      action: () => {
        // Logic to trigger create modal would go here
        // For now, redirect to projects page
        router.push('/project-leader/projects?action=create');
      },
    },
    {
      id: 'sys-toggle-theme',
      label: 'Toggle Theme',
      category: 'System',
      action: () => console.log('Toggle theme'),
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[60vh]">
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <Search className="h-5 w-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 text-lg"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs text-gray-500 font-mono">
            Esc
          </kbd>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No commands found.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Command className={`h-4 w-4 ${index === selectedIndex ? 'text-indigo-500' : 'text-gray-400'}`} />
                    <span className="font-medium">{cmd.label}</span>
                  </div>
                  {cmd.shortcut && (
                    <span className="text-xs text-gray-400 font-mono">{cmd.shortcut}</span>
                  )}
                  {index === selectedIndex && (
                     <ArrowRight className="h-4 w-4 text-indigo-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
          <span>
            <strong className="font-medium text-gray-700">↑↓</strong> to navigate
          </span>
          <span>
            <strong className="font-medium text-gray-700">Enter</strong> to select
          </span>
        </div>
      </div>
    </div>
  );
}
