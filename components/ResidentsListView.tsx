import React, { useState } from 'react';
import { Users, Plus, Search, AlertTriangle, CheckCircle, Edit, Trash2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Resident } from '@/types';
import { Tooltip } from './Tooltip';

interface ResidentsListViewProps {
    residentsList: Resident[];
    onEdit: (r: Resident) => void;
    onDelete: (id: string) => void;
    onNew: () => void;
    availableRoles?: string[];
}

export const ResidentsListView: React.FC<ResidentsListViewProps> = ({ residentsList, onEdit, onDelete, onNew, availableRoles = [] }) => {
    const [filter, setFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [onlyPending, setOnlyPending] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filtered = residentsList.filter(r => {
        const matchesText = (r.name || '').toLowerCase().includes(filter.toLowerCase()) || (r.cpf || '').includes(filter);
        const matchesRole = roleFilter ? r.role === roleFilter : true;
        
        if (onlyPending) {
            return matchesText && matchesRole && (!r.name || !r.cpf || !r.photoUrl);
        }
        return matchesText && matchesRole;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const visibleItems = filtered.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><Users className="text-brand-accent"/> Cadastro de Moradores</h2>
                <Tooltip text="Criar um novo registro em branco">
                  <button onClick={onNew} className="w-full sm:w-auto bg-brand-accent hover:bg-cyan-500 text-brand-dark px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                      <Plus size={18} /> Novo Morador
                  </button>
                </Tooltip>
            </div>

            <div className="bg-brand-secondary rounded-xl p-4 mb-6 flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                    <input 
                      value={filter}
                      onChange={e => setFilter(e.target.value)}
                      placeholder="Buscar por Nome ou CPF..."
                      className="w-full bg-brand-primary border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:border-brand-accent outline-none"
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative w-full sm:w-48">
                        <Filter className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        <select 
                            value={roleFilter} 
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full bg-brand-primary border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-white focus:border-brand-accent outline-none appearance-none text-sm"
                        >
                            <option value="">Todos os Cargos</option>
                            {availableRoles.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>

                    <Tooltip text="Exibir apenas cadastros incompletos">
                    <button 
                        onClick={() => setOnlyPending(!onlyPending)}
                        className={`w-full sm:w-auto px-4 py-2 rounded-lg border text-sm font-medium transition whitespace-nowrap ${onlyPending ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-brand-primary border-gray-700 text-gray-400 hover:text-white'}`}
                    >
                        <AlertTriangle size={16} className="inline mr-2" />
                        Apenas Pendentes
                    </button>
                    </Tooltip>
                </div>
            </div>

            <div className="bg-brand-secondary rounded-xl border border-gray-700 overflow-hidden flex flex-col h-full">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                        <thead className="bg-brand-primary text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="p-4 w-16">Status</th>
                                <th className="p-4">Nome</th>
                                <th className="p-4 w-32">CPF</th>
                                <th className="p-4 w-40">Função</th>
                                <th className="p-4">Endereço</th>
                                <th className="p-4 text-right w-28">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                            )}
                            {visibleItems.map(r => {
                                const isComplete = r.name && r.cpf && r.photoUrl;
                                return (
                                    <tr key={r.id} className="hover:bg-brand-primary/50 transition">
                                        <td className="p-4">
                                            <Tooltip text={isComplete ? "Cadastro Completo" : "Cadastro Incompleto"}>
                                              {isComplete ? <CheckCircle size={18} className="text-green-500"/> : <AlertTriangle size={18} className="text-red-500"/>}
                                            </Tooltip>
                                        </td>
                                        <td className="p-4 font-bold text-white">{r.name || 'Sem Nome'}</td>
                                        <td className="p-4 font-mono text-gray-300 text-sm">{r.cpf || '-'}</td>
                                        <td className="p-4 text-blue-300 text-sm"><span className="bg-blue-900/30 px-2 py-1 rounded">{r.role}</span></td>
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
                
                {/* Pagination Controls */}
                {filtered.length > itemsPerPage && (
                    <div className="flex items-center justify-between p-4 border-t border-gray-700 bg-brand-primary/30">
                        <span className="text-xs text-gray-500">Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filtered.length)} de {filtered.length}</span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handlePageChange(currentPage - 1)} 
                                disabled={currentPage === 1}
                                className="p-1 rounded hover:bg-gray-700 disabled:opacity-50 text-gray-400"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="px-3 py-1 bg-brand-secondary rounded text-sm text-white">{currentPage}</span>
                            <button 
                                onClick={() => handlePageChange(currentPage + 1)} 
                                disabled={currentPage === totalPages}
                                className="p-1 rounded hover:bg-gray-700 disabled:opacity-50 text-gray-400"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
};
