// This is a placeholder file to resolve the module not found error.
// You'll need to implement the actual Heading component here.

import type React from 'react';

interface HeadingProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
}

const Heading: React.FC<HeadingProps> = ({ level = 1, children, className = '' }) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag className={className}>{children}</Tag>;
};

export default Heading;
