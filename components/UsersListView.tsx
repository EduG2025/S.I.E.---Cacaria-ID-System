
import React, { useState } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { SystemUser } from '@/types';
import { api } from '@/services/api';
import { Tooltip } from './Tooltip';

interface UsersListViewProps {
    systemUsers: SystemUser[];
    refreshUsers: () => void;
}

export const UsersListView: React.FC<UsersListViewProps> = ({ systemUsers, refreshUsers }) => {
    const [newUser, setNewUser] = useState<SystemUser>({ id: '', name: '', username: '', password: '', role: 'OPERADOR' });
    
    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!newUser.username || !newUser.password) return;
        try {
            await api.createUser({ ...newUser, id: crypto.randomUUID() });
            refreshUsers();
            setNewUser({ id: '', name: '', username: '', password: '', role: 'OPERADOR' });
        } catch (e) { alert('Erro ao criar usuário'); }
    };

    const handleDeleteUser = async (id: string) => {
        if(id === '1') { alert('Não é possível excluir o admin padrão.'); return; }
        if(confirm('Excluir usuário?')) {
            await api.deleteUser(id);
            refreshUsers();
        }
    }

    return (
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto pb-20">
           <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6"><Settings className="text-brand-accent"/> Gestão de Usuários (Admin)</h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Form */}
               <div className="bg-brand-secondary p-6 rounded-xl border border-gray-700 h-fit">
                   <h3 className="text-white font-bold mb-4 uppercase text-sm">Novo Usuário</h3>
                   <form onSubmit={handleAddUser} className="space-y-3">
                       <input placeholder="Nome" value={newUser.name} onChange={e=>setNewUser({...newUser, name: e.target.value})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm" />
                       <input placeholder="Login" value={newUser.username} onChange={e=>setNewUser({...newUser, username: e.target.value})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm" />
                       <input placeholder="Senha" type="password" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm" />
                       <select value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value as any})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm">
                           <option value="OPERADOR">Operador</option>
                           <option value="ADMIN">Administrador</option>
                       </select>
                       <Tooltip text="Adicionar acesso ao sistema">
                          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded text-sm mt-2">Criar Usuário</button>
                       </Tooltip>
                   </form>
               </div>

               {/* List */}
               <div className="md:col-span-2 bg-brand-secondary rounded-xl border border-gray-700 overflow-hidden">
                   <div className="overflow-x-auto">
                       <table className="w-full text-left min-w-[500px]">
                           <thead className="bg-brand-primary text-gray-400 text-xs uppercase">
                               <tr>
                                   <th className="p-4">Nome</th>
                                   <th className="p-4">Login</th>
                                   <th className="p-4">Perfil</th>
                                   <th className="p-4 text-right">Ação</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-700">
                               {systemUsers.map(u => (
                                   <tr key={u.id}>
                                       <td className="p-4 text-white font-bold">{u.name}</td>
                                       <td className="p-4 text-gray-400">{u.username}</td>
                                       <td className="p-4"><span className={`text-xs px-2 py-1 rounded ${u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>{u.role}</span></td>
                                       <td className="p-4 text-right">
                                           {u.username !== 'admin' && (
                                               <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-white"><Trash2 size={16}/></button>
                                           )}
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </div>
           </div>
      </div>
    )
};
