import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RegisterProps {
  onLogin: (user: any, role: 'admin' | 'employee') => void;
  // onRegisterSuccess?: () => void; // Optionnel maintenant
}

const Register: React.FC<RegisterProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (username.trim().length < 3) {
      setError('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      setLoading(false);
      return;
    }

    try {
      // 1. Vérifier username unique
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle();

      if (existing) {
        setError('Ce nom d\'utilisateur est déjà pris');
        setLoading(false);
        return;
      }

      // 2. Créer un mot de passe aléatoire (l'employé utilisera le mot de passe partagé)

      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password: 'admin1234',
      });

      if (signUpError || !user) {
        setError(signUpError?.message || 'Erreur lors de la création du compte');
        setLoading(false);
        return;
      }

      // 3. Insérer dans la table users
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          username: username.trim(),
          role: 'employee',
        });

      if (insertError) {
        console.error('Erreur insertion users:', insertError);
        setError('Compte créé mais erreur lors de la configuration du profil');
        await supabase.auth.signOut();
        return;
      }

      // 4. Connexion automatique + redirection vers Employee Dashboard
      setSuccess('Compte créé ! Connexion automatique en cours...');
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: 'admin1234', // ← mot de passe partagé
      });

      if (signInError) {
        console.warn('[REGISTER] Connexion auto échouée, mais compte créé', signInError);
        setError('Compte créé mais connexion automatique échouée. Connectez-vous manuellement.');
      } else {
        // Redirection via onLogin
        onLogin(user, 'employee');
      }

    } catch (err: any) {
      console.error('Erreur inscription:', err);
      setError('Erreur inattendue lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-amber-100/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/50 p-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-6 shadow-lg">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Créer un compte employé</h1>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            {/* Username */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Nom d'utilisateur</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.trim())}
                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-500 text-md placeholder-slate-400"
                placeholder="pseudo unique"
                required
                minLength={3}
                maxLength={20}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-500 text-md placeholder-slate-400"
                placeholder="ex@boutiquepro.com"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-medium">
                {success}
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
                  <span>Création...</span>
                </div>
              ) : (
                <>
                  <UserPlus size={20} />
                  <span>Créer mon compte employé</span>
                </>
              )}
            </button>
          </form>

          {/* Retour au login
          <div className="mt-6 text-center">
            <button
              onClick={onRegisterSuccess}
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              ← J'ai déjà un compte
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Register;