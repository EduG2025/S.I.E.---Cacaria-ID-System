
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Upload, FileText, Download, ShieldCheck, User as UserIcon, Settings, Lock, LayoutTemplate, Image as ImageIcon, FileImage, BarChart3, Users, Search, Plus, Save, X, Building, Wifi, WifiOff, LogOut, Palette } from 'lucide-react';
import { Resident, ProcessingStatus, AppView, IDTemplate, PhotoSettings, User, SystemUser, AssociationData, CustomTemplate } from '@/types';
import { analyzeDocumentText, editResidentPhoto, fetchCompanyData } from '@/services/geminiService';
import { api } from '@/services/api'; 
import { IDCard } from '@/components/IDCard';
import { TemplateEditor } from '@/components/TemplateEditor';
import { RegistrationStatusPanel } from '@/components/RegistrationStatusPanel';
import { ResidentsListView } from '@/components/ResidentsListView';
import { UsersListView } from '@/components/UsersListView';
import { SystemSettingsView } from '@/components/SystemSettingsView';
import { Tooltip } from '@/components/Tooltip';
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

  // --- CUSTOM TEMPLATE STATES ---
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [selectedCustomTemplate, setSelectedCustomTemplate] = useState<CustomTemplate | undefined>(undefined);

  // --- SESSION & INITIAL DATA ---
  useEffect(() => {
    // 1. Check Backend Connection
    const checkConnection = async () => {
        const connected = await api.checkBackendConnection();
        setIsBackendConnected(connected);
    };
    checkConnection();

    // 2. Restore Session
    const savedSession = localStorage.getItem('sie_session');
    if (savedSession) {
        try {
            const user = JSON.parse(savedSession);
            setCurrentUser(user);
            // If we are at LOGIN view but have a session, go to DASHBOARD
            setView(prev => prev === AppView.LOGIN ? AppView.DASHBOARD : prev);
        } catch(e) { 
            localStorage.removeItem('sie_session'); 
        }
    }
  }, []);

  // --- VIEW DATA LOADING ---
  useEffect(() => {
    if (!currentUser) return; // Only load data if logged in

    if (view === AppView.RESIDENTS_LIST || view === AppView.DASHBOARD) {
        loadResidents();
    }
    if (view === AppView.USERS_LIST) {
        loadUsers();
    }
    if (view === AppView.LOGIN || view === AppView.ID_GENERATOR || view === AppView.SYSTEM_SETTINGS) {
        loadSettings();
        loadRoles();
        loadTemplates(); // Load custom templates when needed
    }
  }, [view, currentUser]);

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

  const loadTemplates = async () => {
      try {
          const data = await api.getTemplates();
          setCustomTemplates(data);
      } catch (e) { console.error("Failed to load templates", e); }
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
    return (saved === 'CLASSIC' || saved === 'MODERN' || saved === 'MINIMAL' || saved === 'CUSTOM') ? saved as IDTemplate : 'CLASSIC';
  });
  
  const [photoSettings, setPhotoSettings] = useState<PhotoSettings>({ zoom: 1, x: 0, y: 0 });

  // --- AI Features State ---
  const [uploadedPhotoBase64, setUploadedPhotoBase64] = useState<string | null>(null);
  const [uploadedPhotoMimeType, setUploadedPhotoMimeType] = useState<string>('image/jpeg');
  const [editPrompt, setEditPrompt] = useState<string>("Remover fundo original. Adicionar fundo branco sólido. Melhorar iluminação para estilo estúdio. Centralizar rosto e ombros sem cortar o topo da cabeça. Estilo foto 3x4 oficial.");
  
  const idCardRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---

  const handleTemplateChange = (newTemplate: IDTemplate, customData?: CustomTemplate) => {
    setTemplate(newTemplate);
    if(newTemplate === 'CUSTOM' && customData) {
        setSelectedCustomTemplate(customData);
    } else {
        setSelectedCustomTemplate(undefined);
    }
    localStorage.setItem('sie_preferred_template', newTemplate);
  };

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      
      try {
          const user = await api.login(loginForm.user, loginForm.pass);
          if (user) {
              const sessionUser = { name: user.name, role: user.role };
              setCurrentUser(sessionUser);
              localStorage.setItem('sie_session', JSON.stringify(sessionUser)); // Persist session
              setView(AppView.DASHBOARD);
          } else {
              setLoginError("Credenciais inválidas.");
          }
      } catch (e) {
          setLoginError("Erro ao conectar ao servidor.");
      }
  };

  const handleLogout = () => {
      localStorage.removeItem('sie_session');
      setCurrentUser(null);
      setLoginForm({ user: '', pass: '' });
      setView(AppView.LOGIN);
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
        } catch (error: any) {
            console.error(error);
            const msg = error?.message || 'Erro desconhecido';
            alert(`Falha ao analisar documento: ${msg}`);
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
    
    // Agora o sistema valida a chave dinamicamente dentro do geminiService.ts
    // Se não houver chave no banco, o getAI() lançará um erro claro.

    setStatus({ ...status, isEditingPhoto: true, message: 'Processando foto oficial (Gemini Nano Banana)...' });
    try {
      const newImage = await editResidentPhoto(uploadedPhotoBase64, editPrompt, uploadedPhotoMimeType);
      setResident(prev => ({ ...prev, photoUrl: newImage }));
      setUploadedPhotoBase64(newImage.split(',')[1]); 
      setUploadedPhotoMimeType('image/png'); 
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Erro desconhecido';
      alert(`Erro na edição da imagem: ${msg}`);
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
          const data = fetchCompanyData(associationData.cnpj);
          const resolvedData = await data;
          if (resolvedData) {
              setAssociationData(prev => ({
                  ...prev,
                  companyName: resolvedData.companyName || prev.companyName,
                  address: {
                      street: resolvedData.street || prev.address.street,
                      number: resolvedData.number || prev.address.number,
                      city: resolvedData.city || prev.address.city,
                      state: resolvedData.state || prev.address.state,
                      zip: resolvedData.zip || prev.address.zip
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
                  </form>
                  <p className="text-center text-[10px] text-gray-600 mt-4">Dica: admin / admin</p>
              </div>
          </div>
      )
  }

  // --- ACCESS DENIED GUARD ---
  if ((view === AppView.USERS_LIST || view === AppView.SYSTEM_SETTINGS || view === AppView.TEMPLATE_EDITOR) && currentUser?.role !== 'ADMIN') {
      return (
          <div className="min-h-screen bg-brand-primary flex flex-col items-center justify-center text-red-500 p-8 text-center">
              <ShieldCheck size={64} className="mb-4 text-brand-accent opacity-50" />
              <h1 className="text-2xl font-bold mb-2 text-white">Acesso Negado</h1>
              <p className="text-gray-400 mb-6">Você não tem permissão para acessar este módulo administrativo.</p>
              <button onClick={() => setView(AppView.DASHBOARD)} className="bg-brand-secondary hover:bg-brand-accent/20 px-6 py-2 rounded-lg text-white border border-gray-700">
                  Voltar ao Dashboard
              </button>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-brand-light bg-brand-dark">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-brand-primary border-r border-brand-secondary flex flex-col shrink-0 z-20">
        <div className="p-6 border-b border-brand-secondary">
          <h1 className="text-xl font-bold text-white tracking-widest flex items-center gap-2">
            <ShieldCheck className="text-brand-accent" /> S.I.E.
          </h1>
          <div className="mt-2">
            <p className="text-xs text-white font-medium">{currentUser?.name}</p>
            <p className="text-[10px] text-brand-accent opacity-80 uppercase tracking-wider">{currentUser?.role === 'ADMIN' ? 'Administrador' : 'Operador'}</p>
            <div className="flex items-center gap-1 mt-1">
                {isBackendConnected ? <Wifi size={10} className="text-green-500"/> : <WifiOff size={10} className="text-orange-500"/>}
                <span className={`text-[9px] font-mono ${isBackendConnected ? 'text-green-600' : 'text-orange-500'}`}>
                    {isBackendConnected ? 'Online (MySQL)' : 'Modo Offline (Local)'}
                </span>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {/* ... Navigation Buttons ... */}
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
                <Tooltip text="Criar e editar templates de carteirinha">
                    <button onClick={() => setView(AppView.TEMPLATE_EDITOR)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${view === AppView.TEMPLATE_EDITOR ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'hover:bg-brand-secondary'}`}>
                        <Palette size={18} /> Templates ID
                    </button>
                </Tooltip>
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
         
         <div className="p-4 border-t border-brand-secondary">
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded transition">
                 <LogOut size={12} /> Sair do Sistema
             </button>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {view !== AppView.TEMPLATE_EDITOR && (
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
        )}

        {view === AppView.TEMPLATE_EDITOR && (
            <TemplateEditor onBack={() => setView(AppView.DASHBOARD)} />
        )}

        {view === AppView.USERS_LIST && <UsersListView systemUsers={systemUsers} refreshUsers={loadUsers} />}
        
        {view === AppView.SYSTEM_SETTINGS && (
            <SystemSettingsView 
                associationData={associationData}
                setAssociationData={setAssociationData}
                organizationLogo={organizationLogo}
                handleLogoUpload={handleLogoUpload}
                handleCnpjLookup={handleCnpjLookup}
                status={status}
                onSave={handleAssociationSave}
            />
        )}

        {view === AppView.RESIDENTS_LIST && (
            <ResidentsListView 
                residentsList={residentsList}
                onEdit={handleEditResident}
                onDelete={handleDeleteResident}
                onNew={handleNewResident}
            />
        )}

        {view === AppView.ID_GENERATOR && (
            <div className="p-4 lg:p-8 grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1600px] mx-auto">
                
                {/* Left Column: Scanner + Form */}
                <div className="xl:col-span-5 space-y-6">
                    {/* Scanner Card */}
                    <div className="bg-brand-secondary rounded-xl p-6 border border-brand-secondary shadow-lg">
                        <h3 className="text-white font-medium flex items-center gap-2 text-sm uppercase tracking-wide mb-4">
                            <ShieldCheck size={16} className="text-brand-accent"/> Dados Cadastrais
                        </h3>
                        
                        {/* Scanner Input */}
                        <div className="mb-6 bg-brand-primary/50 p-4 rounded-lg border border-dashed border-gray-600 hover:border-brand-accent transition-colors group">
                            <label className="cursor-pointer flex flex-col items-center gap-2">
                                <div className="p-3 bg-brand-secondary rounded-full group-hover:bg-brand-accent/20 transition-colors">
                                    <Search className="text-gray-400 group-hover:text-brand-accent" size={24} />
                                </div>
                                <span className="text-xs text-gray-400 font-medium group-hover:text-white">Escanear Documento (IA)</span>
                                <input type="file" accept="image/*" onChange={handleDocumentScan} className="hidden" />
                            </label>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Nome Completo</label>
                                <input 
                                    value={resident.name} 
                                    onChange={e => setResident({...resident, name: e.target.value})}
                                    className="w-full bg-brand-primary border border-gray-700 rounded p-2.5 text-white text-sm focus:border-brand-accent outline-none font-bold"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">CPF</label>
                                    <input 
                                        value={resident.cpf} 
                                        onChange={e => setResident({...resident, cpf: e.target.value})}
                                        className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm focus:border-brand-accent outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">RG</label>
                                    <input 
                                        value={resident.rg} 
                                        onChange={e => setResident({...resident, rg: e.target.value})}
                                        className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm focus:border-brand-accent outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Cargo / Função</label>
                                    <div className="relative">
                                        <input 
                                            list="roles-list"
                                            value={resident.role}
                                            onChange={handleRoleChange}
                                            className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm focus:border-brand-accent outline-none"
                                        />
                                        <datalist id="roles-list">
                                            {availableRoles.map(role => <option key={role} value={role} />)}
                                        </datalist>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Data Nascimento</label>
                                    <input 
                                        value={resident.birthDate} 
                                        onChange={e => setResident({...resident, birthDate: e.target.value})}
                                        placeholder="DD/MM/AAAA"
                                        className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm focus:border-brand-accent outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Endereço</label>
                                <input 
                                    value={resident.address} 
                                    onChange={e => setResident({...resident, address: e.target.value})}
                                    className="w-full bg-brand-primary border border-gray-700 rounded p-2 text-white text-sm focus:border-brand-accent outline-none"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Tooltip text="Salvar dados no banco">
                                    <button onClick={handleSaveResident} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all">
                                        <Save size={18} /> Salvar
                                    </button>
                                </Tooltip>
                                <Tooltip text="Limpar formulário">
                                    <button onClick={handleNewResident} className="px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                                        <Plus size={18} />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                    
                    {/* Registration Status */}
                    <RegistrationStatusPanel resident={resident} />
                </div>

                <div className="xl:col-span-7 space-y-6 flex flex-col">
                    <div className="bg-brand-secondary rounded-xl p-6 border border-brand-secondary flex flex-col items-center shadow-2xl relative overflow-hidden">
                        
                        <h3 className="text-white font-medium flex items-center gap-2 text-sm uppercase tracking-wide mb-6 w-full">
                            <LayoutTemplate size={16} className="text-brand-accent" /> Visualização
                        </h3>

                        <Tooltip text="A carteirinha é interativa! Clique nos textos para editar">
                            <div className="transform hover:scale-[1.02] transition-transform duration-300 shadow-2xl shadow-black/50 rounded-xl cursor-text">
                                <IDCard 
                                    resident={resident} 
                                    template={template} 
                                    customTemplateData={selectedCustomTemplate} // PASSING CUSTOM DATA
                                    photoSettings={photoSettings} 
                                    organizationLogo={organizationLogo} 
                                    associationData={associationData}
                                    idRef={idCardRef}
                                    onUpdate={handleCardUpdate}
                                />
                            </div>
                        </Tooltip>

                        {/* Template Selector with Dynamic Custom Templates */}
                        <div className="mt-8 w-full max-w-md">
                            <label className="text-[10px] text-gray-400 uppercase font-bold block mb-2 text-center">Modelo de Design</label>
                            <div className="flex bg-brand-primary p-1.5 rounded-lg border border-gray-700 flex-wrap gap-1">
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
                            
                            {/* Custom Templates List */}
                            {customTemplates.length > 0 && (
                                <div className="mt-2 border-t border-gray-700 pt-2">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1 text-center">Personalizados</label>
                                    <div className="flex flex-wrap gap-1 justify-center">
                                        {customTemplates.map(ct => (
                                             <button 
                                                key={ct.id}
                                                onClick={() => handleTemplateChange('CUSTOM', ct)} 
                                                className={`text-xs px-3 py-1 rounded-full border transition-all ${selectedCustomTemplate?.id === ct.id && template === 'CUSTOM' ? 'bg-purple-600 text-white border-purple-400' : 'bg-brand-primary text-gray-400 border-gray-600 hover:border-white'}`}
                                            >
                                                {ct.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
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
                     
                    {/* Photo Studio */}
                    <div className="bg-brand-secondary rounded-xl p-6 border border-brand-secondary shadow-lg">
                        <h3 className="text-white font-medium flex items-center gap-2 text-sm uppercase tracking-wide mb-6">
                            <Sparkles size={16} className="text-brand-accent" /> Estúdio Fotográfico IA
                        </h3>

                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Upload Area */}
                            <div className="flex-1">
                                {!uploadedPhotoBase64 ? (
                                    <label className="h-48 w-full border-2 border-dashed border-gray-600 hover:border-brand-accent rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-brand-primary/30">
                                        <Upload className="text-gray-500 mb-2" size={32} />
                                        <span className="text-xs text-gray-400 font-bold uppercase">Carregar Foto</span>
                                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                    </label>
                                ) : (
                                    <div className="relative h-48 w-full bg-black rounded-xl overflow-hidden border border-gray-700 group">
                                        <img src={`data:${uploadedPhotoMimeType};base64,${uploadedPhotoBase64}`} className="w-full h-full object-contain" alt="Upload" />
                                        <button 
                                            onClick={() => setUploadedPhotoBase64(null)} 
                                            className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="flex-1 space-y-4">
                                <div className="bg-brand-primary/50 p-4 rounded-lg border border-gray-700">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-3">Ajustes Manuais</p>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                                <span>Zoom</span>
                                                <span>{photoSettings.zoom.toFixed(1)}x</span>
                                            </div>
                                            <input 
                                                type="range" min="0.5" max="3" step="0.1" 
                                                value={photoSettings.zoom} 
                                                onChange={e => setPhotoSettings({...photoSettings, zoom: parseFloat(e.target.value)})}
                                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-accent"
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] text-gray-500 block mb-1">Posição X</label>
                                                <input 
                                                    type="number" 
                                                    value={photoSettings.x} 
                                                    onChange={e => setPhotoSettings({...photoSettings, x: parseInt(e.target.value)})}
                                                    className="w-full bg-brand-primary border border-gray-600 rounded p-1 text-xs text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 block mb-1">Posição Y</label>
                                                <input 
                                                    type="number" 
                                                    value={photoSettings.y} 
                                                    onChange={e => setPhotoSettings({...photoSettings, y: parseInt(e.target.value)})}
                                                    className="w-full bg-brand-primary border border-gray-600 rounded p-1 text-xs text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {uploadedPhotoBase64 && (
                                    <Tooltip text="Remover fundo, ajustar iluminação e enquadrar automaticamente">
                                        <button 
                                            onClick={handleEditPhoto} 
                                            disabled={status.isEditingPhoto}
                                            className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${status.isEditingPhoto ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
                                        >
                                            {status.isEditingPhoto ? (
                                                <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> Processando...</>
                                            ) : (
                                                <><Sparkles size={16} /> Foto Oficial IA (Auto)</>
                                            )}
                                        </button>
                                    </Tooltip>
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
    </div>
  );
};

export default App;
