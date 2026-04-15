import Link from 'next/link';
// 1. Trocamos o Ã­cone para um cone de trÃ¢nsito
import { TrafficCone } from 'lucide-react'; 

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-gray-50 text-center">
      <div className="rounded-lg bg-white p-8 shadow-xl md:p-12">
        
        {/* AnimaÃ§Ã£o: O "404" vai "quicar" (bounce) sutilmente */}
        <h1 className="animate-bounce text-8xl font-extrabold text-red-600 md:text-9xl">
          404
        </h1>

        {/* Ãcone e TÃ­tulo */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {/* 2. Usamos o novo Ã­cone e mudamos a cor */}
          <TrafficCone size={32} className="text-orange-500" />
          {/* 3. Mudamos o tÃ­tulo */}
          <h2 className="text-3xl font-bold text-gray-800">
            Ops! Caminho Errado
          </h2>
        </div>
        
        {/* Mensagem de Ajuda */}
        {/* 4. Mudamos as mensagens */}
        <p className="mt-4 text-lg text-gray-600">
          Este caminho nÃ£o levou a nenhum veÃ­culo.
        </p>
        <p className="mt-1 text-gray-500">
          Tente voltar para a home e recalcular a rota.
        </p>

        {/* BotÃ£o de AÃ§Ã£o (permanece igual) */}
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-red-600 px-6 py-3 text-lg font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
        >
          Voltar para a Home
        </Link>
      </div>
    </div>
  );
}