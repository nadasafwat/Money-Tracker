import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Pencil,
  Settings as SettingsIcon, 
  LogOut, 
  Trash2, 
  Download, 
  Upload, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard,
  Filter,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from 'recharts';
import { cn } from './lib/utils';
import { Transaction, TransactionType, PaymentMethod, CATEGORIES, UserSettings } from './types';

// --- Constants ---
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e', '#6366f1'];

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ baseIncome: 0 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [notification, setNotification] = useState<{ 
    isOpen: boolean; 
    message: string; 
    type: 'success' | 'error' | 'info'; 
  }>({
    isOpen: false,
    message: '',
    type: 'info',
  });
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void; 
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ isOpen: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, isOpen: false }));
    }, 3000);
  };

  // --- Auth Logic ---
  useEffect(() => {
    console.log("App initialized, checking auth...");
    try {
      const session = sessionStorage.getItem('currentUser');
      if (session) {
        setCurrentUser(session);
        loadUserData(session);
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
    } finally {
      setIsAuthReady(true);
      console.log("Auth check complete.");
    }
  }, []);

  const loadUserData = (user: string) => {
    try {
      const txData = localStorage.getItem(`tx_${user}`);
      const setData = localStorage.getItem(`set_${user}`);
      if (txData) setTransactions(JSON.parse(txData));
      if (setData) setSettings(JSON.parse(setData));
    } catch (error) {
      console.error("Error loading user data:", error);
      showNotification("Error loading saved data", "error");
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return showNotification("Please fill all fields", "error");

    try {
      const users = JSON.parse(localStorage.getItem('users') || '{}');

      if (authMode === 'register') {
        if (users[username]) return showNotification("Username already exists", "error");
        users[username] = password;
        localStorage.setItem('users', JSON.stringify(users));
        showNotification("Registration successful! Please login.", "success");
        setAuthMode('login');
      } else {
        if (users[username] === password) {
          sessionStorage.setItem('currentUser', username);
          setCurrentUser(username);
          loadUserData(username);
        } else {
          showNotification("Invalid username or password", "error");
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      showNotification("Authentication system error", "error");
    }
  };

  const logout = () => {
    sessionStorage.removeItem('currentUser');
    setCurrentUser(null);
    setTransactions([]);
    setSettings({ baseIncome: 0 });
  };

  // --- Data Persistence ---
  const saveTransactions = (newTx: Transaction[]) => {
    setTransactions(newTx);
    if (currentUser) {
      localStorage.setItem(`tx_${currentUser}`, JSON.stringify(newTx));
    }
  };

  const saveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    if (currentUser) {
      localStorage.setItem(`set_${currentUser}`, JSON.stringify(newSettings));
    }
  };

  // --- Transaction Logic ---
  const handleAddTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newTx: Transaction = {
      id: editingTx?.id || Date.now().toString(),
      date: formData.get('date') as string,
      amount: parseFloat(formData.get('amount') as string),
      category: formData.get('category') as string,
      type: formData.get('type') as TransactionType,
      paymentMethod: formData.get('paymentMethod') as PaymentMethod,
      description: formData.get('description') as string,
    };

    // Duplicate detection
    if (!editingTx) {
      const isDuplicate = transactions.some(t => 
        t.date === newTx.date && 
        t.amount === newTx.amount && 
        t.category === newTx.category &&
        t.type === newTx.type
      );
      if (isDuplicate) {
        setConfirmModal({
          isOpen: true,
          title: 'Duplicate Transaction',
          message: 'A similar transaction already exists. Save anyway?',
          onConfirm: () => {
            const updated = [...transactions, newTx];
            saveTransactions(updated);
            setIsModalOpen(false);
            setEditingTx(null);
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
        });
        return;
      }
    }

    const updated = editingTx 
      ? transactions.map(t => t.id === editingTx.id ? newTx : t)
      : [...transactions, newTx];
    
    saveTransactions(updated);
    setIsModalOpen(false);
    setEditingTx(null);
  };

  const deleteTransaction = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction?',
      onConfirm: () => {
        saveTransactions(transactions.filter(t => t.id !== id));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // --- Calculations ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const m = t.date.substring(0, 7);
      const typeMatch = typeFilter === 'all' || t.type === typeFilter;
      const categoryMatch = categoryFilters.length === 0 || categoryFilters.includes(t.category);
      return m === selectedMonth && typeMatch && categoryMatch;
    });
  }, [transactions, selectedMonth, typeFilter, categoryFilters]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => {
      if (t.date.startsWith(selectedMonth)) {
        if (typeFilter === 'all' || t.type === typeFilter) {
          cats.add(t.category);
        }
      }
    });
    return Array.from(cats);
  }, [transactions, selectedMonth, typeFilter]);

  const toggleCategoryFilter = (cat: string) => {
    setCategoryFilters(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const summary = useMemo(() => {
    let income = parseFloat(settings.baseIncome.toString()) || 0;
    let expense = 0;
    let cash = income; // Assume base income is cash for simplicity or user preference
    let card = 0;

    filteredTransactions.forEach(t => {
      const amt = t.amount;
      if (t.type === 'income') {
        income += amt;
        if (t.paymentMethod === 'cash') cash += amt; else card += amt;
      } else {
        expense += amt;
        if (t.paymentMethod === 'cash') cash -= amt; else card -= amt;
      }
    });

    return { totalIncome: income, totalExpense: expense, balance: cash + card, cash, card };
  }, [filteredTransactions, settings.baseIncome]);

  // --- Charts Data ---
  const categoryData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const totals = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const paymentData = useMemo(() => {
    const totals = filteredTransactions.reduce((acc, t) => {
      acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const trendData = useMemo(() => {
    const year = selectedMonth.substring(0, 4);
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = (i + 1).toString().padStart(2, '0');
      const monthStr = `${year}-${m}`;
      const monthTxs = transactions.filter(t => t.date.startsWith(monthStr));
      const inc = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) + (parseFloat(settings.baseIncome.toString()) || 0);
      const exp = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return {
        name: new Date(year + '-' + m + '-01').toLocaleString('default', { month: 'short' }),
        income: inc,
        expense: exp
      };
    });
    return months;
  }, [transactions, selectedMonth, settings.baseIncome]);

  // --- CSV Logic ---
  const parseCSVText = (text: string): Transaction[] => {
    if (text.startsWith('\uFEFF')) {
      text = text.substring(1);
    }

    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length <= 1) return [];

    const separator = lines[0].includes(';') ? ';' : ',';

    // Parse a single CSV line respecting quoted fields
    const parseLine = (line: string): string[] => {
      const regex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
      return line.split(regex).map(p => p.replace(/^"|"$/g, '').trim());
    };

    // Build a column-index map from the header row (case-insensitive, flexible names)
    const headerParts = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ''));
    const col = (names: string[]): number => {
      for (const name of names) {
        const idx = headerParts.indexOf(name.toLowerCase().replace(/\s+/g, ''));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const dateIdx   = col(['date']);
    const typeIdx   = col(['type']);
    const amtIdx    = col(['amount', 'amt']);
    const catIdx    = col(['category', 'cat']);
    const pmIdx     = col(['paymentmethod', 'payment method', 'payment', 'method']);
    const descIdx   = col(['description', 'desc', 'note', 'notes']);

    // All required columns must be found
    if ([dateIdx, typeIdx, amtIdx, catIdx].some(i => i === -1)) return [];

    const allCategories = [...CATEGORIES.expense, ...CATEGORIES.income];
    const findCategory = (cat: string) => {
      const trimmed = cat.trim();
      const match = allCategories.find(c => c.trim().toLowerCase() === trimmed.toLowerCase());
      return match || trimmed;
    };

    const formatDate = (dateStr: string) => {
      if (!dateStr) return new Date().toISOString().substring(0, 10);
      const parts = dateStr.split(/[-/.]/);
      if (parts.length === 3) {
        const [p1, p2, p3] = parts;
        if (p1.length === 4) return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
        // Assume M/D/YYYY
        return `${p3}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
      }
      return dateStr;
    };

    const newTxs: Transaction[] = [];
    for (const line of lines.slice(1)) {
      const parts = parseLine(line);
      if (parts.length < 4) continue;

      const dateRaw        = parts[dateIdx] || '';
      const typeRaw        = parts[typeIdx]  || '';
      const categoryRaw    = catIdx  !== -1 ? parts[catIdx]  || '' : '';
      const paymentRaw     = pmIdx   !== -1 ? parts[pmIdx]   || '' : '';
      const amountStr      = parts[amtIdx]  || '';
      const descriptionRaw = descIdx !== -1 ? parts[descIdx] || '' : '';

      const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
      if (isNaN(amount)) continue;

      const type = typeRaw.toLowerCase();
      const paymentMethod = paymentRaw.toLowerCase();

      newTxs.push({
        id: Math.random().toString(36).substr(2, 9),
        date: formatDate(dateRaw),
        type: (type === 'income' || type === 'expense') ? type : 'expense',
        category: findCategory(categoryRaw),
        paymentMethod: (paymentMethod === 'cash' || paymentMethod === 'card') ? paymentMethod : 'cash',
        amount: amount,
        description: descriptionRaw.replace(/""/g, '"'),
      });
    }
    return newTxs;
  };

  const exportCSV = () => {
    let csv = "Date,Type,Category,Payment Method,Amount,Description\n";
    transactions.forEach(t => {
      csv += `${t.date},${t.type},"${t.category}",${t.paymentMethod},${t.amount},"${t.description.replace(/"/g, '""')}"\n`;
    });

    // Explicitly encode as UTF-8 bytes so Arabic characters are preserved correctly.
    // The BOM is prepended as raw bytes (0xEF 0xBB 0xBF) — not as a string — to
    // guarantee Excel opens the file in UTF-8 mode regardless of the browser.
    const encoder = new TextEncoder(); // always outputs UTF-8
    const utf8Bytes = encoder.encode(csv);
    const bomBytes = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bomBytes, utf8Bytes], { type: 'text/csv;charset=UTF-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_${currentUser}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const newTxs = parseCSVText(text);

        if (newTxs.length === 0) {
          showNotification("No valid transactions found. Check your CSV format.", "error");
          return;
        }

        saveTransactions([...transactions, ...newTxs]);
        showNotification(`Successfully imported ${newTxs.length} transactions.`, "success");
      } catch (error) {
        console.error("CSV Import Error:", error);
        showNotification("Failed to import CSV. Please check the file format.", "error");
      }
      e.target.value = '';
    };
    reader.onerror = () => {
      showNotification("Error reading file.", "error");
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return showNotification("Please paste some CSV data.", "error");
    
    try {
      const newTxs = parseCSVText(bulkText);
      if (newTxs.length === 0) {
        showNotification("No valid transactions found in the text.", "error");
        return;
      }
      saveTransactions([...transactions, ...newTxs]);
      showNotification(`Successfully imported ${newTxs.length} transactions.`, "success");
      setIsBulkImportOpen(false);
      setBulkText('');
    } catch (error) {
      showNotification("Failed to parse data.", "error");
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold mb-2">Money Tracker</h2>
        <p className="opacity-80">Preparing your dashboard...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="text-indigo-600 w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Money Tracker</h1>
            <p className="text-gray-500">Track your wealth, wisely.</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="Enter password"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition shadow-lg"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-indigo-600 font-medium hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-indigo-600 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            <span className="text-xl font-bold tracking-tight">Money Tracker</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setEditingTx(null); setIsModalOpen(true); }}
              className="bg-white text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition shadow-sm"
            >
              <Plus className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-indigo-500 rounded-full transition"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
            <button 
              onClick={logout}
              className="p-2 hover:bg-indigo-500 rounded-full transition"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Dashboard Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden"
          >
            <div className="relative z-10">
              <p className="text-indigo-100 text-sm font-medium">Total Balance</p>
              <h2 className="text-3xl font-bold mt-1">EP {summary.balance.toFixed(2)}</h2>
              <div className="mt-4 flex justify-between text-sm text-indigo-100 border-t border-indigo-500 pt-3">
                <div className="flex items-center gap-1">
                  <Wallet className="w-4 h-4 opacity-70" />
                  <span>Cash: <b>EP {summary.cash.toFixed(2)}</b></span>
                </div>
                <div className="flex items-center gap-1">
                  <CreditCard className="w-4 h-4 opacity-70" />
                  <span>Card: <b>EP {summary.card.toFixed(2)}</b></span>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Wallet className="w-32 h-32" />
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <TrendingUp className="text-emerald-600 w-5 h-5" />
              </div>
              <p className="text-gray-500 text-sm font-medium">Monthly Income</p>
            </div>
            <h2 className="text-2xl font-bold text-emerald-600">EP {summary.totalIncome.toFixed(2)}</h2>
            <p className="text-xs text-gray-400 mt-2">Includes base salary + extra</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-rose-100 p-2 rounded-lg">
                <TrendingDown className="text-rose-600 w-5 h-5" />
              </div>
              <p className="text-gray-500 text-sm font-medium">Monthly Expenses</p>
            </div>
            <h2 className="text-2xl font-bold text-rose-600">EP {summary.totalExpense.toFixed(2)}</h2>
            <p className="text-xs text-gray-400 mt-2">Total tracked this month</p>
          </motion.div>
        </section>

        {/* Filters */}
        <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Filter className="w-4 h-4 text-gray-400" />
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCategoryFilters([]);
                }}
                className="bg-transparent border-none focus:ring-0 text-gray-700 font-medium cursor-pointer"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'income', 'expense'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setTypeFilter(type);
                    setCategoryFilters([]);
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition",
                    typeFilter === type 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
          

        </section>

        {/* Transactions List — grouped by date */}
        <section>
          {/* Category filter chips */}
          {availableCategories.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">Filter by Category:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoryFilters([])}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium border transition",
                    categoryFilters.length === 0
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  )}
                >
                  All
                </button>
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategoryFilter(cat)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-medium border transition",
                      categoryFilters.includes(cat)
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredTransactions.length > 0 ? (() => {
            // Group transactions by date, sorted newest first
            const sorted = [...filteredTransactions].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            const groups: Record<string, typeof sorted> = {};
            sorted.forEach(t => {
              if (!groups[t.date]) groups[t.date] = [];
              groups[t.date].push(t);
            });
            const totalAll = filteredTransactions.reduce(
              (sum, t) => sum + (t.type === 'expense' ? t.amount : -t.amount), 0
            );

            return (
              <div className="space-y-3">
                {/* Total summary card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
                  <div className="w-1.5 bg-indigo-500 flex-shrink-0 rounded-l-2xl" />
                  <div className="p-5 flex-1 text-center">
                    <p className="text-sm font-semibold text-indigo-500">
                      {categoryFilters.length > 0
                        ? `Total: ${categoryFilters.join(', ')}`
                        : 'Total All Categories'}
                    </p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">
                      EGP {Math.abs(totalAll).toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* Date groups */}
                {Object.entries(groups).map(([date, txs]) => {
                  const dayTotal = txs.reduce(
                    (sum, t) => sum + (t.type === 'expense' ? t.amount : -t.amount), 0
                  );
                  return (
                    <div key={date}>
                      {/* Date header */}
                      <div className="flex items-center justify-between bg-gray-100 px-4 py-2.5 rounded-xl mb-1">
                        <div className="flex items-center gap-2 font-bold text-gray-800 text-sm">
                          <span>🗓️</span>
                          <span>{date}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-700">
                          Total: {Math.abs(dayTotal).toFixed(0)} EGP
                        </span>
                      </div>

                      {/* Transaction rows */}
                      <div className="space-y-1">
                        {txs.map(t => (
                          <motion.div
                            key={t.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white rounded-xl px-4 py-3 flex items-center justify-between shadow-sm border border-gray-50"
                          >
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{t.category}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {t.amount.toFixed(0)} EGP
                                {' · '}
                                <span className="capitalize">{t.paymentMethod}</span>
                                {t.description && (
                                  <span className="ml-1 text-gray-300">· {t.description}</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => { setEditingTx(t); setIsModalOpen(true); }}
                                className="p-1.5 text-orange-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id); }}
                                className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })() : (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="text-gray-400 w-8 h-8" />
              </div>
              <p className="text-gray-500">No transactions found for this period.</p>
              <button
                onClick={() => { setEditingTx(null); setIsModalOpen(true); }}
                className="mt-4 text-indigo-600 font-semibold hover:underline"
              >
                Add your first transaction
              </button>
            </div>
          )}
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Expense Distribution</h3>
            <div className="h-[300px]">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 italic">
                  No expense data for this month
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Monthly Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </main>

      {/* Settings Sidebar */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 h-full w-full max-w-xs bg-white z-50 shadow-2xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Base Income (EP)</label>
                  <input 
                    type="number" 
                    value={settings.baseIncome}
                    onChange={(e) => saveSettings({ ...settings, baseIncome: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 3000"
                  />
                  <p className="text-xs text-gray-400 mt-1">This is automatically added to your income every month.</p>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Data Management</h4>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setIsBulkImportOpen(true)}
                      className="flex items-center gap-3 w-full px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                    >
                      <Plus className="w-5 h-5 text-indigo-600" />
                      <span className="text-sm font-medium text-gray-700">Bulk Paste Import</span>
                    </button>
                    <label className="flex items-center gap-3 w-full px-4 py-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                      <Upload className="w-5 h-5 text-indigo-600" />
                      <span className="text-sm font-medium text-gray-700">Import CSV</span>
                      <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
                    </label>
                    <button 
                      onClick={exportCSV}
                      className="flex items-center gap-3 w-full px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                    >
                      <Download className="w-5 h-5 text-indigo-600" />
                      <span className="text-sm font-medium text-gray-700">Export CSV</span>
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Clear All Data',
                          message: 'DANGER: This will permanently delete all your data. Continue?',
                          onConfirm: () => {
                            saveTransactions([]);
                            saveSettings({ baseIncome: 0 });
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            showNotification("All data cleared.", "success");
                          }
                        });
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 bg-rose-50 rounded-xl hover:bg-rose-100 transition"
                    >
                      <Trash2 className="w-5 h-5 text-rose-600" />
                      <span className="text-sm font-medium text-rose-700">Clear All Data</span>
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <p className="text-xs text-gray-400 text-center italic">
                    Money Tracker v1.0.0 • Offline Ready
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold">{editingTx ? 'Edit Transaction' : 'Add Transaction'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-indigo-500 rounded-full transition">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select 
                      name="type"
                      defaultValue={editingTx?.type || 'expense'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      onChange={(e) => {
                        const catSelect = (e.target.form as HTMLFormElement).elements.namedItem('category') as HTMLSelectElement;
                        const type = e.target.value as TransactionType;
                        catSelect.innerHTML = CATEGORIES[type].map(c => `<option value="${c}">${c}</option>`).join('');
                      }}
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select 
                      name="category"
                      defaultValue={editingTx?.category || CATEGORIES.expense[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {CATEGORIES[(editingTx?.type || 'expense') as TransactionType].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (EP)</label>
                  <input 
                    type="number" 
                    name="amount"
                    step="0.01"
                    required
                    defaultValue={editingTx?.amount}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select 
                      name="paymentMethod"
                      defaultValue={editingTx?.paymentMethod || 'cash'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input 
                      type="date" 
                      name="date"
                      required
                      defaultValue={editingTx?.date || new Date().toISOString().substring(0, 10)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <input 
                    type="text" 
                    name="description"
                    defaultValue={editingTx?.description}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="What was this for?"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg"
                  >
                    {editingTx ? 'Update' : 'Save'} Transaction
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-around items-center md:hidden z-30">
        <button onClick={() => setSelectedMonth(new Date().toISOString().substring(0, 7))} className="p-2 text-indigo-600">
          <Wallet className="w-6 h-6" />
        </button>
        <button 
          onClick={() => { setEditingTx(null); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white p-4 rounded-full -mt-12 shadow-xl border-4 border-white"
        >
          <Plus className="w-6 h-6" />
        </button>
        <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400">
          <SettingsIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
              <p className="text-gray-600 mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition shadow-lg"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {isBulkImportOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkImportOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Bulk Paste Import</h3>
                <button onClick={() => setIsBulkImportOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-500 mb-4">Paste your CSV data below. Make sure it includes the header row.</p>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  placeholder="Date,Type,Category,Payment Method,Amount,Description..."
                />
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setIsBulkImportOpen(false)}
                  className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkImport}
                  className="flex-1 py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  Import Data
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification */}
      <AnimatePresence>
        {notification.isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={cn(
              "fixed bottom-24 left-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl text-white font-semibold text-sm",
              notification.type === 'success' ? "bg-emerald-600" : 
              notification.type === 'error' ? "bg-rose-600" : "bg-indigo-600"
            )}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
