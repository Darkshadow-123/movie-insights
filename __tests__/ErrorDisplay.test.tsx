import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDisplay } from '../app/components/common/ErrorDisplay';

describe('ErrorDisplay', () => {
  it('renders the error message and title', () => {
    render(<ErrorDisplay message="Network error" onRetry={() => {}} />);

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls onRetry when the button is clicked', () => {
    const onRetry = jest.fn();

    render(<ErrorDisplay message="Network error" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

