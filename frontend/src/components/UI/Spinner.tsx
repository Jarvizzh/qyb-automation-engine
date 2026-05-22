import React from 'react';

interface SpinnerProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Spinner: React.FC<SpinnerProps> = ({ className = '', style }) => {
  return <div className={`loading-spinner ${className}`} style={style}></div>;
};
