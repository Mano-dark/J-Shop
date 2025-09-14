import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import { MobileMoneyBalance, Product, Category } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'admin' | 'employee' | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialiser les données par défaut
  const initializeDefaultData = async () => {
    try {
      // Vérifier si les données existent déjà
      const { data: existingBalances } = await supabase
        .from('mobile_money_balances')
        .select('operator')
        .in('operator', ['MTN', 'Moov', 'Celtis']);
      const { data: existingProducts } = await supabase
        .from('products')
        .select('id')
        .limit(1);
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('id')
        .limit(1);

      // Initialiser les soldes Mobile Money si absents
      if (!existingBalances || existingBalances.length < 3) {
        const defaultBalances: Partial<MobileMoneyBalance>[] = [
          { operator: 'MTN', deposit_balance: 0, withdrawal_balance: 0 },
          { operator: 'Moov', deposit_balance: 0, withdrawal_balance: 0 },
          { operator: 'Celtis', deposit_balance: 0, withdrawal_balance: 0 },
        ];
        await supabase.from('mobile_money_balances').upsert(defaultBalances, {
          onConflict: 'operator',
        });
      }

      // Initialiser une catégorie par défaut si absente
      if (!existingCategories || existingCategories.length === 0) {
        const defaultCategory: Partial<Category> = {
          name: 'Général',
          description: 'Catégorie par défaut pour les produits',
        };
        await supabase.from('categories').insert([defaultCategory]);
      }

      // Initialiser un produit par défaut si absent
      if (!existingProducts || existingProducts.length === 0) {
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('name', 'Général')
          .single();
        const defaultProduct: Partial<Product> = {
          name: 'Produit par défaut',
          price: 1000,
          stock: 100,
          description: 'Produit de test',
          category_id: category?.id,
        };
        await supabase.from('products').insert([defaultProduct]);
      }
    } catch (err) {
      console.error('Erreur lors de l’initialisation des données:', err);
    }
  };

  // Gérer l'état d'authentification
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          if (!error && userData && ['admin', 'employee'].includes(userData.role)) {
            setUser(user);
            setRole(userData.role);
            // Initialiser les données après connexion
            await initializeDefaultData();
          } else {
            await supabase.auth.signOut();
            setUser(null);
            setRole(null);
          }
        }
      } catch (err) {
        console.error('Erreur lors de la récupération de l’utilisateur:', err);
      } finally {
        setLoading(false);
      }
    };

  //    if (error) {
  //    return (
  //      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
  //        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
  //          {err}
  //        </div>
  //      </div>
  //    );
  //  }

    fetchUser();

    // Écouter les changements d'état d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (!error && userData && ['admin', 'employee'].includes(userData.role)) {
          setUser(session.user);
          setRole(userData.role);
          await initializeDefaultData();
        } else {
          await supabase.auth.signOut();
          setUser(null);
          setRole(null);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (user: any, role: 'admin' | 'employee') => {
    setUser(user);
    setRole(role);
    await initializeDefaultData();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  

  if (!user || !role) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen">
      {role === 'admin' ? (
        <AdminDashboard onLogout={handleLogout} />
      ) : (
        <EmployeeDashboard onLogout={handleLogout} employeeId={user.id} />
      )}
    </div>
  );
};

export default App;