
import React from 'react';
import { Building, FileText, Search, Move, Users, Paperclip, Download, Trash2, Plus, ImageIcon, ShieldCheck, Upload, Save } from 'lucide-react';
import { AssociationData, ProcessingStatus } from '@/types';
// import { ApiKeyManager } from './ApiKeyManager'; // Deprecated
import { Tooltip } from './Tooltip';

interface SystemSettingsViewProps {
    associationData: AssociationData;
    setAssociationData: React.Dispatch<React.SetStateAction<AssociationData>>;
    organizationLogo: string | null;
    handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleCnpjLookup: () => void;
    status: ProcessingStatus;
    onSave: () => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({ 
    associationData, setAssociationData, organizationLogo, handleLogoUpload, handleCnpjLookup, status, onSave 
}) => {
    const handleDirectorAdd = () => {
        setAssociationData(prev => ({
            ...prev,
            management: {
                ...prev.management,
                directors: [...prev.management.directors, { id: crypto.randomUUID(), name: '', title: 'Diretor' }]
            }
        }));
    };

    const handleDirectorRemove = (id: string) => {
        setAssociationData(prev => ({
            ...prev,
            management: {
                ...prev.management,
                directors: prev.management.directors.filter(d => d.id !== id)
            }
        }));
    };

    const handleDirectorChange = (id: string, field: 'name' | 'title', value: string) => {
        setAssociationData(prev => ({
            ...prev,
            management: {
                ...prev.management,
                directors: prev.management.directors.map(d => d.id === id ? { ...d, [field]: value } : d)
            }
        }));
    };

    const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                return alert("Por favor, selecione apenas arquivos PDF.");
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    const base64 = ev.target.result as string;
                    setAssociationData(prev => ({
                        ...prev,
                        management: {
                            ...prev.management,
                            electionMinutesPdf: base64
                        }
                    }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const inputClass = "w-full bg-brand-primary border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-brand-accent outline-none";
    const labelClass = "block text-xs uppercase text-gray-500 font-bold mb-1";

    return (
        <div className="p-8 max-w-[1200px] mx-auto">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6"><Building className="text-brand-accent"/> Configurações da Associação</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-brand-secondary p-6 rounded-xl border border-gray-700 shadow-lg">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase text-sm"><FileText size={16}/> Dados Jurídicos</h3>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Nome da Associação (Fantasia)</label>
                                <input value={associationData.name} onChange={e => setAssociationData({...associationData, name: e.target.value})} className={inputClass} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>CNPJ</label>
                                    <div className="relative">
                                        <input value={associationData.cnpj} onChange={e => setAssociationData({...associationData, cnpj: e.target.value})} className={inputClass} />
                                        <button onClick={handleCnpjLookup} disabled={status.isSearching} className="absolute right-1 top-1 bg-brand-accent/20 p-1.5 rounded hover:bg-brand-accent text-brand-accent hover:text-white transition">
                                            {status.isSearching ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"/> : <Search size={16}/>}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Razão Social</label>
                                    <input value={associationData.companyName} onChange={e => setAssociationData({...associationData, companyName: e.target.value})} className={inputClass} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="bg-brand-secondary p-6 rounded-xl border border-gray-700 shadow-lg">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase text-sm"><Move size={16}/> Endereço & Contato</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className={labelClass}>Logradouro</label>
                                    <input value={associationData.address.street} onChange={e => setAssociationData({...associationData, address: {...associationData.address, street: e.target.value}})} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Número</label>
                                    <input value={associationData.address.number} onChange={e => setAssociationData({...associationData, address: {...associationData.address, number: e.target.value}})} className={inputClass} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>Cidade</label>
                                    <input value={associationData.address.city} onChange={e => setAssociationData({...associationData, address: {...associationData.address, city: e.target.value}})} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Estado</label>
                                    <input value={associationData.address.state} onChange={e => setAssociationData({...associationData, address: {...associationData.address, state: e.target.value}})} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>CEP</label>
                                    <input value={associationData.address.zip} onChange={e => setAssociationData({...associationData, address: {...associationData.address, zip: e.target.value}})} className={inputClass} />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* API KEY MANAGEMENT REMOVED */}

                </div>

                <div className="space-y-6">
                    {/* Management */}
                    <div className="bg-brand-secondary p-6 rounded-xl border border-gray-700 shadow-lg">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase text-sm"><Users size={16}/> Gestão & Diretoria</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Presidente</label>
                                    <input value={associationData.management.president} onChange={e => setAssociationData({...associationData, management: {...associationData.management, president: e.target.value}})} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Vice-Presidente</label>
                                    <input value={associationData.management.vicePresident} onChange={e => setAssociationData({...associationData, management: {...associationData.management, vicePresident: e.target.value}})} className={inputClass} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Início Mandato</label>
                                    <input type="month" value={associationData.management.mandateStart} onChange={e => setAssociationData({...associationData, management: {...associationData.management, mandateStart: e.target.value}})} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Fim Mandato</label>
                                    <input type="month" value={associationData.management.mandateEnd} onChange={e => setAssociationData({...associationData, management: {...associationData.management, mandateEnd: e.target.value}})} className={inputClass} />
                                </div>
                            </div>

                             {/* Election Minutes PDF (ATA) */}
                             <div className="border-t border-gray-700 pt-4">
                                <label className={labelClass}>Documentação Oficial (Ata da Eleição)</label>
                                {!associationData.management.electionMinutesPdf ? (
                                    <label className="w-full border-2 border-dashed border-gray-600 hover:border-brand-accent rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer bg-brand-primary/30 transition-colors">
                                        <Paperclip className="text-gray-400 mb-1" size={20}/>
                                        <span className="text-xs text-gray-400 font-bold uppercase">Carregar PDF da Ata</span>
                                        <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
                                    </label>
                                ) : (
                                    <div className="bg-brand-primary border border-gray-600 rounded-lg p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <FileText className="text-red-400" size={24}/>
                                            <div>
                                                <p className="text-xs text-white font-bold uppercase">Ata da Eleição.pdf</p>
                                                <p className="text-[10px] text-gray-500">Documento Anexado</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a 
                                                href={associationData.management.electionMinutesPdf} 
                                                download="Ata_Eleicao.pdf" 
                                                className="p-1.5 bg-brand-secondary hover:bg-brand-accent text-brand-accent hover:text-white rounded transition"
                                                title="Baixar PDF"
                                            >
                                                <Download size={16}/>
                                            </a>
                                            <button 
                                                onClick={() => setAssociationData(prev => ({...prev, management: {...prev.management, electionMinutesPdf: null}}))} 
                                                className="p-1.5 bg-brand-secondary hover:bg-red-600 text-red-400 hover:text-white rounded transition"
                                                title="Remover"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Dynamic Directors */}
                            <div className="border-t border-gray-700 pt-4">
                                <label className={`${labelClass} flex justify-between`}>
                                    Diretores Adicionais 
                                    <button onClick={handleDirectorAdd} className="text-brand-accent hover:text-white text-[10px] flex items-center gap-1"><Plus size={12}/> Adicionar</button>
                                </label>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {associationData.management.directors.map(dir => (
                                        <div key={dir.id} className="flex gap-2">
                                            <input value={dir.title} onChange={e => handleDirectorChange(dir.id, 'title', e.target.value)} className={`${inputClass} !py-1 !text-xs w-1/3`} placeholder="Cargo" />
                                            <input value={dir.name} onChange={e => handleDirectorChange(dir.id, 'name', e.target.value)} className={`${inputClass} !py-1 !text-xs flex-1`} placeholder="Nome" />
                                            <button onClick={() => handleDirectorRemove(dir.id)} className="text-red-400 hover:text-white p-1"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                    {associationData.management.directors.length === 0 && <p className="text-gray-500 text-xs italic">Nenhum diretor adicional.</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Logo & Actions */}
                    <div className="bg-brand-secondary p-6 rounded-xl border border-gray-700 shadow-lg">
                         <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase text-sm"><ImageIcon size={16}/> Identidade Visual</h3>
                         <div className="flex gap-6 items-center">
                             <div className="w-24 h-24 bg-brand-primary rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden">
                                 {organizationLogo ? (
                                     <img src={organizationLogo} alt="Logo" className="w-full h-full object-contain" />
                                 ) : (
                                     <ShieldCheck size={32} className="text-gray-600"/>
                                 )}
                             </div>
                             <div className="flex-1">
                                 <label className="bg-brand-primary hover:bg-brand-accent/20 border border-gray-600 hover:border-brand-accent text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 w-fit transition mb-2">
                                     <Upload size={16} /> Carregar Nova Logo
                                     <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                 </label>
                                 <p className="text-[10px] text-gray-500">Recomendado: PNG com fundo transparente. Esta logo será usada na tela de login e nas carteirinhas.</p>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-8 flex justify-end">
                <button onClick={onSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transition">
                    <Save size={20} /> Salvar Configurações
                </button>
            </div>
        </div>
    );
};