import { render, screen } from '@testing-library/react';
 import { vi } from 'vitest';
 import NewsDisplay from '../NewsDisplay';
 import { NewsArticle } from '../../types/types';
 
 // Mock Slider from react-slick to just render children
 vi.mock('react-slick', () => ({
   default: (props: any) => <div data-testid="slider">{props.children}</div>,
 }));
 
 describe('NewsDisplay Component', () => {
   test('renders no news message when articles array is empty', () => {
     render(<NewsDisplay articles={[]} loading={false} />);
     expect(screen.getByText('No news available.')).toBeInTheDocument();
   });
 
   test('renders slider and correct number of news cards', () => {
     const articles: NewsArticle[] = [
       {
         title: 'Sunny Day Forecast',
         url: 'https://example.com/sunny',
         urlToImage: 'https://example.com/image1.jpg',
         publishedAt: '2023-01-01T12:00:00Z',
         content: 'A detailed forecast for a sunny day.',
       },
       {
         title: 'Rainy Evening Update',
         url: 'https://example.com/rainy',
         urlToImage: '',
         publishedAt: '2023-02-15T08:30:00Z',
         content: 'An update on the rainy evening weather.',
       },
     ];
     render(<NewsDisplay articles={articles} loading={false} />);
 
     // Slider is rendered
     expect(screen.getByTestId('slider')).toBeInTheDocument();
 
     // Two links with correct hrefs
     const links = screen.getAllByRole('link');
     expect(links).toHaveLength(2);
     expect(links[0]).toHaveAttribute('href', articles[0].url);
     expect(links[1]).toHaveAttribute('href', articles[1].url);
 
     // target and rel attributes for security
     links.forEach(link => {
       expect(link).toHaveAttribute('target', '_blank');
       expect(link).toHaveAttribute('rel', 'noopener noreferrer');
     });
   });
 
   test('renders image when urlToImage is provided', () => {
     const article: NewsArticle = {
       title: 'Storm Warning',
       url: 'https://example.com/storm',
       urlToImage: 'https://example.com/storm.jpg',
       publishedAt: '2023-03-10T09:45:00Z',
       content: 'A warning about an upcoming storm.',
     };
     render(<NewsDisplay articles={[article]} loading={false} />);
 
     const img = screen.getByRole('img');
     expect(img).toHaveAttribute('src', article.urlToImage);
     expect(img).toHaveAttribute('alt', article.title);
   });
 
   test('does not render image container when urlToImage is empty', () => {
     const article: NewsArticle = {
       title: 'Clear Night',
       url: 'https://example.com/clear',
       urlToImage: '',
       publishedAt: '2023-04-05T22:15:00Z',
       content: 'A clear night with no clouds in sight.',
     };
     render(<NewsDisplay articles={[article]} loading={false} />);
 
     // No img in the document
     expect(screen.queryByRole('img')).toBeNull();
   });
 
   test('formats and displays published date', () => {
     const article: NewsArticle = {
       title: 'Morning Dew',
       url: 'https://example.com/dew',
       urlToImage: '',
       publishedAt: '2023-05-20T06:00:00Z',
       content: 'A serene morning with dew on the grass.',
     };
     render(<NewsDisplay articles={[article]} loading={false} />);
 
     const dateString = new Date(article.publishedAt).toLocaleDateString();
     expect(screen.getByText(dateString, { exact: false })).toBeInTheDocument();
   });
 });
