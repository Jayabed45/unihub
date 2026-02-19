'use client';

import { X, Keyboard } from 'lucide-react';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'General',
      shortcuts: [
        { keys: ['Ctrl', 'K'], description: 'Open Command Palette' },
        { keys: ['Ctrl', '/'], description: 'Show Keyboard Shortcuts' },
        { keys: ['Esc'], description: 'Close Modals / Panels' },
      ],
    },
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['Ctrl', 'P'], description: 'Quick Open (Simulated)' },
        { keys: ['Alt', 'Left'], description: 'Go Back' },
        { keys: ['Alt', 'Right'], description: 'Go Forward' },
      ],
    },
    {
      title: 'Actions',
      shortcuts: [
        { keys: ['Ctrl', 'S'], description: 'Save Changes' },
        { keys: ['Ctrl', 'Z'], description: 'Undo (where supported)' },
        { keys: ['Ctrl', 'Y'], description: 'Redo (where supported)' },
        { keys: ['Ctrl', 'F'], description: 'Find' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <Keyboard className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-800">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">
                {group.title}
              </h3>
              <ul className="space-y-2">
                {group.shortcuts.map((shortcut, idx) => (
                  <li key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="min-w-[24px] px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-600 text-center shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-sm text-center text-gray-500">
          Tip: You can customize these shortcuts in settings (Coming Soon)
        </div>
      </div>
    </div>
  );
}
