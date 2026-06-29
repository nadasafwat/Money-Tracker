import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App, { parseCSVText } from './App';

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
    expect(screen.getByText('Monthly Income')).toBeInTheDocument();
  });
});

describe('parseCSVText CSV Parser', () => {
  it('correctly parses legacy UTF-8 comma-separated CSV with Arabic text', () => {
    const csvContent = 'Date,Type,Category,Payment Method,Amount,Description\n' +
      '2026-06-29,expense,Food,cash,120.50,غداء عمل\n' +
      '2026-06-29,income,Salary,card,5000,راتب شهر يونيو';
    const result = parseCSVText(csvContent);
    expect(result).toHaveLength(2);
    expect(result[0].category).toBe('Food');
    expect(result[0].amount).toBe(120.50);
    expect(result[0].description).toBe('غداء عمل');
    expect(result[0].paymentMethod).toBe('cash');

    expect(result[1].category).toBe('Salary');
    expect(result[1].amount).toBe(5000);
    expect(result[1].description).toBe('راتب شهر يونيو');
    expect(result[1].paymentMethod).toBe('card');
  });

  it('correctly parses legacy UTF-8 semicolon-separated CSV', () => {
    const csvContent = 'Date;Type;Category;Payment Method;Amount;Description\n' +
      '2026-06-29;expense;Food;cash;100;Dinner';
    const result = parseCSVText(csvContent);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Food');
    expect(result[0].amount).toBe(100);
    expect(result[0].description).toBe('Dinner');
  });

  it('correctly parses UTF-16LE tab-separated CSV with Arabic text', () => {
    const csvContent = 'Date\tType\tCategory\tPayment Method\tAmount\tDescription\n' +
      '2026-06-29\texpense\t"طعام"\tcash\t150\t"وجبة غداء"\n' +
      '2026-06-29\tincome\t"الراتب"\tcard\t8000\t"راتب إضافي"';
    const result = parseCSVText(csvContent);
    expect(result).toHaveLength(2);
    expect(result[0].category).toBe('طعام');
    expect(result[0].amount).toBe(150);
    expect(result[0].description).toBe('وجبة غداء');
    
    expect(result[1].category).toBe('الراتب');
    expect(result[1].amount).toBe(8000);
    expect(result[1].description).toBe('راتب إضافي');
  });

  it('removes BOM character if present', () => {
    const csvContent = '\uFEFFDate,Type,Category,Payment Method,Amount,Description\n' +
      '2026-06-29,expense,Food,cash,50,Snack';
    const result = parseCSVText(csvContent);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Food');
    expect(result[0].amount).toBe(50);
  });
});
