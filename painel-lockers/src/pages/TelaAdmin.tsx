import { useState, useEffect, type FormEvent } from 'react';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

interface Locker {
  id: number;
  numero_gaveta: number;
  tamanho: string;
  condomino_id: number;
  status: string;
}

interface Logging {
  id: number;
  entrega_id: number;
  evento: string;
  data: number;
}

export function TelaAdmin() {
  // Estados de Controle de Tela
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'lockers' | 'novo-condomino' | 'novo-locker' | 'logging'>('lockers');
  
  // Estado dos Dados Principais
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [logging, setlogging] = useState<Logging[]>([]);

  // Estados do Formulário de Condômino
  const [nomeCondomino, setNomeCondomino] = useState('');
  const [cpfCondomino, setCpfCondomino] = useState('');
  const [aptCondomino, setAptCondomino] = useState('');
  const [emailCondomino, setEmailCondomino] = useState('');

  // Estados do Formulário de Locker
  const [idMoradorLocker, setIdMoradorLocker] = useState('');
  const [tamanhoLocker, setTamanhoLocker] = useState('P');
  const [numeroGavetaLocker, setNumeroGavetaLocker] = useState('');

  // --- FUNÇÕES DA API ---

  const buscarLogging = async () => {
    try {
      const response = await api.get('/logging');
      setlogging(response.data);
    }catch(error){
      console.error("Erro ao buscar logging:", error);
    }
  };

  const buscarLockers = async () => {
    try {
      const response = await api.get('/lockers');
      setLockers(response.data);
    } catch (error) {
      console.error("Erro ao buscar lockers:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeTab === 'logging') {
      buscarLogging();
    }
  }, [isLoggedIn, activeTab]);

  useEffect(() => {
    if (isLoggedIn && activeTab === 'lockers') {
      buscarLockers();
    }
  }, [isLoggedIn, activeTab]);

  // --- FAKE LOGIN ---
  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
  };

  // --- ENVIO DO FORMULÁRIO DE CONDÔMINO ---
  const handleCriarCondomino = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/condominos', {
        nome: nomeCondomino,
        cpf: cpfCondomino,
        condominio: "Residencial Imbituba",
        apartamento: aptCondomino,
        email: emailCondomino
      });
      
      alert("Morador cadastrado com sucesso!");
      
      // Limpa os campos após salvar
      setNomeCondomino('');
      setCpfCondomino('');
      setAptCondomino('');
      setEmailCondomino('');
    } catch (error) {
      console.error(error);
      alert(error);
    }
  };

  // --- ENVIO DO FORMULÁRIO DE LOCKER ---
  const handleCriarLocker = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/lockers', {
        condominio: "Residencial Imbituba",
        condomino_id: Number(idMoradorLocker),
        localizacao: "Hall Principal",
        numero_gaveta: Number(numeroGavetaLocker),
        tamanho: tamanhoLocker
      });
      
      alert("Gaveta criada e vinculada com sucesso!");
      
      // Limpa os campos
      setIdMoradorLocker('');
      setNumeroGavetaLocker('');
      setTamanhoLocker('P');
    } catch (error) {
      console.error(error);
      alert(error);
    }
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
                type="text" 
                required
                defaultValue="admin@smartlockers.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900" 
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

  // --- PAINEL PRINCIPAL (LOGADO) ---
  return (
    <div className="space-y-6">
      
      {/* Menu Superior do Admin */}
      <div className="bg-white p-4 rounded shadow-sm flex space-x-2 border-b-4 border-blue-600">
        <button 
          onClick={() => setActiveTab('lockers')}
          className={`px-4 py-2 rounded font-semibold transition-colors ${activeTab === 'lockers' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Visão Geral
        </button>
        <button 
          onClick={() => setActiveTab('novo-condomino')}
          className={`px-4 py-2 rounded font-semibold transition-colors ${activeTab === 'novo-condomino' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          + Novo Condômino
        </button>
        <button 
          onClick={() => setActiveTab('novo-locker')}
          className={`px-4 py-2 rounded font-semibold transition-colors ${activeTab === 'novo-locker' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          + Nova Gaveta
        </button>
        <button 
          onClick={() => setActiveTab('logging')}
          className={`px-4 py-2 rounded font-semibold transition-colors ${activeTab === 'novo-locker' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Logging
        </button>
      </div>
      
      {/* ABA 1: VISÃO GERAL */}
      {activeTab === 'lockers' && (
        <Card borderColor="blue">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Status das Gavetas Físicas</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {lockers.length === 0 ? <p className="text-gray-500 col-span-3">Nenhuma gaveta cadastrada ainda.</p> : lockers.map(locker => (
              <div key={locker.id} className={`p-4 rounded border-2 ${locker.status === 'disponivel' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <p className="font-bold text-gray-800">
                  Gaveta {locker.numero_gaveta} <span className="text-sm font-normal bg-gray-200 px-2 py-1 rounded ml-1">{locker.tamanho}</span>
                </p>
                <p className="text-sm text-gray-600 mt-2">Dono (ID): {locker.condomino_id}</p>
                <p className={`mt-2 text-xs uppercase font-bold tracking-wider ${locker.status === 'disponivel' ? 'text-green-700' : 'text-red-700'}`}>
                  Status: {locker.status}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab == 'logging' && (
        <Card borderColor="blue">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Histórico</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {logging.length === 0 ? <p className="text-gray-500 col-span-3">Nenhuma atividade aconteceu ainda.</p> : logging.map(logging => (
              <div key={logging.id} className={`p-4 rounded border-2 bg-blue-50 border-blue-300`}>
                <p className="font-bold text-gray-800">
                  Identificador da entrega: {logging.entrega_id}
                </p>
                <p className="text-sm text-gray-600 mt-2">Evento: {logging.evento}</p>
                <p className={`mt-2 text-xs uppercase font-bold tracking-wider text-blue-800`}>
                  Data: {logging.data}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ABA 2: CADASTRAR CONDÔMINO */}
      {activeTab === 'novo-condomino' && (
        <Card borderColor="none">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Cadastrar Novo Morador</h2>
          
          <form className="m-auto space-y-4 max-w-lg" onSubmit={handleCriarCondomino}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={nomeCondomino}
                  onChange={(e) => setNomeCondomino(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Ex: João da Silva" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CPF</label>
                <input 
                  type="text" 
                  required
                  value={cpfCondomino}
                  onChange={(e) => setCpfCondomino(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="000.000.000-00" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Apartamento</label>
                <input 
                  type="text" 
                  required
                  value={aptCondomino}
                  onChange={(e) => setAptCondomino(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Ex: 101" 
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">E-mail</label>
                <input 
                  type="email" 
                  required
                  value={emailCondomino}
                  onChange={(e) => setEmailCondomino(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="joao@email.com" 
                />
              </div>
            </div>
            <Button type="submit" variant="success">Salvar Morador</Button>
          </form>
        </Card>
      )}

      {/* ABA 3: CADASTRAR LOCKER */}
      {activeTab === 'novo-locker' && (
        <Card borderColor="none">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Vincular Nova Gaveta</h2>
          
          <form className="m-auto space-y-4 max-w-lg" onSubmit={handleCriarLocker}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID do Morador</label>
                <input 
                  type="number" 
                  required
                  value={idMoradorLocker}
                  onChange={(e) => setIdMoradorLocker(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Ex: 1" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tamanho da Gaveta</label>
                <select 
                  value={tamanhoLocker}
                  onChange={(e) => setTamanhoLocker(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="P">P</option>
                  <option value="M">M</option>
                  <option value="G">G</option>
                  <option value="XG">XG</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Número da Gaveta Física</label>
                <input 
                  type="number" 
                  required
                  value={numeroGavetaLocker}
                  onChange={(e) => setNumeroGavetaLocker(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Ex: 102" 
                />
              </div>
            </div>
            <Button type="submit" variant="success">Criar Gaveta</Button>
          </form>
        </Card>
      )}

    </div>
  );
}