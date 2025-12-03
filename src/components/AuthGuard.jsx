import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

/**
 * AuthGuard Component
 * 
 * Wraps protected routes and checks if user is authenticated.
 * If not authenticated, redirects to /auth.
 */
function AuthGuard({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check current session and ban status
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
          setUser(null);
        } else if (session?.user) {
          // Check if user is banned
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_banned')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Error checking profile:', profileError);
          }

          if (profile?.is_banned) {
            // User is banned - force logout
            alert('Ваш аккаунт был заблокирован. Обратитесь к администратору.');
            await supabase.auth.signOut();
            setUser(null);
          } else {
            setUser(session.user);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in checkSession:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Check ban status on auth change
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_banned')
          .eq('id', session.user.id)
          .single();

        if (profile?.is_banned) {
          alert('Ваш аккаунт был заблокирован. Обратитесь к администратору.');
          await supabase.auth.signOut();
          setUser(null);
        } else {
          setUser(session.user);
        }
      } else {
        setUser(null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Render protected content if authenticated
  return children;
}

export default AuthGuard;

