/* LOCKA shared flow: client-side demo storage */
const LOCKA = {
 get(k, fallback=null){try{return JSON.parse(localStorage.getItem(k)) ?? fallback}catch{return fallback}},
 set(k,v){localStorage.setItem(k,JSON.stringify(v))},
 go(path){location.href=path},
 home:'../home Screen/index.html',
 reservations:'../reservations.html',
 profile:'../profile.html',
 notifications:'../notifications.html',
 payment:'../payment method/index.html',
 details:'../Booking Details/booking-details.html',
};


/* In-app reservation reminders. Timers can fire while this site is open. */
(function(){
 if (window.__lockaNotificationsStarted) return;
 window.__lockaNotificationsStarted = true;
 const booking = LOCKA.get('lockaBooking');
 if (!booking || booking.status === 'cancelled' || !booking.startAt || !booking.endAt) return;
 const start = new Date(booking.startAt).getTime(), end = new Date(booking.endAt).getTime();
 if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
 const ref = booking.bookingRef || booking.createdAt || `${booking.startAt}_${booking.locker||''}`;
 const events = [
  {key:'before-start',at:start-5*60*1000,expiresAt:start,title:'حان وقت حجزك قريبًا',message:'سيبدأ حجز اللوكر خلال 5 دقائق.'},
  {key:'before-end',at:end-30*60*1000,expiresAt:end,title:'باقي 30 دقيقة على انتهاء الحجز',message:'يرجى الاستعداد لإنهاء استخدام اللوكر قبل انتهاء الحجز.'},
  {key:'ended',at:end,expiresAt:end+24*60*60*1000,title:'انتهى الحجز',message:'انتهى وقت حجزك.'}
 ];
 const read=()=>LOCKA.get('lockaNotifications',[]);
 const add=(ev)=>{
  const items=read(), id=`${ref}:${ev.key}`;
  if(items.some(n=>n.id===id)) return;
  items.unshift({id,bookingRef:String(ref),type:ev.key,title:ev.title,message:ev.message,at:new Date(ev.at).toISOString(),createdAt:new Date().toISOString(),read:false});
  LOCKA.set('lockaNotifications',items.slice(0,100));
  try { if ('Notification' in window && Notification.permission==='granted') new Notification(ev.title,{body:ev.message}); } catch(_){}
  window.dispatchEvent(new CustomEvent('locka:notification',{detail:ev}));
 };
 events.forEach(ev=>{
  const delay=ev.at-Date.now();
  if(delay<=0) { if(Date.now()<ev.expiresAt) add(ev); }
  else if(delay<2147480000) window.setTimeout(()=>add(ev),delay);
 });
})();
