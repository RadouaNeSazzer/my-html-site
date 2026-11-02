import {
  buildWhatsAppUrl,
  nextIsoDate,
  normaliseBooking,
  shouldShowFloatingBooking,
  validateBooking,
} from './booking.js';
import { applyLocale, translations } from './content.js';

let currentLocale = 'ar';

function storedLocale() {
  try {
    const locale = globalThis.localStorage?.getItem('hotel-saharien-locale');
    return locale === 'fr' || locale === 'ar' ? locale : 'ar';
  } catch {
    return 'ar';
  }
}

function updateAccessibleLabels(locale) {
  const labels = translations[locale].attributes;
  const menuToggle = document.querySelector('[data-menu-toggle]');

  document.querySelector('#primary-navigation')?.setAttribute('aria-label', labels.navLabel);
  document.querySelectorAll('[data-rating-label]').forEach((rating) => {
    rating.setAttribute('aria-label', labels.heroRating);
  });
  document.querySelector('.scroll-cue')?.setAttribute('aria-label', labels.scrollBooking);
  document.querySelector('.review-topics')?.setAttribute('aria-label', labels.reviewTopics);
  document.querySelector('.location__map iframe')?.setAttribute('title', labels.mapTitle);
  document.querySelector('.floating-whatsapp')?.setAttribute('aria-label', labels.whatsappLabel);
  document.querySelectorAll('[data-i18n-alt]').forEach((image) => {
    image.setAttribute('alt', labels[image.dataset.i18nAlt]);
  });
  menuToggle?.setAttribute(
    'aria-label',
    menuToggle.getAttribute('aria-expanded') === 'true' ? labels.menuClose : labels.menuOpen,
  );
}

function setLocale(locale) {
  currentLocale = locale === 'fr' ? 'fr' : 'ar';
  applyLocale(currentLocale);
  updateAccessibleLabels(currentLocale);
  document.documentElement.classList.remove('locale-pending');
  const bookingError = document.querySelector('#booking-error');
  if (bookingError) bookingError.textContent = '';
  document.querySelectorAll('#booking-form [aria-invalid="true"]').forEach((field) => {
    field.removeAttribute('aria-invalid');
  });
}

function initialiseLocale() {
  const toggle = document.querySelector('[data-locale-toggle]');
  setLocale(storedLocale());

  toggle?.addEventListener('click', () => {
    setLocale(currentLocale === 'ar' ? 'fr' : 'ar');
  });
}

function initialiseMenu() {
  const header = document.querySelector('#site-header');
  const navigation = document.querySelector('#primary-navigation');
  const toggle = document.querySelector('[data-menu-toggle]');
  const backgroundRegions = [...document.querySelectorAll('[data-menu-inert]')];
  if (!header || !navigation || !toggle) return;

  const setOpen = (open, restoreFocus = false) => {
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    backgroundRegions.forEach((element) => {
      element.inert = open;
    });
    updateAccessibleLabels(currentLocale);

    if (open) {
      requestAnimationFrame(() => navigation.querySelector('a')?.focus());
    } else if (restoreFocus) {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false, true);
    }
  });
  window.matchMedia('(min-width: 60.01rem)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

function localTodayIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initialiseBooking() {
  const form = document.querySelector('#booking-form');
  const arrival = document.querySelector('#arrival');
  const departure = document.querySelector('#departure');
  const error = document.querySelector('#booking-error');
  if (!form || !arrival || !departure || !error) return;

  const today = localTodayIso();
  arrival.min = today;
  departure.min = nextIsoDate(today);

  arrival.addEventListener('change', () => {
    departure.min = nextIsoDate(arrival.value) ?? nextIsoDate(today);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    form.querySelectorAll('[aria-invalid="true"]').forEach((field) => {
      field.removeAttribute('aria-invalid');
    });

    const details = normaliseBooking(Object.fromEntries(new FormData(form)));
    const validation = validateBooking(details);
    if (!validation.valid) {
      const field = form.elements.namedItem(validation.field);
      error.textContent = translations[currentLocale].errors[validation.code];
      field?.setAttribute('aria-invalid', 'true');
      field?.focus();
      return;
    }

    error.textContent = '';
    const url = buildWhatsAppUrl(details, currentLocale);
    if (!url) return;
    const bookingWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (bookingWindow) bookingWindow.opener = null;
  });
}

function initialiseHeader() {
  const header = document.querySelector('#site-header');
  if (!header) return;

  let frameRequested = false;
  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
    document.body.classList.toggle('has-scrolled', shouldShowFloatingBooking(window.scrollY));
    frameRequested = false;
  };
  window.addEventListener('scroll', () => {
    if (!frameRequested) {
      frameRequested = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

function initialiseReveals() {
  const elements = [...document.querySelectorAll('[data-reveal]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!elements.length || reduceMotion || !('IntersectionObserver' in window)) return;

  document.body.classList.add('reveal-ready');
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

  elements.forEach((element) => observer.observe(element));
}

function initialisePage() {
  initialiseLocale();
  initialiseMenu();
  initialiseBooking();
  initialiseHeader();
  initialiseReveals();
  const year = document.querySelector('[data-current-year]');
  if (year) year.textContent = String(new Date().getFullYear());
}

initialisePage();
