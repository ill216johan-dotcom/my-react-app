import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Successful login
      navigate('/exchange');
    } catch (error) {
      setError(error.message || 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!fullName.trim()) {
      setError('ФИО обязательно для заполнения');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // Show success message
      alert('Регистрация успешна! Проверьте вашу почту для подтверждения аккаунта.');
      setIsSignUp(false);
      setFullName('');
      setPassword('');
    } catch (error) {
      setError(error.message || 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo or Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isSignUp ? 'Создать аккаунт' : 'Добро пожаловать'}
          </h1>
          <p className="text-gray-500">
            {isSignUp ? 'Зарегистрируйтесь для начала' : 'Войдите чтобы продолжить'}
          </p>
        </div>

        {/* Toggle Tabs */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              !isSignUp
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              isSignUp
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
          {/* Full Name (Sign Up Only) */}
          {isSignUp && (
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                ФИО
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="Введите ваше полное имя"
                required={isSignUp}
              />
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              placeholder="Введите ваш email"
              required
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              placeholder="Введите ваш пароль"
              required
              minLength={6}
            />
            {isSignUp && (
              <p className="text-xs text-gray-500 mt-1">
                Пароль должен содержать минимум 6 символов
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
              loading
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
            }`}
          >
            {loading ? 'Обработка...' : isSignUp ? 'Регистрация' : 'Войти'}
          </button>
        </form>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          {isSignUp ? (
            <p>
              Уже есть аккаунт?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Войти
              </button>
            </p>
          ) : (
            <p>
              Нет аккаунта?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Зарегистрироваться
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;

