'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import CommandPalette from './CommandPalette';
import ShortcutsHelp from './ShortcutsHelp';

interface KeyboardShortcutsContextType {
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openHelp: () => void;
  closeHelp: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
}

export default function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore repeats
      if (e.repeat) return;

      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Ctrl + K or Ctrl + P or Ctrl + Shift + P: Command Palette
      if (
        (e.ctrlKey || e.metaKey) && 
        (
          ['k', 'p'].includes(e.key.toLowerCase()) || 
          ['KeyK', 'KeyP'].includes(e.code)
        )
      ) {
        // Check for Ctrl + Shift + P specifically or just Ctrl + P
        // VS Code uses Ctrl+Shift+P for Command Palette, Ctrl+P for Quick Open
        // We'll map both to Command Palette for now
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ctrl + /: Help
      if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.code === 'Slash' || e.code === 'Question')) {
        e.preventDefault();
        e.stopPropagation();
        setIsHelpOpen((prev) => !prev);
        return;
      }

      // Esc: Close all
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (isCommandPaletteOpen || isHelpOpen) {
            e.preventDefault();
            e.stopPropagation();
            if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
            if (isHelpOpen) setIsHelpOpen(false);
        }
        return;
      }
      
      // Ctrl + S: Prevent browser save (Simulate save)
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 's' || e.code === 'KeyS')) {
        e.preventDefault();
        e.stopPropagation();
        // Dispatch a custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('unihub-shortcut-save'));
        return;
      }
      
      // Ctrl + Z / Ctrl + Y: Undo/Redo (Prevent browser default if needed, or allow it)
      // For now, let's just log or dispatch event
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'z' || e.code === 'KeyZ')) {
          // If Shift is pressed, it's Redo
          if (e.shiftKey) {
             // Redo logic
          } else {
             // Undo logic
          }
      }
    };

    // Use capture phase to ensure we get the event before other listeners
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isCommandPaletteOpen, isHelpOpen]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        openCommandPalette: () => setIsCommandPaletteOpen(true),
        closeCommandPalette: () => setIsCommandPaletteOpen(false),
        openHelp: () => setIsHelpOpen(true),
        closeHelp: () => setIsHelpOpen(false),
      }}
    >
      {children}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <ShortcutsHelp isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </KeyboardShortcutsContext.Provider>
  );
}
