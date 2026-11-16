import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWhatsAppUrl, whatsappNumbers } from '../dist/contact-routing.js';

test('sorteio cobre os três contatos com intervalos iguais', () => {
  assert.equal(whatsappNumbers.length, 3);
  for (let i = 0; i < 3; i++) {
    const url = new URL(createWhatsAppUrl('', () => (i + 0.5) / 3));
    assert.equal(url.pathname, '/' + whatsappNumbers[i]);
  }
});

test('mensagem do veículo é preservada no contato sorteado', () => {
  const message = 'Olá! Tenho interesse no HR-V, R$ 134.900. Ele está disponível?';
  const url = new URL(createWhatsAppUrl(message, () => 0.99));
  assert.equal(url.pathname, '/554733180795');
  assert.equal(url.searchParams.get('text'), message);
});
