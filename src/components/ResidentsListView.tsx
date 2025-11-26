
import React, { useState } from 'react';
import { Users, Plus, Search, AlertTriangle, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { Resident } from '@/types';
import { Tooltip } from './Tooltip';

interface ResidentsListViewProps {
    residentsList: Resident[];
    onEdit: (r: Resident) => void;
    onDelete: (id: string) => void;
    onNew: () => void;
}

export const ResidentsListView: React.FC<ResidentsListViewProps> = ({ residentsList, onEdit, onDelete, onNew }) => {
    const [filter, setFilter] = useState('');
    const [onlyPending, setOnlyPending] = useState(false);

    const filtered = residentsList.filter(r => {
        const matchesText = (r.name || '').toLowerCase().includes(filter.toLowerCase()) || (r.cpf || '').includes(filter);
        if (onlyPending) {
            return matchesText && (!r.name || !r.cpf || !r.photoUrl);
        }
        return matchesText;
    });

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="text-brand-accent"/> Cadastro de Moradores</h2>
                <Tooltip text="Criar um novo registro em branco">
                  <button onClick={onNew} className="bg-brand-accent hover:bg-cyan-500 text-brand-dark px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                      <Plus size={18} /> Novo Morador
                  </button>
                </Tooltip>
            </div>

            <div className="bg-brand-secondary rounded-xl p-4 mb-6 flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                    <input 
                      value={filter}
                      onChange={e => setFilter(e.target.value)}
                      placeholder="Buscar por Nome ou CPF..."
                      className="w-full bg-brand-primary border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:border-brand-accent outline-none"
                    />
                </div>
                <Tooltip text="Exibir apenas cadastros incompletos">
                  <button 
                      onClick={() => setOnlyPending(!onlyPending)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${onlyPending ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-brand-primary border-gray-700 text-gray-400 hover:text-white'}`}
                  >
                      <AlertTriangle size={16} className="inline mr-2" />
                      Apenas Pendentes
                  </button>
                </Tooltip>
            </div>

            <div className="bg-brand-secondary rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-brand-primary text-gray-400 text-xs uppercase">
                        <tr>
                            <th className="p-4">Status</th>
                            <th className="p-4">Nome</th>
                            <th className="p-4">CPF</th>
                            <th className="p-4">Função</th>
                            <th className="p-4">Endereço</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filtered.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                        )}
                        {filtered.map(r => {
                            const isComplete = r.name && r.cpf && r.photoUrl;
                            return (
                                <tr key={r.id} className="hover:bg-brand-primary/50 transition">
                                    <td className="p-4">
                                        <Tooltip text={isComplete ? "Cadastro Completo" : "Cadastro Incompleto"}>
                                          {isComplete ? <CheckCircle size={18} className="text-green-500"/> : <AlertTriangle size={18} className="text-red-500"/>}
                                        </Tooltip>
                                    </td>
                                    <td className="p-4 font-bold text-white">{r.name || 'Sem Nome'}</td>
                                    <td className="p-4 font-mono text-gray-300">{r.cpf || '-'}</td>
                                    <td className="p-4 text-blue-300">{r.role}</td>
                                    <td className="p-4 text-gray-400 text-sm truncate max-w-xs">{r.address}</td>
                                    <td className="p-4 flex justify-end gap-2">
                                        <Tooltip text="Editar Carteirinha">
                                          <button onClick={() => onEdit(r)} className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded transition">
                                              <Edit size={16} />
                                          </button>
                                        </Tooltip>
                                        <Tooltip text="Excluir Definitivamente">
                                          <button onClick={() => onDelete(r.id)} className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition">
                                              <Trash2 size={16} />
                                          </button>
                                        </Tooltip>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
};
