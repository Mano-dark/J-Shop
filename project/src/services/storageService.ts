import { User, Category, Product, Sale, MobileMoneyBalance, MobileMoneyTransaction } from '../types';

class StorageService {
  private getFromStorage<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data, (key, value) => {
      if (key === 'createdAt' && typeof value === 'string') {
        return new Date(value);
      }
      return value;
    }) : [];
  }

  private saveToStorage<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Users
  getUsers(): User[] {
    return this.getFromStorage<User>('boutique_users');
  }

  saveUsers(users: User[]): void {
    this.saveToStorage('boutique_users', users);
  }

  // Categories
  getCategories(): Category[] {
    return this.getFromStorage<Category>('boutique_categories');
  }

  saveCategories(categories: Category[]): void {
    this.saveToStorage('boutique_categories', categories);
  }

  // Products
  getProducts(): Product[] {
    return this.getFromStorage<Product>('boutique_products');
  }

  saveProducts(products: Product[]): void {
    this.saveToStorage('boutique_products', products);
  }

  // Sales
  getSales(): Sale[] {
    return this.getFromStorage<Sale>('boutique_sales');
  }

  saveSales(sales: Sale[]): void {
    this.saveToStorage('boutique_sales', sales);
  }

  // Mobile Money Balances
  getMobileMoneyBalances(): MobileMoneyBalance[] {
    return this.getFromStorage<MobileMoneyBalance>('boutique_mobile_money');
  }

  saveMobileMoneyBalances(balances: MobileMoneyBalance[]): void {
    this.saveToStorage('boutique_mobile_money', balances);
  }

  // Mobile Money Transactions
  getMobileMoneyTransactions(): MobileMoneyTransaction[] {
    return this.getFromStorage<MobileMoneyTransaction>('boutique_mobile_money_transactions');
  }

  saveMobileMoneyTransactions(transactions: MobileMoneyTransaction[]): void {
    this.saveToStorage('boutique_mobile_money_transactions', transactions);
  }

  // Current user session
  getCurrentUser(): User | null {
    const userData = localStorage.getItem('boutique_current_user');
    return userData ? JSON.parse(userData) : null;
  }

  setCurrentUser(user: User): void {
    localStorage.setItem('boutique_current_user', JSON.stringify(user));
  }

  clearCurrentUser(): void {
    localStorage.removeItem('boutique_current_user');
  }

  // Initialize default data
  initializeDefaultData(): void {
    const users = this.getUsers();
    if (users.length === 0) {
      const defaultUsers: User[] = [
        {
          id: '1',
          username: 'admin',
          password: 'AZERTY2005',
          role: 'admin',
          name: 'Administrateur'
        },
        {
          id: '2',
          username: 'employe1',
          password: 'employe123',
          role: 'employee',
          name: 'Employé 1'
        },
        {
          id: '3',
          username: 'employe',
          password: 'employe456',
          role: 'employee',
          name: 'Employé 2'
        }
      ];
      this.saveUsers(defaultUsers);
    }

    const categories = this.getCategories();
    if (categories.length === 0) {
      const defaultCategories: Category[] = [
        {
          id: '1',
          name: 'Boissons',
          description: 'Boissons fraîches et chaudes',
          createdAt: new Date()
        },
        {
          id: '2',
          name: 'Biscuits',
          description: 'Biscuits et confiseries',
          createdAt: new Date()
        },
        {
          id: '3',
          name: 'Galettes',
          description: 'Galettes et pâtisseries',
          createdAt: new Date()
        },
        {
          id: '4',
          name: 'Forfaits téléphoniques',
          description: 'Recharges et forfaits mobile (MTN, Moov, Celtis)',
          createdAt: new Date()
        },
        {
          id: '5',
          name: 'Dépôt',
          description: 'Dépôts mobile money (MTN, Moov, Celtis)',
          createdAt: new Date()
        },
        {
          id: '6',
          name: 'Retrait',
          description: 'Retraits mobile money (MTN, Moov, Celtis)',
          createdAt: new Date()
        }
      ];
      this.saveCategories(defaultCategories);
    }

    const mobileMoneyBalances = this.getMobileMoneyBalances();
    if (mobileMoneyBalances.length === 0) {
      const defaultBalances: MobileMoneyBalance[] = [
        { operator: 'MTN', depositBalance: 100000, withdrawalBalance: 100000 },
        { operator: 'Moov', depositBalance: 100000, withdrawalBalance: 100000 },
        { operator: 'Celtis', depositBalance: 100000, withdrawalBalance: 100000 }
      ];
      this.saveMobileMoneyBalances(defaultBalances);
    }

    const mobileMoneyTransactions = this.getMobileMoneyTransactions();
    if (mobileMoneyTransactions.length === 0) {
      // Pas de transactions par défaut nécessaires, mais on peut initialiser un tableau vide
      this.saveMobileMoneyTransactions([]);
    }
  }
}

export const storageService = new StorageService();