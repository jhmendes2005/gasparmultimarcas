"use client";

import Link from "next/link";
import { Facebook, Instagram, MessageCircle, MapPin, Phone, Mail, ArrowRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black text-gray-300">
      {/* --- Seção Principal --- */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          
          {/* 1. Sobre a Empresa */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">Gaspar Multimarcas</h2>
            <p className="text-sm leading-relaxed text-gray-400">
              A Gaspar Multimarcas atua no mercado automobilístico com tradição, excelência no atendimento e veículos com rigorosa qualidade para realizar o sonho de cada cliente.
            </p>
            <div className="flex gap-4 pt-2">
              <a 
                href="#" 
                target="_blank" 
                rel="noopener noreferrer"
                className="h-10 w-10 flex items-center justify-center rounded-full bg-neutral-900 hover:bg-red-700 hover:text-white transition-all duration-300"
              >
                <Instagram size={20} />
              </a>
              <a href="#" className="h-10 w-10 flex items-center justify-center rounded-full bg-neutral-900 hover:bg-red-700 hover:text-white transition-all duration-300">
                <Facebook size={20} />
              </a>
              <a href="#" className="h-10 w-10 flex items-center justify-center rounded-full bg-neutral-900 hover:bg-green-600 hover:text-white transition-all duration-300">
                <MessageCircle size={20} />
              </a>
            </div>
          </div>

          {/* 2. Links Rápidos */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6 border-b border-red-800 pb-2 inline-block">
              Navegação
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="flex items-center gap-2 hover:text-red-400 transition-colors">
                  <ArrowRight size={16} className="text-red-600" /> Home
                </Link>
              </li>
              <li>
                <Link href="/sobre" className="flex items-center gap-2 hover:text-red-400 transition-colors">
                  <ArrowRight size={16} className="text-red-600" /> Sobre Nós
                </Link>
              </li>
              <li>
                <Link href="/contato" className="flex items-center gap-2 hover:text-red-400 transition-colors">
                  <ArrowRight size={16} className="text-red-600" /> Contato
                </Link>
              </li>
              <li>
                <Link href="/estoque" className="flex items-center gap-2 hover:text-red-400 transition-colors">
                  <ArrowRight size={16} className="text-red-600" /> Estoque
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. Contato */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6 border-b border-red-800 pb-2 inline-block">
              Endereço e Contato
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                <span className="text-sm">
                  Rua Anfiloquio Nunes Pires nº 351<br />
                  Figueira - Gaspar/SC
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="text-sm">(47) 99619-0693</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="text-sm">(47) 98823-7774</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="text-sm">(47) 3318-0795</span>
              </li>
            </ul>
          </div>

          {/* 4. Newsletter / Horário */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6 border-b border-red-800 pb-2 inline-block">
              Horário de Atendimento
            </h3>
            <div className="space-y-2 text-sm text-gray-400 mb-6">
              <p className="flex justify-between">
                <span>Segunda a Sexta:</span>
                <span className="text-white">09:00 às 18:00</span>
              </p>
              <p className="flex justify-between">
                <span>Sábado:</span>
                <span className="text-white">08:00 às 12:00</span>
              </p>
              <p className="flex justify-between">
                <span>Domingo:</span>
                <span className="text-red-400">Fechado</span>
              </p>
            </div>

            <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-800">
              <p className="text-xs text-red-200 mb-2">Localização</p>
              <p className="text-sm text-gray-200">
                Rua Anfiloquio Nunes Pires nº 351<br />
                Figueira - Gaspar/SC
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* --- Barra Inferior --- */}
      <div className="border-t border-neutral-900 bg-black/70">
        <div className="container mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-1 md:gap-4 text-xs text-gray-500 text-center md:text-left">
            <p>Gaspar Multimarcas © Copyright. Todos os direitos reservados.</p>
            <span className="hidden md:inline text-gray-700">|</span>
            <p>Developed By TecnoSync Services.</p>
          </div>
          <div className="flex gap-6 text-xs text-gray-500">
            <Link href="/termos-de-uso" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}