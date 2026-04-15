"use client";

import Link from "next/link";
import { Target, Eye, Heart, MapPin, CheckCircle2 } from "lucide-react";

export default function SobreNos() {
  return (
    <div className="bg-white min-h-screen pb-12">
      <div className="relative bg-black text-white py-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-red-700/20 skew-x-12 transform translate-x-20" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Nossa História</h1>
          <p className="text-red-200 text-lg max-w-3xl mx-auto">
            Tradição, credibilidade e paixão por veículos para transformar o sonho de cada cliente em realidade.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-14 max-w-6xl">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-10 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-semibold">
            <CheckCircle2 size={16} /> Gaspar Multimarcas
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Excelência no atendimento e rigor na qualidade</h2>
          <div className="text-gray-700 leading-relaxed space-y-4 text-justify">
            <p>
              A Gaspar Multimarcas atua no mercado automobilístico, caracterizada por ser uma empresa sólida, de tradição,
              que conjuga excelência no atendimento e veículos com rigorosa qualidade, com o objetivo único de tornar real
              o sonho de cada cliente.
            </p>
            <p>
              Apostando em confiança e credibilidade como princípios fundamentais de sua atuação, a empresa busca no mercado
              somente veículos diferenciados, através de um rigoroso critério técnico de avaliação que garante qualidade e
              procedência.
            </p>
            <p>
              A loja oferece automóveis de diversas marcas, seminovos e zero quilômetro, nacionais e importados. Todos
              criteriosamente testados e avaliados, característica que a revenda traz consigo até hoje e a diferencia no
              mercado.
            </p>
            <p>
              E é assim que a Gaspar Multimarcas solidificou a sua marca, com uma conduta ética e respeito a seus clientes,
              parceiros e fornecedores.
            </p>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-14 h-14 bg-red-100 text-red-700 rounded-xl flex items-center justify-center mb-6">
              <Eye size={30} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Visão</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Ser referência nacional na venda de veículos de médio e alto padrão, reconhecida pela confiança, inovação e
              excelência no atendimento.
            </p>
          </div>

          <div className="bg-red-700 p-8 rounded-2xl shadow-lg text-white">
            <div className="w-14 h-14 bg-white/20 text-white rounded-xl flex items-center justify-center mb-6">
              <Target size={30} />
            </div>
            <h3 className="text-xl font-bold mb-3">Nossa Missão</h3>
            <p className="text-red-100 text-sm leading-relaxed">
              Oferecer uma experiência de compra segura, transparente e confiável, tornando o sonho do carro ideal uma
              realidade com qualidade e credibilidade.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-14 h-14 bg-red-100 text-red-700 rounded-xl flex items-center justify-center mb-6">
              <Heart size={30} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Nossos Valores</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Paixão pelo que fazemos. Qualidade em cada detalhe. Respeito aos clientes e colaboradores.
            </p>
          </div>
        </section>

        <section className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 p-3 rounded-xl text-red-700 mt-1">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Onde estamos</h3>
              <p className="text-gray-700 mb-4">Rua Anfiloquio Nunes Pires nº 351, Figueira - Gaspar/SC</p>
              <Link
                href="/contato"
                className="inline-flex items-center gap-2 bg-red-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-800 transition-colors"
              >
                Ver canais de contato
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
