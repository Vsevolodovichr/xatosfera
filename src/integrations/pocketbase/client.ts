import PocketBase from 'pocketbase';

// URL з .env або Cloudflare Env Vars
const pbUrl = import.meta.env.VITE_POCKETBASE_URL;

if (!pbUrl) {
  throw new Error('VITE_POCKETBASE_URL не встановлено');
}

const pb = new PocketBase(pbUrl);

// Автоматичне відновлення автентифікації з cookies/localStorage
pb.authStore.loadFromCookie(document?.cookie ?? '');

export default pb;