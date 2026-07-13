import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthProvider } from "./AuthContext";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProviderWithNavigation: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  
  return (
    <AuthProvider navigate={navigate}>
      {children}
    </AuthProvider>
  );
};
