import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';

describe('Money Tracker App', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders login screen initially', async () => {
    render(<App />);
    expect(await screen.findByText('Money Tracker')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
  });

  it('allows a user to register and login', async () => {
    render(<App />);
    
    // Switch to register
    fireEvent.click(await screen.findByText(/Don't have an account\? Register/i));
    
    const userinput = screen.getByPlaceholderText('Enter username');
    const passinput = screen.getByPlaceholderText('Enter password');
    const submitBtn = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(userinput, { target: { value: 'testuser' } });
    fireEvent.change(passinput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    // After register, it switches back to login
    expect(await screen.findByRole('button', { name: /Sign In/i })).toBeInTheDocument();

    // Login
    fireEvent.change(userinput, { target: { value: 'testuser' } });
    fireEvent.change(passinput, { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    // Verify Dashboard is visible
    expect(await screen.findByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
  });
});
