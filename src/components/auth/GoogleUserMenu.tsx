import React, { useState, useRef, useEffect } from 'react';
import { useGoogleAuth } from '../../context/GoogleAuthContext';
import { LogOut, ChevronDown } from 'lucide-react';

export const GoogleUserMenu: React.FC = () => {
  const { user, logout } = useGoogleAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-full transition-colors hover:bg-gray-800 p-1"
        aria-label="User menu"
        tabIndex={0}
      >
        <img 
          src={user.picture} 
          alt={user.name} 
          className="h-6 w-6 rounded-full border border-gray-700"
          onError={(e) => {
            // Fallback if image fails to load
            e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name);
          }}
        />
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-8 mt-1 w-48 rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="p-2 border-b border-gray-700">
            <p className="text-xs font-medium text-green-400 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <div className="p-1">
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs bg-black hover:bg-gray-900 border border-primary text-green-400 hover:text-green-300"
              aria-label="Sign out"
              tabIndex={0}
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 