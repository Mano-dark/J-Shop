import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, TrendingUp, DollarSign, LogOut, Calendar, Plus } from 'lucide-react';
import { Product, Sale, MobileMoneyBalance, MobileMoneyTransaction } from '../types';
import { supabase } from '../lib/supabase';

interface EmployeeDashboardProps {
  onLogout: () => void;
  employeeId: string; // Identifiant de l'employé connecté
}

type Tab = 'sales' | 'mobileMoney';

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ onLogout, employeeId }) => {
  const [activeTab, setActiveTab] = useState<Tab>('sales');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [mobileMoneyBalances, setMobileMoneyBalances] = useState<MobileMoneyBalance[]>([]);
  const [mobileMoneyTransactions, setMobileMoneyTransactions] = useState<MobileMoneyTransaction[]>([]);
  const [showAddSale, setShowAddSale] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<
    { action: 'addSale' | 'addTransaction' | 'updateBalance'; data: any }[]
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

  useEffect(() => {
    async function loadData() {
      // Charger depuis localStorage
      const localProducts = localStorage.getItem('products');
      const localSales = localStorage.getItem('sales');
      const localBalances = localStorage.getItem('mobileMoneyBalances');
      const localTransactions = localStorage.getItem('mobileMoneyTransactions');
      const localQueue = localStorage.getItem('offlineQueue');

      if (localProducts) setProducts(JSON.parse(localProducts));
      if (localSales) setSales(JSON.parse(localSales));
      if (localBalances) setMobileMoneyBalances(JSON.parse(localBalances));
      if (localTransactions) setMobileMoneyTransactions(JSON.parse(localTransactions));
      if (localQueue) setOfflineQueue(JSON.parse(localQueue) || []);

      // Si en ligne, synchroniser avec Supabase
      if (isOnline) {
        try {
          const [
            { data: productsData, error: productsError },
            { data: salesData, error: salesError },
            { data: balancesData, error: balancesError },
            { data: transactionsData, error: transactionsError },
          ] = await Promise.all([
            supabase.from('products').select('*'),
            supabase.from('sales').select('*').eq('employee_id', employeeId),
            supabase.from('mobile_money_balances').select('*'),
            supabase.from('mobile_money_transactions').select('*').eq('employee_id', employeeId),
          ]);

          if (productsError || salesError || balancesError || transactionsError) {
            setError('Erreur lors du chargement des données');
            console.error('Erreurs:', productsError, salesError, balancesError, transactionsError);
            return;
          }

          setProducts(productsData || []);
          setSales(salesData || []);
          setMobileMoneyBalances(balancesData || []);
          setMobileMoneyTransactions(transactionsData || []);

          localStorage.setItem('products', JSON.stringify(productsData || []));
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
  }, [isOnline, employeeId]);

  // Synchroniser les actions hors ligne
  useEffect(() => {
    async function syncOfflineQueue() {
      if (isOnline && offlineQueue.length > 0) {
        for (const { action, data } of offlineQueue) {
          try {
            if (action === 'addSale') {
              await supabase.from('sales').insert([{
                product_id: data.productId,
                quantity: data.quantity,
                total_amount: data.totalAmount,
                sold_amount: data.soldAmount,
                employee_id: employeeId,
              }]);
              // Mettre à jour le stock
              await supabase.from('products').update({
                stock: data.newStock,
              }).eq('id', data.productId);
            } else if (action === 'addTransaction') {
              await supabase.from('mobile_money_transactions').insert([{
                type: data.type,
                operator: data.operator,
                phone_number: data.phoneNumber,
                amount: data.amount,
                employee_id: employeeId,
              }]);
              // Mettre à jour le solde
              const balanceField = data.type === 'deposit' ? 'deposit_balance' : 'withdrawal_balance';
              const { data: balanceData } = await supabase
                .from('mobile_money_balances')
                .select(balanceField)
                .eq('operator', data.operator)
                .single();
              const currentBalance = balanceData ? balanceData[balanceField] : 0;
              await supabase
                .from('mobile_money_balances')
                .upsert(
                  {
                    operator: data.operator,
                    [balanceField]: currentBalance + data.amount,
                  },
                  { onConflict: 'operator' }
                );
            }
          } catch (err) {
            setError(`Erreur lors de la synchronisation: ${action}`);
            console.error('Erreur:', err);
          }
        }

        // Rafraîchir les données et vider la file d'attente
        const [
          { data: productsData },
          { data: salesData },
          { data: balancesData },
          { data: transactionsData },
        ] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('sales').select('*').eq('employee_id', employeeId),
          supabase.from('mobile_money_balances').select('*'),
          supabase.from('mobile_money_transactions').select('*').eq('employee_id', employeeId),
        ]);

        setProducts(productsData || []);
        setSales(salesData || []);
        setMobileMoneyBalances(balancesData || []);
        setMobileMoneyTransactions(transactionsData || []);

        localStorage.setItem('products', JSON.stringify(productsData || []));
        localStorage.setItem('sales', JSON.stringify(salesData || []));
        localStorage.setItem('mobileMoneyBalances', JSON.stringify(balancesData || []));
        localStorage.setItem('mobileMoneyTransactions', JSON.stringify(transactionsData || []));
        setOfflineQueue([]);
        localStorage.setItem('offlineQueue', JSON.stringify([]));
        setError(null);
      }
    }
    syncOfflineQueue();
  }, [isOnline, offlineQueue, employeeId]);

  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return sales.filter(sale => new Date(sale.created_at).toDateString() === today);
  }, [sales]);

  const totalRevenue = useMemo(() => {
    return todaySales.reduce((total, sale) => total + sale.total_amount, 0);
  }, [todaySales]);

  const mobileMoneyStats = useMemo(() => {
    const stats: Record<string, { deposits: number; withdrawals: number; depositBalance: number; withdrawalBalance: number }> = {
      MTN: { deposits: 0, withdrawals: 0, depositBalance: 0, withdrawalBalance: 0 },
      Moov: { deposits: 0, withdrawals: 0, depositBalance: 0, withdrawalBalance: 0 },
      Celtis: { deposits: 0, withdrawals: 0, depositBalance: 0, withdrawalBalance: 0 },
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

  const handleAddSale = async (saleData: { productId: string; quantity: number; soldAmount?: number }) => {
    const product = products.find(p => p.id === saleData.productId);
    if (!product) {
      setError('Produit introuvable');
      return;
    }
    if (product.stock < saleData.quantity) {
      setError('Stock insuffisant');
      return;
    }

    const newSale: Sale = {
      id: Date.now().toString(),
      product_id: saleData.productId,
      quantity: saleData.quantity,
      total_amount: saleData.soldAmount || product.price * saleData.quantity,
      sold_amount: saleData.soldAmount,
      created_at: new Date().toISOString(),
      employee_id: employeeId,
    };
    const newStock = product.stock - saleData.quantity;
    const updatedProducts = products.map(p => (p.id === product.id ? { ...p, stock: newStock } : p));
    const updatedSales = [...sales, newSale];

    setProducts(updatedProducts);
    setSales(updatedSales);
    localStorage.setItem('products', JSON.stringify(updatedProducts));
    localStorage.setItem('sales', JSON.stringify(updatedSales));

    if (isOnline) {
      try {
        const [{ error: saleError }, { error: productError }] = await Promise.all([
          supabase.from('sales').insert([{
            product_id: newSale.product_id,
            quantity: newSale.quantity,
            total_amount: newSale.total_amount,
            sold_amount: newSale.sold_amount,
            employee_id: newSale.employee_id,
          }]),
          supabase.from('products').update({ stock: newStock }).eq('id', product.id),
        ]);
        if (saleError || productError) throw saleError || productError;

        const [{ data: productsData }, { data: salesData }] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('sales').select('*').eq('employee_id', employeeId),
        ]);
        setProducts(productsData || []);
        setSales(salesData || []);
        localStorage.setItem('products', JSON.stringify(productsData || []));
        localStorage.setItem('sales', JSON.stringify(salesData || []));
        setError(null);
      } catch (err) {
        setError('Erreur lors de l’enregistrement de la vente');
        console.error('Erreur:', err);
        setOfflineQueue([
          ...offlineQueue,
          {
            action: 'addSale',
            data: {
              productId: newSale.product_id,
              quantity: newSale.quantity,
              totalAmount: newSale.total_amount,
              soldAmount: newSale.sold_amount,
              newStock,
            },
          },
        ]);
        localStorage.setItem(
          'offlineQueue',
          JSON.stringify([
            ...offlineQueue,
            {
              action: 'addSale',
              data: {
                productId: newSale.product_id,
                quantity: newSale.quantity,
                totalAmount: newSale.total_amount,
                soldAmount: newSale.sold_amount,
                newStock,
              },
            },
          ])
        );
      }
    } else {
      setOfflineQueue([
        ...offlineQueue,
        {
          action: 'addSale',
          data: {
            productId: newSale.product_id,
            quantity: newSale.quantity,
            totalAmount: newSale.total_amount,
            soldAmount: newSale.sold_amount,
            newStock,
          },
        },
      ]);
      localStorage.setItem(
        'offlineQueue',
        JSON.stringify([
          ...offlineQueue,
          {
            action: 'addSale',
            data: {
              productId: newSale.product_id,
              quantity: newSale.quantity,
              totalAmount: newSale.total_amount,
              soldAmount: newSale.sold_amount,
              newStock,
            },
          },
        ])
      );
    }

    setShowAddSale(false);
  };

  const TabButton: React.FC<{ id: Tab; label: string; icon: React.ReactNode; active: boolean }> = ({
    id,
    label,
    icon,
    active,
  }) => (
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
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Tableau de bord employé</h1>
              <p className="text-slate-600 font-medium">
                Employé {employeeId} {isOnline ? '(En ligne)' : '(Hors ligne)'}
              </p>
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
            id="sales"
            label="Ventes"
            icon={<ShoppingCart size={20} />}
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
        {activeTab === 'sales' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            {/* Today's Sales */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Ventes d'aujourd'hui</h3>
                </div>
                <button
                  onClick={() => setShowAddSale(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl flex items-center space-x-2 shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Plus size={20} />
                  <span className="font-semibold">Nouvelle vente</span>
                </button>
              </div>
              {todaySales.length > 0 ? (
                <div className="space-y-3">
                  {todaySales.map(sale => {
                    const product = products.find(p => p.id === sale.product_id);
                    return (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {product?.name || 'Produit inconnu'}
                            {product?.operator ? ` (${product.operator})` : ''}
                          </p>
                          <p className="text-slate-600">
                            Quantité: {sale.quantity}
                            {sale.sold_amount ? ` (Vendu à ${sale.sold_amount} FCFA)` : ''}
                          </p>
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
            <MobileMoneyManagement
              employeeId={employeeId}
              isOnline={isOnline}
              setError={setError}
              mobileMoneyBalances={mobileMoneyBalances}
              setMobileMoneyBalances={setMobileMoneyBalances}
              mobileMoneyTransactions={mobileMoneyTransactions}
              setMobileMoneyTransactions={setMobileMoneyTransactions}
              offlineQueue={offlineQueue}
              setOfflineQueue={setOfflineQueue}
            />
          </div>
        )}

        {showAddSale && (
          <SaleModal
            products={products}
            onSave={handleAddSale}
            onCancel={() => setShowAddSale(false)}
          />
        )}
      </div>
    </div>
  );
};

// Sale Modal Component
const SaleModal: React.FC<{
  products: Product[];
  onSave: (data: { productId: string; quantity: number; soldAmount?: number }) => void;
  onCancel: () => void;
}> = ({ products, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
    soldAmount: '' as string | number,
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.productId) {
      setError('Veuillez sélectionner un produit.');
      return;
    }
    if (formData.quantity < 1) {
      setError('La quantité doit être supérieure à 0.');
      return;
    }
    const product = products.find(p => p.id === formData.productId);
    if (!product) {
      setError('Produit introuvable.');
      return;
    }
    if (product.stock < formData.quantity) {
      setError('Stock insuffisant.');
      return;
    }
    if (formData.soldAmount && Number(formData.soldAmount) < 0) {
      setError('Le prix de vente ne peut pas être négatif.');
      return;
    }

    onSave({
      productId: formData.productId,
      quantity: formData.quantity,
      soldAmount: formData.soldAmount ? Number(formData.soldAmount) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
        <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">Nouvelle vente</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Produit</label>
            <select
              value={formData.productId}
              onChange={e => setFormData({ ...formData, productId: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              required
            >
              <option value="">Sélectionner un produit</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} {product.operator ? `(${product.operator})` : ''} - {product.stock} en stock
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Quantité</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Prix de vente (optionnel, FCFA)</label>
            <input
              type="number"
              value={formData.soldAmount}
              onChange={e => setFormData({ ...formData, soldAmount: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              min="0"
              placeholder="Laissez vide pour utiliser le prix par défaut"
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
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// MobileMoneyManagement Component
const MobileMoneyManagement: React.FC<{
  employeeId: string;
  isOnline: boolean;
  setError: (error: string | null) => void;
  mobileMoneyBalances: MobileMoneyBalance[];
  setMobileMoneyBalances: React.Dispatch<React.SetStateAction<MobileMoneyBalance[]>>;
  mobileMoneyTransactions: MobileMoneyTransaction[];
  setMobileMoneyTransactions: React.Dispatch<React.SetStateAction<MobileMoneyTransaction[]>>;
  offlineQueue: { action: 'addSale' | 'addTransaction' | 'updateBalance'; data: any }[];
  setOfflineQueue: React.Dispatch<
    React.SetStateAction<{ action: 'addSale' | 'addTransaction' | 'updateBalance'; data: any }[]>
  >;
}> = ({
  employeeId,
  isOnline,
  setError,
  mobileMoneyBalances,
  setMobileMoneyBalances,
  mobileMoneyTransactions,
  setMobileMoneyTransactions,
  offlineQueue,
  setOfflineQueue,
}) => {
  const [formData, setFormData] = useState({
    type: 'deposit' as 'deposit' | 'withdrawal',
    operator: '' as '' | 'MTN' | 'Moov' | 'Celtis',
    phoneNumber: '',
    amount: 0,
  });
  const [error, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!['MTN', 'Moov', 'Celtis'].includes(formData.operator)) {
      setLocalError('Veuillez sélectionner un opérateur valide.');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setLocalError('Le numéro de téléphone est requis.');
      return;
    }
    if (formData.amount <= 0) {
      setLocalError('Le montant doit être supérieur à 0.');
      return;
    }

    const newTransaction: MobileMoneyTransaction = {
      id: Date.now().toString(),
      type: formData.type,
      operator: formData.operator,
      phone_number: formData.phoneNumber,
      amount: formData.amount,
      created_at: new Date().toISOString(),
      employee_id: employeeId,
    };

    const balanceField = formData.type === 'deposit' ? 'deposit_balance' : 'withdrawal_balance';
    const currentBalance = mobileMoneyBalances.find(b => b.operator === formData.operator)?.[balanceField] || 0;
    const updatedBalance = currentBalance + formData.amount;
    const updatedBalances = mobileMoneyBalances.filter(b => b.operator !== formData.operator).concat({
      id: mobileMoneyBalances.find(b => b.operator === formData.operator)?.id || Date.now().toString(),
      operator: formData.operator,
      deposit_balance: formData.type === 'deposit' ? updatedBalance : currentBalance,
      withdrawal_balance: formData.type === 'withdrawal' ? updatedBalance : currentBalance,
      created_at: new Date().toISOString(),
    });
    const updatedTransactions = [...mobileMoneyTransactions, newTransaction];

    setMobileMoneyBalances(updatedBalances);
    setMobileMoneyTransactions(updatedTransactions);
    localStorage.setItem('mobileMoneyBalances', JSON.stringify(updatedBalances));
    localStorage.setItem('mobileMoneyTransactions', JSON.stringify(updatedTransactions));

    if (isOnline) {
      try {
        const [{ error: transactionError }, { error: balanceError }] = await Promise.all([
          supabase.from('mobile_money_transactions').insert([{
            type: newTransaction.type,
            operator: newTransaction.operator,
            phone_number: newTransaction.phone_number,
            amount: newTransaction.amount,
            employee_id: newTransaction.employee_id,
          }]),
          supabase.from('mobile_money_balances').upsert(
            {
              operator: formData.operator,
              [balanceField]: updatedBalance,
            },
            { onConflict: 'operator' }
          ),
        ]);
        if (transactionError || balanceError) throw transactionError || balanceError;

        const [{ data: balancesData }, { data: transactionsData }] = await Promise.all([
          supabase.from('mobile_money_balances').select('*'),
          supabase.from('mobile_money_transactions').select('*').eq('employee_id', employeeId),
        ]);
        setMobileMoneyBalances(balancesData || []);
        setMobileMoneyTransactions(transactionsData || []);
        localStorage.setItem('mobileMoneyBalances', JSON.stringify(balancesData || []));
        localStorage.setItem('mobileMoneyTransactions', JSON.stringify(transactionsData || []));
        setError(null);
      } catch (err) {
        setError('Erreur lors de l’enregistrement de la transaction Mobile Money');
        console.error('Erreur:', err);
        setOfflineQueue([
          ...offlineQueue,
          {
            action: 'addTransaction',
            data: {
              type: newTransaction.type,
              operator: newTransaction.operator,
              phoneNumber: newTransaction.phone_number,
              amount: newTransaction.amount,
            },
          },
        ]);
        localStorage.setItem(
          'offlineQueue',
          JSON.stringify([
            ...offlineQueue,
            {
              action: 'addTransaction',
              data: {
                type: newTransaction.type,
                operator: newTransaction.operator,
                phoneNumber: newTransaction.phone_number,
                amount: newTransaction.amount,
              },
            },
          ])
        );
      }
    } else {
      setOfflineQueue([
        ...offlineQueue,
        {
          action: 'addTransaction',
          data: {
            type: newTransaction.type,
            operator: newTransaction.operator,
            phoneNumber: newTransaction.phone_number,
            amount: newTransaction.amount,
          },
        },
      ]);
      localStorage.setItem(
        'offlineQueue',
        JSON.stringify([
          ...offlineQueue,
          {
            action: 'addTransaction',
            data: {
              type: newTransaction.type,
              operator: newTransaction.operator,
              phoneNumber: newTransaction.phone_number,
              amount: newTransaction.amount,
            },
          },
        ])
      );
    }

    setFormData({ type: 'deposit', operator: '', phoneNumber: '', amount: 0 });
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Enregistrer une transaction Mobile Money</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Type de transaction</label>
          <select
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value as 'deposit' | 'withdrawal' })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            required
          >
            <option value="deposit">Dépôt</option>
            <option value="withdrawal">Retrait</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Opérateur</label>
          <select
            value={formData.operator}
            onChange={e => setFormData({ ...formData, operator: e.target.value as '' | 'MTN' | 'Moov' | 'Celtis' })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            required
          >
            <option value="">Sélectionner un opérateur</option>
            <option value="MTN">MTN</option>
            <option value="Moov">Moov</option>
            <option value="Celtis">Celtis</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Numéro de téléphone</label>
          <input
            type="text"
            value={formData.phoneNumber}
            onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Montant (FCFA)</label>
          <input
            type="number"
            value={formData.amount}
            onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            min="1"
            required
          />
        </div>
        <div className="flex space-x-4 pt-4">
          <button
            type="button"
            onClick={() => setFormData({ type: 'deposit', operator: '', phoneNumber: '', amount: 0 })}
            className="flex-1 px-6 py-3 text-slate-600 border border-slate-300 rounded-2xl hover:bg-slate-50 transition-all duration-200 font-semibold"
          >
            Réinitialiser
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeDashboard;