import React, { useState, useRef, useEffect } from 'react';
import { CustomTemplate, TemplateElement, ElementType, Resident } from '@/types';
import { Type, Image as ImageIcon, Trash2, Save, Upload, Layout } from 'lucide-react';
import { api } from '@/services/api';

interface TemplateEditorProps {
    onBack: () => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({ onBack }) => {
    const [templates, setTemplates] = useState<CustomTemplate[]>([]);
    const [currentTemplate, setCurrentTemplate] = useState<CustomTemplate>({
        id: crypto.randomUUID(),
        name: 'Novo Template',
        width: 350,
        height: 220,
        backgroundUrl: null,
        elements: [],
        createdAt: new Date().toISOString()
    });

    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);

    const PRESETS = [
        { name: 'Padrão CR80 (350x220)', width: 350, height: 220 },
        { name: 'Vertical (220x350)', width: 220, height: 350 },
        { name: 'Cartão Visita (350x200)', width: 350, height: 200 },
        { name: 'Credencial (300x450)', width: 300, height: 450 },
        { name: 'Quadrado (350x350)', width: 350, height: 350 },
    ];

    // --- Loading ---
    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await api.getTemplates();
            setTemplates(data);
        } catch (e) { console.error(e); }
    };

    // --- Actions ---

    const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setCurrentTemplate(prev => ({ ...prev, backgroundUrl: ev.target!.result as string }));
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const addElement = (type: ElementType, field?: keyof Resident) => {
        const newEl: TemplateElement = {
            id: crypto.randomUUID(),
            type,
            label: field ? field.toUpperCase() : (type === 'text' ? 'Novo Texto' : 'Elemento'),
            field: field as any,
            content: type === 'text' ? 'Texto Fixo' : undefined,
            x: 20,
            y: 20,
            width: type === 'photo' ? 80 : 150,
            height: type === 'photo' ? 100 : 20,
            fontSize: 10,
            fontFamily: 'Arial',
            color: '#000000',
            fontWeight: 'normal',
            textAlign: 'left',
            zIndex: currentTemplate.elements.length + 1
        };
        setCurrentTemplate(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
        setSelectedElementId(newEl.id);
    };

    const updateElement = (id: string, updates: Partial<TemplateElement>) => {
        setCurrentTemplate(prev => ({
            ...prev,
            elements: prev.elements.map(el => el.id === id ? { ...el, ...updates } : el)
        }));
    };

    const deleteElement = (id: string) => {
        setCurrentTemplate(prev => ({
            ...prev,
            elements: prev.elements.filter(el => el.id !== id)
        }));
        setSelectedElementId(null);
    };

    const handleSave = async () => {
        if (!currentTemplate.name) return alert("Dê um nome ao template");
        setIsSaving(true);
        try {
            // Persistência Híbrida: Tenta Backend (MySQL) -> Fallback LocalStorage
            await api.saveTemplate(currentTemplate);
            
            alert("Template salvo com sucesso!");
            loadTemplates(); // Recarrega a lista lateral
        } catch (e) { 
            alert("Erro ao salvar template");
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const loadTemplateToEdit = (t: CustomTemplate) => {
        setCurrentTemplate(t);
        setSelectedElementId(null);
    };

    const createNew = () => {
        setCurrentTemplate({
            id: crypto.randomUUID(),
            name: 'Novo Template',
            width: 350,
            height: 220,
            backgroundUrl: null,
            elements: [],
            createdAt: new Date().toISOString()
        });
        setSelectedElementId(null);
    }

    // --- Drag & Drop Logic (Simple) ---
    const handleDragStart = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedElementId(id);
        const el = currentTemplate.elements.find(x => x.id === id);
        if (!el || !canvasRef.current) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const startElX = el.x;
        const startElY = el.y;

        const handleMouseMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            updateElement(id, { x: startElX + dx, y: startElY + dy });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const selectedElement = currentTemplate.elements.find(el => el.id === selectedElementId);

    const applyPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const preset = PRESETS.find(p => p.name === e.target.value);
        if (preset) {
            setCurrentTemplate(prev => ({ ...prev, width: preset.width, height: preset.height }));
        }
    };

    return (
        <div className="flex flex-col h-full bg-brand-dark text-white p-4 overflow-hidden">
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-gray-400 hover:text-white">Voltar</button>
                    <h2 className="text-xl font-bold">Editor de Carteirinhas</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={createNew} className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600">Novo</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className={`bg-green-600 px-3 py-1 rounded text-sm flex items-center gap-1 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-500'}`}
                    >
                        <Save size={14}/> {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 gap-4 overflow-hidden">
                {/* Left: Saved Templates & Tools */}
                <div className="w-64 bg-brand-secondary p-4 rounded-lg overflow-y-auto flex flex-col gap-4">
                    <div>
                        <h3 className="font-bold text-sm mb-2 text-brand-accent">Ferramentas</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="bg-brand-primary p-2 rounded cursor-pointer hover:bg-gray-700 text-xs flex flex-col items-center">
                                <Upload size={16} className="mb-1"/> Fundo
                                <input type="file" className="hidden" accept="image/*" onChange={handleBackgroundUpload}/>
                            </label>
                            <button onClick={() => addElement('text')} className="bg-brand-primary p-2 rounded hover:bg-gray-700 text-xs flex flex-col items-center">
                                <Type size={16} className="mb-1"/> Texto Fixo
                            </button>
                            <button onClick={() => addElement('photo')} className="bg-brand-primary p-2 rounded hover:bg-gray-700 text-xs flex flex-col items-center">
                                <ImageIcon size={16} className="mb-1"/> Foto Usuário
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-sm mb-2 text-brand-accent">Campos Dinâmicos</h3>
                        <div className="flex flex-col gap-1">
                            {['name', 'role', 'cpf', 'rg', 'birthDate', 'registrationDate'].map(field => (
                                <button key={field} onClick={() => addElement('field', field as any)} className="text-left text-xs bg-brand-primary px-2 py-1.5 rounded hover:bg-gray-700">
                                    + {field.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                         <h3 className="font-bold text-sm mb-2 text-gray-400">Templates Salvos</h3>
                         <div className="space-y-1">
                             {templates.map(t => (
                                 <div key={t.id} onClick={() => loadTemplateToEdit(t)} className={`p-2 rounded cursor-pointer text-xs ${currentTemplate.id === t.id ? 'bg-brand-accent text-brand-dark font-bold' : 'bg-brand-primary hover:bg-gray-700'}`}>
                                     {t.name}
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>

                {/* Middle: Canvas */}
                <div className="flex-1 bg-gray-900 flex items-center justify-center relative overflow-auto rounded-lg border border-gray-700">
                    <div 
                        ref={canvasRef}
                        className="bg-white shadow-2xl relative overflow-hidden transition-all duration-300"
                        style={{ width: currentTemplate.width, height: currentTemplate.height }}
                    >
                        {/* Background */}
                        {currentTemplate.backgroundUrl ? (
                            <img src={currentTemplate.backgroundUrl} className="absolute inset-0 w-full h-full object-cover z-0" alt="bg"/>
                        ) : (
                            <div className="absolute inset-0 bg-white grid grid-cols-12 grid-rows-6 opacity-10 pointer-events-none">
                                {Array.from({length: 72}).map((_, i) => <div key={i} className="border border-gray-300"></div>)}
                            </div>
                        )}

                        {/* Elements */}
                        {currentTemplate.elements.map(el => (
                            <div
                                key={el.id}
                                onMouseDown={(e) => handleDragStart(e, el.id)}
                                className={`absolute cursor-move select-none group border ${selectedElementId === el.id ? 'border-blue-500 z-50' : 'border-transparent hover:border-blue-300'}`}
                                style={{
                                    left: el.x,
                                    top: el.y,
                                    width: el.width,
                                    height: el.type === 'text' || el.type === 'field' ? 'auto' : el.height,
                                    fontSize: el.fontSize,
                                    fontFamily: el.fontFamily,
                                    color: el.color,
                                    fontWeight: el.fontWeight,
                                    textAlign: el.textAlign,
                                    zIndex: el.zIndex
                                }}
                            >
                                {el.type === 'photo' ? (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[8px] text-gray-500">FOTO</div>
                                ) : el.type === 'field' ? (
                                    `{${el.field}}` // Placeholder visual
                                ) : (
                                    el.content
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Properties */}
                <div className="w-64 bg-brand-secondary p-4 rounded-lg border-l border-gray-700">
                     <div className="mb-4">
                        <label className="text-xs text-gray-400 block mb-1">Nome do Template</label>
                        <input 
                            value={currentTemplate.name} 
                            onChange={e => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                            className="w-full bg-brand-primary border border-gray-600 rounded p-1 text-sm text-white"
                        />
                     </div>
                     
                     <div className="mb-4">
                        <label className="text-xs text-gray-400 block mb-1 flex items-center gap-1"><Layout size={12}/> Dimensões</label>
                        <select onChange={applyPreset} className="w-full bg-brand-primary border border-gray-600 rounded p-1 text-xs text-gray-300 mb-2">
                            <option value="">Tamanho Personalizado</option>
                            {PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-gray-500">Largura</label>
                                <input 
                                    type="number" 
                                    value={currentTemplate.width} 
                                    onChange={e => setCurrentTemplate({...currentTemplate, width: parseInt(e.target.value) || 0})}
                                    className="w-full bg-brand-primary border border-gray-600 rounded p-1 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">Altura</label>
                                <input 
                                    type="number" 
                                    value={currentTemplate.height} 
                                    onChange={e => setCurrentTemplate({...currentTemplate, height: parseInt(e.target.value) || 0})}
                                    className="w-full bg-brand-primary border border-gray-600 rounded p-1 text-sm text-white"
                                />
                            </div>
                        </div>
                     </div>

                    {selectedElement ? (
                        <div className="space-y-3">
                            <h3 className="font-bold text-sm text-brand-accent border-b border-gray-600 pb-1">Propriedades</h3>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-gray-400">X</label>
                                    <input type="number" value={selectedElement.x} onChange={e => updateElement(selectedElement.id, { x: parseInt(e.target.value) })} className="w-full bg-brand-primary p-1 text-xs rounded"/>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400">Y</label>
                                    <input type="number" value={selectedElement.y} onChange={e => updateElement(selectedElement.id, { y: parseInt(e.target.value) })} className="w-full bg-brand-primary p-1 text-xs rounded"/>
                                </div>
                            </div>
                            
                            {(selectedElement.type === 'text' || selectedElement.type === 'field') && (
                                <>
                                    <div>
                                        <label className="text-[10px] text-gray-400">Tamanho Fonte</label>
                                        <input type="number" value={selectedElement.fontSize} onChange={e => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })} className="w-full bg-brand-primary p-1 text-xs rounded"/>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400">Cor (Hex)</label>
                                        <input type="color" value={selectedElement.color} onChange={e => updateElement(selectedElement.id, { color: e.target.value })} className="w-full h-8 bg-brand-primary rounded cursor-pointer"/>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400">Peso</label>
                                        <select value={selectedElement.fontWeight} onChange={e => updateElement(selectedElement.id, { fontWeight: e.target.value as any })} className="w-full bg-brand-primary p-1 text-xs rounded">
                                            <option value="normal">Normal</option>
                                            <option value="bold">Negrito</option>
                                        </select>
                                    </div>
                                    {selectedElement.type === 'text' && (
                                        <div>
                                            <label className="text-[10px] text-gray-400">Conteúdo</label>
                                            <input value={selectedElement.content} onChange={e => updateElement(selectedElement.id, { content: e.target.value })} className="w-full bg-brand-primary p-1 text-xs rounded"/>
                                        </div>
                                    )}
                                </>
                            )}
                            
                            <button onClick={() => deleteElement(selectedElement.id)} className="w-full bg-red-600/20 text-red-400 border border-red-600/50 p-2 rounded text-xs flex items-center justify-center gap-2 mt-4 hover:bg-red-600 hover:text-white">
                                <Trash2 size={14}/> Remover Elemento
                            </button>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500 text-center mt-10">Selecione um elemento para editar</p>
                    )}
                </div>
            </div>
        </div>
    );
};