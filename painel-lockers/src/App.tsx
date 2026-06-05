import { useState, useEffect } from 'react';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { Title } from './components/Typography';
import { PageLayout } from './components/PageLayout';
import { TelaAdmin } from './pages/TelaAdmin';
import { TelaCondomino } from './pages/TelaCondomino';
import { api } from './services/api';
import './index.css';

function App() {
  const [role, setRole] = useState<string | null>(null); 
  const [userId] = useState<number>(1); 

  useEffect(() => {
    if (role) {
      api.defaults.headers.common['x-role'] = role;
    }
  }, [role]);

  if (!role) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center h-[80vh]">
          <Card className="text-center w-96">
            <Title>Smart Lockers</Title>
            
            <div className="flex flex-col space-y-4">
              <Button onClick={() => setRole('admin')} variant="primary" className="w-full">
                Acessar Painel Admin
              </Button>
              <Button onClick={() => setRole('condomino')} variant="success" className="w-full">
                Acessar App do Morador
              </Button>
            </div>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            {role === 'admin' ? 'Painel de Controle' : 'Minhas Encomendas'}
          </h1>
          <button 
            onClick={() => setRole(null)}
            className="cursor-pointer text-red-500 hover:text-red-700 font-bold underline"
          >
            Sair
          </button>
        </div>

        {/* Aqui injetamos as telas que vieram dos outros arquivos */}
        {role === 'admin' ? <TelaAdmin /> : <TelaCondomino userId={userId} />}
      </div>
    </div>
  );
}

export default App;