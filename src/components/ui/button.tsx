import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'outline' | 'default' | 'primary';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'md', 
  className,
  disabled,
  ...props 
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'outline':
        return 'bg-black border border-gray-600 text-white hover:bg-gray-900 hover:border-gray-500';
      case 'primary':
        return 'bg-black text-green-400 hover:bg-gray-900 border border-primary hover:text-green-300 focus:ring-offset-primary/20';
      default:
        return 'bg-black text-white hover:bg-gray-900';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'xs':
        return 'px-2 py-1 text-xs';
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-5 py-3 text-lg';
      default: // md
        return 'px-4 py-2 text-base';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900 ${getVariantClass()} ${getSizeClass()} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
}; 