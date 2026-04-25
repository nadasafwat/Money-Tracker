export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'card';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  description: string;
}

export interface UserSettings {
  baseIncome: number;
}

export const CATEGORIES = {
  expense: [
    'اكل',
    'مواصلات',
    'Shopping',
    'خروجات',
    'فواتير',
    'ادوية ',
    'مستلزمات دراسية',
    'اوبر',
    'Other'
  ],
  income: [
    'مرتب',
    'مصروف',
    'عيدية',
    'باقي الشهر اللي فات',
    'تحويش',
    'مكافاه',
    'زيادة',
    'Other'
  ]
};
