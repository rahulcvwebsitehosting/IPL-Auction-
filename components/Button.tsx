
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  className?: string;
  disabled?: boolean;
  // Added style property to allow inline styling
  style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  // Destructure style property
  style 
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20",
    ghost: "bg-transparent hover:bg-white/10 text-white",
    outline: "border-2 border-slate-600 hover:border-slate-400 text-white"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled}
      // Apply style property to the button element
      style={style}
    >
      {children}
    </button>
  );
};

export default Button;
