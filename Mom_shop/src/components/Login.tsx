import React, { useState } from 'react';
import { LogIn, Store, Eye, EyeOff, Shield, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: any, role: 'admin' | 'employee') => void;
  onRegisterClick: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegisterClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState<'admin' | 'employee' | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

      // Vérifier le rôle de l'utilisateur et le username
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('role, username')
        .eq('id', user.id)
        .single();
        
      if (roleError || !userData || !['admin', 'employee'].includes(userData.role)) {
        setError('Compte non autorisé');
        setLoading(false);
        await supabase.auth.signOut();
        return;
      }

      //  Si l'utilisateur n'a pas encore de username → on lui demande
      if (!userData.username) {
        setCurrentUser(user);
        setCurrentRole(userData.role);
        setShowUsernameForm(true);
        // setLoading(false);
        return; // On attend qu'il choisisse un username
      }

      // Appeler onLogin avec l'utilisateur et son rôle
      onLogin(user, userData.role);
    } catch (err: any) {
      setError('Erreur lors de la connexion');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  // Sauvegarde du username choisi
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Le nom d\'utilisateur est requis');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Vérifier unicité
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle();

      if (existing) {
        setError('Ce nom d\'utilisateur est déjà pris');
        return;
      }

      // Mettre à jour
      const { error: updateError } = await supabase
        .from('users')
        .update({ username: username.trim() })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      // Connexion réussie !
      onLogin(currentUser, currentRole!);
    } catch (err: any) {
      setError('Erreur lors de la sauvegarde du nom d\'utilisateur');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (showUsernameForm) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <User className="w-16 h-16 mx-auto text-slate-900 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900">Choisissez votre nom d'utilisateur</h2>
            <p className="text-slate-600 mt-2">Ce nom sera visible dans l'application</p>
          </div>

          <form onSubmit={handleUsernameSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="Votre pseudo (ex: HermannPro)"
                required
                minLength={3}
                maxLength={20}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Valider et continuer'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Formulaire de connexion classique
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
      {/* Fond subtil */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-amber-100/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/50 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-6 shadow-lg">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Ma Boutique Pro</h1>
          </div>

          <form onSubmit={handleLoginSubmit} className="w-full max-w-md space-y-6">
            {/* Email */}
          <div>
         <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
           <input
             type="email"
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             className="w-full px-4 py-2  bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
             placeholder="ex@boutiquepro.com"
             required
           />
         </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900  placeholder-slate-400 pr-14"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-4 px-6 rounded-2xl transition-all flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Connexion...</span>
                </div>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Se connecter</span>
                </>
              )}
            </button>
          </form>

          {/* Comptes de démonstration - remis ici */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="text-xs text-slate-500 space-y-3 rounded-2xl p-4">
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
          {/* Lien vers l'inscription - placé juste en dessous */}
            <div className="mt-6 text-center">
              <button
                onClick={onRegisterClick}
                className="text-slate-600 hover:text-slate-900 font-small text-base transition-colors duration-200 "
              >
                Créer un compte employé →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;