export const whatsappNumbers = Object.freeze([
  '5547996190693',
  '5547988237774',
  '554733180795',
]);

export function createWhatsAppUrl(message = '', random = Math.random) {
  const number = whatsappNumbers[Math.floor(random() * whatsappNumbers.length)];
  const url = new URL(`https://wa.me/${number}`);
  if (message) url.searchParams.set('text', message);
  return url.toString();
}
