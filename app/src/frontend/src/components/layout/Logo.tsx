import React from 'react';
import logoImage from '../../assets/images/logo.png';
import logoDarkModeImage from '../../assets/images/logoDarkMode.png';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'large' }) => {
  const sizeClasses = {
    small: 'h-8',
    medium: 'h-12',
    large: 'h-20'
  };

  return (
    <div className={`flex items-center ${className}`}>
      {/* Light mode logo */}
      <img 
        src={logoImage} 
        alt="AllocAid - TA Allocation and Management System" 
        className={`block dark:hidden w-auto object-contain transition-opacity duration-150 hover:opacity-80 ${sizeClasses[size]}`}
      />
      {/* Dark mode logo */}
      <img 
        src={logoDarkModeImage} 
        alt="AllocAid - TA Allocation and Management System" 
        className={`hidden dark:block w-auto object-contain transition-opacity duration-150 hover:opacity-80 ${sizeClasses[size]}`}
      />
    </div>
  );
}; 