const WHATSAPP_NUMBER = '213770060307';
const MAX_GUESTS = 20;

const COPY = {
  ar: {
    opening: 'مرحباً Hôtel Saharien، أود الاستفسار عن توفر إقامة.',
    arrival: 'تاريخ الوصول',
    departure: 'تاريخ المغادرة',
    guests: 'عدد الضيوف',
    closing: 'يرجى تأكيد التوفر والسعر.',
  },
  fr: {
    opening: "Bonjour Hôtel Saharien, je souhaite vérifier la disponibilité d'un séjour.",
    arrival: 'Arrivée',
    departure: 'Départ',
    guests: 'Voyageurs',
    closing: 'Merci de me confirmer la disponibilité et le tarif.',
  },
};

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  );
}

function formatDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function nextIsoDate(value) {
  if (!isValidIsoDate(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return date.toISOString().slice(0, 10);
}

export function shouldShowFloatingBooking(scrollY) {
  return Number.isFinite(scrollY) && scrollY > 240;
}

export function normaliseBooking(details = {}) {
  const rawGuests = details.guests ?? 1;

  return {
    arrival: String(details.arrival ?? '').trim(),
    departure: String(details.departure ?? '').trim(),
    guests: typeof rawGuests === 'number' ? rawGuests : Number(String(rawGuests).trim()),
  };
}

export function validateBooking(details = {}) {
  const booking = normaliseBooking(details);
  const hasArrival = booking.arrival.length > 0;
  const hasDeparture = booking.departure.length > 0;

  if (!Number.isInteger(booking.guests) || booking.guests < 1 || booking.guests > MAX_GUESTS) {
    return { valid: false, code: 'invalid_guests', field: 'guests' };
  }

  if (hasArrival && !isValidIsoDate(booking.arrival)) {
    return { valid: false, code: 'invalid_date', field: 'arrival' };
  }

  if (hasDeparture && !isValidIsoDate(booking.departure)) {
    return { valid: false, code: 'invalid_date', field: 'departure' };
  }

  if (hasArrival !== hasDeparture) {
    return {
      valid: false,
      code: 'complete_date_range',
      field: hasArrival ? 'departure' : 'arrival',
    };
  }

  if (hasArrival && booking.departure <= booking.arrival) {
    return { valid: false, code: 'departure_after_arrival', field: 'departure' };
  }

  return { valid: true, code: null, field: null };
}

export function buildWhatsAppUrl(details = {}, locale = 'ar') {
  const booking = normaliseBooking(details);
  if (!validateBooking(booking).valid) return null;

  const language = locale === 'fr' ? 'fr' : 'ar';
  const copy = COPY[language];
  const lines = [copy.opening];

  if (booking.arrival && booking.departure) {
    lines.push(`${copy.arrival}${language === 'fr' ? ' :' : ':'} ${formatDate(booking.arrival)}`);
    lines.push(`${copy.departure}${language === 'fr' ? ' :' : ':'} ${formatDate(booking.departure)}`);
  }

  lines.push(`${copy.guests}${language === 'fr' ? ' :' : ':'} ${booking.guests}`);
  lines.push(copy.closing);

  const url = new URL(`https://wa.me/${WHATSAPP_NUMBER}`);
  url.search = new URLSearchParams({ text: lines.join('\n') }).toString();
  return url.toString();
}
