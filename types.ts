
export interface Resident {
  id: string;
  name: string;
  role: string; // Morador, Diretor, etc.
  cpf: string;
  rg: string;
  address: string;
  birthDate: string;
  registrationDate: string;
  photoUrl: string | null;
}

export interface ProcessingStatus {
  isAnalyzing: boolean;
  isEditingPhoto: boolean;
  isGeneratingReport: boolean;
  isSearching: boolean;
  message: string;
}

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  ID_GENERATOR = 'ID_GENERATOR',
  RESIDENTS_LIST = 'RESIDENTS_LIST',
  USERS_LIST = 'USERS_LIST',
  SYSTEM_SETTINGS = 'SYSTEM_SETTINGS',
  TEMPLATE_EDITOR = 'TEMPLATE_EDITOR', // Nova view para o editor
  SETTINGS = 'SETTINGS',
}

export type IDTemplate = 'CLASSIC' | 'MODERN' | 'MINIMAL' | 'CUSTOM';

export interface PhotoSettings {
  zoom: number;
  x: number;
  y: number;
}

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: 'ADMIN' | 'OPERADOR';
}

export interface User {
  name: string;
  role: 'ADMIN' | 'OPERADOR';
}

export interface Director {
  id: string;
  name: string;
  title: string;
}

export interface ApiKey {
  id: string;
  label: string;
  key: string; // Mascarada no frontend na listagem, mas usada internamente
  isActive: boolean;
  createdAt: string;
}

export interface AssociationData {
  name: string;
  cnpj: string;
  companyName: string;
  address: {
    street: string;
    number: string;
    city: string;
    state: string;
    zip: string;
  };
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
  };
  management: {
    president: string;
    vicePresident: string;
    treasurer: string;
    secretary: string;
    directors: Director[];
    mandateStart: string;
    mandateEnd: string;
    electionMinutesPdf: string | null;
  };
}

// --- Dynamic Template Types ---

export type ElementType = 'text' | 'field' | 'image' | 'photo' | 'qrcode';

export interface TemplateElement {
  id: string;
  type: ElementType;
  label: string; // Para UI do editor
  field?: keyof Resident | 'mandate' | 'associationName'; // Campo dinâmico
  content?: string; // Texto estático
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  zIndex: number;
}

export interface CustomTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundUrl: string | null;
  elements: TemplateElement[];
  createdAt: string;
}
