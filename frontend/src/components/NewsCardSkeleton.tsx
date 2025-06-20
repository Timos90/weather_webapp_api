import React from 'react';
import '../css/NewsDisplay.css'; // Re-using the same CSS file for shimmer effect

const NewsCardSkeleton: React.FC = () => {
  return (
    <div className="news-card-skeleton">
      <div className="skeleton-image shimmer"></div>
      <div className="skeleton-details">
        <div className="skeleton-title shimmer"></div>
        <div className="skeleton-date shimmer"></div>
      </div>
    </div>
  );
};

export default NewsCardSkeleton;
