import React, { useState } from 'react';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RegisterProps {
  onRegisterSuccess: () => void; // Retour au login après succès
}

const Register: React.FC<RegisterProps> = ({ onRegisterSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Vérifications rapides
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (username.trim().length < 3) {
      setError('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      setLoading(false);
      return;
    }

    try {
      // 1. Vérifier si le username existe déjà
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

      // 2. Créer l'utilisateur dans Supabase Auth
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError || !user) {
        setError(signUpError?.message || 'Erreur lors de la création du compte');
        setLoading(false);
        return;
      }

      // 3. Enregistrer username + rôle dans la table users
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          username: username.trim(),
          role: 'employee', // Tous les nouveaux comptes créés ici sont employés
        });

      if (insertError) {
        console.error('Erreur insertion users:', insertError);
        setError('Compte créé mais erreur lors de la configuration du profil');
        await supabase.auth.signOut(); // Nettoyage
        return;
      }

      setSuccess('Compte employé créé avec succès ! Vous pouvez maintenant vous connecter.');
      setTimeout(() => onRegisterSuccess(), 2500); // Retour auto au login après 2.5s
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
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-500 text-sm placeholder-slate-400"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-500 text-sm placeholder-slate-400"
                placeholder="nouvel.employe@boutiquepro.com"
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-500 text-sm placeholder-slate-400"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-500 text-sm placeholder-slate-400"
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

          {/* Retour au login */}
          <div className="mt-6 text-center">
            <button
              onClick={onRegisterSuccess}
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              ← J'ai déjà un compte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;