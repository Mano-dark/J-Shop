import React, { useState, useEffect } from 'react';
import { DollarSign, Save } from 'lucide-react';
import { MobileMoneyBalance } from '../types';
import { storageService } from '../services/storageService';

const MobileMoneyManagement: React.FC = () => {
  const [balances, setBalances] = useState<MobileMoneyBalance[]>([]);
  const [formData, setFormData] = useState<{ [key: string]: { deposit: number; withdrawal: number } }>({
    MTN: { deposit: 0, withdrawal: 0 },
    Moov: { deposit: 0, withdrawal: 0 },
    Celtis: { deposit: 0, withdrawal: 0 }
  });

  useEffect(() => {
    const currentBalances = storageService.getMobileMoneyBalances();
    setBalances(currentBalances);
    const initialFormData = currentBalances.reduce((acc, balance) => ({
      ...acc,
      [balance.operator]: {
        deposit: balance.depositBalance,
        withdrawal: balance.withdrawalBalance
      }
    }), {});
    setFormData(initialFormData);
  }, []);

  const handleUpdateBalance = (operator: string, type: 'deposit' | 'withdrawal', value: number) => {
    setFormData(prev => ({
      ...prev,
      [operator]: {
        ...prev[operator],
        [type]: value
      }
    }));
  };

  const saveBalances = () => {
    const updatedBalances: MobileMoneyBalance[] = balances.map(balance => ({
      ...balance,
      depositBalance: formData[balance.operator].deposit,
      withdrawalBalance: formData[balance.operator].withdrawal
    }));
    setBalances(updatedBalances);
    storageService.saveMobileMoneyBalances(updatedBalances);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Gestion Mobile Money</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {balances.map(balance => (
          <div key={balance.operator} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">{balance.operator}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Solde Dépôt (FCFA)</label>
                <input
                  type="number"
                  value={formData[balance.operator]?.deposit || 0}
                  onChange={(e) => handleUpdateBalance(balance.operator, 'deposit', Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Solde Retrait (FCFA)</label>
                <input
                  type="number"
                  value={formData[balance.operator]?.withdrawal || 0}
                  onChange={(e) => handleUpdateBalance(balance.operator, 'withdrawal', Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={saveBalances}
        className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl flex items-center space-x-2 shadow-lg transition-all duration-200 hover:-translate-y-0.5"
      >
        <Save size={20} />
        <span className="font-semibold">Enregistrer les modifications</span>
      </button>
    </div>
  );
};

export default MobileMoneyManagement;