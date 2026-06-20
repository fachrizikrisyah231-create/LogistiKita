import api from './api';
import Cookies from 'js-cookie';

export const login = async (email, password) => {
  const res = await api.post('/auth/login', { email, password });
  const { user, token } = res.data.data;
  Cookies.set('token', token, { expires: 1 });
  Cookies.set('user', JSON.stringify(user), { expires: 1 });
  return user;
};

export const register = async (name, email, password) => {
  const res = await api.post('/auth/register', { name, email, password });
  const { user, token } = res.data.data;
  Cookies.set('token', token, { expires: 1 });
  Cookies.set('user', JSON.stringify(user), { expires: 1 });
  return user;
};

export const logout = () => {
  Cookies.remove('token');
  Cookies.remove('user');
  window.location.href = '/login';
};

export const getUser = () => {
  const userStr = Cookies.get('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
};
