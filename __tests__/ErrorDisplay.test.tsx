// __tests__/ErrorDisplay.test.tsx  
import React from 'react';  
import { render, screen, fireEvent } from '@testing-library/react';  
import { ErrorDisplay } from '../app/components/common/ErrorDisplay';  
  
// Mock next/link since Jest doesn't have Next.js routing context  
jest.mock('next/link', () => {  
  return ({ children, href }: { children: React.ReactNode; href: string }) => (  
    <a href={href}>{children}</a>  
  );  
});  
  
describe('ErrorDisplay', () => {  
  it('renders the default title and message', () => {  
    render(<ErrorDisplay message="Network error" />);  
  
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();  
    expect(screen.getByText('Network error')).toBeInTheDocument();  
  });  
  
  it('renders a custom title', () => {  
    render(<ErrorDisplay message="Not found" title="Movie Not Found" />);  
  
    expect(screen.getByText('Movie Not Found')).toBeInTheDocument();  
    expect(screen.getByText('Not found')).toBeInTheDocument();  
  });  
  
  it('renders the Try Again button', () => {  
    render(<ErrorDisplay message="Error" />);  
  
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();  
  });  
  
  it('calls onRetry when the button is clicked', () => {  
    const onRetry = jest.fn();  
    render(<ErrorDisplay message="Error" onRetry={onRetry} />);  
  
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));  
  
    expect(onRetry).toHaveBeenCalledTimes(1);  
  });  
  
  it('calls window.location.reload by default when no onRetry is provided', () => {  
    const reloadMock = jest.fn();  
    Object.defineProperty(window, 'location', {  
      value: { reload: reloadMock },  
      writable: true,  
    });  
  
    render(<ErrorDisplay message="Error" />);  
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));  
  
    expect(reloadMock).toHaveBeenCalledTimes(1);  
  });  
  
  it('renders a Go Home link pointing to /', () => {  
    render(<ErrorDisplay message="Error" />);  
  
    const link = screen.getByRole('link', { name: /go home/i });  
    expect(link).toBeInTheDocument();  
    expect(link).toHaveAttribute('href', '/');  
  });  
  
  it('renders the movie emoji icon', () => {  
    render(<ErrorDisplay message="Error" />);  
  
    expect(screen.getByText('🎬')).toBeInTheDocument();  
  });  
});