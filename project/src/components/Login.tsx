import React, { useState } from 'react';
import { LogIn, Store, Eye, EyeOff, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: any, role: 'admin' | 'employee') => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Authentification avec Supabase
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !user) {
        setError('Identifiants invalides');
        setLoading(false);
        return;
      }

      // Vérifier le rôle de l'utilisateur
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (roleError || !userData || !['admin', 'employee'].includes(userData.role)) {
        setError('Rôle utilisateur non valide');
        setLoading(false);
        await supabase.auth.signOut();
        return;
      }

      // Appeler onLogin avec l'utilisateur et son rôle
      onLogin(user, userData.role);
    } catch (err) {
      setError('Erreur lors de la connexion');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
      {/* Subtle geometric background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-amber-100/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Clean, minimal card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/50 p-8 relative">
          <div className="relative z-10">
            {/* Logo and branding */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-6 shadow-lg relative">
                <Store className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Ma Boutique Pro</h1>
              <p className="text-slate-600 text-lg font-medium">Gestion professionnelle</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 tracking-wide">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-slate-900 text-lg placeholder-slate-400"
                    placeholder="Votre email"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 tracking-wide">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-slate-900 text-lg placeholder-slate-400 pr-14"
                    placeholder="Votre mot de passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200 p-1"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Login button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                    <span className="text-lg">Connexion...</span>
                  </div>
                ) : (
                  <>
                    <LogIn size={20} />
                    <span className="text-lg">Se connecter</span>
                  </>
                )}
              </button>
            </form>

            {/* Credentials info */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="text-xs text-slate-500 space-y-3  rounded-2xl p-4">
                <p className="font-semibold text-slate-700 mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Comptes de démonstration
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <p className="text-slate-900 font-semibold">👑 Administrateur</p>
                    <p className="text-slate-600">admin@boutiquepro.com / AZERTY2005</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <p className="text-slate-900 font-semibold">👤 Employé</p>
                    <p className="text-slate-600">employee@boutiquepro.com / employe123</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;