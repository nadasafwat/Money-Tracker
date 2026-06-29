import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
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
  ArrowLeftRight,
  Tags,
  ChevronDown,
  ChevronUp,
  Check,
  BarChart2,
  LayoutDashboard,
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
  Legend,
} from 'recharts';
import { cn } from './lib/utils';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
  Category,
  UserSettings,
  SEED_CATEGORIES,
  CATEGORIES,
} from './types';

// --- Constants ---
const COLORS = [
  '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f43f5e', '#6366f1',
];

// ─────────────────────────────────────────────
// Helper: generate a short unique id
// ─────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 11);


export const parseCSVText = (text: string): Transaction[] => {
  if (text.startsWith('\uFEFF')) text = text.substring(1);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length <= 1) return [];

  let separator = ',';
  if (lines[0].includes('\t')) {
    separator = '\t';
  } else if (lines[0].includes(';')) {
    separator = ';';
  }

  const parseLine = (line: string): string[] => {
    const regex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
    return line.split(regex).map(p => p.replace(/^"|"$/g, '').trim());
  };

  const headerParts = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ''));
  const col = (names: string[]): number => {
    for (const name of names) {
      const idx = headerParts.indexOf(name.toLowerCase().replace(/\s+/g, ''));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const dateIdx = col(['date']);
  const typeIdx = col(['type']);
  const amtIdx  = col(['amount', 'amt']);
  const catIdx  = col(['category', 'cat']);
  const pmIdx   = col(['paymentmethod', 'payment method', 'payment', 'method']);
  const descIdx = col(['description', 'desc', 'note', 'notes']);

  if ([dateIdx, typeIdx, amtIdx, catIdx].some(i => i === -1)) return [];

  const allCatNames = [...CATEGORIES.expense, ...CATEGORIES.income];
  const findCategory = (cat: string) => {
    const trimmed = cat.trim();
    return allCatNames.find(c => c.trim().toLowerCase() === trimmed.toLowerCase()) || trimmed;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return new Date().toISOString().substring(0, 10);
    const parts = dateStr.split(/[-/.]/);
    if (parts.length === 3) {
      const [p1, p2, p3] = parts;
      if (p1.length === 4) return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
      return `${p3}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
    }
    return dateStr;
  };

  const newTxs: Transaction[] = [];
  for (const line of lines.slice(1)) {
    const parts = parseLine(line);
    if (parts.length < 4) continue;

    const dateRaw     = parts[dateIdx] || '';
    const typeRaw     = parts[typeIdx]  || '';
    const categoryRaw = catIdx  !== -1 ? parts[catIdx]  || '' : '';
    const paymentRaw  = pmIdx   !== -1 ? parts[pmIdx]   || '' : '';
    const amountStr   = parts[amtIdx]  || '';
    const descRaw     = descIdx !== -1 ? parts[descIdx] || '' : '';

    const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
    if (isNaN(amount)) continue;

    const type          = typeRaw.toLowerCase();
    const paymentMethod = paymentRaw.toLowerCase();

    newTxs.push({
      id: uid(),
      date: formatDate(dateRaw),
      type: (['income', 'expense', 'exchange'] as TransactionType[]).includes(type as TransactionType)
        ? (type as TransactionType)
        : 'expense',
      category: findCategory(categoryRaw),
      paymentMethod: (paymentMethod === 'cash' || paymentMethod === 'card') ? paymentMethod : 'cash',
      amount,
      description: descRaw.replace(/""/g, '"'),
    });
  }
  return newTxs;
};

// ─────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────

export default function App() {
  // ── Auth ──────────────────────────────────
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ── Core Data ─────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ baseIncome: 0 });

  // ── UI State ──────────────────────────────
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'statistics'>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Controlled form state for the transaction modal
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('cash');
  const [formExchangeFrom, setFormExchangeFrom] = useState<PaymentMethod>('card');
  const [formExchangeTo, setFormExchangeTo] = useState<PaymentMethod>('cash');
  const [formCategory, setFormCategory] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().substring(0, 10));
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Category manager state
  const [catManagerTab, setCatManagerTab] = useState<'expense' | 'income'>('expense');
  const [catAddName, setCatAddName] = useState('');
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catEditName, setCatEditName] = useState('');

  // Notifications & modals
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ isOpen: false, message: '', type: 'info' });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('expense');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);

  // ── Notification helper ───────────────────
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ isOpen: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, isOpen: false })), 3000);
  }, []);

  // ── Auth Logic ────────────────────────────
  useEffect(() => {
    try {
      const session = sessionStorage.getItem('currentUser');
      if (session) {
        setCurrentUser(session);
        loadUserData(session);
      }
    } catch (e) {
      console.error('Auth init error:', e);
    } finally {
      setIsAuthReady(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = (user: string) => {
    try {
      const txData  = localStorage.getItem(`tx_${user}`);
      const setData = localStorage.getItem(`set_${user}`);
      const catData = localStorage.getItem(`cat_${user}`);

      if (txData)  setTransactions(JSON.parse(txData));
      if (setData) setSettings(JSON.parse(setData));

      // Seed categories if none saved yet
      if (catData) {
        setCategories(JSON.parse(catData));
      } else {
        const seeded = [...SEED_CATEGORIES];
        setCategories(seeded);
        localStorage.setItem(`cat_${user}`, JSON.stringify(seeded));
      }
    } catch (e) {
      console.error('Error loading user data:', e);
      showNotification('Error loading saved data', 'error');
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);

    if (!username.trim()) { setAuthMessage({ text: 'Please enter your username.', type: 'error' }); return; }
    if (!password)         { setAuthMessage({ text: 'Please enter your password.',  type: 'error' }); return; }

    try {
      const users = JSON.parse(localStorage.getItem('users') || '{}');
      if (authMode === 'register') {
        if (username.trim().length < 3)  { setAuthMessage({ text: 'Username must be at least 3 characters.', type: 'error' }); return; }
        if (password.length < 4)         { setAuthMessage({ text: 'Password must be at least 4 characters.',  type: 'error' }); return; }
        if (users[username.trim()])      { setAuthMessage({ text: 'Username already taken. Try another.',     type: 'error' }); return; }
        users[username.trim()] = password;
        localStorage.setItem('users', JSON.stringify(users));
        setAuthMessage({ text: '✓ Account created! You can now sign in.', type: 'success' });
        setAuthMode('login');
        setPassword('');
      } else {
        if (!users[username.trim()])               { setAuthMessage({ text: 'No account found with that username.', type: 'error' }); return; }
        if (users[username.trim()] !== password)   { setAuthMessage({ text: 'Incorrect password. Please try again.', type: 'error' }); return; }
        sessionStorage.setItem('currentUser', username.trim());
        setCurrentUser(username.trim());
        loadUserData(username.trim());
      }
    } catch (e) {
      console.error('Auth error:', e);
      setAuthMessage({ text: 'Something went wrong. Please try again.', type: 'error' });
    }
  };

  const logout = () => {
    sessionStorage.removeItem('currentUser');
    setCurrentUser(null);
    setTransactions([]);
    setCategories([]);
    setSettings({ baseIncome: 0 });
    setUsername('');
    setPassword('');
  };

  // ── Data Persistence ──────────────────────
  const saveTransactions = useCallback((next: Transaction[]) => {
    setTransactions(next);
    if (currentUser) localStorage.setItem(`tx_${currentUser}`, JSON.stringify(next));
  }, [currentUser]);

  const saveSettings = useCallback((next: UserSettings) => {
    setSettings(next);
    if (currentUser) localStorage.setItem(`set_${currentUser}`, JSON.stringify(next));
  }, [currentUser]);

  const saveCategories = useCallback((next: Category[]) => {
    setCategories(next);
    if (currentUser) localStorage.setItem(`cat_${currentUser}`, JSON.stringify(next));
  }, [currentUser]);

  // ── Category CRUD ─────────────────────────
  const handleAddCategory = () => {
    const name = catAddName.trim();
    if (!name) return;
    const duplicate = categories.some(c => c.type === catManagerTab && c.name.toLowerCase() === name.toLowerCase());
    if (duplicate) { showNotification('A category with that name already exists.', 'error'); return; }
    const next = [...categories, { id: uid(), name, type: catManagerTab }];
    saveCategories(next);
    setCatAddName('');
    showNotification('Category added!', 'success');
  };

  const handleStartEditCategory = (cat: Category) => {
    setCatEditId(cat.id);
    setCatEditName(cat.name);
  };

  const handleSaveEditCategory = (id: string) => {
    const name = catEditName.trim();
    if (!name) return;
    const next = categories.map(c => c.id === id ? { ...c, name } : c);
    saveCategories(next);
    setCatEditId(null);
    showNotification('Category updated!', 'success');
  };

  const handleDeleteCategory = (cat: Category) => {
    const usedBy = transactions.filter(t => t.category === cat.name);
    if (usedBy.length > 0) {
      showNotification(
        `Cannot delete "${cat.name}" — used by ${usedBy.length} transaction(s). Remove those first.`,
        'error'
      );
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message: `Delete "${cat.name}"? This cannot be undone.`,
      onConfirm: () => {
        saveCategories(categories.filter(c => c.id !== cat.id));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        showNotification('Category deleted.', 'success');
      },
    });
  };

  // ── Form Modal Helpers ────────────────────
  const openAddModal = () => {
    setEditingTx(null);
    setFormType('expense');
    setFormPaymentMethod('cash');
    setFormExchangeFrom('card');
    setFormExchangeTo('cash');
    setFormDate(new Date().toISOString().substring(0, 10));
    setFormAmount('');
    setFormDescription('');
    const firstExpense = categories.find(c => c.type === 'expense')?.name ?? '';
    setFormCategory(firstExpense);
    setIsModalOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setFormType(tx.type);
    setFormPaymentMethod(tx.paymentMethod);
    setFormExchangeFrom(tx.exchangeFrom ?? 'card');
    setFormExchangeTo(tx.exchangeTo ?? 'cash');
    setFormDate(tx.date);
    setFormAmount(tx.amount.toString());
    setFormDescription(tx.description);
    setFormCategory(tx.category);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTx(null);
  };

  // Update category when form type changes
  const handleFormTypeChange = (type: TransactionType) => {
    setFormType(type);
    if (type !== 'exchange') {
      const first = categories.find(c => c.type === type)?.name ?? '';
      setFormCategory(first);
    }
  };

  // ── Transaction CRUD ──────────────────────
  const handleAddTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotification('Amount must be a positive number.', 'error');
      return;
    }

    // Exchange-specific validation
    if (formType === 'exchange') {
      if (formExchangeFrom === formExchangeTo) {
        showNotification('"From" and "To" must be different.', 'error');
        return;
      }
    }

    const newTx: Transaction = {
      id: editingTx?.id || uid(),
      date: formDate,
      amount,
      category: formType === 'exchange' ? 'Exchange' : formCategory,
      type: formType,
      paymentMethod: formType === 'exchange' ? formExchangeFrom : formPaymentMethod,
      description: formDescription,
      ...(formType === 'exchange' ? { exchangeFrom: formExchangeFrom, exchangeTo: formExchangeTo } : {}),
    };

    // Duplicate detection (skip for exchanges and edits)
    if (!editingTx && formType !== 'exchange') {
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
            saveTransactions([...transactions, newTx]);
            closeModal();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          },
        });
        return;
      }
    }

    const updated = editingTx
      ? transactions.map(t => (t.id === editingTx.id ? newTx : t))
      : [...transactions, newTx];

    saveTransactions(updated);
    showNotification(editingTx ? 'Transaction updated!' : 'Transaction saved!', 'success');
    closeModal();
  };

  const deleteTransaction = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction?',
      onConfirm: () => {
        saveTransactions(transactions.filter(t => t.id !== id));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // ── Calculations ──────────────────────────

  /** Full month summary — uses baseIncome + this month's transactions */
  const summary = useMemo(() => {
    const baseIncome = parseFloat(settings.baseIncome.toString()) || 0;

    // This month's transactions
    let income  = baseIncome;
    let expense = 0;
    let cash    = baseIncome; // base income → cash by default
    let card    = 0;

    const monthTxs = transactions.filter(t => t.date.startsWith(selectedMonth));
    monthTxs.forEach(t => {
      const amt = t.amount;
      if (t.type === 'income') {
        income += amt;
        if (t.paymentMethod === 'cash') cash += amt; else card += amt;
      } else if (t.type === 'expense') {
        expense += amt;
        if (t.paymentMethod === 'cash') cash -= amt; else card -= amt;
      } else if (t.type === 'exchange') {
        // Total balance unchanged; shift between cash and card
        if (t.exchangeFrom === 'cash') { cash -= amt; card += amt; }
        else                           { card -= amt; cash += amt; }
      }
    });

    const balance = income - expense;
    return { totalIncome: income, totalExpense: expense, balance, cash, card };
  }, [transactions, selectedMonth, settings.baseIncome]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const m = t.date.substring(0, 7);
      const typeMatch     = typeFilter === 'all' || t.type === typeFilter;
      const categoryMatch = categoryFilters.length === 0 || categoryFilters.includes(t.category);
      return m === selectedMonth && typeMatch && categoryMatch;
    });
  }, [transactions, selectedMonth, typeFilter, categoryFilters]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => {
      if (t.date.startsWith(selectedMonth)) {
        if (typeFilter === 'all' || t.type === typeFilter) cats.add(t.category);
      }
    });
    return Array.from(cats);
  }, [transactions, selectedMonth, typeFilter]);

  const toggleCategoryFilter = (cat: string) => {
    setCategoryFilters(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // ── Chart Data ────────────────────────────
  const categoryData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const totals = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const trendData = useMemo(() => {
    const year = selectedMonth.substring(0, 4);
    const baseIncome = parseFloat(settings.baseIncome.toString()) || 0;
    return Array.from({ length: 12 }, (_, i) => {
      const m        = (i + 1).toString().padStart(2, '0');
      const monthStr = `${year}-${m}`;
      const monthTxs = transactions.filter(t => t.date.startsWith(monthStr));
      const isSelected = monthStr === selectedMonth;
      const inc = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) + (isSelected ? baseIncome : 0);
      const exp = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return {
        name: new Date(`${year}-${m}-01`).toLocaleString('default', { month: 'short' }),
        income: inc,
        expense: exp,
      };
    });
  }, [transactions, selectedMonth, settings.baseIncome]);



  const exportXLSX = () => {
    const rows = transactions.map(t => ({
      Date:             t.date,
      Type:             t.type,
      Category:         t.category,
      'Payment Method': t.paymentMethod,
      Amount:           t.amount,
      Description:      t.description,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, `transactions_${currentUser}.xlsx`);
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const arr = new Uint8Array(buffer);
        let encoding = 'utf-8';
        if (arr.length >= 2 && arr[0] === 0xFF && arr[1] === 0xFE) {
          encoding = 'utf-16le';
        } else if (arr.length >= 2 && arr[0] === 0xFE && arr[1] === 0xFF) {
          encoding = 'utf-16be';
        }

        const decoder = new TextDecoder(encoding);
        const text = decoder.decode(buffer);
        const newTxs = parseCSVText(text);
        if (newTxs.length === 0) { showNotification('No valid transactions found. Check your CSV format.', 'error'); return; }
        saveTransactions([...transactions, ...newTxs]);
        showNotification(`Successfully imported ${newTxs.length} transactions.`, 'success');
      } catch (err) {
        console.error('CSV import error:', err);
        showNotification('Failed to import CSV. Please check the file format.', 'error');
      }
      e.target.value = '';
    };
    reader.onerror = () => showNotification('Error reading file.', 'error');
    reader.readAsArrayBuffer(file);
  };

  // ── Dynamic categories for form ───────────
  const formCategories = useMemo(
    () => categories.filter(c => c.type === (formType as 'income' | 'expense')),
    [categories, formType]
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
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
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
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

          {authMessage && (
            <div className={cn(
              'mt-4 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2',
              authMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200',
            )}>
              <span>{authMessage.type === 'success' ? '✓' : '✕'}</span>
              {authMessage.text}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthMessage(null); }}
              className="text-indigo-600 font-medium hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main Dashboard ────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ── Header ── */}
      <header className="bg-indigo-600 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            <span className="text-xl font-bold tracking-tight">Money Tracker</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openAddModal}
              className="bg-white text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition shadow-sm"
            >
              <Plus className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentPage(p => p === 'statistics' ? 'dashboard' : 'statistics')}
              className={cn(
                'p-2 rounded-full transition',
                currentPage === 'statistics'
                  ? 'bg-white text-indigo-600'
                  : 'hover:bg-indigo-500 text-white',
              )}
              title="Statistics"
            >
              <BarChart2 className="w-6 h-6" />
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-indigo-500 rounded-full transition">
              <SettingsIcon className="w-6 h-6" />
            </button>
            <button onClick={logout} className="p-2 hover:bg-indigo-500 rounded-full transition">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Dashboard Cards ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Balance Card */}
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden"
          >
            <div className="relative z-10">
              <p className="text-indigo-100 text-sm font-medium">Total Balance</p>
              <h2 className="text-3xl font-bold mt-1">EGP {summary.balance.toFixed(2)}</h2>


              <div className="mt-4 flex justify-between text-sm text-indigo-100 border-t border-indigo-500 pt-3">
                <div className="flex items-center gap-1">
                  <Wallet className="w-4 h-4 opacity-70" />
                  <span>Cash: <b>EGP {summary.cash.toFixed(2)}</b></span>
                </div>
                <div className="flex items-center gap-1">
                  <CreditCard className="w-4 h-4 opacity-70" />
                  <span>Card: <b>EGP {summary.card.toFixed(2)}</b></span>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Wallet className="w-32 h-32" />
            </div>
          </motion.div>

          {/* Income Card */}
          <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <TrendingUp className="text-emerald-600 w-5 h-5" />
              </div>
              <p className="text-gray-500 text-sm font-medium">Monthly Income</p>
            </div>
            <h2 className="text-2xl font-bold text-emerald-600">EGP {summary.totalIncome.toFixed(2)}</h2>
            <p className="text-xs text-gray-400 mt-2">Includes base salary + extra</p>
          </motion.div>

          {/* Expense Card */}
          <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-rose-100 p-2 rounded-lg">
                <TrendingDown className="text-rose-600 w-5 h-5" />
              </div>
              <p className="text-gray-500 text-sm font-medium">Monthly Expenses</p>
            </div>
            <h2 className="text-2xl font-bold text-rose-600">EGP {summary.totalExpense.toFixed(2)}</h2>
            <p className="text-xs text-gray-400 mt-2">Total tracked this month</p>
          </motion.div>
        </section>

        {/* ── Filters ── */}
        <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Filter className="w-4 h-4 text-gray-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => { setSelectedMonth(e.target.value); setCategoryFilters([]); }}
                className="bg-transparent border-none focus:ring-0 text-gray-700 font-medium cursor-pointer"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'income', 'expense', 'exchange'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => { setTypeFilter(type); setCategoryFilters([]); }}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition',
                    typeFilter === type
                      ? type === 'exchange'
                        ? 'bg-violet-600 text-white shadow-md'
                        : 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  {type === 'exchange' ? (
                    <span className="flex items-center gap-1">
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Exchange
                    </span>
                  ) : (
                    type.charAt(0).toUpperCase() + type.slice(1)
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Transaction List ── */}
        <section>
          {availableCategories.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">Filter by Category:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoryFilters([])}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium border transition',
                    categoryFilters.length === 0
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                  )}
                >
                  All
                </button>
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategoryFilter(cat)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm font-medium border transition',
                      categoryFilters.includes(cat)
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredTransactions.length > 0 ? (() => {
            const sorted = [...filteredTransactions].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            const groups: Record<string, typeof sorted> = {};
            sorted.forEach(t => {
              if (!groups[t.date]) groups[t.date] = [];
              groups[t.date].push(t);
            });
            const totalAll = filteredTransactions.reduce(
              (sum, t) => sum + (t.type === 'expense' ? t.amount : t.type === 'income' ? -t.amount : 0), 0
            );

            return (
              <div className="space-y-3">
                {/* Summary card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
                  <div className="w-1.5 bg-indigo-500 flex-shrink-0 rounded-l-2xl" />
                  <div className="p-5 flex-1 text-center">
                    <p className="text-sm font-semibold text-indigo-500">
                      {categoryFilters.length > 0 ? `Total: ${categoryFilters.join(', ')}` : 'Total All Categories'}
                    </p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">
                      EGP {Math.abs(totalAll).toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* Date groups */}
                {Object.entries(groups).map(([date, txs]) => {
                  const dayTotal = txs.reduce(
                    (sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0
                  );
                  return (
                    <div key={date}>
                      <div className="flex items-center justify-between bg-gray-100 px-4 py-2.5 rounded-xl mb-1">
                        <div className="flex items-center gap-2 font-bold text-gray-800 text-sm">
                          <span>🗓️</span>
                          <span>{date}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-700">
                          Total: {Math.abs(dayTotal).toFixed(0)} EGP
                        </span>
                      </div>

                      <div className="space-y-1">
                        {txs.map(t => {
                          const isExchange = t.type === 'exchange';
                          const isIncome   = t.type === 'income';
                          return (
                            <motion.div
                              key={t.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={cn(
                                'bg-white rounded-xl px-4 py-3 flex items-center justify-between shadow-sm border',
                                isExchange ? 'border-violet-100' : 'border-gray-50',
                              )}
                            >
                              <div className="flex items-center gap-3">
                                {/* Type icon */}
                                <div className={cn(
                                  'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                                  isExchange ? 'bg-violet-100' : isIncome ? 'bg-emerald-100' : 'bg-rose-100',
                                )}>
                                  {isExchange
                                    ? <ArrowLeftRight className="w-4 h-4 text-violet-600" />
                                    : isIncome
                                      ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                                      : <TrendingDown className="w-4 h-4 text-rose-600" />
                                  }
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 text-sm">
                                    {isExchange
                                      ? `${t.exchangeFrom === 'cash' ? 'Cash' : 'Card'} → ${t.exchangeTo === 'cash' ? 'Cash' : 'Card'}`
                                      : t.category
                                    }
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    <span className={cn(
                                      'font-semibold',
                                      isExchange ? 'text-violet-600' : isIncome ? 'text-emerald-600' : 'text-rose-600',
                                    )}>
                                      {isIncome ? '+' : isExchange ? '⇄' : '-'}{t.amount.toFixed(0)} EGP
                                    </span>
                                    {!isExchange && (
                                      <>
                                        {' · '}
                                        <span className="capitalize">{t.paymentMethod}</span>
                                      </>
                                    )}
                                    {t.description && (
                                      <span className="ml-1 text-gray-300">· {t.description}</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => openEditModal(t)}
                                  className="p-1.5 text-orange-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); deleteTransaction(t.id); }}
                                  className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
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
                onClick={openAddModal}
                className="mt-4 text-indigo-600 font-semibold hover:underline"
              >
                Add your first transaction
              </button>
            </div>
          )}
        </section>

      </main>

      {/* ════════════════════════════════════════
          Statistics Page (slides in/out)
          ════════════════════════════════════════ */}
      <AnimatePresence>
        {currentPage === 'statistics' && (
          <motion.div
            key="statistics"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-20 bg-gray-50 overflow-y-auto pb-20"
            style={{ top: 64 }} /* below sticky header */
          >
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
              {/* Page heading */}
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl">
                  <BarChart2 className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
                  <p className="text-sm text-gray-400">
                    {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="ml-auto flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition shadow-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
              </div>

              {/* Month picker (mirrors dashboard) */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => { setSelectedMonth(e.target.value); setCategoryFilters([]); }}
                  className="bg-transparent border-none focus:ring-0 text-gray-700 font-medium cursor-pointer"
                />
              </div>

              {/* Charts grid */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Expense Distribution</h3>
                  <div className="h-[300px]">
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%" cy="50%"
                            innerRadius={60} outerRadius={100}
                            paddingAngle={5} dataKey="value"
                          >
                            {categoryData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 italic">
                        No expense data for this month
                      </div>
                    )}
                  </div>
                </div>

                {/* Monthly Trend */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Monthly Trend</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,.1)' }} />
                        <Legend verticalAlign="top" align="right" iconType="circle" />
                        <Bar dataKey="income"  fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {/* Summary stats */}
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Income</p>
                  <p className="text-2xl font-bold text-emerald-600">EGP {summary.totalIncome.toFixed(2)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Expenses</p>
                  <p className="text-2xl font-bold text-rose-600">EGP {summary.totalExpense.toFixed(2)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Net Balance</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    summary.balance >= 0 ? 'text-indigo-600' : 'text-rose-600',
                  )}>
                    EGP {summary.balance.toFixed(2)}
                  </p>
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════
          Settings Sidebar
          ════════════════════════════════════════ */}
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
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Base Income */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Base Income (EGP)</label>
                    <input
                      type="number"
                      value={settings.baseIncome}
                      onChange={e => saveSettings({ ...settings, baseIncome: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. 3000"
                    />
                    <p className="text-xs text-gray-400 mt-1">Automatically added to income for the viewed month.</p>
                  </div>

                  {/* ── Category Manager ── */}
                  <div className="border-t border-gray-100 pt-6">
                    <button
                      onClick={() => setIsCategoryManagerOpen(v => !v)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Tags className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Manage Categories</h4>
                      </div>
                      {isCategoryManagerOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                      }
                    </button>

                    <AnimatePresence>
                      {isCategoryManagerOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 space-y-4">
                            {/* Tab switcher */}
                            <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
                              {(['expense', 'income'] as const).map(tab => (
                                <button
                                  key={tab}
                                  onClick={() => { setCatManagerTab(tab); setCatAddName(''); setCatEditId(null); }}
                                  className={cn(
                                    'flex-1 py-1.5 rounded-lg text-sm font-semibold transition',
                                    catManagerTab === tab
                                      ? tab === 'expense'
                                        ? 'bg-rose-500 text-white shadow-sm'
                                        : 'bg-emerald-500 text-white shadow-sm'
                                      : 'text-gray-500 hover:text-gray-700',
                                  )}
                                >
                                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                              ))}
                            </div>

                            {/* Category list */}
                            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                              {categories.filter(c => c.type === catManagerTab).map(cat => (
                                <div key={cat.id} className="flex items-center gap-2 group">
                                  {catEditId === cat.id ? (
                                    <>
                                      <input
                                        autoFocus
                                        value={catEditName}
                                        onChange={e => setCatEditName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEditCategory(cat.id); if (e.key === 'Escape') setCatEditId(null); }}
                                        className="flex-1 px-3 py-1.5 text-sm border border-indigo-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                                      />
                                      <button onClick={() => handleSaveEditCategory(cat.id)} className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition">
                                        <Check className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => setCatEditId(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition">
                                        <X className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="flex-1 text-sm text-gray-700 px-3 py-1.5 bg-gray-50 rounded-lg truncate">
                                        {cat.name}
                                      </span>
                                      <button
                                        onClick={() => handleStartEditCategory(cat)}
                                        className="p-1.5 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCategory(cat)}
                                        className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              ))}
                              {categories.filter(c => c.type === catManagerTab).length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-4 italic">No {catManagerTab} categories yet.</p>
                              )}
                            </div>

                            {/* Add new category */}
                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                value={catAddName}
                                onChange={e => setCatAddName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                                placeholder={`New ${catManagerTab} category…`}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                              />
                              <button
                                onClick={handleAddCategory}
                                className="px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4" /> Add
                              </button>
                            </div>

                            <p className="text-xs text-gray-400 italic">
                              Note: renaming a category won't update existing transactions (they store the name at the time of creation).
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Data Management */}
                  <div className="border-t border-gray-100 pt-6">
                    <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Data Management</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 w-full px-4 py-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                        <Upload className="w-5 h-5 text-indigo-600" />
                        <span className="text-sm font-medium text-gray-700">Import CSV</span>
                        <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
                      </label>
                      <button
                        onClick={exportXLSX}
                        className="flex items-center gap-3 w-full px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                      >
                        <Download className="w-5 h-5 text-indigo-600" />
                        <span className="text-sm font-medium text-gray-700">Export Excel</span>
                      </button>
                      <button
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: 'Clear All Data',
                            message: 'DANGER: This will permanently delete all transactions and settings. Continue?',
                            onConfirm: () => {
                              saveTransactions([]);
                              saveSettings({ baseIncome: 0 });
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                              showNotification('All data cleared.', 'success');
                            },
                          });
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 bg-rose-50 rounded-xl hover:bg-rose-100 transition"
                      >
                        <Trash2 className="w-5 h-5 text-rose-600" />
                        <span className="text-sm font-medium text-rose-700">Clear All Data</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 text-center italic">Money Tracker v2.0.0 • Offline Ready</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════
          Transaction Modal
          ════════════════════════════════════════ */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className={cn(
                'p-6 text-white flex justify-between items-center',
                formType === 'exchange' ? 'bg-violet-600' : 'bg-indigo-600',
              )}>
                <div className="flex items-center gap-2">
                  {formType === 'exchange' && <ArrowLeftRight className="w-5 h-5" />}
                  <h2 className="text-xl font-bold">{editingTx ? 'Edit Transaction' : 'Add Transaction'}</h2>
                </div>
                <button onClick={closeModal} className="p-1 hover:bg-white/20 rounded-full transition">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="p-6 space-y-4">

                {/* Transaction Type selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'expense',  label: 'Expense',  color: 'rose' },
                      { value: 'income',   label: 'Income',   color: 'emerald' },
                      { value: 'exchange', label: 'Exchange', color: 'violet' },
                    ] as const).map(({ value, label, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleFormTypeChange(value)}
                        className={cn(
                          'py-2.5 rounded-xl text-sm font-semibold border-2 transition',
                          formType === value
                            ? color === 'rose'
                              ? 'bg-rose-500 border-rose-500 text-white'
                              : color === 'emerald'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-violet-600 border-violet-600 text-white'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white',
                        )}
                      >
                        {value === 'exchange' && <ArrowLeftRight className="w-3.5 h-3.5 inline mr-1" />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Exchange-specific fields ── */}
                {formType === 'exchange' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                      <select
                        value={formExchangeFrom}
                        onChange={e => {
                          const from = e.target.value as PaymentMethod;
                          setFormExchangeFrom(from);
                          setFormExchangeTo(from === 'cash' ? 'card' : 'cash');
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="card">💳 Card</option>
                        <option value="cash">💵 Cash</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                      <select
                        value={formExchangeTo}
                        onChange={e => {
                          const to = e.target.value as PaymentMethod;
                          setFormExchangeTo(to);
                          setFormExchangeFrom(to === 'cash' ? 'card' : 'cash');
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="cash">💵 Cash</option>
                        <option value="card">💳 Card</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  /* ── Income / Expense fields ── */
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {formCategories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        {formCategories.length === 0 && (
                          <option value="" disabled>No categories — add some in Settings</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                      <select
                        value={formPaymentMethod}
                        onChange={e => setFormPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="cash">💵 Cash</option>
                        <option value="card">💳 Card</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (EGP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className={cn(
                      'w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2',
                      formType === 'exchange' ? 'focus:ring-violet-500' : 'focus:ring-indigo-500',
                    )}
                    placeholder="0.00"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="What was this for?"
                  />
                </div>

                {/* Exchange info banner */}
                {formType === 'exchange' && (
                  <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 text-xs text-violet-700 flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Exchanges move money between wallets — your <strong>total balance won't change</strong>.
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={cn(
                      'flex-1 px-4 py-3 text-white rounded-xl font-semibold transition shadow-lg',
                      formType === 'exchange' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-indigo-600 hover:bg-indigo-700',
                    )}
                  >
                    {editingTx ? 'Update' : 'Save'} {formType === 'exchange' ? 'Exchange' : 'Transaction'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Mobile Nav Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-around items-center md:hidden z-30">
        <button
          onClick={() => { setCurrentPage('dashboard'); setSelectedMonth(new Date().toISOString().substring(0, 7)); }}
          className={cn('p-2 flex flex-col items-center gap-0.5 text-xs font-medium transition', currentPage === 'dashboard' ? 'text-indigo-600' : 'text-gray-400')}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 text-white p-4 rounded-full -mt-12 shadow-xl border-4 border-white"
        >
          <Plus className="w-6 h-6" />
        </button>
        <button
          onClick={() => setCurrentPage('statistics')}
          className={cn('p-2 flex flex-col items-center gap-0.5 text-xs font-medium transition', currentPage === 'statistics' ? 'text-indigo-600' : 'text-gray-400')}
        >
          <BarChart2 className="w-5 h-5" />
          <span>Statistics</span>
        </button>
      </div>

      {/* ── Confirm Modal ── */}
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

      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {notification.isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={cn(
              'fixed bottom-24 left-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl text-white font-semibold text-sm',
              notification.type === 'success' ? 'bg-emerald-600' :
              notification.type === 'error'   ? 'bg-rose-600'    : 'bg-indigo-600',
            )}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
