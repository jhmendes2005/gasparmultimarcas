"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { 
  RefreshCw, Trash2, PlusCircle, CheckCircle, AlertTriangle, 
  BarChart3, Settings, Car, Save, Plus, X, Edit, Loader2
} from "lucide-react";

interface ScriptConfig {
  type: "GTM" | "PIXEL" | "ANALYTICS";
  code: string;
}

const BRAZILIAN_BRANDS = [
    "Audi",
    "BMW",
    "BYD",
    "Caoa Chery",
    "Chevrolet",
    "Citroen",
    "Fiat",
    "Ford",
    "GWM",
    "Honda",
    "Hyundai",
    "Jeep",
    "Kia",
    "Land Rover",
    "Lexus",
    "Mercedes-Benz",
    "Mitsubishi",
    "Nissan",
    "Peugeot",
    "Porsche",
    "RAM",
    "Renault",
    "Toyota",
    "Volkswagen",
    "Volvo",
];

const STANDARD_COLORS = [
    "Branco",
    "Preto",
    "Prata",
    "Cinza",
    "Vermelho",
    "Azul",
    "Verde",
    "Amarelo",
    "Marrom",
    "Bege",
    "Dourado",
    "Laranja",
    "Vinho",
    "Roxo",
];

const TRANSMISSIONS = ["Manual", "AutomÃ¡tico", "Automatizado", "CVT"];

const FUEL_TYPES = [
    "Gasolina",
    "Etanol",
    "Flex",
    "Diesel",
    "ElÃ©trico",
    "HÃ­brido",
    "GNV",
];

const CURRENT_YEAR = new Date().getFullYear() + 1;
const STANDARD_YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => String(CURRENT_YEAR - i));

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "estoque" | "config">("dashboard");

  // Dados
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [stats, setStats] = useState({ views: 0, whatsapp: 0, shares: 0 });
  
  // ConfiguraÃ§Ã£o
  const [configId, setConfigId] = useState<number | null>(null);
  const [syncUrl, setSyncUrl] = useState("");
  const [apiType, setApiType] = useState("ALTIMUS");
  const [scripts, setScripts] = useState<ScriptConfig[]>([]);
  
  // UI States
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0); // ðŸŸ¢ Novo estado de progresso
  const [isSaving, setIsSaving] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  
  // SeleÃ§Ã£o e ExclusÃ£o
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal de EdiÃ§Ã£o
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
    const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);
    const [isUploadingImages, setIsUploadingImages] = useState(false);

    function openCreateVehicleModal() {
        setPendingImageFiles([]);
        setEditingVehicle({
            id: null,
            marca: "",
            modelo: "",
            versao: "",
            preco: 0,
            anoModelo: "",
            quilometragem: "",
            tipo: "",
            combustivel: "",
            cambio: "",
            cor: "",
            descricao: "",
            destaque: false,
            fotos: [],
            opcionais: [],
        });
    }

    function closeVehicleModal() {
        setEditingVehicle(null);
        setPendingImageFiles([]);
    }

    async function toDataUrl(file: File) {
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function uploadPendingImages(vehicleId: number, files: File[]) {
        if (!files.length) return;

        setIsUploadingImages(true);
        try {
            const imagesPayload = await Promise.all(
                files.map(async (file) => ({
                    fileName: file.name,
                    contentType: file.type,
                    dataUrl: await toDataUrl(file),
                })),
            );

            await api.post(`/vehicles/${vehicleId}/images`, { images: imagesPayload });
        } finally {
            setIsUploadingImages(false);
        }
    }

    async function handleRemoveImage(imageUrl: string) {
        if (!editingVehicle?.id) return;
        try {
            await api.delete(`/vehicles/${editingVehicle.id}/images`, {
                data: { imageUrls: [imageUrl] },
            });

            setEditingVehicle((prev: any) => ({
                ...prev,
                fotos: (prev?.fotos || []).filter((url: string) => url !== imageUrl),
            }));

            setVehicles((prev) =>
                prev.map((v) =>
                    v.id === editingVehicle.id
                        ? { ...v, fotos: (v.fotos || []).filter((url: string) => url !== imageUrl) }
                        : v,
                ),
            );
        } catch (error) {
            alert("Erro ao remover imagem do veÃ­culo.");
        }
    }

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));
    loadAllData();
  }, [router]);

  async function loadAllData() {
    fetchVehicles();
    
    // Carregar Config
    api.get("/config").then((res) => {
        if (res.data) {
            setConfigId(res.data.id);
            setSyncUrl(res.data.apiUrl || "");
            setApiType(res.data.apiType || "ALTIMUS");
            setScripts((res.data.scripts as ScriptConfig[]) || []);
        }
    }).catch(console.error);

    // Carregar Stats
    api.get("/analytics/summary")
       .then(res => setStats(res.data))
       .catch(() => setStats({ views: 0, whatsapp: 0, shares: 0 }));
  }

  function fetchVehicles() {
    api.get("/vehicles").then((res) => {
        setVehicles(res.data);
        setSelectedIds([]); 
    }).catch(console.error);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }

  // --- FUNÃ‡Ã•ES DE SELEÃ‡ÃƒO ---
  const toggleSelectAll = () => {
      if (selectedIds.length === vehicles.length) {
          setSelectedIds([]);
      } else {
          setSelectedIds(vehicles.map(v => v.id));
      }
  };

  const toggleSelectOne = (id: number) => {
      if (selectedIds.includes(id)) {
          setSelectedIds(prev => prev.filter(i => i !== id));
      } else {
          setSelectedIds(prev => [...prev, id]);
      }
  };

  // --- FUNÃ‡Ã•ES DE EXCLUSÃƒO ---
  async function handleDeleteSelected() {
      if (selectedIds.length === 0) return;
      if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} veÃ­culos selecionados?`)) return;

      setIsDeleting(true);
      try {
          await Promise.all(selectedIds.map(id => api.delete(`/vehicles/${id}`)));
          setVehicles(prev => prev.filter(v => !selectedIds.includes(v.id)));
          setSelectedIds([]);
          alert("VeÃ­culos excluÃ­dos com sucesso!");
      } catch (error) {
          alert("Erro ao excluir alguns veÃ­culos.");
      } finally {
          setIsDeleting(false);
      }
  }

  async function handleDeleteAll() {
      if (vehicles.length === 0) return;
      if (!confirm("PERIGO: Isso apagarÃ¡ TODOS os veÃ­culos do seu estoque. Tem certeza absoluta?")) return;

      setIsDeleting(true);
      try {
          const allIds = vehicles.map(v => v.id);
          await Promise.all(allIds.map(id => api.delete(`/vehicles/${id}`)));
          setVehicles([]);
          setSelectedIds([]);
          alert("Estoque limpo com sucesso!");
      } catch (error) {
          alert("Erro ao limpar estoque.");
      } finally {
          setIsDeleting(false);
      }
  }

  // --- SINCRONIZAÃ‡ÃƒO COM BARRA DE PROGRESSO ---
  async function handleSync() {
    if (!syncUrl) return alert("Digite a URL da API de estoque.");
    
    setIsSyncing(true);
    setSyncResult(null);
    setProgress(0); // Reinicia a barra

    // ðŸŸ¢ Simula o progresso visualmente (jÃ¡ que o backend nÃ£o envia progresso em tempo real)
    // Aumenta 10% a cada 800ms atÃ© chegar em 90% e espera
    const progressInterval = setInterval(() => {
        setProgress((prev) => {
            if (prev >= 90) return 90; // Trava em 90% esperando o backend
            return prev + Math.random() * 10;
        });
    }, 800);

    try {
      await handleSaveConfig(false); 
      // Essa chamada demora porque o Backend estÃ¡ esperando o Webhook do n8n responder para cada carro
      const response = await api.post(`/vehicles/process?url=${encodeURIComponent(syncUrl)}&type=${apiType}`);
      
      // Quando o backend responde, completamos a barra
      clearInterval(progressInterval);
      setProgress(100);
      
      setSyncResult(response.data);
      fetchVehicles();
    } catch (error: any) {
      clearInterval(progressInterval);
      setProgress(0); // Zera em caso de erro
      console.error("Erro sync:", error);
      const msg = error.response?.data?.message || "Erro ao conectar.";
      setSyncResult({ success: false, message: msg });
    } finally {
      // Pequeno delay para mostrar o 100% antes de habilitar o botÃ£o
      setTimeout(() => setIsSyncing(false), 500);
    }
  }

  // --- CONFIGURAÃ‡ÃƒO ---
  async function handleSaveConfig(showAlert = true) {
    setIsSaving(true);
    try {
        const payload = {
            apiUrl: syncUrl,
            apiType: apiType,
            scripts: scripts
        };
        
        if (configId) {
            await api.put(`/config/${configId}`, payload);
        } else {
            const res = await api.post("/config", payload);
            if(res.data?.id) setConfigId(res.data.id);
        }
        
        if(showAlert) alert("ConfiguraÃ§Ãµes salvas!");
    } catch (error) {
        console.error("Erro config:", error);
        if(showAlert) alert("Erro ao salvar config.");
    } finally {
        setIsSaving(false);
    }
  }

  async function handleDelete(id: number) {
      if(!confirm("Tem certeza que deseja excluir este veÃ­culo?")) return;
      try {
          await api.delete(`/vehicles/${id}`);
          setVehicles(prev => prev.filter(v => v.id !== id));
      } catch (error) {
          alert("Erro ao excluir veÃ­culo");
      }
  }

  async function handleUpdateVehicle(e: React.FormEvent) {
      e.preventDefault();
      if (!editingVehicle) return;
      setIsUpdating(true);
      try {
          const payload = {
              marca: editingVehicle.marca,
              modelo: editingVehicle.modelo,
              versao: editingVehicle.versao,
              preco: Number(editingVehicle.preco || 0),
              anoModelo: editingVehicle.anoModelo ? Number(editingVehicle.anoModelo) : null,
              quilometragem: editingVehicle.quilometragem ? Number(editingVehicle.quilometragem) : null,
              tipo: editingVehicle.tipo || null,
              combustivel: editingVehicle.combustivel || null,
              cambio: editingVehicle.cambio || null,
              cor: editingVehicle.cor || null,
              descricao: editingVehicle.descricao || null,
              destaque: Boolean(editingVehicle.destaque),
              fotos: Array.isArray(editingVehicle.fotos) ? editingVehicle.fotos : [],
              opcionais: Array.isArray(editingVehicle.opcionais) ? editingVehicle.opcionais : [],
          };

          let savedVehicle;
          if (editingVehicle.id) {
              const res = await api.put(`/vehicles/${editingVehicle.id}`, payload);
              savedVehicle = res.data;
          } else {
              const res = await api.post('/vehicles', payload);
              savedVehicle = res.data;
          }

          if (pendingImageFiles.length > 0) {
              await uploadPendingImages(savedVehicle.id, pendingImageFiles);
          }

          fetchVehicles();
          closeVehicleModal();
      } catch (error) {
          alert("Erro ao salvar veÃ­culo.");
      } finally {
          setIsUpdating(false);
      }
  }

  const addScript = () => setScripts([...scripts, { type: "GTM", code: "" }]);
  const removeScript = (idx: number) => setScripts(scripts.filter((_, i) => i !== idx));
  const updateScript = (idx: number, field: keyof ScriptConfig, value: string) => {
      const newScripts = [...scripts];
      newScripts[idx] = { ...newScripts[idx], [field]: value };
      setScripts(newScripts);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
            <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">OlÃ¡, <strong>{user.nome}</strong></span>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 font-medium">Sair</button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
            <nav className="p-4 space-y-2">
                {[
                    { id: "dashboard", icon: BarChart3, label: "Dashboard" },
                    { id: "estoque", icon: Car, label: "Estoque" },
                    { id: "config", icon: Settings, label: "ConfiguraÃ§Ãµes" }
                ].map(item => (
                    <button 
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <item.icon size={20} /> {item.label}
                    </button>
                ))}
            </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto h-[calc(100vh-64px)] relative">
            
            {/* Dashboard */}
            {activeTab === "dashboard" && (
                <div className="space-y-6 animate-in fade-in">
                    <h2 className="text-2xl font-bold text-gray-800">VisÃ£o Geral</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CardStat label="VisualizaÃ§Ãµes" value={stats.views} sub="PÃ¡ginas visitadas" />
                        <CardStat label="WhatsApp Clicks" value={stats.whatsapp} sub="Leads gerados" color="text-green-600" />
                        <CardStat label="Compartilhamentos" value={stats.shares} sub="Engajamento" color="text-red-600" />
                    </div>
                </div>
            )}

            {/* Estoque */}
            {activeTab === "estoque" && (
                <div className="space-y-6 animate-in fade-in">
                    {/* Barra de Ferramentas */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <h2 className="text-2xl font-bold text-gray-800">Gerenciar Estoque</h2>
                            {selectedIds.length > 0 && (
                                <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">
                                    {selectedIds.length} selecionados
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {selectedIds.length > 0 ? (
                                <button 
                                    onClick={handleDeleteSelected}
                                    disabled={isDeleting}
                                    className="flex-1 md:flex-none text-sm bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 flex items-center justify-center gap-2 shadow-sm transition-all"
                                >
                                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    Excluir Selecionados
                                </button>
                            ) : (
                                <>
                                    <button 
                                        onClick={handleDeleteAll}
                                        disabled={isDeleting}
                                        className="flex-1 md:flex-none text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-50 flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Trash2 size={16} /> Limpar Estoque
                                    </button>
                                    <button 
                                        onClick={openCreateVehicleModal}
                                        className="flex-1 md:flex-none text-sm bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 flex items-center justify-center gap-2 transition-all"
                                    >
                                        <PlusCircle size={16} /> Novo Manual
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                            checked={vehicles.length > 0 && selectedIds.length === vehicles.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-6 py-4">VeÃ­culo</th>
                                    <th className="px-6 py-4">Ano</th>
                                    <th className="px-6 py-4">PreÃ§o</th>
                                    <th className="px-6 py-4">Origem</th>
                                    <th className="px-6 py-4 text-right">AÃ§Ãµes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {vehicles.map((v) => (
                                    <tr key={v.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(v.id) ? 'bg-red-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                                checked={selectedIds.includes(v.id)}
                                                onChange={() => toggleSelectOne(v.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {v.marca} {v.modelo}
                                            <span className="block text-xs text-gray-500 font-normal">{v.versao?.slice(0, 30)}...</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{v.anoModelo}</td>
                                        <td className="px-6 py-4 text-green-700 font-bold">
                                            {Number(v.preco).toLocaleString("pt-BR", { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${v.idExterno ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {v.idExterno ? 'API' : 'Manual'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button 
                                                onClick={() => {
                                                    setPendingImageFiles([]);
                                                    setEditingVehicle(v);
                                                }}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                                                title="Editar"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(v.id)}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {vehicles.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                                            Nenhum veÃ­culo encontrado no estoque.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ConfiguraÃ§Ãµes */}
            {activeTab === "config" && (
                <div className="max-w-4xl space-y-8 animate-in fade-in">
                    <h2 className="text-2xl font-bold text-gray-800">ConfiguraÃ§Ãµes</h2>

                    {/* SincronizaÃ§Ã£o */}
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <RefreshCw size={20} className="text-red-600" /> API de Estoque
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">IntegraÃ§Ã£o</label>
                                    <select 
                                        className="w-full border border-gray-300 rounded-lg p-3 text-sm bg-white"
                                        value={apiType}
                                        onChange={(e) => setApiType(e.target.value)}
                                    >
                                        <option value="ALTIMUS">Altimus</option>
                                        <option value="AUTOCERTO">AutoCerto</option>
                                        <option value="BOOM">Boom Sistemas</option>
                                        <option value="REVENDAMAIS">Revenda Mais</option>
                                    </select>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">URL do JSON</label>
                                    <input 
                                        type="text" 
                                        placeholder="https://api..."
                                        className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                                        value={syncUrl}
                                        onChange={(e) => setSyncUrl(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            {/* BARRA DE PROGRESSO E BOTÃƒO */}
                            <div className="space-y-2">
                                {/* Barra visual */}
                                {isSyncing && (
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div 
                                            className="bg-red-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                )}

                                <div className="flex gap-4 pt-2">
                                    <button 
                                        onClick={handleSync}
                                        disabled={isSyncing}
                                        className={`flex-1 py-2.5 rounded-lg font-bold text-white transition flex items-center justify-center gap-2 ${isSyncing ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}
                                    >
                                        {isSyncing ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" /> 
                                                Sincronizando {Math.floor(progress)}%...
                                            </>
                                        ) : "Sincronizar Agora"}
                                    </button>
                                    <button 
                                        onClick={() => handleSaveConfig(true)}
                                        disabled={isSaving}
                                        className="px-6 py-2.5 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200"
                                    >
                                        {isSaving ? "Salvando..." : "Salvar Config"}
                                    </button>
                                </div>
                            </div>

                            {syncResult && (
                                <div className={`p-4 rounded-lg border text-sm ${syncResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                    {syncResult.success ? (
                                        <p>âœ… <b>Sucesso!</b> Novos: {syncResult.inseridos}, Atualizados: {syncResult.atualizados}, Removidos: {syncResult.removidos}</p>
                                    ) : (
                                        <p>âŒ {syncResult.message}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Scripts */}
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <BarChart3 size={20} className="text-purple-600" /> Rastreamento (Pixel/GTM)
                            </h3>
                            <button onClick={addScript} className="text-sm text-red-600 hover:underline flex items-center gap-1">
                                <Plus size={16} /> Adicionar
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {scripts.map((script, idx) => (
                                <div key={idx} className="flex gap-4 items-start bg-gray-50 p-3 rounded-lg">
                                    <div className="w-1/3 md:w-1/4">
                                        <select 
                                            className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
                                            value={script.type}
                                            onChange={(e) => updateScript(idx, 'type', e.target.value as any)}
                                        >
                                            <option value="GTM">Google Tag Manager</option>
                                            <option value="PIXEL">Facebook Pixel</option>
                                            <option value="ANALYTICS">Google Analytics 4</option>
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <input 
                                            type="text" 
                                            placeholder="Ex: GTM-XXXXXX"
                                            className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                            value={script.code}
                                            onChange={(e) => updateScript(idx, 'code', e.target.value)}
                                        />
                                    </div>
                                    <button onClick={() => removeScript(idx)} className="text-gray-400 hover:text-red-500 p-2">
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                            <div className="pt-4 border-t border-gray-100 flex justify-end">
                                <button onClick={() => handleSaveConfig(true)} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-purple-700 transition shadow-sm">
                                    <Save size={18} /> Salvar AlteraÃ§Ãµes
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* --- MODAL DE EDIÃ‡ÃƒO --- */}
            {editingVehicle && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-50 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">{editingVehicle.id ? "Editar VeÃ­culo" : "Novo VeÃ­culo"}</h3>
                            <button onClick={closeVehicleModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleUpdateVehicle} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                                    <input 
                                        type="text" 
                                        list="brand-options"
                                        className="w-full border rounded-lg p-2"
                                        value={editingVehicle.marca} 
                                        onChange={e => setEditingVehicle({...editingVehicle, marca: e.target.value})}
                                    />
                                    <datalist id="brand-options">
                                        {BRAZILIAN_BRANDS.map((brand) => (
                                            <option key={brand} value={brand} />
                                        ))}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                                    <input 
                                        type="text" 
                                        className="w-full border rounded-lg p-2"
                                        value={editingVehicle.modelo} 
                                        onChange={e => setEditingVehicle({...editingVehicle, modelo: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">VersÃ£o</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded-lg p-2"
                                    value={editingVehicle.versao || ""} 
                                    onChange={e => setEditingVehicle({...editingVehicle, versao: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">PreÃ§o (R$)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded-lg p-2 font-bold text-green-700"
                                        value={editingVehicle.preco} 
                                        onChange={e => setEditingVehicle({...editingVehicle, preco: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ano Modelo</label>
                                    <input 
                                        type="text"
                                        list="year-options"
                                        className="w-full border rounded-lg p-2"
                                        value={editingVehicle.anoModelo || ""}
                                        onChange={e => setEditingVehicle({...editingVehicle, anoModelo: e.target.value})}
                                    />
                                    <datalist id="year-options">
                                        {STANDARD_YEARS.map((year) => (
                                            <option key={year} value={year} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quilometragem</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded-lg p-2"
                                        value={editingVehicle.quilometragem || ""}
                                        onChange={e => setEditingVehicle({...editingVehicle, quilometragem: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <input 
                                        type="text" 
                                        className="w-full border rounded-lg p-2"
                                        value={editingVehicle.tipo || ""}
                                        onChange={e => setEditingVehicle({...editingVehicle, tipo: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CombustÃ­vel</label>
                                    <input 
                                        type="text" 
                                        list="fuel-options"
                                        className="w-full border rounded-lg p-2"
                                        value={editingVehicle.combustivel || ""}
                                        onChange={e => setEditingVehicle({...editingVehicle, combustivel: e.target.value})}
                                    />
                                    <datalist id="fuel-options">
                                        {FUEL_TYPES.map((fuel) => (
                                            <option key={fuel} value={fuel} />
                                        ))}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CÃ¢mbio</label>
                                    <input 
                                        type="text" 
                                        list="transmission-options"
                                        className="w-full border rounded-lg p-2"
                                        value={editingVehicle.cambio || ""}
                                        onChange={e => setEditingVehicle({...editingVehicle, cambio: e.target.value})}
                                    />
                                    <datalist id="transmission-options">
                                        {TRANSMISSIONS.map((transmission) => (
                                            <option key={transmission} value={transmission} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                                <input
                                    type="text"
                                    list="color-options"
                                    className="w-full border rounded-lg p-2"
                                    value={editingVehicle.cor || ""}
                                    onChange={e => setEditingVehicle({...editingVehicle, cor: e.target.value})}
                                />
                                <datalist id="color-options">
                                    {STANDARD_COLORS.map((color) => (
                                        <option key={color} value={color} />
                                    ))}
                                </datalist>
                                <p className="text-xs text-gray-500 mt-1">
                                    Digite para buscar. Se nÃ£o encontrar, pode salvar exatamente o texto digitado.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">DescriÃ§Ã£o</label>
                                <textarea 
                                    className="w-full border rounded-lg p-2 min-h-20"
                                    value={editingVehicle.descricao || ""}
                                    onChange={e => setEditingVehicle({...editingVehicle, descricao: e.target.value})}
                                />
                            </div>

                            {Array.isArray(editingVehicle.fotos) && editingVehicle.fotos.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Imagens atuais</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {editingVehicle.fotos.map((url: string) => (
                                            <div key={url} className="relative rounded-lg overflow-hidden border">
                                                <img src={url} alt="Imagem do veÃ­culo" className="w-full h-20 object-cover" />
                                                {editingVehicle.id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveImage(url)}
                                                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                                                        title="Remover imagem"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Adicionar imagens (mÃºltiplas)</label>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="w-full border rounded-lg p-2"
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.files || []);
                                        setPendingImageFiles((prev) => [...prev, ...selected]);
                                    }}
                                />
                                {pendingImageFiles.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        {pendingImageFiles.length} imagem(ns) pronta(s) para upload.
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center mt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 text-red-600 rounded"
                                            checked={editingVehicle.destaque}
                                            onChange={e => setEditingVehicle({...editingVehicle, destaque: e.target.checked})}
                                        />
                                        <span className="text-gray-700 font-medium">Destaque na Home</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={closeVehicleModal}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isUpdating || isUploadingImages}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 flex justify-center gap-2"
                                >
                                    {isUpdating || isUploadingImages ? <Loader2 className="animate-spin" /> : editingVehicle.id ? "Salvar AlteraÃ§Ãµes" : "Criar VeÃ­culo"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </main>
      </div>
    </div>
  );
}

// Componente simples para os Cards do Dashboard
function CardStat({ label, value, sub, color = "text-gray-900" }: any) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
            <span className="text-xs text-gray-400 mt-2">{sub}</span>
        </div>
    )
}