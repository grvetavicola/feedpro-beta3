import React, { useState } from 'react';
import { Client } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { PlusIcon, TrashIcon, UserIcon, BriefcaseIcon, SearchIcon } from './icons';

interface ClientsScreenProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  selectedClientId?: string;
  setSelectedClientId: (id: string) => void;
}

export const ClientsScreen: React.FC<ClientsScreenProps> = ({ clients, setClients, selectedClientId, setSelectedClientId }) => {
  const { t } = useTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [newClientName, setNewClientName] = useState('');

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAddClient = () => {
    if (!newClientName) return;
    const newClient: Client = { id: `c${Date.now()}`, name: newClientName };
    setClients([...clients, newClient]);
    setNewClientName('');
  };

  return (
    <div className="p-4 md:p-8 space-y-8 h-full flex flex-col">
      <div className="flex justify-between items-center bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl">
          <div className="flex items-center gap-4">
              <BriefcaseIcon className="text-cyan-400 w-10 h-10" />
              <div>
                  <h2 className="text-2xl font-bold text-white">{t('clients.title')}</h2>
                  <p className="text-sm text-gray-500">{t('clients.subtitle')}</p>
              </div>
          </div>
          <div className="flex gap-2">
              <input 
                value={newClientName} 
                onChange={e => setNewClientName(e.target.value)} 
                placeholder={t('clients.namePlaceholder')} 
                className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none w-72"
              />
              <button 
                onClick={handleAddClient}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all"
              >
                  <PlusIcon className="w-5 h-5"/> {t('common.add')}
              </button>
          </div>
      </div>

      <div className="bg-gray-800/40 rounded-2xl border border-gray-700 flex-1 flex flex-col overflow-hidden shadow-xl">
          <div className="p-4 border-b border-gray-700 bg-gray-900/20 flex justify-between items-center">
               <div className="relative w-96">
                   <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
                   <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder={t('common.search') + "..."} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-300 focus:border-cyan-500 outline-none"
                   />
               </div>
               <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{filteredClients.length} {t('common.list')}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClients.map(client => (
                      <div 
                        key={client.id} 
                        onClick={() => setSelectedClientId(client.id)}
                        className={`p-6 rounded-2xl border transition-all cursor-pointer group relative flex items-center gap-4 ${selectedClientId === client.id ? 'bg-cyan-900/30 border-cyan-500 shadow-lg shadow-cyan-900/20' : 'bg-gray-800/60 border-gray-700 hover:border-gray-500'}`}
                      >
                          <div className={`p-4 rounded-xl relative overflow-hidden flex items-center justify-center min-w-[64px] min-h-[64px] ${selectedClientId === client.id ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400 group-hover:text-cyan-400 transition-colors'}`}>
                              {client.logo ? (
                                  <img src={client.logo} alt={client.name} className="w-full h-full object-contain" />
                              ) : (
                                  <UserIcon className="w-6 h-6"/>
                              )}
                              
                              {/* Logo Upload Trigger only if selected */}
                              {selectedClientId === client.id && (
                                  <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                                      <SearchIcon className="w-5 h-5 text-white" />
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                const logoData = ev.target?.result as string;
                                                setClients(prev => prev.map(c => c.id === client.id ? { ...c, logo: logoData } : c));
                                            };
                                            reader.readAsDataURL(file);
                                        }}
                                      />
                                  </label>
                              )}
                          </div>
                          <div className="flex-1 truncate">
                              <h4 className={`font-bold text-lg truncate ${selectedClientId === client.id ? 'text-white' : 'text-gray-200'}`}>{client.name}</h4>
                              <p className="text-xs text-gray-500">ID: {client.id.slice(-6)}</p>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setClients(prev => prev.filter(c => c.id !== client.id)); }}
                            className="absolute top-4 right-4 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                              <TrashIcon className="w-5 h-5"/>
                          </button>
                          {selectedClientId === client.id && (
                              <div className="absolute -top-2 -right-2 bg-cyan-500 text-[10px] font-black text-white px-2 py-0.5 rounded-full shadow-lg">{t('common.confirm').toUpperCase()}</div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
};
