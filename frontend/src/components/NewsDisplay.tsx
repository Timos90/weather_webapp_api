import React from 'react';
import Slider from "react-slick";
import { NewsDisplayProps } from '../types/types';
import '../css/NewsDisplay.css';
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";

const NewsDisplay: React.FC<NewsDisplayProps> = ({ articles }) => {
  if (articles.length === 0) {
    return <div className="news-display no-news">No news available.</div>;
  }

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    slidesToShow: 2,
    slidesToScroll: 1,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 1 } },
      { breakpoint: 600, settings: { slidesToShow: 1 } }
    ]
  };

  return (
    <div className="news-display">
      <h2>Latest Weather News</h2>
      <Slider {...settings} className="news-slider">
        {articles.map((article, index) => (
          <a 
            key={index}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-card"
          >
            {article.urlToImage && (
              <div className="news-image-container">
                <img 
                  src={article.urlToImage} 
                  alt={article.title} 
                  className="news-image" 
                />
              </div>
            )}
            <div className="news-details">
              <h3 className="news-title">{article.title}</h3>
              <p className="news-date">
                <em>{new Date(article.publishedAt).toLocaleDateString()}</em>
              </p>
            </div>
          </a>
        ))}
      </Slider>
    </div>
  );
};

export default NewsDisplay;
