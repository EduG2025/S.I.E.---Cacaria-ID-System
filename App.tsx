import React, { useState, useRef, useEffect } from 'react';
import { Camera, Sparkles, Upload, FileText, Download, ShieldCheck, User as UserIcon, ZoomIn, Move, Settings, Lock, LayoutTemplate, Image as ImageIcon, FileImage, AlertTriangle, CheckCircle, BarChart3, Users, Search, Edit, Trash2, Plus, Info, Save, X, Building, Phone, Calendar, Paperclip, File, Wifi, WifiOff } from 'lucide-react';
import { Resident, ProcessingStatus, AppView, IDTemplate, PhotoSettings, User, SystemUser, AssociationData, Director } from './types';
import { analyzeDocumentText, editResidentPhoto, fetchCompanyData } from './services/geminiService';
import { api } from './services/api'; 
import { IDCard } from './components/IDCard';
import html2canvas from 'html2canvas';

// Utility to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

// --- TOOLTIP COMPONENT ---
interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => (
    <div className="group relative flex items-center w-full">
      {children}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-[10px] p-2 rounded w-max max-w-[200px] z-50 pointer-events-none border border-gray-700 shadow-xl">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
);

const App: React.FC = () => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [loginError, setLoginError] = useState('');
  
  // --- Connection State ---
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // --- App State ---
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [status, setStatus] = useState<ProcessingStatus>({
    isAnalyzing: false,
    isEditingPhoto: false,
    isGeneratingReport: false,
    isSearching: false,
    message: ''
  });

  // --- DATABASE STATES (Fetched from API) ---
  const [residentsList, setResidentsList] = useState<Resident[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  
  // Lista padrão de cargos solicitada - COMPLETA
  const defaultRoles = ['Morador', 'Presidente', 'Vice-Presidente', 'Tesoureiro', 'Secretário', 'Diretor'];
  const [availableRoles, setAvailableRoles] = useState<string[]>(defaultRoles);
  
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  
  const [associationData, setAssociationData] = useState<AssociationData>({
      name: 'Associação de Moradores',
      cnpj: '',
      companyName: '',
      address: { street: '', number: '', city: 'Piraí', state: 'RJ', zip: '' },
      contact: { phone: '', whatsapp: '', email: '' },
      management: {
          president: '',
          vicePresident: '',
          treasurer: '',
          secretary: '',
          directors: [],
          mandateStart: '',
          mandateEnd: '',
          electionMinutesPdf: null
      }
  });

  // --- INITIAL DATA FETCHING ---
  // Load data when view changes (simple strategy for now)
  useEffect(() => {
    // Check connection on startup
    const checkConnection = async () => {
        const connected = await api.checkBackendConnection();
        setIsBackendConnected(connected);
    };
    checkConnection();

    if (view === AppView.RESIDENTS_LIST || view === AppView.DASHBOARD) {
        loadResidents();
    }
    if (view === AppView.USERS_LIST) {
        loadUsers();
    }
    if (view === AppView.LOGIN || view === AppView.ID_GENERATOR || view === AppView.SYSTEM_SETTINGS) {
        loadSettings();
        loadRoles();
    }
  }, [view]);

  const loadResidents = async () => {
      try {
          const data = await api.getResidents();
          setResidentsList(data);
      } catch (e) { console.error("Failed to load residents", e); }
  };

  const loadUsers = async () => {
      try {
          const data = await api.getUsers();
          setSystemUsers(data);
      } catch (e) { console.error("Failed to load users", e); }
  };

  const loadRoles = async () => {
      try {
          const data = await api.getRoles();
          // Mescla os cargos padrão com os salvos no banco/localstorage, removendo duplicatas e ordenando
          const uniqueRoles = Array.from(new Set([...defaultRoles, ...data]));
          setAvailableRoles(uniqueRoles);
      } catch (e) { 
          console.error("Failed to load roles", e); 
          setAvailableRoles(defaultRoles); // Fallback
      }
  }

  const loadSettings = async () => {
      try {
          const { data, logo } = await api.getSettings();
          if (data) setAssociationData(data);
          if (logo) setOrganizationLogo(logo);
      } catch (e) { console.error("Failed to load settings", e); }
  }


  // --- Current Resident Editing State ---
  const [resident, setResident] = useState<Resident>({
    id: crypto.randomUUID(),
    name: '',
    role: 'Morador',
    cpf: '',
    rg: '',
    address: '',
    birthDate: '',
    registrationDate: new Date().toLocaleDateString('pt-BR'),
    photoUrl: null
  });

  const handleRoleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const newRole = e.target.value;
      setResident({ ...resident, role: newRole });
      
      // Se for um cargo novo (não está na lista) e tiver tamanho suficiente, salva
      if (newRole.length > 2 && !availableRoles.includes(newRole)) {
          // Update otimista para a lista ficar disponível imediatamente
          setAvailableRoles(prev => [...prev, newRole]);
          // Persistência
          await api.addRole(newRole);
      }
  };

  // --- Visual & Config State ---
  const [template, setTemplate] = useState<IDTemplate>(() => {
    const saved = localStorage.getItem('sie_preferred_template');
    return (saved === 'CLASSIC' || saved === 'MODERN' || saved === 'MINIMAL') ? saved as IDTemplate : 'CLASSIC';
  });
  
  const [photoSettings, setPhotoSettings] = useState<PhotoSettings>({ zoom: 1, x: 0, y: 0 });

  // --- AI Features State ---
  const [uploadedPhotoBase64, setUploadedPhotoBase64] = useState<string | null>(null);
  const [uploadedPhotoMimeType, setUploadedPhotoMimeType] = useState<string>('image/jpeg');
  const [editPrompt, setEditPrompt] = useState<string>("Remover fundo original. Adicionar fundo branco sólido. Melhorar iluminação para estilo estúdio. Centralizar rosto e ombros sem cortar o topo da cabeça. Estilo foto 3x4 oficial.");
  
  const idCardRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---

  const handleTemplateChange = (newTemplate: IDTemplate) => {
    setTemplate(newTemplate);
    localStorage.setItem('sie_preferred_template', newTemplate);
  };

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      
      try {
          const user = await api.login(loginForm.user, loginForm.pass);
          if (user) {
              setCurrentUser({ name: user.name, role: user.role });
              setView(AppView.DASHBOARD);
          } else {
              setLoginError("Credenciais inválidas.");
          }
      } catch (e) {
          setLoginError("Erro ao conectar ao servidor.");
      }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if(ev.target?.result) {
                  const logoData = ev.target.result as string;
                  setOrganizationLogo(logoData);
                  // Auto save on upload
                  api.saveSettings(associationData, logoData); 
              }
          }
          reader.readAsDataURL(e.target.files[0]);
      }
  }

  const handleSaveResident = async () => {
      if (!resident.name || !resident.cpf) {
          alert("Preencha ao menos Nome e CPF para salvar.");
          return;
      }
      setStatus({ ...status, message: 'Salvando no Banco de Dados...' });
      try {
        await api.saveResident(resident);
        alert("Cadastro Salvo com Sucesso!");
        setView(AppView.RESIDENTS_LIST);
      } catch (err) {
        alert("Erro ao salvar cadastro.");
      } finally {
        setStatus({ ...status, message: '' });
      }
  };

  const handleNewResident = () => {
      setResident({
        id: crypto.randomUUID(),
        name: '',
        role: 'Morador',
        cpf: '',
        rg: '',
        address: '',
        birthDate: '',
        registrationDate: new Date().toLocaleDateString('pt-BR'),
        photoUrl: null
      });
      setUploadedPhotoBase64(null);
      setPhotoSettings({ zoom: 1, x: 0, y: 0 });
      setView(AppView.ID_GENERATOR);
  }

  const handleDeleteResident = async (id: string) => {
      if (confirm('Tem certeza que deseja excluir este cadastro?')) {
          await api.deleteResident(id);
          loadResidents(); // Refresh list
      }
  }

  const handleEditResident = (r: Resident) => {
      setResident(r);
      // If has photo, try to set up edit context (basic)
      if (r.photoUrl && r.photoUrl.startsWith('data:image')) {
           setUploadedPhotoBase64(r.photoUrl.split(',')[1]);
           const mimeMatch = r.photoUrl.match(/data:(.*?);/);
           if (mimeMatch) setUploadedPhotoMimeType(mimeMatch[1]);
      }
      setView(AppView.ID_GENERATOR);
  }

  // Real-time update from ID Card direct editing
  const handleCardUpdate = async (field: keyof Resident, value: string) => {
      setResident(prev => ({ ...prev, [field]: value }));

      // Se o campo editado for o Cargo (role), verificamos se é novo para salvar na lista
      if (field === 'role') {
        const newRole = value;
        if (newRole.length > 2 && !availableRoles.includes(newRole)) {
            // Update otimista
            setAvailableRoles(prev => [...prev, newRole]);
            // Persistência silenciosa
            await api.addRole(newRole);
        }
      }
  };

  const handleDocumentScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setStatus({ ...status, isAnalyzing: true, message: 'Analisando documento (Gemini 2.5 Flash)...' });
        try {
            const base64 = await fileToBase64(file);
            const data = await analyzeDocumentText(base64, file.type);
            setResident(prev => ({
                ...prev,
                name: data.name || prev.name,
                cpf: data.cpf || prev.cpf,
                rg: data.rg || prev.rg,
                birthDate: data.birthDate || prev.birthDate
            }));
        } catch (error) {
            console.error(error);
            alert('Falha ao analisar documento. Verifique a chave de API e o formato da imagem.');
        } finally {
            setStatus({ ...status, isAnalyzing: false, message: '' });
        }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const base64 = await fileToBase64(file);
      setUploadedPhotoBase64(base64);
      setUploadedPhotoMimeType(file.type);
      setResident(prev => ({ ...prev, photoUrl: `data:${file.type};base64,${base64}` }));
      setPhotoSettings({ zoom: 1, x: 0, y: 0 });
    }
  };

  const handleEditPhoto = async () => {
    if (!uploadedPhotoBase64) return;
    setStatus({ ...status, isEditingPhoto: true, message: 'Processando foto oficial (Gemini Nano Banana)...' });
    try {
      const newImage = await editResidentPhoto(uploadedPhotoBase64, editPrompt, uploadedPhotoMimeType);
      setResident(prev => ({ ...prev, photoUrl: newImage }));
      setUploadedPhotoBase64(newImage.split(',')[1]); 
      setUploadedPhotoMimeType('image/png'); // Gemini usually returns PNG/JPEG, but let's assume valid base64
    } catch (err) {
      console.error(err);
      alert("Erro na edição da imagem. Verifique a API Key.");
    } finally {
      setStatus({ ...status, isEditingPhoto: false, message: '' });
    }
  };

  const handlePrint = () => window.print();

  const handleDownloadJPG = async () => {
      if (!idCardRef.current) return;
      try {
          const canvas = await html2canvas(idCardRef.current, { 
              scale: 3, 
              backgroundColor: '#ffffff', // Force white background for JPG
              useCORS: true,
              logging: false 
          });
          const image = canvas.toDataURL("image/jpeg", 1.0);
          const link = document.createElement("a");
          link.href = image;
          link.download = `Carteirinha-${resident.name || 'Residente'}.jpg`;
          link.click();
      } catch (error) {
          console.error("Erro ao gerar JPG", error);
          alert("Erro ao salvar imagem.");
      }
  };

  // --- Association System Handlers ---
  const handleAssociationSave = async () => {
      try {
          await api.saveSettings(associationData, organizationLogo);
          alert("Dados da Associação salvos com sucesso!");
      } catch (e) {
          alert("Erro ao salvar configurações.");
      }
  };

  const handleCnpjLookup = async () => {
      if (!associationData.cnpj) return;
      setStatus({ ...status, isSearching: true, message: 'Consultando CNPJ e Endereço na Receita/Google...' });
      try {
          const data = await fetchCompanyData(associationData.cnpj);
          if (data) {
              setAssociationData(prev => ({
                  ...prev,
                  companyName: data.companyName || prev.companyName,
                  address: {
                      street: data.street || prev.address.street,
                      number: data.number || prev.address.number,
                      city: data.city || prev.address.city,
                      state: data.state || prev.address.state,
                      zip: data.zip || prev.address.zip
                  }
              }));
          } else {
              alert("Não foi possível encontrar dados exatos. Preencha manualmente.");
          }
      } catch (error) {
          console.error(error);
          alert("Erro na consulta.");
      } finally {
          setStatus({ ...status, isSearching: false, message: '' });
      }
  };

  // --- Components ---

  const RegistrationStatusPanel = () => {
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
  }

  const ResidentsListView = () => {
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
                    <button onClick={handleNewResident} className="bg-brand-accent hover:bg-cyan-500 text-brand-dark px-4 py-2 rounded-lg font-bold flex items-center gap-2">
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
                                            <button onClick={() => handleEditResident(r)} className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded transition">
                                                <Edit size={16} />
                                            </button>
                                          </Tooltip>
                                          <Tooltip text="Excluir Definitivamente">
                                            <button onClick={() => handleDeleteResident(r.id)} className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition">
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
  }

  const UsersListView = () => {
      const [newUser, setNewUser] = useState<SystemUser>({ id: '', name: '', username: '', password: '', role: 'OPERADOR' });
      
      const handleAddUser = async (e: React.FormEvent) => {
          e.preventDefault();
          if(!newUser.username || !newUser.password) return;
          try {
              await api.createUser({ ...newUser, id: crypto.randomUUID() });
              loadUsers();
              setNewUser({ id: '', name: '', username: '', password: '', role: 'OPERADOR' });
          } catch (e) { alert('Erro ao criar usuário'); }
      };

      const handleDeleteUser = async (id: string) => {
          if(id === '1') { alert('Não é possível excluir o admin padrão.'); return; }
          if(confirm('Excluir usuário?')) {
              await api.deleteUser(id);
              loadUsers();
          }
      }

      return (
        <div className="p-8 max-w-[1200px] mx-auto">
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
                     <table className="w-full text-left">
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
      )
  }

  const SystemSettingsView = () => {
    const [newDirector, setNewDirector] = useState<{name: string, title: string}>({name: '', title: ''});

    const handleAddDirector = () => {
        if(newDirector.name && newDirector.title) {
            setAssociationData(prev => ({
                ...prev,
                management: {
                    ...prev.management,
                    directors: [...prev.management.directors, { id: crypto.randomUUID(), ...newDirector }]
                }
            }));
            setNewDirector({name: '', title: ''});
        }
    }

    const handleRemoveDirector = (id: string) => {
        setAssociationData(prev => ({
            ...prev,
            management: {
                ...prev.management,
                directors: prev.management.directors.filter(d => d.id !== id)
            }
        }));
    }

    const handleMinutesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                alert('Apenas arquivos PDF são permitidos.');
                return;
            }
            try {
                if (file.size > 2 * 1024 * 1024) {
                    alert('Arquivo muito grande. O limite para armazenamento é 2MB.');
                    return;
                }
                const base64 = await fileToBase64(file);
                setAssociationData(prev => ({
                    ...prev,
                    management: { ...prev.management, electionMinutesPdf: base64 }
                }));
            } catch (err) {
                alert('Erro ao processar arquivo.');
            }
        }
    }

    return (
        <div className="p-8 max-w-[1200px] mx-auto pb-20">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6"><Building className="text-brand-accent"/> Sistema: Associação</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Basic Info & Logo */}
                <div className="space-y-6">
                    <div className="bg-brand-secondary p-6 rounded-xl border border-gray-700">
                        <h3 className="text-white font-bold mb-4 uppercase text-sm flex items-center gap-2"><ImageIcon size={14}/> Identidade Visual (Logo)</h3>
                        <div className="flex flex-col items-center gap-4">
                             <div className={`w-32 h-32 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-lg ${organizationLogo ? 'p-1' : 'border-4 border-brand-accent p-4'}`}>
                                {organizationLogo ? (
                                    <img src={organizationLogo} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <ShieldCheck size={48} className="text-brand-accent" />
                                )}
                             </div>
                             <Tooltip text="Esta logo será usada em todas as carteirinhas">
                                <label className="bg-brand-primary hover:bg-gray-700 text-white text-xs px-4 py-2 rounded cursor-pointer border border-gray-600 transition">
                                    <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                                    Carregar Imagem Oficial
                                </label>
                             </Tooltip>
                        </div>
                    </div>

                    <div className="bg-brand-secondary p-6 rounded-xl border border-gray-700">
                         <h3 className="text-white font-bold mb-4 uppercase text-sm flex items-center gap-2"><Info size={14}/> Informações Básicas</h3>
                         <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Nome da Associação</label>
                                <input value={associationData.name} onChange={e => setAssociationData({...associationData, name: e.target.value})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-accent" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">CNPJ</label>
                                <div className="flex gap-2">
                                    <input value={associationData.cnpj} onChange={e => setAssociationData({...associationData, cnpj: e.target.value})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-accent" placeholder="00.000.000/0000-00" />
                                    <Tooltip text="IA: Buscar dados na Receita/Google">
                                        <button onClick={handleCnpjLookup} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded"><Search size={16}/></button>
                                    </Tooltip>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Razão Social</label>
                                <input value={associationData.companyName} onChange={e => setAssociationData({...associationData, companyName: e.target.value})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-accent" />
                            </div>
                         </div>
                    </div>
                     <div className="bg-brand-secondary p-6 rounded-xl border border-gray-700">
                        <h3 className="text-white font-bold mb-4 uppercase text-sm flex items-center gap-2"><Settings size={14}/> Endereço</h3>
                        <div className="grid grid-cols-3 gap-3">
                             <div className="col-span-2">
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Logradouro</label>
                                <input value={associationData.address.street} onChange={e => setAssociationData({...associationData, address: {...associationData.address, street: e.target.value}})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-accent" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Número</label>
                                <input value={associationData.address.number} onChange={e => setAssociationData({...associationData, address: {...associationData.address, number: e.target.value}})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-accent" />
                            </div>
                             <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Cidade</label>
                                <input value={associationData.address.city} onChange={e => setAssociationData({...associationData, address: {...associationData.address, city: e.target.value}})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-accent" />
                            </div>
                             <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Estado (UF)</label>
                                <input value={associationData.address.state} onChange={e => setAssociationData({...associationData, address: {...associationData.address, state: e.target.value}})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-accent" />
                            </div>
                             <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">CEP</label>
                                <input value={associationData.address.zip} onChange={e => setAssociationData({...associationData, address: {...associationData.address, zip: e.target.value}})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-accent" />
                            </div>
                             <div className="col-span-3">
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Email Oficial</label>
                                <input value={associationData.contact.email} onChange={e => setAssociationData({...associationData, contact: {...associationData.contact, email: e.target.value}})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-accent" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Management & Mandate */}
                <div className="space-y-6">
                    <div className="bg-brand-secondary p-6 rounded-xl border border-gray-700">
                        <h3 className="text-white font-bold mb-4 uppercase text-sm flex items-center gap-2"><Users size={14}/> Gestão & Mandato</h3>
                        
                        {/* Mandate Dates */}
                        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-600">
                            <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Início do Mandato</label>
                                <div className="relative">
                                    <Calendar className="absolute left-2 top-2 text-gray-500" size={14}/>
                                    <input type="month" value={associationData.management.mandateStart} onChange={e => setAssociationData({...associationData, management: {...associationData.management, mandateStart: e.target.value}})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 pl-8 text-white text-sm outline-none focus:border-brand-accent" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Fim do Mandato</label>
                                <div className="relative">
                                    <Calendar className="absolute left-2 top-2 text-gray-500" size={14}/>
                                    <input type="month" value={associationData.management.mandateEnd} onChange={e => setAssociationData({...associationData, management: {...associationData.management, mandateEnd: e.target.value}})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 pl-8 text-white text-sm outline-none focus:border-brand-accent" />
                                </div>
                            </div>
                             <div className="col-span-2">
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Ata da Eleição (PDF)</label>
                                <label className="flex items-center gap-2 bg-brand-primary hover:bg-gray-700 border border-gray-700 border-dashed rounded p-3 cursor-pointer transition">
                                    <input type="file" className="hidden" accept="application/pdf" onChange={handleMinutesUpload} />
                                    <Paperclip size={16} className="text-brand-accent" />
                                    <span className="text-xs text-gray-400">
                                        {associationData.management.electionMinutesPdf 
                                            ? "Arquivo PDF Anexado (Pronto)" 
                                            : "Clique para anexar PDF da Ata"}
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Executive Board */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Presidente</label>
                                <input value={associationData.management.president} onChange={e => setAssociationData({...associationData, management: {...associationData.management, president: e.target.value}})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-accent" placeholder="Nome Completo" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Vice-Presidente</label>
                                <input value={associationData.management.vicePresident} onChange={e => setAssociationData({...associationData, management: {...associationData.management, vicePresident: e.target.value}})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-accent" placeholder="Nome Completo" />
                            </div>
                             <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">1º Tesoureiro</label>
                                <input value={associationData.management.treasurer} onChange={e => setAssociationData({...associationData, management: {...associationData.management, treasurer: e.target.value}})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-accent" placeholder="Nome" />
                            </div>
                             <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">1º Secretário</label>
                                <input value={associationData.management.secretary} onChange={e => setAssociationData({...associationData, management: {...associationData.management, secretary: e.target.value}})} className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-accent" placeholder="Nome" />
                            </div>
                        </div>
                        
                        {/* Directors (Dynamic List) */}
                        <div className="pt-4 border-t border-gray-600">
                             <label className="block text-[10px] uppercase text-gray-500 mb-2">Diretores (Lista Dinâmica)</label>
                             <div className="flex gap-2 mb-2">
                                <input 
                                    placeholder="Cargo (ex: Diretor de Esportes)" 
                                    value={newDirector.title}
                                    onChange={e => setNewDirector({...newDirector, title: e.target.value})}
                                    className="flex-1 bg-brand-primary border border-gray-700 rounded p-2 text-white text-xs outline-none focus:border-brand-accent" 
                                />
                                <input 
                                    placeholder="Nome do Diretor" 
                                    value={newDirector.name}
                                    onChange={e => setNewDirector({...newDirector, name: e.target.value})}
                                    className="flex-1 bg-brand-primary border border-gray-700 rounded p-2 text-white text-xs outline-none focus:border-brand-accent" 
                                />
                                <button onClick={handleAddDirector} className="bg-brand-accent hover:bg-cyan-500 text-brand-dark p-2 rounded"><Plus size={16}/></button>
                             </div>

                             <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                {associationData.management.directors.length === 0 && <p className="text-xs text-gray-600 italic">Nenhum diretor adicional cadastrado.</p>}
                                {associationData.management.directors.map(dir => (
                                    <div key={dir.id} className="flex justify-between items-center bg-brand-primary/50 p-2 rounded border border-gray-700">
                                        <div>
                                            <span className="text-brand-accent font-bold text-xs block">{dir.title}</span>
                                            <span className="text-white text-xs block">{dir.name}</span>
                                        </div>
                                        <button onClick={() => handleRemoveDirector(dir.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>

                    <button onClick={handleAssociationSave} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"><Save size={18}/> Salvar Configurações</button>
                </div>
            </div>
        </div>
    );
  }

  // --- Views Logic ---

  if (view === AppView.LOGIN) {
      return (
          <div className="min-h-screen bg-brand-primary flex items-center justify-center p-4">
              <div className="bg-brand-secondary p-8 rounded-xl shadow-2xl w-full max-w-md border border-brand-accent/20">
                  <div className="flex flex-col items-center mb-8">
                      <div className={`w-24 h-24 rounded-full bg-white flex items-center justify-center mb-4 overflow-hidden shadow-lg ${organizationLogo ? 'p-1' : 'border-4 border-brand-accent p-4'}`}>
                           {organizationLogo ? (
                               <img src={organizationLogo} alt="Logo" className="w-full h-full object-contain" />
                           ) : (
                               <ShieldCheck size={48} className="text-brand-accent" />
                           )}
                      </div>
                      <h1 className="text-xl font-bold text-white tracking-widest text-center">S.I.E. <span className="text-brand-accent">CACARIA</span></h1>
                      <p className="text-sm text-gray-400 text-center">{associationData.name} - {associationData.address.city}</p>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                          <label className="block text-xs uppercase text-gray-500 mb-1">Usuário</label>
                          <div className="relative">
                              <UserIcon size={16} className="absolute left-3 top-3 text-gray-500" />
                              <input 
                                type="text" 
                                value={loginForm.user}
                                onChange={e => setLoginForm({...loginForm, user: e.target.value})}
                                className="w-full bg-brand-primary border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-brand-accent outline-none"
                                placeholder="ex: admin"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs uppercase text-gray-500 mb-1">Senha</label>
                          <div className="relative">
                              <Lock size={16} className="absolute left-3 top-3 text-gray-500" />
                              <input 
                                type="password" 
                                value={loginForm.pass}
                                onChange={e => setLoginForm({...loginForm, pass: e.target.value})}
                                className="w-full bg-brand-primary border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-brand-accent outline-none"
                                placeholder="••••••"
                              />
                          </div>
                      </div>
                      {loginError && <p className="text-red-500 text-xs text-center">{loginError}</p>}
                      
                      <Tooltip text="Clique para acessar o painel">
                        <button type="submit" className="w-full bg-brand-accent hover:bg-cyan-600 text-brand-dark font-bold py-3 rounded-lg transition-colors mt-4">
                            ACESSAR SISTEMA
                        </button>
                      </Tooltip>
                      <div className="text-center mt-4 p-2 bg-brand-primary/50 rounded border border-gray-700">
                          <p className="text-xs text-gray-400"><span className="font-bold text-brand-accent">Dica de Acesso:</span> admin / admin</p>
                      </div>
                  </form>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-brand-light bg-brand-dark">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-brand-primary border-r border-brand-secondary flex flex-col shrink-0 z-20">
        <div className="p-6 border-b border-brand-secondary">
          <h1 className="text-xl font-bold text-white tracking-widest flex items-center gap-2">
            <ShieldCheck className="text-brand-accent" /> S.I.E.
          </h1>
          <p className="text-xs text-brand-accent mt-1 opacity-70">Logado: {currentUser?.name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setView(AppView.DASHBOARD)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${view === AppView.DASHBOARD ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'hover:bg-brand-secondary'}`}>
            <BarChart3 size={18} /> Dashboard
          </button>
          
          <div className="pt-4 pb-1 pl-4 text-[10px] uppercase text-gray-500 font-bold">Módulos</div>
          
          <Tooltip text="Lista completa de moradores">
            <button onClick={() => setView(AppView.RESIDENTS_LIST)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${view === AppView.RESIDENTS_LIST ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'hover:bg-brand-secondary'}`}>
                <Users size={18} /> Cadastros
            </button>
          </Tooltip>
          
          <Tooltip text="Criar ou editar carteirinhas">
            <button onClick={() => setView(AppView.ID_GENERATOR)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${view === AppView.ID_GENERATOR ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'hover:bg-brand-secondary'}`}>
                <FileText size={18} /> Editor de ID
            </button>
          </Tooltip>

          {currentUser?.role === 'ADMIN' && (
              <>
                <div className="pt-4 pb-1 pl-4 text-[10px] uppercase text-gray-500 font-bold">Administração</div>
                <Tooltip text="Configurar dados da Associação e CNPJ">
                    <button onClick={() => setView(AppView.SYSTEM_SETTINGS)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${view === AppView.SYSTEM_SETTINGS ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'hover:bg-brand-secondary'}`}>
                        <Building size={18} /> Sistema
                    </button>
                </Tooltip>
                <Tooltip text="Gerenciar quem acessa o sistema">
                    <button onClick={() => setView(AppView.USERS_LIST)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${view === AppView.USERS_LIST ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'hover:bg-brand-secondary'}`}>
                        <Settings size={18} /> Usuários
                    </button>
                </Tooltip>
              </>
          )}
        </nav>
         
         {/* Footer / Status Indicator */}
         <div className="p-4 border-t border-brand-secondary">
             <div className="flex items-center gap-2 text-[10px] mb-3 px-2">
                 {isBackendConnected ? (
                     <>
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                        <span className="text-green-400 font-medium tracking-wide">ONLINE (Servidor VPS)</span>
                     </>
                 ) : (
                     <>
                        <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                        <span className="text-orange-400 font-medium tracking-wide">OFFLINE (Modo Local)</span>
                     </>
                 )}
             </div>
             <button onClick={() => setView(AppView.LOGIN)} className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded transition">
                 <Lock size={12} /> Sair do Sistema
             </button>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-brand-secondary flex items-center justify-between px-8 bg-brand-primary/50 backdrop-blur-md sticky top-0 z-40">
           <h2 className="text-lg font-semibold text-white">
               {view === AppView.ID_GENERATOR && 'Central de Identificação - AMC'}
               {view === AppView.RESIDENTS_LIST && 'Banco de Dados: Moradores'}
               {view === AppView.USERS_LIST && 'Controle de Acesso'}
               {view === AppView.SYSTEM_SETTINGS && 'Configuração do Sistema'}
               {view === AppView.DASHBOARD && 'Dashboard Geral'}
           </h2>
           <Tooltip text="Mecanismo de IA Google Gemini operando">
             <span className="text-xs bg-green-900/30 px-3 py-1 rounded-full border border-green-500/30 text-green-400 font-mono">Sistema Inteligente Ativo</span>
           </Tooltip>
        </header>

        {view === AppView.USERS_LIST && <UsersListView />}
        
        {view === AppView.SYSTEM_SETTINGS && <SystemSettingsView />}

        {view === AppView.RESIDENTS_LIST && <ResidentsListView />}

        {view === AppView.ID_GENERATOR && (
            <div className="p-4 lg:p-8 grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1600px] mx-auto">
                
                {/* --- LEFT STATION: DATA ENTRY --- */}
                <div className="xl:col-span-5 space-y-6">
                    
                    {/* Toolbar */}
                    <div className="flex justify-between items-center bg-brand-secondary p-3 rounded-xl border border-gray-700">
                        <Tooltip text="Limpar formulário">
                            <button onClick={handleNewResident} className="text-xs flex items-center gap-1 text-gray-400 hover:text-white"><Plus size={14}/> Novo</button>
                        </Tooltip>
                        <Tooltip text="Salvar cadastro atual no banco de dados">
                            <button onClick={handleSaveResident} className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2"><Save size={14}/> Salvar Cadastro</button>
                        </Tooltip>
                    </div>

                    {/* 1. Scanner */}
                    <div className="bg-brand-secondary rounded-xl p-5 border border-brand-secondary group hover:border-brand-accent/30 transition-all">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-white font-medium flex items-center gap-2 text-sm uppercase tracking-wide">
                                <FileText size={16} className="text-brand-accent" /> Documentos Digitais
                            </h3>
                        </div>
                        <Tooltip text="Clique para escanear RG ou CNH automaticamente">
                            <div className="relative border-2 border-dashed border-gray-600 rounded-lg p-6 hover:bg-brand-primary/50 transition-all flex flex-col items-center justify-center text-center cursor-pointer">
                                <input type="file" onChange={handleDocumentScan} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                {status.isAnalyzing ? <div className="animate-spin text-brand-accent mb-2">⟳</div> : <Upload className="text-gray-400 mb-2" />}
                                <p className="text-xs text-gray-400">Arraste RG/CNH ou clique para<br/>preenchimento automático (OCR)</p>
                            </div>
                        </Tooltip>
                    </div>

                    {/* 2. Registration Status (New Panel) */}
                    <RegistrationStatusPanel />

                    {/* 3. Data Form */}
                    <div className="bg-brand-secondary rounded-xl p-5 border border-brand-secondary">
                        <h3 className="text-white font-medium flex items-center gap-2 text-sm uppercase tracking-wide mb-4">
                            <UserIcon size={16} className="text-brand-accent" /> Dados Cadastrais
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Nome Completo</label>
                                <Tooltip text="Nome conforme documento oficial">
                                    <input 
                                        type="text" 
                                        value={resident.name}
                                        onChange={(e) => setResident({...resident, name: e.target.value})}
                                        className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white focus:border-brand-accent outline-none text-sm"
                                    />
                                </Tooltip>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Cargo / Função</label>
                                <Tooltip text="Selecione da lista ou digite um novo cargo">
                                    <input 
                                        list="roles-list"
                                        value={resident.role}
                                        onChange={handleRoleChange}
                                        className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white focus:border-brand-accent outline-none text-sm"
                                        placeholder="Selecione ou digite..."
                                    />
                                </Tooltip>
                                <datalist id="roles-list">
                                    {availableRoles.map(role => <option key={role} value={role} />)}
                                </datalist>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-500 mb-1">RG</label>
                                    <input 
                                        type="text" 
                                        value={resident.rg}
                                        onChange={(e) => setResident({...resident, rg: e.target.value})}
                                        className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white focus:border-brand-accent outline-none text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-500 mb-1">CPF</label>
                                    <input 
                                        type="text" 
                                        value={resident.cpf}
                                        onChange={(e) => setResident({...resident, cpf: e.target.value})}
                                        className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white focus:border-brand-accent outline-none text-sm font-mono"
                                    />
                                </div>
                            </div>
                             <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Endereço</label>
                                <input 
                                    type="text" 
                                    value={resident.address}
                                    onChange={(e) => setResident({...resident, address: e.target.value})}
                                    className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white focus:border-brand-accent outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Data Nascimento</label>
                                <input 
                                    type="text" 
                                    value={resident.birthDate}
                                    onChange={(e) => setResident({...resident, birthDate: e.target.value})}
                                    className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white focus:border-brand-accent outline-none text-sm font-mono"
                                    placeholder="DD/MM/AAAA"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT STATION: IDENTITY & VISUALIZATION --- */}
                <div className="xl:col-span-7 space-y-6 flex flex-col">
                    
                    {/* Visualizer & Templates */}
                    <div className="bg-brand-secondary rounded-xl p-6 border border-brand-secondary flex flex-col items-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-accent to-purple-500"></div>
                        
                        {/* Interactive Preview */}
                        <h3 className="text-white font-medium flex items-center gap-2 text-sm uppercase tracking-wide mb-6 w-full">
                            <LayoutTemplate size={16} className="text-brand-accent" /> Visualização (Edição Direta)
                        </h3>

                        <Tooltip text="A carteirinha é interativa! Clique nos textos para editar">
                            <div className="transform hover:scale-[1.02] transition-transform duration-300 shadow-2xl shadow-black/50 rounded-xl cursor-text">
                                <IDCard 
                                    resident={resident} 
                                    template={template} 
                                    photoSettings={photoSettings} 
                                    organizationLogo={organizationLogo} 
                                    associationData={associationData}
                                    idRef={idCardRef}
                                    onUpdate={handleCardUpdate}
                                />
                            </div>
                        </Tooltip>
                        <p className="text-xs text-gray-500 mt-4 flex items-center gap-1"><Sparkles size={10}/> Clique nos textos da carteirinha para editar</p>

                        {/* Template Selector */}
                        <div className="mt-8 w-full max-w-md">
                            <label className="text-[10px] text-gray-400 uppercase font-bold block mb-2 text-center">Modelo de Design</label>
                            <div className="flex bg-brand-primary p-1.5 rounded-lg border border-gray-700">
                                {['CLASSIC', 'MODERN', 'MINIMAL'].map((t) => (
                                    <Tooltip key={t} text={`Aplicar tema ${t}`}>
                                        <button 
                                            onClick={() => handleTemplateChange(t as IDTemplate)} 
                                            className={`flex-1 text-xs px-2 py-2 rounded-md transition-all font-medium ${template === t ? 'bg-brand-accent text-brand-dark shadow' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {t}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>

                         {/* Actions */}
                        <div className="mt-6 flex gap-3 w-full max-w-md">
                            <Tooltip text="Imprimir via navegador">
                                <button onClick={handlePrint} className="flex-1 bg-white hover:bg-gray-100 text-brand-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all text-sm">
                                    <Download size={16} /> Imprimir
                                </button>
                            </Tooltip>
                            <Tooltip text="Baixar imagem de alta resolução (JPG)">
                                <button onClick={handleDownloadJPG} className="flex-1 bg-brand-accent hover:bg-cyan-400 text-brand-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all text-sm">
                                    <FileImage size={16} /> Salvar JPG
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* AI Photo Studio */}
                    <div className="bg-brand-secondary rounded-xl p-5 border border-brand-secondary flex-1">
                        <h3 className="text-white font-medium flex items-center gap-2 text-sm uppercase tracking-wide mb-4">
                            <Camera size={16} className="text-brand-accent" /> Estúdio Fotográfico IA
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Tooltip text="Upload de foto do computador">
                                    <label className="flex flex-col items-center justify-center w-full h-32 bg-brand-primary hover:bg-gray-700/50 border border-dashed border-gray-600 rounded-lg cursor-pointer transition">
                                        <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                                        <ImageIcon size={24} className="text-gray-400 mb-2" />
                                        <span className="text-xs text-gray-400">Carregar Foto Raw</span>
                                    </label>
                                </Tooltip>
                                
                                {resident.photoUrl && (
                                    <div className="bg-brand-primary p-3 rounded-lg border border-gray-700">
                                        <div className="mb-3">
                                            <label className="text-[10px] text-gray-400 flex items-center gap-1 mb-1"><ZoomIn size={10}/> Zoom</label>
                                            <input 
                                                type="range" min="1" max="3" step="0.1" 
                                                value={photoSettings.zoom}
                                                onChange={(e) => setPhotoSettings({...photoSettings, zoom: parseFloat(e.target.value)})}
                                                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400 flex items-center gap-1 mb-1"><Move size={10}/> Ajuste Vertical</label>
                                            <input 
                                                type="range" min="-50" max="50" step="1" 
                                                value={photoSettings.y}
                                                onChange={(e) => setPhotoSettings({...photoSettings, y: parseFloat(e.target.value)})}
                                                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                {uploadedPhotoBase64 ? (
                                    <div className="bg-brand-primary p-3 rounded-lg border border-gray-700 h-full flex flex-col">
                                        <label className="text-[10px] text-brand-accent uppercase font-bold mb-2">Editor Inteligente</label>
                                        <textarea 
                                            value={editPrompt}
                                            onChange={(e) => setEditPrompt(e.target.value)}
                                            className="flex-1 w-full bg-brand-dark border border-gray-700 rounded p-2 text-xs text-white mb-2 resize-none focus:border-brand-accent outline-none"
                                            placeholder="Descreva a edição..."
                                        />
                                        <Tooltip text="Usar IA para remover fundo e melhorar iluminação">
                                            <button 
                                                onClick={handleEditPhoto}
                                                disabled={status.isEditingPhoto}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-xs disabled:opacity-50"
                                            >
                                                {status.isEditingPhoto ? 'Processando...' : 'Aplicar Edição (IA)'}
                                            </button>
                                        </Tooltip>
                                    </div>
                                ) : (
                                    <div className="bg-brand-primary p-3 rounded-lg border border-gray-700 h-full flex flex-col justify-center items-center text-center opacity-50">
                                        <p className="text-xs text-gray-500">Carregue uma foto para habilitar o estúdio</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        )}

        {view === AppView.DASHBOARD && (
             <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                    <BarChart3 size={64} className="mx-auto mb-4 opacity-20" />
                    <h3 className="text-xl text-white mb-2">Dashboard Geral</h3>
                    <p className="mb-8">S.I.E. Conectado: MySQL Database Active</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={() => setView(AppView.RESIDENTS_LIST)} className="bg-brand-secondary hover:bg-brand-accent/20 px-6 py-3 rounded-lg flex flex-col items-center gap-2 border border-gray-700 transition">
                            <Users size={24} className="text-brand-accent"/>
                            <span className="text-sm font-bold text-white">Gerenciar Cadastros</span>
                        </button>
                         <button onClick={() => setView(AppView.ID_GENERATOR)} className="bg-brand-secondary hover:bg-brand-accent/20 px-6 py-3 rounded-lg flex flex-col items-center gap-2 border border-gray-700 transition">
                            <FileText size={24} className="text-brand-accent"/>
                            <span className="text-sm font-bold text-white">Criar Carteirinha</span>
                        </button>
                    </div>
                </div>
             </div>
        )}

      </main>

      {/* Global Loading Overlay */}
      {(status.isAnalyzing || status.isEditingPhoto || status.isSearching) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-brand-secondary p-6 rounded-xl border border-brand-accent shadow-2xl flex flex-col items-center max-w-sm text-center">
                <div className="animate-spin mb-4 text-brand-accent">⟳</div>
                <h3 className="text-white text-lg font-bold mb-2">Processando IA</h3>
                <p className="text-brand-light text-sm">{status.message}</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;