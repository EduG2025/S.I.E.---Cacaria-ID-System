import React, { useState, useEffect } from 'react';
import { Key, Trash2 } from 'lucide-react';
import { ApiKey } from '@/types';
import { api } from '@/services/api';
import { validateApiKey } from '@/services/geminiService';

export const ApiKeyManager: React.FC = () => {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [newKey, setNewKey] = useState({ label: '', key: '' });
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        try {
            const data = await api.getApiKeys();
            setKeys(data);
        } catch (e) { console.error("Error loading keys", e); }
    };

    const handleAddKey = async () => {
        if (!newKey.key || !newKey.label) return alert("Preencha o Nome e a Chave");
        
        setIsValidating(true);
        // 1. Validate with Gemini
        const isValid = await validateApiKey(newKey.key);
        setIsValidating(false);

        if (!isValid) {
            return alert("Chave inválida ou inativa na Google AI Studio. Verifique e tente novamente.");
        }

        // 2. Save
        try {
            await api.addApiKey({
                id: crypto.randomUUID(),
                label: newKey.label,
                key: newKey.key,
                isActive: keys.length === 0, // First key auto active
                createdAt: new Date().toISOString()
            });
            setNewKey({ label: '', key: '' });
            loadKeys();
            alert("Chave adicionada com sucesso!");
        } catch (e) {
            alert("Erro ao salvar chave");
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await api.updateApiKeyStatus(id, !currentStatus);
            loadKeys();
        } catch (e) { alert("Erro ao atualizar status"); }
    };

    const deleteKey = async (id: string) => {
        if (confirm("Tem certeza? O sistema pode parar de funcionar se não houver outra chave ativa.")) {
            await api.deleteApiKey(id);
            loadKeys();
        }
    };

    return (
        <div className="bg-brand-secondary p-6 rounded-xl border border-gray-700 shadow-lg mt-6">
             <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase text-sm">
                 <Key size={16} className="text-yellow-500"/> Gestão de Chaves API (Gemini)
             </h3>
             <p className="text-xs text-gray-400 mb-4">
                 O sistema usará exclusivamente a chave marcada como <span className="text-green-400">ATIVA</span>. 
                 A chave do arquivo .env será ignorada.
             </p>

             <div className="flex gap-4 mb-6">
                 <input 
                    placeholder="Identificador (ex: Chave Pessoal)" 
                    value={newKey.label} 
                    onChange={e => setNewKey({...newKey, label: e.target.value})}
                    className="flex-1 bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm"
                 />
                 <input 
                    placeholder="Cole a API Key aqui (AIza...)" 
                    value={newKey.key} 
                    onChange={e => setNewKey({...newKey, key: e.target.value})}
                    type="password"
                    className="flex-[2] bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm"
                 />
                 <button 
                    onClick={handleAddKey} 
                    disabled={isValidating}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 rounded text-sm font-bold disabled:opacity-50"
                 >
                     {isValidating ? "Validando..." : "Adicionar"}
                 </button>
             </div>

             <div className="space-y-2">
                 {keys.length === 0 && <p className="text-red-400 text-xs">Nenhuma chave configurada. O sistema não funcionará.</p>}
                 {keys.map(k => (
                     <div key={k.id} className="flex items-center justify-between bg-brand-primary p-3 rounded border border-gray-700">
                         <div className="flex items-center gap-3">
                             <div className={`w-3 h-3 rounded-full ${k.isActive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`}></div>
                             <div>
                                 <p className="text-sm font-bold text-white">{k.label}</p>
                                 <p className="text-[10px] text-gray-500 font-mono">
                                     {k.key.substring(0, 8)}...{k.key.substring(k.key.length - 4)}
                                 </p>
                             </div>
                         </div>
                         <div className="flex items-center gap-3">
                             {!k.isActive && (
                                 <button onClick={() => toggleStatus(k.id, k.isActive)} className="text-xs text-gray-400 hover:text-green-400 border border-gray-600 px-2 py-1 rounded">
                                     Ativar
                                 </button>
                             )}
                             {k.isActive && <span className="text-xs text-green-500 font-bold px-2">EM USO</span>}
                             
                             <button onClick={() => deleteKey(k.id)} className="text-red-400 hover:text-white p-1">
                                 <Trash2 size={16}/>
                             </button>
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
};