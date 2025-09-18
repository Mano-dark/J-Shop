// src/types.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  // initialStock?: number;
  description?: string;
  category_id: string | null;
  operator: 'MTN' | 'Moov' | 'Celtis' | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  sold_amount?: number;
  created_at: string;
  employee_id: string;
}

export interface MobileMoneyBalance {
  id: string;
  operator: 'MTN' | 'Moov' | 'Celtis';
  deposit_balance: number;
  withdrawal_balance: number;
  created_at: string;
}

export interface MobileMoneyTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  operator: 'MTN' | 'Moov' | 'Celtis';
  phone_number: string;
  amount: number;
  created_at: string;
  employee_id: string;
}