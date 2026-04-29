import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

interface User {
  id: string;
  phone: string;
  displayName: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (phone: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  login: (phone: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on init
    const savedUser = localStorage.getItem('droprun_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const signup = async (phone: string, password: string, displayName: string) => {
    try {
      // 1. Check if user exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .single();

      if (existing) return { error: 'Phone number already registered' };

      // 2. Hash password
      const salt = bcrypt.genSaltSync(10);
      const password_hash = bcrypt.hashSync(password, salt);

      // 3. Insert user
      const { data, error } = await supabase
        .from('users')
        .insert({
          phone,
          password_hash,
          display_name: displayName,
          created_at: Date.now()
        })
        .select()
        .single();

      if (error) throw error;

      const newUser = { id: data.id, phone: data.phone, displayName: data.display_name };
      setUser(newUser);
      localStorage.setItem('droprun_user', JSON.stringify(newUser));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const login = async (phone: string, password: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      if (error || !data) return { error: 'Invalid phone or password' };

      // Verify hash
      const isValid = bcrypt.compareSync(password, data.password_hash);
      if (!isValid) return { error: 'Invalid phone or password' };

      const loggedUser = { id: data.id, phone: data.phone, displayName: data.display_name };
      setUser(loggedUser);
      localStorage.setItem('droprun_user', JSON.stringify(loggedUser));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('droprun_user');
  };

  const setDisplayName = async (name: string) => {
    if (user) {
      // Update in DB
      const { error } = await supabase
        .from('users')
        .update({ display_name: name })
        .eq('id', user.id);
      
      if (!error) {
        const updatedUser = { ...user, displayName: name };
        setUser(updatedUser);
        localStorage.setItem('droprun_user', JSON.stringify(updatedUser));
      }
    } else {
      // Fallback for guest users (legacy support)
      localStorage.setItem('droprun_displayName', name);
      // We don't have a 'user' object for guests anymore in the new AuthContext, 
      // but we can provide a shim.
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, setDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  
  const [guestName, setGuestName] = useState(() => localStorage.getItem('droprun_displayName') || '');

  return {
    ...context,
    userId: context.user?.id || '',
    displayName: context.user?.displayName || guestName,
    setDisplayName: async (name: string) => {
      await context.setDisplayName(name);
      if (!context.user) setGuestName(name);
    }
  };
};

