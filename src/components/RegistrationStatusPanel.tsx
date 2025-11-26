
import React from 'react';
import { BarChart3, AlertTriangle, CheckCircle } from 'lucide-react';
import { Resident } from '@/types';
import { Tooltip } from './Tooltip';

export const RegistrationStatusPanel: React.FC<{ resident: Resident }> = ({ resident }) => {
    const fields = [
        { key: 'name', label: 'Nome Completo' },
        { key: 'cpf', label: 'CPF' },
        { key: 'rg', label: 'RG' },
        { key: 'address', label: 'Endereço' },
        { key: 'birthDate', label: 'Data de Nascimento' },
        { key: 'photoUrl', label: 'Foto de Perfil' }
    ];

    const missingFields = fields.filter(f => !resident[f.key as keyof Resident]);
    const total = fields.length;
    const filled = total - missingFields.length;
    const percentage = Math.round((filled / total) * 100);

    let statusColor = 'bg-red-500';
    if (percentage > 40) statusColor = 'bg-yellow-500';
    if (percentage === 100) statusColor = 'bg-green-500';

    return (
      <div className="bg-brand-secondary rounded-xl p-4 border border-brand-secondary">
           <div className="flex items-center gap-2 mb-3 border-b border-gray-700 pb-2">
               <BarChart3 className="text-brand-accent w-4 h-4" />
               <h4 className="text-white text-sm font-bold uppercase tracking-wide">Status do Cadastro</h4>
           </div>
           
           <Tooltip text="Indica o quão completo está o cadastro atual.">
               <div className="mb-4 w-full cursor-help">
                   <div className="flex justify-between text-xs mb-1">
                       <span className="text-gray-400">Progresso</span>
                       <span className="text-white font-bold">{percentage}%</span>
                   </div>
                   <div className="w-full bg-brand-primary rounded-full h-2.5 overflow-hidden">
                       <div className={`h-2.5 rounded-full transition-all duration-500 ${statusColor}`} style={{ width: `${percentage}%` }}></div>
                   </div>
               </div>
           </Tooltip>

           {missingFields.length > 0 ? (
               <div className="bg-brand-primary/50 rounded p-3">
                   <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Pendências Detectadas:</p>
                   <ul className="space-y-1">
                       {missingFields.map(field => (
                           <li key={field.key} className="text-xs text-red-300 flex items-center gap-2">
                               <AlertTriangle size={10} />
                               Falta: <span className="font-semibold">{field.label}</span>
                           </li>
                       ))}
                   </ul>
               </div>
           ) : (
               <div className="bg-green-900/20 border border-green-500/30 rounded p-3 flex items-center gap-3">
                   <CheckCircle className="text-green-500 w-6 h-6" />
                   <div>
                       <p className="text-xs text-green-400 font-bold uppercase">Cadastro Completo</p>
                       <p className="text-[10px] text-gray-400">Pronto para impressão</p>
                   </div>
               </div>
           )}
      </div>
    );
};
