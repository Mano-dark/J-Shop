import React, { useState, useEffect, useMemo } from 'react';
import { Package, ShoppingCart, TrendingUp, AlertTriangle, Plus, Edit, Trash2, LogOut, Crown, BarChart3, DollarSign, Calendar } from 'lucide-react';
import { Product, Category, Sale, MobileMoneyBalance, MobileMoneyTransaction } from '../types';
import { supabase } from '../lib/supabase';
import MobileMoneyManagement from './MobileMoneyManagement';

interface AdminDashboardProps {
  onLogout: () => void;
}

type Tab = 'overview' | 'products' | 'categories' | 'sales' | 'mobileMoney';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [mobileMoneyBalances, setMobileMoneyBalances] = useState<MobileMoneyBalance[]>([]);
  const [mobileMoneyTransactions, setMobileMoneyTransactions] = useState<MobileMoneyTransaction[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<
    { action: 'addProduct' | 'updateProduct' | 'deleteProduct' | 'addCategory' | 'updateCategory' | 'deleteCategory'; data: any }[]
  >([]);

  // Mettre à jour l'état de connexion
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Charger les données
  useEffect(() => {
    async function loadData() {
      // Charger depuis localStorage
      const localProducts = localStorage.getItem('products');
      const localCategories = localStorage.getItem('categories');
      const localSales = localStorage.getItem('sales');
      const localBalances = localStorage.getItem('mobileMoneyBalances');
      const localTransactions = localStorage.getItem('mobileMoneyTransactions');
      const localQueue = localStorage.getItem('offlineQueue');

      if (localProducts) setProducts(JSON.parse(localProducts));
      if (localCategories) setCategories(JSON.parse(localCategories));
      if (localSales) setSales(JSON.parse(localSales));
      if (localBalances) setMobileMoneyBalances(JSON.parse(localBalances));
      if (localTransactions) setMobileMoneyTransactions(JSON.parse(localTransactions));
      if (localQueue) setOfflineQueue(JSON.parse(localQueue) || []);

      // Si en ligne, synchroniser avec Supabase
      if (isOnline) {
        try {
          const [
            { data: productsData, error: productsError },
            { data: categoriesData, error: categoriesError },
            { data: salesData, error: salesError },
            { data: balancesData, error: balancesError },
            { data: transactionsData, error: transactionsError },
          ] = await Promise.all([
            supabase.from('products').select('*'),
            supabase.from('categories').select('*'),
            supabase.from('sales').select('*'),
            supabase.from('mobile_money_balances').select('*'),
            supabase.from('mobile_money_transactions').select('*'),
          ]);

          if (productsError || categoriesError || salesError || balancesError || transactionsError) {
            setError('Erreur lors du chargement des données');
            console.error('Erreurs:', productsError, categoriesError, salesError, balancesError, transactionsError);
            return;
          }

          setProducts(productsData || []);
          setCategories(categoriesData || []);
          setSales(salesData || []);
          setMobileMoneyBalances(balancesData || []);
          setMobileMoneyTransactions(transactionsData || []);

          localStorage.setItem('products', JSON.stringify(productsData || []));
          localStorage.setItem('categories', JSON.stringify(categoriesData || []));
          localStorage.setItem('sales', JSON.stringify(salesData || []));
          localStorage.setItem('mobileMoneyBalances', JSON.stringify(balancesData || []));
          localStorage.setItem('mobileMoneyTransactions', JSON.stringify(transactionsData || []));
          setError(null);
        } catch (err) {
          setError('Erreur réseau');
          console.error('Erreur:', err);
        }
      }
    }
    loadData();
  }, [isOnline]);

  // Synchroniser les actions hors ligne
	useEffect(() => {
		async function syncOfflineQueue() {
			if (isOnline && offlineQueue.length > 0) {
				for (const { action, data } of offlineQueue) {
					try {
						if (action === 'addProduct') {
							await supabase.from('products').insert([{
								name: data.name,
								price: data.price,
								stock: data.stock,
								// initial_stock: data.initialStock,
								description: data.description,
								category_id: data.categoryId,
								operator: data.operator || null,
							}]);
						} else if (action === 'updateProduct') {
							await supabase.from('products').update({
								name: data.name,
								price: data.price,
								stock: data.stock,
								// initial_stock: data.initialStock,
								description: data.description,
								category_id: data.categoryId,
								operator: data.operator || null,
							}).eq('id', data.id);
						} else if (action === 'deleteProduct') {
							await supabase.from('products').delete().eq('id', data.id);
						} else if (action === 'addCategory') {
							await supabase.from('categories').insert([{
								name: data.name,
								description: data.description,
							}]);
						} else if (action === 'updateCategory') {
							await supabase.from('categories').update({
								name: data.name,
								description: data.description,
							}).eq('id', data.id);
						} else if (action === 'deleteCategory') {
							await supabase.from('categories').delete().eq('id', data.id);
						} else if (action === 'updateBalance') {
							await supabase.from('mobile_money_balances').upsert(
								data.map((balance: MobileMoneyBalance) => ({
									operator: balance.operator,
									deposit_balance: balance.deposit_balance,
									withdrawal_balance: balance.withdrawal_balance,
								})),
								{ onConflict: 'operator' }
							);
						}
					} catch (err) {
						setError(`Erreur lors de la synchronisation: ${action}`);
						console.error('Erreur:', err);
					}
				}

				const [
					{ data: productsData },
					{ data: categoriesData },
					{ data: salesData },
					{ data: balancesData },
					{ data: transactionsData },
				] = await Promise.all([
					supabase.from('products').select('*'),
					supabase.from('categories').select('*'),
					supabase.from('sales').select('*'),
					supabase.from('mobile_money_balances').select('*'),
					supabase.from('mobile_money_transactions').select('*'),
				]);

				setProducts(productsData || []);
				setCategories(categoriesData || []);
				setSales(salesData || []);
				setMobileMoneyBalances(balancesData || []);
				setMobileMoneyTransactions(transactionsData || []);

				localStorage.setItem('products', JSON.stringify(productsData || []));
				localStorage.setItem('categories', JSON.stringify(categoriesData || []));
				localStorage.setItem('sales', JSON.stringify(salesData || []));
				localStorage.setItem('mobileMoneyBalances', JSON.stringify(balancesData || []));
				localStorage.setItem('mobileMoneyTransactions', JSON.stringify(transactionsData || []));
				setOfflineQueue([]);
				localStorage.setItem('offlineQueue', JSON.stringify([]));
				setError(null);
			}
		}
		syncOfflineQueue();
	}, [isOnline, offlineQueue]);

  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return sales.filter(sale => new Date(sale.created_at).toDateString() === today);
  }, [sales]);

  const lowStockProducts = useMemo(() => {
    return products.filter(product => product.stock <= 2);
  }, [products]);

  const totalRevenue = useMemo(() => {
    return todaySales.reduce((total, sale) => total + sale.total_amount, 0);
  }, [todaySales]);

  const phonePlanStats = useMemo(() => {
    const phonePlanCategory = categories.find(c => c.name === 'Forfaits téléphoniques');
    if (!phonePlanCategory) return {} as Record<string, { totalSales: number; totalAmount: number }>;

    const phonePlanSales = sales.filter(sale => {
      const product = products.find(p => p.id === sale.product_id);
      return product?.category_id === phonePlanCategory.id;
    });

    const stats: Record<string, { totalSales: number; totalAmount: number }> = {
      MTN: { totalSales: 0, totalAmount: 0 },
      Moov: { totalSales: 0, totalAmount: 0 },
      Celtis: { totalSales: 0, totalAmount: 0 }
    };

    phonePlanSales.forEach(sale => {
      const product = products.find(p => p.id === sale.product_id);
      if (product?.operator) {
        stats[product.operator].totalSales += sale.quantity;
        stats[product.operator].totalAmount += sale.total_amount;
      }
    });

    return stats;
  }, [sales, products, categories]);

  const employeeSalesStats = useMemo(() => {
    const employeeIds = [...new Set(sales.map(sale => sale.employee_id))];
    const stats: Record<string, { products: Record<string, { quantity: number; totalAmount: number; productName: string; operator?: string | null }> }> = {};

    employeeIds.forEach(id => {
      const employeeSales = sales.filter(sale => sale.employee_id === id);
      const productStats: Record<string, { quantity: number; totalAmount: number; productName: string; operator: string | null }> = {};

      employeeSales.forEach(sale => {
        const product = products.find(p => p.id === sale.product_id);
        if (product) {
          if (!productStats[product.id]) {
            productStats[product.id] = {
              quantity: 0,
              totalAmount: 0,
              productName: product.name,
              operator: product.operator
            };
          }
          productStats[product.id].quantity += sale.quantity;
          productStats[product.id].totalAmount += sale.total_amount;
        }
      });

      stats[id] = { products: productStats };
    });

    return stats;
  }, [sales, products]);

  const mobileMoneyStats = useMemo(() => {
    const stats: Record<string, { deposits: number; withdrawals: number; depositBalance: number; withdrawalBalance: number }> = {
      MTN: { deposits: 0, withdrawals: 0, depositBalance: 0, withdrawalBalance: 0 },
      Moov: { deposits: 0, withdrawals: 0, depositBalance: 0, withdrawalBalance: 0 },
      Celtis: { deposits: 0, withdrawals: 0, depositBalance: 0, withdrawalBalance: 0 }
    };

    mobileMoneyTransactions.forEach(t => {
      if (t.type === 'deposit') {
        stats[t.operator].deposits += t.amount;
      } else {
        stats[t.operator].withdrawals += t.amount;
      }
    });

    mobileMoneyBalances.forEach(b => {
      stats[b.operator].depositBalance = b.deposit_balance;
      stats[b.operator].withdrawalBalance = b.withdrawal_balance;
    });

    return stats;
  }, [mobileMoneyTransactions, mobileMoneyBalances]);


// Add product
  const handleAddProduct = async (productData: Omit<Product, 'id' | 'created_at'>) => {
    const newProduct: Product = {
      ...productData,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    localStorage.setItem('products', JSON.stringify(updatedProducts));

    if (isOnline) {
      try {
        const { error } = await supabase.from('products').insert([{
          name: productData.name,
          price: productData.price,
          stock: productData.stock,
          // initial_stock: productData.initialStock,
          description: productData.description,
          category_id: productData.category_id,
          operator: productData.operator || null,
        }]);
        if (error) throw error;

        const { data: productsData } = await supabase.from('products').select('*');
        setProducts(productsData || []);
        localStorage.setItem('products', JSON.stringify(productsData || []));
        setError(null);
      } catch (err) {
        setError('Erreur lors de l’ajout du produit');
        console.error('Erreur:', err);
        setOfflineQueue([...offlineQueue, { action: 'addProduct', data: productData }]);
        localStorage.setItem('offlineQueue', JSON.stringify([...offlineQueue, { action: 'addProduct', data: productData }]));
      }
    } else {
      setOfflineQueue([...offlineQueue, { action: 'addProduct', data: productData }]);
      localStorage.setItem('offlineQueue', JSON.stringify([...offlineQueue, { action: 'addProduct', data: productData }]));
    }

    setShowAddProduct(false);
  };

// Update product
  const handleUpdateProduct = async (productData: Omit<Product, 'id' | 'created_at'>) => {
    if (!editingProduct) return;

    const updatedProducts = products.map(p =>
      p.id === editingProduct.id
        ? { ...productData, id: editingProduct.id, created_at: editingProduct.created_at }
        : p
    );
    setProducts(updatedProducts);
    localStorage.setItem('products', JSON.stringify(updatedProducts));

    if (isOnline) {
      try {
        const { error } = await supabase.from('products').update({
          name: productData.name,
          price: productData.price,
          stock: productData.stock,
          // initial_stock: productData.initialStock,
          description: productData.description,
          category_id: productData.category_id,
          operator: productData.operator || null,
        }).eq('id', editingProduct.id);
        if (error) throw error;

        const { data: productsData } = await supabase.from('products').select('*');
        setProducts(productsData || []);
        localStorage.setItem('products', JSON.stringify(productsData || []));
        setError(null);
      } catch (err) {
        setError('Erreur lors de la mise à jour du produit');
        console.error('Erreur:', err);
        setOfflineQueue([...offlineQueue, { action: 'updateProduct', data: { ...productData, id: editingProduct.id } }]);
        localStorage.setItem('offlineQueue', JSON.stringify([...offlineQueue, { action: 'updateProduct', data: { ...productData, id: editingProduct.id } }]));
      }
    } else {
      setOfflineQueue([...offlineQueue, { action: 'updateProduct', data: { ...productData, id: editingProduct.id } }]);
      localStorage.setItem('offlineQueue', JSON.stringify([...offlineQueue, { action: 'updateProduct', data: { ...productData, id: editingProduct.id } }]));
    }

    setEditingProduct(null);
  };


// Delete products
  const handleDeleteProduct = async (productId: string) => {
    const updatedProducts = products.filter(p => p.id !== productId);
    setProducts(updatedProducts);
    localStorage.setItem('products', JSON.stringify(updatedProducts));

    if (isOnline) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) throw error;

        const { data: productsData } = await supabase.from('products').select('*');
        setProducts(productsData || []);
        localStorage.setItem('products', JSON.stringify(productsData || []));
        setError(null);
      } catch (err) {
        setError('Erreur lors de la suppression du produit');
        console.error('Erreur:', err);
        setOfflineQueue([...offlineQueue, { action: 'deleteProduct', data: { id: productId } }]);
        localStorage.setItem('offlineQueue', JSON.stringify([...offlineQueue, { action: 'deleteProduct', data: { id: productId } }]));
      }
    } else {
      setOfflineQueue([...offlineQueue, { action: 'deleteProduct', data: { id: productId } }]);
      localStorage.setItem('offlineQueue', JSON.stringify([...offlineQueue, { action: 'deleteProduct', data: { id: productId } }]));
    }
  };


// Add Categorie
  const handleAddCategory = async (categoryData: Omit<Category, 'id' | 'created_at'>) => {
    const newCategory: Category = {
      ...categoryData,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
    const updatedCategories = [...categories, newCategory];
    setCategories(updatedCategories);
    localStorage.setItem('categories', JSON.stringify(updatedCategories));

    if (isOnline) {
      try {
        const { error } = await supabase.from('categories').insert([{
          name: categoryData.name,
          description: categoryData.description,
        }]);
        if (error) throw error;

        const { data: categoriesData } = await supabase.from('categories').select('*');
        setCategories(categoriesData || []);
        localStorage.setItem('categories', JSON.stringify(categoriesData || []));
        setError(null);
      } catch (err) {
        setError('Erreur lors de l’ajout de la catégorie');
        console.error('Erreur:', err);
        setOfflineQueue([...offlineQueue, { action: 'addCategory', data: categoryData }]);
        localStorage.setItem('offlineQueue', JSON.stringify([...offlineQueue, { action: 'addCategory', data: categoryData }]));
      }
    } else {
      setOfflineQueue([...offlineQueue, { action: 'addCategory', data: categoryData }]);
      localStorage.setItem('offlineQueue', JSON.stringify([...offlineQueue, { action: 'addCategory', data: categoryData }]));
    }

    setShowAddCategory(false);
  };

// Update Category
  const handleUpdateCategory = async (categoryData: Omit<Category, 'id' | 'created_at'>) => {
    if (!editingCategory) return;

    const updatedCategories = categories.map(c =>
      c.id === editingCategory.id
        ? { ...categoryData, id: editingCategory.id, created_at: editingCategory.created_at }
        : c
    );
    setCategories(updatedCategories);
    localStorage.setItem('categories', JSON.stringify(updatedCategories));

    if (isOnline) {
      try {
        const { error } = await supabase.from('categories').update({
          name: categoryData.name,
          description: categoryData.description,
        }).eq('id', editingCategory.id);
        if (error) throw error;

        const { data: categoriesData } = await supabase.from('categories').select('*');
        setCategories(categoriesData || []);
        localStorage.setItem('categories', JSON.stringify(categoriesData || []));
        setError(null);
      } catch (err) {
        setError('Erreur lors de la mise à jour de la catégorie');
        console.error('Erreur:', err);
        setOfflineQueue([...offlineQueue, { action: 'updateCategory', data: { ...categoryData, id: editingCategory.id } }]);
        localStorage.setItem('offlineQueue', JSON.stringify([...offlineQueue, { action: 'updateCategory', data: { ...categoryData, id: editingCategory.id } }]));
      }
    } else {
      setOfflineQueue([...offlineQueue, { action: 'updateCategory', data: { ...categoryData, id: editingCategory.id } }]);
      localStorage.setItem('offlineQueue', JSON.stringify([...offlineQueue, { action: 'updateCategory', data: { ...categoryData, id: editingCategory.id } }]));
    }

    setEditingCategory(null);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (products.some(p => p.category_id === categoryId)) {
      setError('Impossible de supprimer cette catégorie car des produits y sont associés.');
      return;
    }

    const updatedCategories = categories.filter(c => c.id !== categoryId);
    setCategories(updatedCategories);
    localStorage.setItem('categories', JSON.stringify(updatedCategories));

    if (isOnline) {
      try {
        const { error } = await supabase.from('categories').delete().eq('id', categoryId);
        if (error) throw error;

        const { data: categoriesData } = await supabase.from('categories').select('*');
        setCategories(categoriesData || []);
        localStorage.setItem('categories', JSON.stringify(categoriesData || []));
        setError(null);
      } catch (err) {
        setError('Erreur lors de la suppression de la catégorie');
        console.error('Erreur:', err);
        setOfflineQueue([...offlineQueue, { action: 'deleteCategory', data: { id: categoryId } }]);
        localStorage.setItem('offlineQueue', JSON.stringify([...offlineQueue, { action: 'deleteCategory', data: { id: categoryId } }]));
      }
    } else {
      setOfflineQueue([...offlineQueue, { action: 'deleteCategory', data: { id: categoryId } }]);
      localStorage.setItem('offlineQueue', JSON.stringify([...offlineQueue, { action: 'deleteCategory', data: { id: categoryId } }]));
    }
  };

  const TabButton: React.FC<{ id: Tab; label: string; icon: React.ReactNode; active: boolean }> = ({ id, label, icon, active }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 ${
        active
          ? 'bg-slate-900 text-white shadow-lg'
          : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
      }`}
    >
      {icon}
      <span className="text-sm font-semibold mt-2">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
              <p className="text-slate-600 font-medium">Tableau de bord {isOnline ? '(En ligne)' : '(Hors ligne)'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all duration-200"
            aria-label="Déconnexion"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
            {error}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="p-6">
        <div className="flex space-x-3 bg-slate-100 p-3 rounded-2xl">
          <TabButton
            id="overview"
            label="Vue d'ensemble"
            icon={<BarChart3 size={20} />}
            active={activeTab === 'overview'}
          />
          <TabButton
            id="products"
            label="Produits"
            icon={<Package size={20} />}
            active={activeTab === 'products'}
          />
          <TabButton
            id="categories"
            label="Catégories"
            icon={<ShoppingCart size={20} />}
            active={activeTab === 'categories'}
          />
          <TabButton
            id="sales"
            label="Ventes"
            icon={<TrendingUp size={20} />}
            active={activeTab === 'sales'}
          />
          <TabButton
            id="mobileMoney"
            label="Mobile Money"
            icon={<DollarSign size={20} />}
            active={activeTab === 'mobileMoney'}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Revenus du jour</h3>
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{totalRevenue.toLocaleString()}</p>
                <p className="text-slate-600 font-medium">FCFA</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Ventes du jour</h3>
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{todaySales.length}</p>
                <p className="text-slate-600 font-medium">Transactions</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Produits actifs</h3>
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{products.length}</p>
                <p className="text-slate-600 font-medium">En catalogue</p>
              </div>
            </div>

            {/* Phone Plan Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Statistiques Forfaits Téléphoniques</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(phonePlanStats as Record<string, { totalSales: number; totalAmount: number }>).map(([operator, stats]) => (
                  <div key={operator} className="bg-slate-50 rounded-xl p-4">
                    <p className="text-lg font-bold text-slate-900 mb-2">{operator}</p>
                    <p className="text-sm text-slate-600">Total ventes: {stats.totalSales}</p>
                    <p className="text-sm text-slate-600">Montant: {stats.totalAmount.toLocaleString()} FCFA</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold text-amber-800">Stock faible</h3>
                </div>
                <div className="space-y-3">
                  {lowStockProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between bg-white rounded-xl p-4 border border-amber-200">
                      <span className="font-semibold text-amber-800">{product.name}{product.operator ? ` (${product.operator})` : ''}</span>
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-bold">
                        {product.stock} restant{product.stock > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today's Sales */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Ventes d'aujourd'hui</h3>
              </div>
              {todaySales.length > 0 ? (
                <div className="space-y-3">
                  {todaySales.map(sale => {
                    const product = products.find(p => p.id === sale.product_id);
                    return (
                      <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <p className="font-semibold text-slate-900">{product?.name || 'Produit inconnu'}{product?.operator ? ` (${product.operator})` : ''}</p>
                          <p className="text-slate-600">Employé: {sale.employee_id}</p>
                          <p className="text-slate-600">Quantité: {sale.quantity}{sale.sold_amount ? ` (Vendu à ${sale.sold_amount} FCFA)` : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-slate-900">{sale.total_amount.toLocaleString()}</p>
                          <p className="text-sm text-slate-500">{new Date(sale.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-lg">Aucune vente aujourd'hui</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Historique des ventes par employé</h2>
            <div className="space-y-6">
              {Object.entries(employeeSalesStats as Record<string, { products: Record<string, { quantity: number; totalAmount: number; productName: string; operator?: string }>}>).map(([employeeId, employeeData]) => (
                <div key={employeeId} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Employé {employeeId}</h3>
                  <div className="space-y-3">
                    {Object.entries(employeeData.products).map(([productId, stats]) => (
                      <div key={productId} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <p className="font-semibold text-slate-900">{stats.productName}{stats.operator ? ` (${stats.operator})` : ''}</p>
                          <p className="text-slate-600">Quantité: {stats.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-slate-900">{stats.totalAmount.toLocaleString()} FCFA</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(employeeSalesStats).length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-lg">Aucune vente enregistrée</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'mobileMoney' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Gestion Mobile Money</h2>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Statistiques Mobile Money</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(mobileMoneyStats as Record<string, { deposits: number; withdrawals: number; depositBalance: number; withdrawalBalance: number }>).map(([operator, stats]) => (
                  <div key={operator} className="bg-slate-50 rounded-xl p-4">
                    <p className="text-lg font-bold text-slate-900 mb-2">{operator}</p>
                    <p className="text-sm text-slate-600">Dépôts: {stats.deposits.toLocaleString()} FCFA</p>
                    <p className="text-sm text-slate-600">Retraits: {stats.withdrawals.toLocaleString()} FCFA</p>
                    <p className="text-sm text-slate-600">Solde dépôt: {stats.depositBalance.toLocaleString()} FCFA</p>
                    <p className="text-sm text-slate-600">Solde retrait: {stats.withdrawalBalance.toLocaleString()} FCFA</p>
                  </div>
                ))}
              </div>
            </div>
            <MobileMoneyManagement />
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Gestion des produits</h2>
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl flex items-center space-x-2 shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                <Plus size={20} />
                <span className="font-semibold">Nouveau produit</span>
              </button>
            </div>
            
            <div className="grid gap-4">
              {products.map(product => {
                const category = categories.find(c => c.id === product.category_id);
                return (
                  <div key={product.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{product.name}{product.operator ? ` (${product.operator})` : ''}</h3>
                        <p className="text-slate-600 mb-3">{category?.name || 'Aucune catégorie'}</p>
                        <div className="flex items-center space-x-4">
                          <div className="bg-slate-50 rounded-xl px-4 py-2">
                            <span className="text-sm font-semibold text-slate-600">Prix: </span>
                            <span className="text-lg font-bold text-slate-900">{product.price.toLocaleString()} FCFA</span>
                          </div>
                          <div className={`rounded-xl px-4 py-2 ${
                            product.stock <= 2 
                              ? 'bg-red-50 text-red-700' 
                              : 'bg-green-50 text-green-700'
                          }`}>
                            <span className="text-sm font-semibold">Stock: </span>
                            <span className="text-lg font-bold">{product.stock}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="p-3 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                          aria-label={`Modifier ${product.name}`}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                          aria-label={`Supprimer ${product.name}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Gestion des catégories</h2>
              <button
                onClick={() => setShowAddCategory(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl flex items-center space-x-2 shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                <Plus size={20} />
                <span className="font-semibold">Nouvelle catégorie</span>
              </button>
            </div>
            
            <div className="grid gap-4">
              {categories.map(category => (
                <div key={category.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{category.name}</h3>
                      <p className="text-slate-600 mb-3">{category.description || 'Aucune description'}</p>
                      <div className="bg-slate-50 rounded-xl px-4 py-2 inline-block">
                        <span className="text-sm font-semibold text-slate-600">
                          {products.filter(p => p.category_id === category.id).length} produit(s)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="p-3 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                        aria-label={`Modifier ${category.name}`}
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                        aria-label={`Supprimer ${category.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(showAddProduct || editingProduct) && (
          <ProductModal
            product={editingProduct}
            categories={categories}
            onSave={editingProduct ? handleUpdateProduct : handleAddProduct}
            onCancel={() => {
              setShowAddProduct(false);
              setEditingProduct(null);
            }}
          />
        )}

        {(showAddCategory || editingCategory) && (
          <CategoryModal
            category={editingCategory}
            onSave={editingCategory ? handleUpdateCategory : handleAddCategory}
            onCancel={() => {
              setShowAddCategory(false);
              setEditingCategory(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

// Product Modal Component
const ProductModal: React.FC<{
  product?: Product | null;
  categories: Category[];
  onSave: (data: Omit<Product, 'id' | 'created_at'>) => void;
  onCancel: () => void;
}> = ({ product, categories, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category_id: product?.category_id || '',
    price: product?.price || 0,
    stock: product?.stock || 0,
    // initialStock: product?.initialStock || 0,
    description: product?.description || '',
    operator: (product?.operator || '') as '' | 'MTN' | 'Moov' | 'Celtis'
  });
  const [error, setError] = useState('');

  const phonePlanCategoryId = categories.find(c => c.name === 'Forfaits téléphoniques')?.id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Le nom du produit est requis.');
      return;
    }
    if (!formData.category_id) {
      setError('Veuillez sélectionner une catégorie.');
      return;
    }
    if (formData.price < 0) {
      setError('Le prix ne peut pas être négatif.');
      return;
    }
    if (formData.stock < 0) {
      setError('Le stock ne peut pas être négatif.');
      return;
    }
    // if (formData.initialStock < 0) {
    //   setError('Le stock initial ne peut pas être négatif.');
    //   return;
    // }
    if (formData.category_id === phonePlanCategoryId && !['MTN', 'Moov', 'Celtis'].includes(formData.operator)) {
      setError('Veuillez sélectionner un opérateur valide pour les forfaits téléphoniques.');
      return;
    }

    const dataToSave: Omit<Product, 'id' | 'created_at'> = {
      ...formData,
      operator: formData.category_id === phonePlanCategoryId ? (formData.operator as 'MTN' | 'Moov' | 'Celtis' ) : null
    };

    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
        <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">
          {product ? 'Modifier le produit' : 'Nouveau produit'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nom du produit</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Catégorie</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value, operator: e.target.value === phonePlanCategoryId ? formData.operator : '' })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              required
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          
          {formData.category_id === phonePlanCategoryId && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Opérateur</label>
              <select
                value={formData.operator}
                onChange={(e) => setFormData({ ...formData, operator: e.target.value as '' | 'MTN' | 'Moov' | 'Celtis' })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                required
              >
                <option value="">Sélectionner un opérateur</option>
                <option value="MTN">MTN</option>
                <option value="Moov">Moov</option>
                <option value="Celtis">Celtis</option>
              </select>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Prix (FCFA)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                min="0"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Stock actuel</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                min="0"
                required
              />
            </div>
          </div>
          
          {/* <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Stock initial</label>
            <input
              type="number"
              value={formData.initialStock}
              onChange={(e) => setFormData({ ...formData, initialStock: Number(e.target.value) })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              min="0"
              required
            />
          </div> */}
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              rows={3}
            />
          </div>
          
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 text-slate-600 border border-slate-300 rounded-2xl hover:bg-slate-50 transition-all duration-200 font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg"
            >
              {product ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Category Modal Component
const CategoryModal: React.FC<{
  category?: Category | null;
  onSave: (data: Omit<Category, 'id' | 'created_at'>) => void;
  onCancel: () => void;
}> = ({ category, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || ''
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Le nom de la catégorie est requis.');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
        <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">
          {category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nom de la catégorie</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              rows={4}
            />
          </div>
          
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 text-slate-600 border border-slate-300 rounded-2xl hover:bg-slate-50 transition-all duration-200 font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg"
            >
              {category ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;