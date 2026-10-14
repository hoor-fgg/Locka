const extendModal = document.getElementById('extendModal');
const cancelModal = document.getElementById('cancelModal');
const toast = document.getElementById('toast');

/*
  اربطوا واجهة الدفع الخاصة بزميلتكم من هنا فقط.
  مثال:
  const PAYMENT_PAGE_URL = '../payment/payment.html';
*/
const PAYMENT_PAGE_URL = '../../payment method/index.html';

const DEFAULT_BOOKING = {
  locker: '',
  building: '',
  floor: '',
  date: '',
  start: '',
  end: '',
  originalMinutes: 0
};

let booking = loadBooking();
booking.extensionMinutes = Number(booking.extensionMinutes || 0);
booking.extensionPrice = Number(booking.extensionPrice || 0);

const extensionOptions = {
  '1h': { minutes: 60, price: 3, label: 'ساعة واحدة' },
  '1d': { minutes: 1440, price: 5, label: 'يوم واحد' },
  '2d': { minutes: 2880, price: 10, label: 'يومان' },
  '3d': { minutes: 4320, price: 15, label: '3 أيام' },
  '4d': { minutes: 5760, price: 20, label: '4 أيام' },
  '5d': { minutes: 7200, price: 25, label: '5 أيام' },
  '6d': { minutes: 8640, price: 25, label: '6 أيام' },
  '7d': { minutes: 10080, price: 25, label: 'أسبوع كامل' }
};

function loadBooking() {
  const params = new URLSearchParams(window.location.search);
  let stored = {};
  try { stored = JSON.parse(sessionStorage.getItem('lockaBooking') || '{}'); } catch (_) {}
  try { stored = { ...JSON.parse(localStorage.getItem('lockaBooking') || '{}'), ...stored }; } catch (_) {}
  if (stored.startAt && !stored.date) { const d=new Date(stored.startAt); stored.date=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; stored.start=`${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  if (stored.endAt && !stored.end) { const d=new Date(stored.endAt); stored.end=`${pad(d.getHours())}:${pad(d.getMinutes())}`; }

  const merged = { ...DEFAULT_BOOKING, ...stored };
  const map = {
    locker: 'locker', building: 'building', floor: 'floor',
    date: 'date', start: 'start', end: 'end', originalMinutes: 'originalMinutes'
  };

  Object.keys(map).forEach((key) => {
    const value = params.get(map[key]);
    if (value !== null && value !== '') merged[key] = key === 'originalMinutes' ? Number(value) : value;
  });

  return merged;
}

function pad(value) { return String(value).padStart(2, '0'); }

function parseDateTime(dateString, timeString) {
  if (!dateString || !timeString) return null;
  const normalized = timeString.trim().replace(/\s+/g, ' ');
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*([صم]))?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = match[3];
  if (suffix === 'م' && hour < 12) hour += 12;
  if (suffix === 'ص' && hour === 12) hour = 0;
  const date = new Date(`${dateString}T${pad(hour)}:${pad(minute)}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function formatTimeFromDate(date) {
  const h = date.getHours();
  const suffix = h >= 12 ? 'م' : 'ص';
  const hour = h % 12 || 12;
  return `${pad(hour)}:${pad(date.getMinutes())} ${suffix}`;
}

function formatDuration(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} دقيقة`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0 && hours > 0) return `${days} يوم و${hours} ساعة`;
  if (days === 1) return 'يوم واحد';
  if (days > 1) return `${days} أيام`;
  if (hours === 1) return 'ساعة واحدة';
  return `${hours} ساعات`;
}

function getCurrentEnd() {
  return parseDateTime(booking.date, booking.end);
}

function updateBookingUI() {
  document.getElementById('lockerNumber').textContent = booking.locker ? `اللوكر رقم ${booking.locker}` : 'اللوكر —';
  document.getElementById('buildingName').textContent = booking.building || '—';
  document.getElementById('floorName').textContent = booking.floor || '—';
  document.getElementById('bookingDate').textContent = booking.date ? booking.date.replaceAll('-', '/') : '—';
  document.getElementById('bookingStart').textContent = booking.start || '—';
  document.getElementById('bookingEnd').textContent = booking.end || '—';
  document.getElementById('originalDuration').textContent = formatDuration(Number(booking.originalMinutes));
  document.getElementById('remainingDuration').textContent = formatDuration(Number(booking.originalMinutes) + Number(booking.extensionMinutes || 0));

  if (booking.extensionMinutes > 0) {
    document.getElementById('extensionValue').textContent = formatDuration(booking.extensionMinutes);
    document.getElementById('extensionPriceValue').textContent = `${booking.extensionPrice} ريال`;
    document.getElementById('extensionRow').hidden = false;
    document.getElementById('extensionPriceRow').hidden = false;
  }

  try { sessionStorage.setItem('lockaBooking', JSON.stringify(booking)); } catch (_) {}
}

function updatePrice() {
  const value = document.getElementById('extendPeriod').value;
  const option = extensionOptions[value];
  document.getElementById('price').textContent = `${option.price} ريال`;

  const currentEnd = getCurrentEnd();
  if (!currentEnd) {
    document.getElementById('newEndPreview').textContent = 'سيتم تحديد وقت الانتهاء بعد ربط بيانات الحجز';
    return;
  }

  const previewEnd = new Date(currentEnd.getTime() + option.minutes * 60000);
  document.getElementById('newEndPreview').textContent = `${formatDate(previewEnd)} — ${formatTimeFromDate(previewEnd)}`;
}

function openExtend() {
  const paidExtension = sessionStorage.getItem('lockaPaidExtension');
  if (paidExtension) {
    try { applyPaidExtension(JSON.parse(paidExtension)); } catch (error) { console.error(error); }
    sessionStorage.removeItem('lockaPaidExtension');
  }
  updatePrice();
  extendModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeExtend() {
  extendModal.style.display = 'none';
  restoreScroll();
}

function openCancel() {
  cancelModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeCancel() {
  cancelModal.style.display = 'none';
  restoreScroll();
}

function restoreScroll() {
  if (extendModal.style.display !== 'flex' && cancelModal.style.display !== 'flex') {
    document.body.style.overflow = '';
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function goToPayment() {
  const value = document.getElementById('extendPeriod').value;
  const option = extensionOptions[value];
  const currentEnd = getCurrentEnd();

  if (!currentEnd) {
    showToast('بيانات وقت انتهاء الحجز غير مرتبطة بعد. اربطي بيانات الحجز أولًا.');
    return;
  }

  

  const newEnd = new Date(currentEnd.getTime() + option.minutes * 60000);
  const paymentData = {
    value,
    minutes: option.minutes,
    price: option.price,
    label: option.label,
    newEnd: newEnd.toISOString(),
    locker: booking.locker,
    building: booking.building,
    floor: booking.floor
  };

  sessionStorage.setItem('lockaExtensionPayment', JSON.stringify(paymentData));
  localStorage.setItem('lockaPendingPayment', JSON.stringify({ ...booking, purpose:'extension', extensionPrice:option.price, extensionLabel:option.label, minutes:option.minutes, newEnd:newEnd.toISOString(), price:option.price }));

  const separator = PAYMENT_PAGE_URL.includes('?') ? '&' : '?';
  const url = `${PAYMENT_PAGE_URL}${separator}${new URLSearchParams({
    amount: String(option.price),
    extension: option.label,
    returnTo: '../reservations.html'
  }).toString()}`;

  window.location.href = url;
}

function applyPaidExtension(paymentData) {
  const newEnd = new Date(paymentData.newEnd);
  if (Number.isNaN(newEnd.getTime())) return;

  booking.date = `${newEnd.getFullYear()}-${pad(newEnd.getMonth() + 1)}-${pad(newEnd.getDate())}`;
  booking.end = formatTimeFromDate(newEnd);
  booking.extensionMinutes += Number(paymentData.minutes || 0);
  booking.extensionPrice += Number(paymentData.price || 0);
  updateBookingUI();
  try { const b=JSON.parse(localStorage.getItem('lockaBooking')||'{}'); b.endAt=newEnd.toISOString(); b.extensionMinutes=booking.extensionMinutes; b.extensionPrice=booking.extensionPrice; localStorage.setItem('lockaBooking',JSON.stringify(b)); } catch(_) {}
  showToast(`تم التمديد حتى ${formatDate(newEnd)} الساعة ${formatTimeFromDate(newEnd)}`);
}

function confirmCancel() {
  closeCancel();
  document.getElementById('bookingContent').hidden = true;
  document.getElementById('emptyBooking').hidden = false;
  sessionStorage.removeItem('lockaBooking');
  try { const b=JSON.parse(localStorage.getItem('lockaBooking')||'{}'); b.status='cancelled'; localStorage.setItem('lockaBooking',JSON.stringify(b)); localStorage.removeItem('lockaPendingPayment'); } catch(_) {}
  sessionStorage.removeItem('lockaExtensionPayment');
  sessionStorage.removeItem('lockaPaidExtension');
  showToast('تم إلغاء الحجز وحذف تفاصيله.');
}

window.addEventListener('click', (event) => {
  if (event.target === extendModal) closeExtend();
  if (event.target === cancelModal) closeCancel();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeExtend();
    closeCancel();
  }
});

const paidExtension = sessionStorage.getItem('lockaPaidExtension');
if (paidExtension) {
  try { applyPaidExtension(JSON.parse(paidExtension)); } catch (error) { console.error(error); }
  sessionStorage.removeItem('lockaPaidExtension');
}

updateBookingUI();
updatePrice();
