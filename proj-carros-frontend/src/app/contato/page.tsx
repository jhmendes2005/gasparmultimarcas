"use client";

import { Phone, Clock, Navigation, MessageCircle, MapPin } from "lucide-react";
import { useWhatsApp } from "@/src/context/WhatsAppContext";

const ADDRESS = "Rua Anfiloquio Nunes Pires nº 351, Figueira - Gaspar/SC";

export default function Contato() {
  const { openModal } = useWhatsApp();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-black py-16 text-center text-white">
        <h1 className="text-4xl font-bold mb-4">Fale Conosco</h1>
        <p className="text-red-200">Estamos prontos para atender você com transparência e agilidade.</p>
      </div>

      <div className="container mx-auto px-4 -mt-10 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Atendimento Online</h3>
              <p className="text-gray-500 text-sm mb-6">Fale com nossos consultores agora mesmo pelo WhatsApp.</p>
              <button
                onClick={openModal}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-green-500 px-6 py-4 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-green-600"
              >
                <MessageCircle size={24} />
                Iniciar Conversa
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
              <div className="flex items-start gap-3">
                <MapPin className="h-6 w-6 text-red-600 mt-1" />
                <div>
                  <h4 className="font-bold text-gray-900">Endereço</h4>
                  <p className="text-gray-600 text-sm">{ADDRESS}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-gray-700">(47) 99619-0693</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-gray-700">(47) 98823-7774</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-gray-700">(47) 3318-0795</span>
                </div>
              </div>
            </div>

            <div className="bg-red-700 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center gap-3 mb-4">
                <Clock size={24} className="text-red-200" />
                <h3 className="font-bold text-lg">Horário de Atendimento</h3>
              </div>
              <p className="text-sm text-red-100">Segunda a Sexta das 09:00 às 18:00</p>
              <p className="text-sm text-red-100">Sábados das 08:00 às 12:00</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center gap-2 text-gray-800">
                <Navigation size={18} className="text-red-700" />
                <h2 className="font-bold text-lg">Nossa Localização</h2>
              </div>
              <div className="h-[420px] w-full bg-gray-200">
                <iframe
                  src="https://www.google.com/maps?q=Rua+Anfiloquio+Nunes+Pires+351+Gaspar+SC&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
