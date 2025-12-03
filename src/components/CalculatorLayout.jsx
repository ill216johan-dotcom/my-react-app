import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, User, LogOut, LogIn, Home } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const CalculatorLayout = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  // Auth state
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Check auth status
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { path: '/', label: 'Knowledge Base', exact: true },
    { path: '/calculator', label: 'FBO Calculator' },
    { path: '/ozon-calculator', label: 'Ozon Calculator' },
    { path: '/packaging-calculator', label: 'Packaging' },
    { path: '/exchange', label: 'Exchange' },
  ];

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname === item.path;
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-slate-50'}`}>
      {/* Compact Single-Row Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black border-b border-slate-200 dark:border-neutral-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo + Navigation */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link to="/" className="flex-shrink-0">
                <img 
                  src="/logo-light.svg" 
                  alt="FF Portal" 
                  className="h-8 w-auto block dark:hidden object-contain" 
                />
                <img 
                  src="/logo-dark.svg" 
                  alt="FF Portal" 
                  className="h-8 w-auto hidden dark:block object-contain" 
                />
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive(item)
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right: User Actions */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* User Status */}
              {authLoading ? (
                <div className="w-9 h-9 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-600"></div>
                </div>
              ) : user ? (
                <div className="flex items-center gap-2">
                  {/* User Profile Badge */}
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-neutral-900 rounded-md border border-slate-200 dark:border-neutral-800">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {profile?.full_name?.split(' ')[0] || 'User'}
                    </span>
                  </div>
                  
                  {/* Sign Out */}
                  <button
                    onClick={handleSignOut}
                    className="p-2 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-sm"
                >
                  <LogIn size={16} />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <div className="md:hidden border-t border-slate-200 dark:border-neutral-800">
          <nav className="px-4 py-2 flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive(item)
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area - with padding to account for fixed header */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-20 pb-8">
        {title && (
          <h1 className="text-3xl md:text-4xl font-bold mb-8 leading-tight text-slate-900 dark:text-white">
            {title}
          </h1>
        )}
        {children}
      </main>
    </div>
  );
};

export default CalculatorLayout;

