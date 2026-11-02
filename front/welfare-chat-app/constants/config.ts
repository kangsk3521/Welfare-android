// 서버 주소. .env에 EXPO_PUBLIC_API_URL을 넣으면 그 값을 쓰고, 없으면 Render 배포 주소를 쓴다.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://welfare-1gs5.onrender.com').replace(/\/$/, '');

// http(s):// → ws(s)://
export const WS_URL = API_URL.replace(/^http/, 'ws');
