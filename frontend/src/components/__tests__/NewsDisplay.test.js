// src/components/__tests__/NewsDisplay.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import NewsDisplay from '../NewsDisplay';

const sampleArticles = [
  {
    title: 'Weather breakthrough in city',
    url: 'http://news.example.com/article1',
    publishedAt: new Date('2025-01-01T12:00:00Z').toISOString(),
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    urlToImage: 'http://news.example.com/image1.jpg',
  },
  {
    title: 'Storm warning for coastal areas',
    url: 'http://news.example.com/article2',
    publishedAt: new Date('2025-01-02T15:00:00Z').toISOString(),
    content: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    urlToImage: 'http://news.example.com/image2.jpg',
  },
];

describe('NewsDisplay Component', () => {
  it('renders fallback message when no articles are provided', () => {
    render(<NewsDisplay articles={[]} />);
    expect(screen.getByText(/No news available/i)).toBeInTheDocument();
  });

  it('renders header and news cards when articles are provided', () => {
    render(<NewsDisplay articles={sampleArticles} />);
    // Check that the header is rendered.
    expect(screen.getByText(/Latest Weather News/i)).toBeInTheDocument();

    // Because react-slick clones slides, we use getAllByText and simply check that at least one instance exists.
    const breakthroughElements = screen.getAllByText(/Weather breakthrough in city/i);
    expect(breakthroughElements.length).toBeGreaterThan(0);

    const stormElements = screen.getAllByText(/Storm warning for coastal areas/i);
    expect(stormElements.length).toBeGreaterThan(0);
  });
});
    