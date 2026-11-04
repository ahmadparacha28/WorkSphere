
import { createContext, useContext, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("worksphere_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email, password) => {
    const response = await api.post("/Auth/login", {
      email,
      password
    });

    const { token, user: loggedInUser } = response.data;

    localStorage.setItem("worksphere_token", token);
    localStorage.setItem(
      "worksphere_user",
      JSON.stringify(loggedInUser)
    );

    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = () => {
    localStorage.removeItem("worksphere_token");
    localStorage.removeItem("worksphere_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
