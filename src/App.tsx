
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Upload, FileText, Download, ShieldCheck, User as UserIcon, Settings, Lock, LayoutTemplate, Image as ImageIcon, FileImage, BarChart3, Users, Search, Plus, Save, X, Building, Wifi, WifiOff, LogOut, Palette, Camera, Video, MessageSquare, Info, Menu, Fingerprint, Wand2 } from 'lucide-react';
import { Resident, ProcessingStatus, AppView, IDTemplate, PhotoSettings, User, SystemUser, AssociationData, CustomTemplate } from '@/types';
import { analyzeDocumentText, editResidentPhoto, fetchCompanyData, deepAnalyzeDocument, validateApiKey } from '@/services/geminiService';
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
  const [isAiReady, setIsAiReady] = useState<boolean>(false);

  // --- App State ---
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
  const defaultRoles = ['Morador', 'Presidente', 'Vice-Presidente', 'Tesoureiro', 'Secretário', 'Diretor', 'Sócio Benemérito'];
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

    // 2. Check AI Capability
    const checkAi = async () => {
        const key = await api.getActiveApiKey();
        if(key) {
            const valid = await validateApiKey(key);
            setIsAiReady(valid);
        }
    };
    checkAi();

    // 3. Restore Session
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
    
    // Close mobile menu on view change
    setIsMobileMenuOpen(false);

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

  // --- AI & Camera Features State ---
  const [studioMode, setStudioMode] = useState<'UPLOAD' | 'GENERATE'>('UPLOAD');
  const [uploadedPhotoBase64, setUploadedPhotoBase64] = useState<string | null>(null);
  const [uploadedPhotoMimeType, setUploadedPhotoMimeType] = useState<string>('image/jpeg');
  
  // Base technical prompt for ID cards
  const baseEditPrompt = "Foto de identificação profissional (ID Card). Fundo branco sólido perfeito. Iluminação suave de estúdio, sem sombras no rosto. Rosto centralizado e nítido. Alta resolução. Aparência formal.";
  const [additionalPrompt, setAdditionalPrompt] = useState<string>("");
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const idCardRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---

  const handleStartCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setIsCameraOpen(true);
          streamRef.current = stream;
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }
          setTimeout(() => {
              if (videoRef.current) videoRef.current.srcObject = stream;
          }, 100);
      } catch (err) {
          console.error("Erro ao acessar câmera:", err);
          alert("Não foi possível acessar a câmera. Verifique as permissões.");
      }
  };

  const handleStopCamera = () => {
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
      setIsCameraOpen(false);
  };

  const handleCapturePhoto = () => {
      if (videoRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/png');
              const base64 = dataUrl.split(',')[1];
              
              setUploadedPhotoBase64(base64);
              setUploadedPhotoMimeType('image/png');
              setResident(prev => ({ ...prev, photoUrl: dataUrl }));
              setPhotoSettings({ zoom: 1, x: 0, y: 0 });
              
              handleStopCamera();
          }
      }
  };

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
        const result = await api.saveResident(resident);
        
        // FEEDBACK DE ONDE FOI SALVO
        if (result.offline) {
            alert("⚠️ Atenção: Conexão com servidor instável. Cadastro salvo LOCALMENTE (Offline). Verifique sua conexão.");
        } else {
            alert("✅ Sucesso: Cadastro salvo no Banco de Dados (MySQL)!");
        }
        
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
      setAdditionalPrompt("");
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
            // Store for potential deep analysis
            setUploadedPhotoBase64(base64); 
        } catch (error: any) {
            console.error(error);
            const msg = error?.message || 'Erro desconhecido';
            alert(`Falha ao analisar documento: ${msg}`);
        } finally {
            setStatus({ ...status, isAnalyzing: false, message: '' });
        }
    }
  };

  const handleDeepAnalyze = async () => {
      if (!uploadedPhotoBase64) return alert("Escaneie ou carregue um documento primeiro.");
      setStatus({ ...status, isAnalyzing: true, message: 'Realizando análise forense (Gemini 3 Pro)...' });
      try {
          const result = await deepAnalyzeDocument(uploadedPhotoBase64);
          alert(`RELATÓRIO DE ANÁLISE:\n\n${result}`);
      } catch (e) {
          alert("Erro na análise profunda.");
      } finally {
          setStatus({ ...status, isAnalyzing: false, message: '' });
      }
  }

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
    
    if (!isAiReady) {
        alert("Atenção: O sistema de IA parece indisponível. Verifique a Chave API nas Configurações.");
    }

    // Combine base prompt with user additions
    const finalPrompt = additionalPrompt.trim() 
        ? `${baseEditPrompt} Instruções adicionais específicas do usuário: ${additionalPrompt}` 
        : baseEditPrompt;

    setStatus({ ...status, isEditingPhoto: true, message: 'Processando foto (Gemini 3 Pro + Fallback)...' });
    try {
      const newImage = await editResidentPhoto(uploadedPhotoBase64, finalPrompt, uploadedPhotoMimeType);
      setResident(prev => ({ ...prev, photoUrl: newImage }));
      setUploadedPhotoBase64(newImage.split(',')[1]); 
      setUploadedPhotoMimeType('image/png'); 
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Erro desconhecido';
      if (msg.includes("API_KEY_MISSING")) {
          alert(`Erro Crítico: Nenhuma Chave de API ativa. Acesse 'Sistema' para configurar.`);
      } else {
          alert(`Falha na edição: ${msg}`);
      }
    } finally {
      setStatus({ ...status, isEditingPhoto: false, message: '' });
    }
  };

  const getCleanImage = async () => {
      if (!idCardRef.current) return null;
      // CRITICAL FIX: html2canvas doesn't read input values correctly unless we replace them with text
      return html2canvas(idCardRef.current, { 
          scale: 3, 
          backgroundColor: '#ffffff', 
          useCORS: true,
          logging: false,
          onclone: (clonedDoc) => {
              // Find all inputs in the cloned ID card
              const inputs = clonedDoc.querySelectorAll('input');
              inputs.forEach((input) => {
                  // Create a text node or span with the current value
                  const span = clonedDoc.createElement('span');
                  span.textContent = input.value;
                  // Copy styles to match
                  const style = window.getComputedStyle(input);
                  span.style.cssText = style.cssText;
                  span.style.border = 'none';
                  span.style.background = 'transparent';
                  span.style.display = 'flex';
                  span.style.alignItems = 'center';
                  span.style.height = '100%';
                  // Replace input with span
                  input.parentNode?.replaceChild(span, input);
              });
          }
      });
  };

  const handlePrint = async () => {
      if (!idCardRef.current) return;
      
      try {
          // Use the clean image generator
          const canvas = await getCleanImage();
          if(!canvas) return;

          const imgData = canvas.toDataURL('image/png');
          
          // Open print window
          const printWindow = window.open('', '_blank', 'width=800,height=600');
          if (printWindow) {
              printWindow.document.write(`
                  <html>
                      <head>
                          <title>Imprimir Carteirinha - S.I.E.</title>
                          <style>
                              body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                              img { max-width: 100%; height: auto; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                              @media print { body { display: block; } img { box-shadow: none; } }
                          </style>
                      </head>
                      <body>
                          <img src="${imgData}" onload="window.print();" />
                      </body>
                  </html>
              `);
              printWindow.document.close();
          }
      } catch (e) {
          console.error("Erro na impressão", e);
          alert("Erro ao preparar impressão.");
      }
  };

  const handleDownloadJPG = async () => {
      if (!idCardRef.current) return;
      try {
          const canvas = await getCleanImage();
          if(!canvas) return;

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
          const result = await api.saveSettings(associationData, organizationLogo);
          if (result.offline) {
              alert("⚠️ Aviso: Dados salvos LOCALMENTE (Offline). Conexão com servidor indisponível.");
          } else {
              alert("✅ Dados da Associação salvos com sucesso no Servidor!");
          }
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
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-brand-secondary border-b border-brand-primary sticky top-0 z-50">
          <div className="flex items-center gap-2">
             <ShieldCheck className="text-brand-accent" size={20} />
             <span className="font-bold text-white tracking-widest">S.I.E.</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
             {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
      )}

      {/* Sidebar (Responsive Drawer) */}
      <aside className={`
          fixed md:relative top-0 left-0 h-full w-64 bg-brand-primary border-r border-brand-secondary 
          flex flex-col shrink-0 z-40 transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          pt-16 md:pt-0
      `}>
        <div className="p-6 border-b border-brand-secondary hidden md:block">
          <h1 className="text-xl font-bold text-white tracking-widest flex items-center gap-2">
            <ShieldCheck className="text-brand-accent" /> S.I.E.
          </h1>
          <div className="mt-2">
            <p className="text-xs text-white font-medium">{currentUser?.name}</p>
            <p className="text-[10px] text-brand-accent opacity-80 uppercase tracking-wider">{currentUser?.role === 'ADMIN' ? 'Administrador' : 'Operador'}</p>
            <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-1">
                    {isBackendConnected ? <Wifi size={10} className="text-green-500"/> : <WifiOff size={10} className="text-orange-500"/>}
                    <span className={`text-[9px] font-mono ${isBackendConnected ? 'text-green-600' : 'text-orange-500'}`}>
                        {isBackendConnected ? 'DB Online' : 'DB Offline'}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Sparkles size={10} className={isAiReady ? "text-purple-500" : "text-gray-500"}/>
                    <span className={`text-[9px] font-mono ${isAiReady ? 'text-purple-400' : 'text-gray-500'}`}>
                        {isAiReady ? 'IA Pronta' : 'IA Inativa'}
                    </span>
                </div>
            </div>
          </div>
        </div>
        
        {/* Mobile User Info in Drawer */}
        <div className="p-6 border-b border-brand-secondary md:hidden bg-brand-secondary/30">
            <p className="text-xs text-white font-medium">{currentUser?.name}</p>
            <p className="text-[10px] text-brand-accent opacity-80 uppercase tracking-wider">{currentUser?.role}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* ... Navigation Buttons ... */}
          <button onClick={() => setView(AppView.DASHBOARD)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${view === AppView.DASHBOARD ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'hover:bg-brand-secondary'}`}>
            <BarChart3 size={18} /> Dashboard
          </button>
          
          <div className="pt-4 pb-1 pl-4 text-[10px] uppercase text-gray-500 font-bold">Módulos</div>
          
          <button onClick={() => setView(AppView.RESIDENTS_LIST)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${view === AppView.RESIDENTS_LIST ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'hover:bg-brand-secondary'}`}>
                <Users size={18} /> Cadastros
            </button>
          
          <button onClick={() => setView(AppView.ID_GENERATOR)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${view === AppView.ID_GENERATOR ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'hover:bg-brand-secondary'}`}>
                <FileText size={18} /> Editor de ID
            </button>

          {currentUser?.role === 'ADMIN' && (
              <>
                <div className="pt-4 pb-1 pl-4 text-[10px] uppercase text-gray-500 font-bold">Administração</div>
                <button onClick={() => setView(AppView.TEMPLATE_EDITOR)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${view === AppView.TEMPLATE_EDITOR ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'hover:bg-brand-secondary'}`}>
                    <Palette size={18} /> Templates ID
                </button>
                <button onClick={() => setView(AppView.SYSTEM_SETTINGS)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${view === AppView.SYSTEM_SETTINGS ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'hover:bg-brand-secondary'}`}>
                    <Building size={18} /> Sistema
                </button>
                <button onClick={() => setView(AppView.USERS_LIST)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${view === AppView.USERS_LIST ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'hover:bg-brand-secondary'}`}>
                    <Settings size={18} /> Usuários
                </button>
              </>
          )}
        </nav>
         
         <div className="p-4 border-t border-brand-secondary">
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded transition">
                 <LogOut size={12} /> Sair
             </button>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-60px)] md:h-screen">
        {view !== AppView.TEMPLATE_EDITOR && (
             <header className="hidden md:flex h-16 border-b border-brand-secondary items-center justify-between px-8 bg-brand-primary/50 backdrop-blur-md sticky top-0 z-30">
                <h2 className="text-lg font-semibold text-white">
                    {view === AppView.ID_GENERATOR && 'Central de Identificação - AMC'}
                    {view === AppView.RESIDENTS_LIST && 'Banco de Dados: Moradores'}
                    {view === AppView.USERS_LIST && 'Controle de Acesso'}
                    {view === AppView.SYSTEM_SETTINGS && 'Configuração do Sistema'}
                    {view === AppView.DASHBOARD && 'Dashboard Geral'}
                </h2>
                <Tooltip text="Mecanismo de IA Google Gemini operando">
                    <span className={`text-xs px-3 py-1 rounded-full border font-mono flex items-center gap-2 ${isAiReady ? 'bg-green-900/30 border-green-500/30 text-green-400' : 'bg-red-900/30 border-red-500/30 text-red-400'}`}>
                        <Sparkles size={10}/> {isAiReady ? 'Sistema Inteligente Ativo' : 'IA Indisponível'}
                    </span>
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
                availableRoles={availableRoles}
            />
        )}

        {view === AppView.ID_GENERATOR && (
            <div className="p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-6 max-w-[1600px] mx-auto pb-20">
                
                {/* Left Column: Scanner + Form */}
                <div className="xl:col-span-5 space-y-6">
                    {/* Scanner Card */}
                    <div className="bg-brand-secondary rounded-xl p-6 border border-brand-secondary shadow-lg">
                        <h3 className="text-white font-medium flex items-center gap-2 text-sm uppercase tracking-wide mb-4">
                            <ShieldCheck size={16} className="text-brand-accent"/> Dados Cadastrais
                        </h3>
                        
                        {/* Scanner Input */}
                        <div className="mb-4 bg-brand-primary/50 p-4 rounded-lg border border-dashed border-gray-600 hover:border-brand-accent transition-colors group">
                            <label className="cursor-pointer flex flex-col items-center gap-2">
                                <div className="p-3 bg-brand-secondary rounded-full group-hover:bg-brand-accent/20 transition-colors">
                                    <Search className="text-gray-400 group-hover:text-brand-accent" size={24} />
                                </div>
                                <span className="text-xs text-gray-400 font-medium group-hover:text-white text-center">Escanear Documento (OCR)</span>
                                <input type="file" accept="image/*" onChange={handleDocumentScan} className="hidden" />
                            </label>
                        </div>

                        {/* Deep Analysis Button */}
                        {uploadedPhotoBase64 && (
                            <Tooltip text="Usa Gemini 3 Pro para buscar sinais de fraude, datas alteradas ou fontes suspeitas no documento.">
                                <button onClick={handleDeepAnalyze} disabled={status.isAnalyzing} className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 text-red-300 py-2 rounded-lg text-xs flex items-center justify-center gap-2 mb-6 transition-all">
                                    {status.isAnalyzing ? <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"/> : <Fingerprint size={14} />}
                                    Verificar Autenticidade (IA Pro)
                                </button>
                            </Tooltip>
                        )}

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
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                            <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                <Tooltip text="Salvar dados no banco">
                                    <button onClick={handleSaveResident} className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all">
                                        <Save size={18} /> Salvar
                                    </button>
                                </Tooltip>
                                <Tooltip text="Limpar formulário">
                                    <button onClick={handleNewResident} className="w-full sm:w-auto px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex justify-center items-center">
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
                            <div className="w-full overflow-x-auto flex justify-center py-2 px-1">
                                <div className="transform hover:scale-[1.02] transition-transform duration-300 shadow-2xl shadow-black/50 rounded-xl cursor-text shrink-0">
                                    <IDCard 
                                        resident={resident} 
                                        template={template} 
                                        customTemplateData={selectedCustomTemplate} // PASSING CUSTOM DATA
                                        photoSettings={photoSettings} 
                                        organizationLogo={organizationLogo} 
                                        associationData={associationData}
                                        idRef={idCardRef}
                                        onUpdate={handleCardUpdate}
                                        onPhotoChange={setPhotoSettings} // Enable Interactive Zoom/Pan
                                    />
                                </div>
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
                                            className={`flex-1 min-w-[80px] text-xs px-2 py-2 rounded-md transition-all font-medium ${template === t ? 'bg-brand-accent text-brand-dark shadow' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
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
                        <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-md">
                            <Tooltip text="Imprimir documento limpo">
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
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-medium flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Sparkles size={16} className="text-brand-accent" /> Estúdio Fotográfico IA
                            </h3>
                            <div className="flex bg-brand-primary rounded-lg p-1 gap-1">
                                <button onClick={() => setStudioMode('UPLOAD')} className={`p-1.5 rounded ${studioMode === 'UPLOAD' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`} title="Upload/Câmera"><Upload size={14}/></button>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Upload Area / Camera */}
                            <div className="flex-1">
                                {!uploadedPhotoBase64 && !isCameraOpen ? (
                                    <div className="h-48 w-full flex gap-2">
                                        <label className="flex-1 border-2 border-dashed border-gray-600 hover:border-brand-accent rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-brand-primary/30">
                                            <Upload className="text-gray-500 mb-2" size={32} />
                                            <span className="text-xs text-gray-400 font-bold uppercase text-center">Carregar Foto</span>
                                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                        </label>
                                        <button onClick={handleStartCamera} className="w-20 border-2 border-dashed border-gray-600 hover:border-brand-accent rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-brand-primary/30">
                                            <Camera className="text-gray-500 mb-2" size={24} />
                                            <span className="text-[10px] text-gray-400 font-bold uppercase text-center">Câmera</span>
                                        </button>
                                    </div>
                                ) : isCameraOpen ? (
                                        <div className="relative h-48 w-full bg-black rounded-xl overflow-hidden border border-gray-700 flex flex-col items-center justify-center">
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                        <div className="absolute bottom-2 flex gap-2">
                                            <button onClick={handleCapturePhoto} className="bg-white text-black px-4 py-1 rounded-full text-xs font-bold shadow-lg hover:bg-gray-200">
                                                Capturar
                                            </button>
                                            <button onClick={handleStopCamera} className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg hover:bg-red-500">
                                                Cancelar
                                            </button>
                                        </div>
                                        </div>
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
                                    <div className="space-y-3">
                                        <div className="bg-brand-primary/30 p-3 rounded border border-gray-600/50">
                                            <p className="text-[10px] text-brand-accent font-bold mb-1 uppercase flex items-center gap-1">
                                                <Info size={10}/> Padrão Aplicado (Auto)
                                            </p>
                                            <p className="text-[9px] text-gray-500 italic leading-tight">
                                                "Fundo branco sólido, enquadramento de rosto oficial (3x4), iluminação de estúdio."
                                            </p>
                                        </div>

                                        <div>
                                            <label className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 font-bold">
                                                <MessageSquare size={10}/> Ajustes Específicos (Opcional)
                                            </label>
                                            <textarea 
                                                value={additionalPrompt}
                                                onChange={e => setAdditionalPrompt(e.target.value)}
                                                placeholder="Ex: Corrigir olhos vermelhos, suavizar pele, remover óculos..."
                                                className="w-full bg-brand-primary border border-gray-600 rounded p-2 text-xs text-white focus:border-brand-accent outline-none resize-none h-14"
                                            />
                                        </div>

                                        <Tooltip text="Aplica o padrão oficial + seus ajustes específicos usando IA (Gemini 3 Pro/Flash)">
                                            <button 
                                                onClick={handleEditPhoto} 
                                                disabled={status.isEditingPhoto}
                                                className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${status.isEditingPhoto ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
                                            >
                                                {status.isEditingPhoto ? (
                                                    <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> Processando...</>
                                                ) : (
                                                    <><Sparkles size={16} /> Gerar Foto Oficial</>
                                                )}
                                            </button>
                                        </Tooltip>
                                        {!isAiReady && <p className="text-[10px] text-red-400 text-center mt-1">IA Indisponível - Verifique Chave API</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {view === AppView.DASHBOARD && (
             <div className="h-full flex items-center justify-center text-gray-500 p-4">
                <div className="text-center w-full max-w-lg">
                    <BarChart3 size={64} className="mx-auto mb-4 opacity-20" />
                    <h3 className="text-xl text-white mb-2">Dashboard Geral</h3>
                    <p className="mb-8">S.I.E. Conectado: {isBackendConnected ? "MySQL Database Active" : "Modo Offline (Fallback)"}</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => setView(AppView.RESIDENTS_LIST)} className="bg-brand-secondary hover:bg-brand-accent/20 px-6 py-4 rounded-lg flex flex-col items-center gap-2 border border-gray-700 transition w-full sm:w-auto">
                            <Users size={24} className="text-brand-accent"/>
                            <span className="text-sm font-bold text-white">Gerenciar Cadastros</span>
                        </button>
                         <button onClick={() => setView(AppView.ID_GENERATOR)} className="bg-brand-secondary hover:bg-brand-accent/20 px-6 py-4 rounded-lg flex flex-col items-center gap-2 border border-gray-700 transition w-full sm:w-auto">
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
