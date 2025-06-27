import React, { useState } from 'react';
import styles from './SourceBubble.module.css';

interface SourceBubbleProps {
  href: string;
  children: React.ReactNode;
}

const SourceBubble: React.FC<SourceBubbleProps> = ({ href }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'link';
    }
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    } catch {
      return null;
    }
  };

  const domain = getDomain(href);
  const faviconUrl = getFaviconUrl(href);

  return (
    <span className={styles.container}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.bubble}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className={styles.iconContainer}>
          {faviconUrl && !imageError ? (
            <img
              src={faviconUrl}
              alt=""
              className={styles.favicon}
              onError={() => setImageError(true)}
            />
          ) : (
            <svg className={styles.defaultIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          )}
        </span>
        <span className={`${styles.tooltip} ${isHovered ? styles.visible : ''}`}>
          {domain}
        </span>
      </a>
    </span>
  );
};

export default SourceBubble;