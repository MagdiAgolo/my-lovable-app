import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import '../../styles/_colors.scss';

const TEXT = {
  themeLabel: 'Theme',
  darkMode: 'Dark Mode',
  lightMode: 'Light Mode'
};

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-selector-container">
      <label className="theme-selector-label">
        {TEXT.themeLabel}
      </label>
      
      <div className="theme-options">
        {/* Dark Mode Radio Button */}
        <label className="theme-option">
          <input
            type="radio"
            name="theme"
            value="dark"
            checked={theme === 'dark'}
            onChange={() => setTheme('dark')}
            className="theme-radio"
          />
          <div className="theme-option-content">
            <Moon className="theme-icon" />
            <span className="theme-text">{TEXT.darkMode}</span>
          </div>
        </label>

        {/* Light Mode Radio Button */}
        <label className="theme-option">
          <input
            type="radio"
            name="theme"
            value="light"
            checked={theme === 'light'}
            onChange={() => setTheme('light')}
            className="theme-radio"
          />
          <div className="theme-option-content">
            <Sun className="theme-icon" />
            <span className="theme-text">{TEXT.lightMode}</span>
          </div>
        </label>
      </div>
    </div>
  );
}; 