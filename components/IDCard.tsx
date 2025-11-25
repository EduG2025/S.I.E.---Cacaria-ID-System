import React from 'react';
import { Resident, IDTemplate, PhotoSettings, AssociationData } from '../types';

interface IDCardProps {
  resident: Resident;
  template: IDTemplate;
  photoSettings: PhotoSettings;
  organizationLogo: string | null;
  associationData?: AssociationData;
  idRef?: React.RefObject<HTMLDivElement>;
  onUpdate?: (field: keyof Resident, value: string) => void;
}

export const IDCard: React.FC<IDCardProps> = ({ resident, template, photoSettings, organizationLogo, associationData, idRef, onUpdate }) => {
  
  // Use association data or defaults
  const assocName = associationData?.name || "Associação de Moradores";
  const assocLocation = associationData?.address?.city && associationData?.address?.state 
    ? `${associationData.address.city} - ${associationData.address.state}`
    : "Cacaria - Piraí - RJ";
  const assocFullLocation = associationData?.address?.city ? `de ${associationData.address.city} - ${associationData.address.state}` : "de Cacaria - Piraí - RJ";

  // Footer Data (Address & CNPJ)
  const footerAddress = associationData?.address?.street 
    ? `${associationData.address.street}, ${associationData.address.number} - ${associationData.address.city}/${associationData.address.state}` 
    : "Endereço da Sede";
  const footerCNPJ = associationData?.cnpj ? `CNPJ: ${associationData.cnpj}` : "";
  const footerText = `${footerAddress} ${footerCNPJ ? '• ' + footerCNPJ : ''}`;

  // Calculate Mandate Text
  const formatDate = (dateStr: string) => {
    if(!dateStr) return '';
    const [year, month] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month)-1);
    return date.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
  };

  const mandateText = associationData?.management?.mandateStart && associationData?.management?.mandateEnd
    ? `Mandato: ${formatDate(associationData.management.mandateStart)} a ${formatDate(associationData.management.mandateEnd)}`
    : "Mandato: Nov 2025 / 2027";

  // Helper to handle input changes
  const handleChange = (field: keyof Resident, e: React.ChangeEvent<HTMLInputElement>) => {
    if (onUpdate) {
        onUpdate(field, e.target.value);
    }
  };

  // AMC Logo Component
  const AmcLogo = ({ className }: { className?: string }) => (
    <div className={`rounded-full bg-white flex items-center justify-center relative overflow-hidden ${organizationLogo ? '' : 'border-4 border-blue-800'} ${className}`}>
        {organizationLogo ? (
            <img src={organizationLogo} alt="Logo Oficial" className="w-full h-full object-contain" />
        ) : (
            <>
                <div className="absolute inset-0 border-2 border-green-500 rounded-full m-1"></div>
                <div className="text-center z-10">
                    <h1 className="text-blue-900 font-bold tracking-tighter leading-none" style={{ fontSize: '1.5em' }}>AMC</h1>
                </div>
                <div className="absolute bottom-2 w-full h-1/3 bg-transparent flex justify-center">
                    <div className="w-8 h-8 border-b-4 border-blue-900 rounded-full"></div>
                </div>
            </>
        )}
    </div>
  );

  // Common Photo Render
  const renderPhoto = () => (
    <div className="w-full h-full overflow-hidden relative bg-gray-200">
      {resident.photoUrl ? (
        <img 
            src={resident.photoUrl} 
            alt="Resident" 
            className="w-full h-full object-cover transition-transform origin-center"
            style={{
                transform: `scale(${photoSettings.zoom}) translate(${photoSettings.x}px, ${photoSettings.y}px)`
            }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-1">
          Sem Foto
        </div>
      )}
    </div>
  );

  // Common Input Style Helper
  const inputBaseClass = "bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white/20 outline-none w-full transition-colors rounded px-0.5";

  // Watermark Render
  const Watermark = () => {
    if (!organizationLogo) return null;
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10">
            <img src={organizationLogo} className="w-48 h-48 object-contain grayscale" alt="" />
        </div>
    );
  };

  /* --- TEMPLATE 1: CLASSIC (Original Green) --- */
  if (template === 'CLASSIC') {
    return (
      <div ref={idRef} className="w-[350px] h-[220px] bg-white rounded-xl overflow-hidden shadow-2xl relative flex flex-col print:shadow-none font-sans select-none">
        <Watermark />
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-500 to-transparent"></div>
        
        {/* Top Bar - Compacted */}
        <div className="bg-green-700 h-9 w-full flex items-center justify-between px-2 relative z-10 shrink-0">
           <AmcLogo className="w-7 h-7 shadow-md bg-white rounded-full" />
           <h2 className="text-white text-[8px] font-bold tracking-wider uppercase text-right leading-tight">
            {assocName}<br/>{assocLocation}
          </h2>
        </div>
  
        {/* Main Content - Adjusted for Footer */}
        <div className="flex flex-row p-2 gap-2 relative z-10 h-full pb-4">
          <div className="flex flex-col items-center gap-1 mt-0.5">
            <div className="w-18 h-24 border-2 border-green-700 rounded-md overflow-hidden relative shadow-sm bg-gray-100 shrink-0">
              {renderPhoto()}
            </div>
            <div className="w-18">
                <input 
                    value={resident.role}
                    onChange={(e) => handleChange('role', e)}
                    className="text-[7px] font-bold text-white bg-green-800 rounded-full uppercase shadow-sm text-center w-full outline-none border border-transparent focus:border-white py-0.5"
                />
            </div>
          </div>
  
          <div className="flex-1 flex flex-col justify-start gap-0.5 mt-0 min-w-0">
            <div className="mb-0.5">
              <label className="block text-[6px] text-gray-500 uppercase font-bold leading-none">Nome</label>
              <input 
                value={resident.name}
                onChange={(e) => handleChange('name', e)}
                placeholder="NOME DO MORADOR"
                className={`${inputBaseClass} text-[10px] font-bold text-gray-900 leading-tight font-mono uppercase truncate`}
              />
            </div>
  
            <div className="grid grid-cols-2 gap-1">
              <div>
                <label className="block text-[6px] text-gray-500 uppercase font-bold leading-none">RG</label>
                <input 
                    value={resident.rg}
                    onChange={(e) => handleChange('rg', e)}
                    placeholder="00.000.000-0"
                    className={`${inputBaseClass} text-[9px] font-semibold text-gray-800 font-mono`}
                />
              </div>
              <div>
                 <label className="block text-[6px] text-gray-500 uppercase font-bold leading-none">Nascimento</label>
                 <input 
                    value={resident.birthDate}
                    onChange={(e) => handleChange('birthDate', e)}
                    placeholder="DD/MM/AAAA"
                    className={`${inputBaseClass} text-[9px] font-semibold text-gray-800 font-mono`}
                 />
              </div>
            </div>
  
            <div>
              <label className="block text-[6px] text-gray-500 uppercase font-bold leading-none">CPF</label>
              <input 
                    value={resident.cpf}
                    onChange={(e) => handleChange('cpf', e)}
                    placeholder="000.000.000-00"
                    className={`${inputBaseClass} text-[9px] font-semibold text-gray-800 font-mono`}
              />
            </div>
            
             <div className="mt-auto pt-0.5">
              <p className="text-[6px] text-gray-400 italic mb-0.5 leading-none">Membro desde {resident.registrationDate}</p>
              <p className="text-[6px] font-bold text-green-800 uppercase bg-green-100/50 px-1 rounded w-fit leading-tight">{mandateText}</p>
            </div>
          </div>
        </div>
        
        {/* Footer stripe */}
        <div className="absolute bottom-0 w-full h-3.5 bg-yellow-400 flex items-center justify-center z-20 px-1 shrink-0">
            <p className="text-[5px] font-bold text-black uppercase text-center w-full truncate leading-none">{footerText}</p>
        </div>
      </div>
    );
  }

  /* --- TEMPLATE 2: MODERN (Dark Blue) --- */
  if (template === 'MODERN') {
    return (
        <div ref={idRef} className="w-[350px] h-[220px] bg-slate-900 rounded-xl overflow-hidden shadow-2xl relative flex flex-row print:shadow-none text-white font-sans border border-slate-700 select-none">
             {/* Left color bar */}
            <div className="w-20 h-full bg-blue-600 relative flex flex-col items-center pt-2 z-10 shrink-0">
                 <AmcLogo className="w-10 h-10 shadow-lg mb-2 bg-white rounded-full p-0.5" />
                 <div className="w-14 h-18 bg-white rounded-lg overflow-hidden border-2 border-white shadow-lg mx-auto">
                    {renderPhoto()}
                 </div>
                 <div className="mt-auto mb-3 -rotate-90 whitespace-nowrap text-[7px] font-bold tracking-widest text-blue-200">
                    IDENTIDADE
                 </div>
            </div>

            {/* Right content */}
            <div className="flex-1 p-2 flex flex-col gap-0.5 relative z-10 overflow-hidden min-w-0">
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-0">
                    {organizationLogo && <img src={organizationLogo} className="w-48 h-48 object-contain grayscale invert" alt="" />}
                </div>

                <div className="z-10 mt-0.5">
                    <h3 className="text-blue-400 text-[7px] font-bold uppercase tracking-widest leading-tight mb-0.5 truncate">{assocName}<br/>{assocFullLocation}</h3>
                    <div className="border-b border-blue-500/30 pb-0.5">
                      <input 
                          value={resident.name}
                          onChange={(e) => handleChange('name', e)}
                          placeholder="NOME COMPLETO"
                          className="bg-transparent border-none text-[10px] font-bold text-white uppercase leading-none w-full focus:ring-1 focus:ring-blue-500 rounded px-1 truncate"
                      />
                    </div>
                </div>

                <div className="z-10 grid grid-cols-2 gap-x-1 gap-y-0.5 mt-0.5">
                    <div>
                        <h3 className="text-gray-500 text-[5px] font-bold uppercase leading-none">Função</h3>
                        <input 
                            value={resident.role}
                            onChange={(e) => handleChange('role', e)}
                            className="bg-transparent border-none text-[8px] font-semibold text-blue-300 w-full focus:ring-1 focus:ring-blue-500 rounded px-1 leading-tight truncate"
                        />
                    </div>
                     <div>
                        <h3 className="text-gray-500 text-[5px] font-bold uppercase leading-none">Nascimento</h3>
                        <input 
                            value={resident.birthDate}
                            onChange={(e) => handleChange('birthDate', e)}
                            className="bg-transparent border-none text-[8px] font-mono text-white w-full focus:ring-1 focus:ring-blue-500 rounded px-1 leading-tight"
                        />
                    </div>
                    <div>
                        <h3 className="text-gray-500 text-[5px] font-bold uppercase leading-none">CPF</h3>
                        <input 
                            value={resident.cpf}
                            onChange={(e) => handleChange('cpf', e)}
                            className="bg-transparent border-none text-[8px] font-mono text-gray-300 w-full focus:ring-1 focus:ring-blue-500 rounded px-1 leading-tight"
                        />
                    </div>
                     <div>
                        <h3 className="text-gray-500 text-[5px] font-bold uppercase leading-none">RG</h3>
                        <input 
                            value={resident.rg}
                            onChange={(e) => handleChange('rg', e)}
                            placeholder="RG"
                            className="bg-transparent border-none text-[8px] font-mono text-gray-300 w-full focus:ring-1 focus:ring-blue-500 rounded px-1 leading-tight"
                        />
                    </div>
                </div>

                <div className="mt-auto border-t border-slate-700 pt-0.5 flex flex-col gap-0.5 z-10">
                    <div className="flex justify-between items-center">
                        <span className="text-[5px] text-gray-500">Membro: {resident.registrationDate}</span>
                        <span className="text-[5px] text-blue-400 uppercase tracking-wider text-right">{mandateText}</span>
                    </div>
                    <div className="w-full text-center mt-0.5">
                        <p className="text-[4.5px] text-gray-600 uppercase w-full truncate leading-none">{footerText}</p>
                    </div>
                </div>
            </div>
        </div>
    );
  }

   /* --- TEMPLATE 3: MINIMAL (White/Clean) --- */
   return (
    <div ref={idRef} className="w-[350px] h-[220px] bg-white rounded-lg overflow-hidden shadow-xl border border-gray-200 relative flex flex-col p-1.5 font-mono select-none">
         <Watermark />
         
         <div className="flex justify-between items-start border-b-2 border-black pb-0.5 mb-1 relative z-10 shrink-0">
             <div className="flex items-center gap-1.5">
                 <AmcLogo className="w-6 h-6 shrink-0" />
                 <div className="overflow-hidden">
                    <h1 className="text-xs font-bold text-black leading-none tracking-tight">AMC</h1>
                    <p className="text-[5px] text-gray-600 uppercase leading-none truncate w-32">{assocName}<br/>{assocLocation}</p>
                 </div>
             </div>
             <div className="text-right w-1/3">
                 <input 
                    value={resident.role}
                    onChange={(e) => handleChange('role', e)}
                    className="text-[8px] font-bold bg-black text-white px-1 py-0.5 text-center w-full outline-none rounded-sm"
                 />
             </div>
         </div>

         <div className="flex gap-2 relative z-10 flex-1 min-h-0">
             <div className="w-16 h-20 bg-gray-100 border border-black p-0.5 shrink-0">
                 <div className="w-full h-full grayscale overflow-hidden relative">
                     {renderPhoto()}
                 </div>
             </div>
             <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                 <div className="mb-0.5">
                     <span className="text-[5px] block text-gray-500 uppercase leading-none">Nome</span>
                     <input 
                        value={resident.name}
                        onChange={(e) => handleChange('name', e)}
                        placeholder="NOME"
                        className="text-[9px] font-bold block leading-tight w-full outline-none hover:bg-gray-50 focus:bg-gray-100 bg-white/50 truncate"
                     />
                 </div>
                 <div className="mb-0.5">
                     <span className="text-[5px] block text-gray-500 uppercase leading-none">Documento (CPF)</span>
                     <div className="flex gap-1">
                        <input 
                            value={resident.cpf}
                            onChange={(e) => handleChange('cpf', e)}
                            className="text-[8px] block w-full outline-none hover:bg-gray-50 focus:bg-gray-100 bg-white/50 leading-tight"
                        />
                     </div>
                 </div>
                  <div className="flex justify-between gap-1">
                     <div className="flex-1">
                         <span className="text-[5px] block text-gray-500 uppercase leading-none">Nasc.</span>
                         <input 
                            value={resident.birthDate}
                            onChange={(e) => handleChange('birthDate', e)}
                            className="text-[8px] block w-full outline-none hover:bg-gray-50 focus:bg-gray-100 bg-white/50 leading-tight"
                         />
                     </div>
                      <div className="flex-1 text-right">
                         <span className="text-[5px] block text-gray-500 uppercase leading-none">RG</span>
                         <input 
                            value={resident.rg}
                            onChange={(e) => handleChange('rg', e)}
                            className="text-[8px] block w-full text-right outline-none hover:bg-gray-50 focus:bg-gray-100 bg-white/50 leading-tight"
                         />
                     </div>
                 </div>
                 <div className="pt-0.5 mt-auto">
                    <p className="text-[6px] font-bold border-t border-dashed border-gray-300 pt-0.5 text-right">{mandateText}</p>
                 </div>
             </div>
         </div>
         
         <div className="relative z-10 mt-auto pt-0.5 border-t border-gray-100 text-center shrink-0">
              <p className="text-[4.5px] text-gray-400 uppercase w-full truncate leading-none">{footerText}</p>
         </div>
    </div>
   );
};