
import React from 'react';
import { ShieldCheck, Wifi, WifiOff, Sparkles, LogOut, BarChart3, Users, FileText, Palette, Building, Settings, X, Menu } from 'lucide-react';
import { User, AppView } from '@/types';
import { Tooltip } from './Tooltip';

interface LayoutProps {
    children: React.ReactNode;
    currentUser: User | null;
    isBackendConnected: boolean;
    isAiReady: boolean;
    view: AppView;
    setView: (view: AppView) => void;
    handleLogout: () => void;
    title: string;
}

export const Layout: React.FC<LayoutProps> = ({ 
    children, currentUser, isBackendConnected, isAiReady, view, setView, handleLogout, title 
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const NavButton = ({ targetView, icon: Icon, label, restricted = false }: { targetView: AppView, icon: any, label: string, restricted?: boolean }) => {
        if (restricted && currentUser?.role !== 'ADMIN') return null;
        return (
            <button 
                onClick={() => { setView(targetView); setIsMobileMenuOpen(false); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${view === targetView ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'hover:bg-brand-secondary'}`}
            >
                <Icon size={18} /> {label}
            </button>
        );
    };

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

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            {/* Sidebar */}
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

                {/* Mobile User Info */}
                <div className="p-6 border-b border-brand-secondary md:hidden bg-brand-secondary/30">
                    <p className="text-xs text-white font-medium">{currentUser?.name}</p>
                    <p className="text-[10px] text-brand-accent opacity-80 uppercase tracking-wider">{currentUser?.role}</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <NavButton targetView={AppView.DASHBOARD} icon={BarChart3} label="Dashboard" />
                    
                    <div className="pt-4 pb-1 pl-4 text-[10px] uppercase text-gray-500 font-bold">Módulos</div>
                    <NavButton targetView={AppView.RESIDENTS_LIST} icon={Users} label="Cadastros" />
                    <NavButton targetView={AppView.ID_GENERATOR} icon={FileText} label="Editor de ID" />

                    {currentUser?.role === 'ADMIN' && (
                        <>
                            <div className="pt-4 pb-1 pl-4 text-[10px] uppercase text-gray-500 font-bold">Administração</div>
                            <NavButton targetView={AppView.TEMPLATE_EDITOR} icon={Palette} label="Templates ID" restricted />
                            <NavButton targetView={AppView.SYSTEM_SETTINGS} icon={Building} label="Sistema" restricted />
                            <NavButton targetView={AppView.USERS_LIST} icon={Settings} label="Usuários" restricted />
                        </>
                    )}
                </nav>
                
                <div className="p-4 border-t border-brand-secondary">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded transition">
                        <LogOut size={12} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto h-[calc(100vh-60px)] md:h-screen flex flex-col">
                {view !== AppView.TEMPLATE_EDITOR && (
                    <header className="hidden md:flex h-16 border-b border-brand-secondary items-center justify-between px-8 bg-brand-primary/50 backdrop-blur-md sticky top-0 z-30 shrink-0">
                        <h2 className="text-lg font-semibold text-white">{title}</h2>
                        <Tooltip text="Mecanismo de IA Google Gemini operando">
                            <span className={`text-xs px-3 py-1 rounded-full border font-mono flex items-center gap-2 ${isAiReady ? 'bg-green-900/30 border-green-500/30 text-green-400' : 'bg-red-900/30 border-red-500/30 text-red-400'}`}>
                                <Sparkles size={10}/> {isAiReady ? 'Sistema Inteligente Ativo' : 'IA Indisponível'}
                            </span>
                        </Tooltip>
                    </header>
                )}
                
                <div className="flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
};
