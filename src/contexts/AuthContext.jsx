// src/contexts/AuthContext.jsx
// Authentication and Access Control (ported from js/auth.js)
import { createContext, useContext, useState, useCallback } from 'react';
import { useData } from './DataContext';

const AuthContext = createContext(null);

const ALL_MENUS = [
  { id: "dashboard", label: "Dashboard", icon: "📊", roles: ["admin","store_manager","store_operator","viewer"], group: "Main" },
  { id: "users", label: "User Management", icon: "👤", roles: ["admin"], group: "Master" },
  { id: "products", label: "Product Master", icon: "📦", roles: ["admin","store_manager","store_operator","viewer"], group: "Master" },
  { id: "jobworkers", label: "Job Worker Master", icon: "🏭", roles: ["admin","store_manager","store_operator","viewer"], group: "Master" },
  { id: "transporters", label: "Transporter List", icon: "🚛", roles: ["admin","store_manager","store_operator","viewer"], group: "Master" },
  { id: "deliverynotes", label: "Delivery Note", icon: "📝", roles: ["admin","store_manager","store_operator","viewer"], group: "Operations" },
  { id: "acceptance", label: "Delivery Acceptance", icon: "✅", roles: ["job_worker"], group: "Operations" },
  { id: "grn", label: "GRN Form", icon: "📥", roles: ["admin","store_manager","store_operator","viewer"], group: "Operations" },
  { id: "production", label: "Production Tracking", icon: "⚙️", roles: ["admin","store_manager","store_operator","job_worker","viewer"], group: "Operations" },
  { id: "aging", label: "Aging Analysis", icon: "📈", roles: ["admin","store_manager","store_operator","viewer"], group: "Reports" }
];

export function AuthProvider({ children }) {
  const { db } = useData();
  const [currentUser, setCurrentUser] = useState(() => db.session.getCurrent());

  const login = useCallback((username, password) => {
    const user = db.users.getByUsername(username);
    if (!user) return { success: false, message: "Username not found" };
    if (user.status !== "active") return { success: false, message: "User account is inactive. Contact administrator." };
    if (user.password !== password) return { success: false, message: "Incorrect password" };

    const sessionUser = {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      linkedJobWorkerId: user.linkedJobWorkerId,
      email: user.email
    };
    db.session.setCurrent(sessionUser);
    user.lastLogin = new Date().toISOString();
    db.users.save(user);
    setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  }, [db]);

  const logout = useCallback(() => {
    db.session.clear();
    setCurrentUser(null);
  }, [db]);

  const isLoggedIn = currentUser !== null;

  const getUserRole = () => currentUser ? currentUser.role : null;

  const checkAccess = (requiredRoles) => {
    if (!currentUser) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.includes(currentUser.role);
  };

  const getAllMenus = () => ALL_MENUS;

  const getAllowedNavigation = () => {
    if (!currentUser) return [];
    const role = currentUser.role;
    const filtered = ALL_MENUS.filter(menu => {
      const roleOk = menu.roles.includes(role);
      const screenOk = currentUser.allowedScreens ? currentUser.allowedScreens.includes(menu.id) : true;
      return roleOk && screenOk;
    });

    const masterIds = ["users", "products", "jobworkers", "transporters"];
    const masterChildren = filtered.filter(m => masterIds.includes(m.id));
    const otherMenus = filtered.filter(m => !masterIds.includes(m.id));

    const navigation = [];
    if (masterChildren.length) {
      navigation.push({ id: "master", label: "Master", icon: "🗂️", group: "Main", children: masterChildren });
    }
    navigation.push(...otherMenus);
    return navigation;
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isLoggedIn, getUserRole, checkAccess, getAllMenus, getAllowedNavigation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
