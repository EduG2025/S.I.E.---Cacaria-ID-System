
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
  ID_GENERATOR = 'ID_GENERATOR', // Módulo de Edição/Criação
  RESIDENTS_LIST = 'RESIDENTS_LIST', // Novo Módulo Cadastros
  USERS_LIST = 'USERS_LIST', // Novo Módulo Usuários
  SYSTEM_SETTINGS = 'SYSTEM_SETTINGS', // Novo Módulo Sistema
  SETTINGS = 'SETTINGS',
}

export type IDTemplate = 'CLASSIC' | 'MODERN' | 'MINIMAL';

export interface PhotoSettings {
  zoom: number;
  x: number;
  y: number;
}

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  password?: string; // Optional for listing
  role: 'ADMIN' | 'OPERADOR';
}

export interface User {
  name: string;
  role: 'ADMIN' | 'OPERADOR';
}

export interface Director {
  id: string;
  name: string;
  title: string; // e.g. "Diretor Social", "Diretor de Esportes"
}

export interface AssociationData {
  name: string;
  cnpj: string;
  companyName: string; // Razão Social
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
    electionMinutesPdf: string | null; // Base64 of the PDF
  };
}
