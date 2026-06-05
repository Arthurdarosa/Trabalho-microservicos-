import { useState, useEffect, type FormEvent  } from 'react';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

interface Encomenda {
  id: number;
  descricao_encomenda: string;
  compartimento_id: number;
}

interface Locker {
  id: number;
  numero_gaveta: number;
  tamanho: string;
  condomino_id: number;
  status: string;
}

export function TelaCondomino({ userId }: { userId: number }) {
  // Estado para simular qual morador está logado (facilita muito os seus testes!)
  const [currentUserId, setCurrentUserId] = useState<number>(userId);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Controle de Abas
  const [activeTab, setActiveTab] = useState<'encomendas' | 'minhas-gavetas'>('encomendas');
  
  // Estados de Dados
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [minhasGavetas, setMinhasGavetas] = useState<Locker[]>([]);

  // --- FUNÇÕES DA API ---
  const buscarEncomendas = async () => {
    try {
      const response = await api.get(`/entregas/condomino/${currentUserId}`);
      if (response.data.message) {
        setEncomendas([]);
      } else {
        setEncomendas(response.data);
      }
    } catch (error) {
      console.error("Erro ao buscar encomendas:", error);
      setEncomendas([]);
    }
  };

  const buscarMinhasGavetas = async () => {
    try {
      // Busca todos e filtra no frontend (ou você pode criar uma rota específica depois)
      const response = await api.get(`/lockers/condomino/${currentUserId}`);
      setMinhasGavetas(response.data);
    } catch (error) {
      console.error("Erro ao buscar gavetas:", error);
    }
  };

  const retirarPacote = async (idEntrega: number) => {
    try {
      await api.post(`/entregas/retirar/${idEntrega}`);
      alert("Comando enviado para o RabbitMQ! A porta do armário físico foi aberta.");
      // Atualiza a lista para o pacote sumir da tela
      buscarEncomendas();
    } catch (error) {
      alert("Erro ao tentar abrir a porta.");
    }
  };

  // Recarrega os dados sempre que a aba ou o usuário mudar
  useEffect(() => {
    if (activeTab === 'encomendas') buscarEncomendas();
    if (activeTab === 'minhas-gavetas') buscarMinhasGavetas();
  }, [currentUserId, activeTab]);

    // --- FAKE LOGIN ---
    const handleLogin = (e: FormEvent) => {
      e.preventDefault();
      setIsLoggedIn(true);
    };

  if (!isLoggedIn) {
      return (
        <div className="flex justify-center items-center py-10">
          <Card className="w-full max-w-md" borderColor="blue">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Acesso Administrativo</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">E-mail ou Usuário</label>
                <input 
                  type="number" 
                  value={currentUserId}
                  onChange={(e) => setCurrentUserId(Number(e.target.value))}
                  className="w-20 px-2 py-1 text-center border border-gray-400 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Senha</label>
                <input 
                  type="password" 
                  required
                  defaultValue="123456"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900" 
                />
              </div>
              <Button type="submit" variant="primary" className="w-full mt-4">
                Entrar no Sistema
              </Button>
            </form>
          </Card>
        </div>
      );
    }

  return (
    <div className="space-y-6">
      {/* MENU SUPERIOR DO MORADOR */}
      <div className="bg-white p-4 rounded shadow-sm flex space-x-2 border-b-4 border-green-500">
        <button 
          onClick={() => setActiveTab('encomendas')}
          className={`px-4 py-2 rounded font-semibold transition-colors ${activeTab === 'encomendas' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          📦 Retirar Encomendas
        </button>
        <button 
          onClick={() => setActiveTab('minhas-gavetas')}
          className={`px-4 py-2 rounded font-semibold transition-colors ${activeTab === 'minhas-gavetas' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          🗄️ Minhas Gavetas
        </button>
      </div>

      {/* ABA 1: ENCOMENDAS PENDENTES */}
      {activeTab === 'encomendas' && (
        <Card borderColor="green">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Pacotes Aguardando Retirada</h2>
          
          {encomendas.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl">🧹</span>
              <p className="text-gray-500 italic mt-4 text-lg">Tudo limpo! Você não tem encomendas no momento.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {encomendas.map(enc => (
                <li key={enc.id} className="flex flex-col md:flex-row justify-between items-center border p-4 rounded-lg bg-gray-50 shadow-sm hover:shadow transition-shadow">
                  <div className="mb-4 md:mb-0 text-center md:text-left">
                    <p className="font-bold text-gray-800 text-lg">📦 {enc.descricao_encomenda}</p>
                    <p className="text-sm text-gray-500 font-mono mt-1">Sua encomenda está no Locker ID: <span className="font-bold text-gray-700">{enc.compartimento_id}</span></p>
                  </div>
                  <Button 
                    onClick={() => retirarPacote(enc.id)}
                    variant="success"
                  >
                    🔓 Abrir Armário
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* ABA 2: MINHAS GAVETAS (STATUS) */}
      {activeTab === 'minhas-gavetas' && (
        <Card borderColor="none">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Status das Suas Gavetas</h2>
          
          {minhasGavetas.length === 0 ? (
            <p className="text-gray-500 italic text-center py-4">Você ainda não tem nenhuma gaveta vinculada ao seu nome.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {minhasGavetas.map(gaveta => (
                <div key={gaveta.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                  <div>
                    <p className="font-bold text-gray-800 text-lg">Gaveta {gaveta.numero_gaveta}</p>
                    <p className="text-sm text-gray-500 mt-1">Tamanho: <span className="uppercase font-bold">{gaveta.tamanho}</span></p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      gaveta.status === 'disponivel' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {gaveta.status === 'disponivel' ? 'Livre' : 'Ocupada'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

    </div>
  );
}