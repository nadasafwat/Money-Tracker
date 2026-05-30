export type TransactionType = 'income' | 'expense' | 'exchange';
export type PaymentMethod = 'cash' | 'card';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  description: string;
  /** Only set when type === 'exchange' — the source wallet */
  exchangeFrom?: PaymentMethod;
  /** Only set when type === 'exchange' — the destination wallet */
  exchangeTo?: PaymentMethod;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

export interface UserSettings {
  baseIncome: number;
}

/** Static seed data — used to pre-populate dynamic categories for new users */
export const SEED_CATEGORIES: Category[] = [
  // Expense categories
  { id: 'exp_1', name: 'اكل',                  type: 'expense' },
  { id: 'exp_2', name: 'مواصلات',              type: 'expense' },
  { id: 'exp_3', name: 'Shopping',              type: 'expense' },
  { id: 'exp_4', name: 'خروجات',               type: 'expense' },
  { id: 'exp_5', name: 'فواتير',               type: 'expense' },
  { id: 'exp_6', name: 'ادوية',                type: 'expense' },
  { id: 'exp_7', name: 'مستلزمات دراسية',      type: 'expense' },
  { id: 'exp_8', name: 'اوبر',                  type: 'expense' },
  { id: 'exp_9', name: 'Other',                 type: 'expense' },
  // Income categories
  { id: 'inc_1', name: 'مرتب',                 type: 'income' },
  { id: 'inc_2', name: 'مصروف',               type: 'income' },
  { id: 'inc_3', name: 'عيدية',               type: 'income' },
  { id: 'inc_4', name: 'باقي الشهر اللي فات', type: 'income' },
  { id: 'inc_5', name: 'تحويش',               type: 'income' },
  { id: 'inc_6', name: 'مكافاه',              type: 'income' },
  { id: 'inc_7', name: 'زيادة',               type: 'income' },
  { id: 'inc_8', name: 'Other',                type: 'income' },
];

/** @deprecated Use SEED_CATEGORIES — kept here only for backward-compat CSV parsing */
export const CATEGORIES = {
  expense: SEED_CATEGORIES.filter(c => c.type === 'expense').map(c => c.name),
  income:  SEED_CATEGORIES.filter(c => c.type === 'income').map(c => c.name),
};
