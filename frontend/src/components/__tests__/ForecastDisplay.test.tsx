import { render, screen, fireEvent, within } from '@testing-library/react';
import ForecastDisplay from '../ForecastDisplay';
import { ForecastItem } from '../../types/types';

const mockData: ForecastItem[] = [
  {
    day_name: 'Monday',
    date: '2025-01-01',
    uv_index: 3,
    sunrise: '06:30',
    sunset: '18:00',
    forecasts: [
      {
        datetime: '2025-01-01 09:00:00',
        temperature: 15,
        feels_like: 16,
        temp_min: 10,
        temp_max: 20,
        humidity: 50,
        wind_speed: 5,
        weather_icon: '01d',
        weather_description: 'Clear sky',
      },
      {
        datetime: '2025-01-01 12:00:00',
        temperature: 18,
        feels_like: 17,
        temp_min: 12,
        temp_max: 22,
        humidity: 55,
        wind_speed: 4,
        weather_icon: '02d',
        weather_description: 'Few clouds',
      },
    ],
  },
  {
    day_name: 'Tuesday',
    date: '2025-01-02',
    uv_index: 4,
    sunrise: '06:31',
    sunset: '18:01',
    forecasts: [
      {
        datetime: '2025-01-02 09:00:00',
        temperature: 12,
        feels_like: 13,
        temp_min: 8,
        temp_max: 15,
        humidity: 60,
        wind_speed: 6,
        weather_icon: '03d',
        weather_description: 'Scattered clouds',
      },
    ],
  },
];

describe('ForecastDisplay Component', () => {
  it('shows a no-data message when data is empty or missing', () => {
    const { rerender } = render(<ForecastDisplay data={[]} unit="C" />);
    expect(screen.getByText(/no forecast data available/i)).toBeInTheDocument();

    // @ts-expect-error
    rerender(<ForecastDisplay unit="C" />);
    expect(screen.getByText(/no forecast data available/i)).toBeInTheDocument();
  });

  it('renders header, tabs and default day’s forecasts in °C', () => {
    render(<ForecastDisplay data={mockData} unit="C" />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('5-Day Forecast');
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Tuesday')).toBeInTheDocument();

    // cast to HTMLElement here
    const firstRow = screen.getAllByText('09:00')[0]
      .closest('.forecast-item')! as HTMLElement;

    expect(within(firstRow).getByText('15.0°C')).toBeInTheDocument();
    const img = within(firstRow).getByRole('img', { name: /clear sky/i }) as HTMLImageElement;
    expect(img.src).toContain('01d@2x.png');
    expect(within(firstRow).getByText('Clear sky')).toBeInTheDocument();
  });

  it('switches to another day when its tab is clicked', () => {
    render(<ForecastDisplay data={mockData} unit="C" />);
    fireEvent.click(screen.getByText('Tuesday'));

    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.queryByText('12:00')).not.toBeInTheDocument();
  });

  it('expands and collapses forecast‐item details with correct formatting in °C', () => {
    render(<ForecastDisplay data={mockData} unit="C" />);
    const firstItem = screen.getAllByText('09:00')[0]
      .closest('.forecast-item')! as HTMLElement;

    fireEvent.click(firstItem);
    expect(within(firstItem).getByText('▲')).toBeInTheDocument();

    const feelsP = screen.getByText('Feels Like:').closest('p')!;
    expect(feelsP).toHaveTextContent('16.0°C');

    const minP = screen.getByText('Min:').closest('p')!;
    expect(minP).toHaveTextContent('10.0°C');

    const maxP = screen.getByText('Max:').closest('p')!;
    expect(maxP).toHaveTextContent('20.0°C');

    const humidityP = screen.getByText('Humidity:').closest('p')!;
    expect(humidityP).toHaveTextContent('50%');

    const windP = screen.getByText('Wind Speed:').closest('p')!;
    expect(windP).toHaveTextContent('5.0 m/s');

    const uvP = screen.getByText('UV Index:').closest('p')!;
    expect(uvP).toHaveTextContent('3');

    const sunrP = screen.getByText('Sunrise:').closest('p')!;
    expect(sunrP).toHaveTextContent('06:30');

    const sunsP = screen.getByText('Sunset:').closest('p')!;
    expect(sunsP).toHaveTextContent('18:00');

    fireEvent.click(sunsP);
    expect(screen.queryByText('Feels Like:')).not.toBeInTheDocument();
  });

  it('formats temperatures and wind speeds in °F when unit="F"', () => {
    render(<ForecastDisplay data={mockData} unit="F" />);
    const firstItem = screen.getAllByText('09:00')[0]
      .closest('.forecast-item')! as HTMLElement;

    expect(within(firstItem).getByText('15.0°F')).toBeInTheDocument();

    fireEvent.click(firstItem);

    const feelsP = screen.getByText('Feels Like:').closest('p')!;
    expect(feelsP).toHaveTextContent('16.0°F');

    const minP = screen.getByText('Min:').closest('p')!;
    expect(minP).toHaveTextContent('10.0°F');

    const maxP = screen.getByText('Max:').closest('p')!;
    expect(maxP).toHaveTextContent('20.0°F');

    const windP = screen.getByText('Wind Speed:').closest('p')!;
    expect(windP).toHaveTextContent('5.0 mph');
  });
});
