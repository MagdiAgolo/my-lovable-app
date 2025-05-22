import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'outline' | 'default';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'md', 
  className,
  ...props 
}) => {
  return (
    <button
      onClick={onClick}
      className={`button ${variant} ${size} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
}; 