const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getBackendBaseUrl = () => API_URL.replace(/\/api\/?$/, '');

const categoryThemes = {
  Appetizer: ['#f97316', '#fb923c'],
  'Main Course': ['#16a34a', '#22c55e'],
  Dessert: ['#ec4899', '#f472b6'],
  Beverage: ['#0ea5e9', '#38bdf8'],
  Snack: ['#f59e0b', '#fbbf24'],
  Special: ['#4f46e5', '#6366f1']
};

const namedDishQueries = {
  'chicken biryani': 'chicken biryani indian food',
  biryani: 'biryani indian rice dish',
  'curd rice': 'curd rice south indian food',
  'filter coffee': 'south indian filter coffee',
  coffee: 'indian coffee cup',
  'gulab jamun': 'gulab jamun dessert',
  'idli sambhar': 'idli sambar south indian breakfast',
  idli: 'idli south indian food',
  'masala dosa': 'masala dosa south indian food',
  dosa: 'dosa indian crepe',
  'paneer butter masala': 'paneer butter masala curry',
  paneer: 'paneer curry indian food',
  pongal: 'ven pongal south indian dish',
  samosa: 'samosa indian snack',
  vada: 'medu vada south indian snack'
};

const buildUnsplashQueryImage = (query, signature = 1) => {
  const tokenized = String(query || '')
    .split(/\s+/)
    .filter(Boolean)
    .join(',');

  return `https://source.unsplash.com/1200x800/?${encodeURIComponent(tokenized)}&sig=${signature}`;
};

const normalizeDishName = (dishName = '') => {
  return String(dishName || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getNamedDishImage = (dishName = '') => {
  const key = normalizeDishName(dishName);
  if (!key) {
    return '';
  }

  if (namedDishQueries[key]) {
    return buildUnsplashQueryImage(namedDishQueries[key], 7);
  }

  const partialMatchKey = Object.keys(namedDishQueries)
    .sort((a, b) => b.length - a.length)
    .find((nameKey) => key.includes(nameKey));

  if (partialMatchKey) {
    return buildUnsplashQueryImage(namedDishQueries[partialMatchKey], 11);
  }

  return '';
};

export const normalizeDishImageUrl = (imageUrl) => {
  const value = String(imageUrl || '').trim();
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith('//')) {
    return `https:${value}`;
  }

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
};

export const getDishFallbackImage = (dishName = 'Dish', category = 'Special') => {
  const [startColor, endColor] = categoryThemes[category] || categoryThemes.Special;
  const safeTitle = String(dishName || 'Dish').replace(/[<&>]/g, '').slice(0, 24);
  const safeCategory = String(category || 'Special').replace(/[<&>]/g, '').slice(0, 20);

  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='800' height='500' viewBox='0 0 800 500'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='${startColor}' />
          <stop offset='100%' stop-color='${endColor}' />
        </linearGradient>
      </defs>
      <rect width='800' height='500' fill='url(#g)' />
      <circle cx='120' cy='120' r='90' fill='rgba(255,255,255,0.18)' />
      <circle cx='700' cy='430' r='140' fill='rgba(255,255,255,0.14)' />
      <text x='50%' y='48%' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Segoe UI, Arial, sans-serif' font-size='46' font-weight='700'>${safeTitle}</text>
      <text x='50%' y='62%' dominant-baseline='middle' text-anchor='middle' fill='rgba(255,255,255,0.88)' font-family='Segoe UI, Arial, sans-serif' font-size='28'>${safeCategory}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const getDishImageSrc = (dish) => {
  const direct = normalizeDishImageUrl(dish?.imageUrl);
  if (direct) {
    return direct;
  }

  const named = getNamedDishImage(dish?.name);
  if (named) {
    return named;
  }

  return getDishFallbackImage(dish?.name, dish?.category);
};
