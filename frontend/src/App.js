import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Home from "./pages/Home";
import Billing from "./pages/Billing";
import Receipts from "./pages/Receipts";
import Inventory from "./pages/Inventory";
import Analytics from "./pages/Analytics";
import AIAgents from "./pages/AIAgents";
import Settings from "./pages/Settings";
import Notification from "./pages/Notification";
import ReceiptDetail from "./pages/ReceiptDetail";
import Logout from "./pages/Logout";
import Login from "./pages/Login";

export default function App() {
    const [collapsed, setCollapsed] = useState(window.innerWidth < 768);
    const [user, setUser] = useState(null);
    const [authChecking, setAuthChecking] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setCollapsed(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const savedUser = localStorage.getItem("medipay_user");
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setAuthChecking(false);
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
        navigate("/");
    };

    const handleLogout = () => {
        localStorage.removeItem("medipay_user");
        setUser(null);
        navigate("/login");
    };

    if (authChecking) return null;

    if (!user) {
        return (
            <Routes>
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    return ( 
        <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
            {/* Sidebar Overlay for mobile */}
            {!collapsed && (
                <div 
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden"
                    onClick={() => setCollapsed(true)}
                ></div>
            )}
            
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} user={user} /> 
            
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Navbar collapsed={collapsed} setCollapsed={setCollapsed} user={user} onLogout={handleLogout} /> 
                <main className="p-4 md:p-6 overflow-auto flex-1 h-full">
                    <Routes>
                        <Route path="/" element={<Home />} /> 
                        <Route path="/billing" element={<Billing />} /> 
                        <Route path="/receipts" element={<Receipts />} /> 
                        <Route path="/inventory" element={<Inventory />} /> 
                        <Route path="/analytics" element={<Analytics />} /> 
                        <Route path="/ai-agents" element={<AIAgents />} /> 
                        <Route path="/settings" element={<Settings />} /> 
                        <Route path="/notification" element={<Notification />} /> 
                        <Route path="/receipts/:id" element={<ReceiptDetail />} /> 
                        <Route path="/logout" element={<Logout onLogout={handleLogout} />} /> 
                        <Route path="*" element={<Navigate to="/" replace />} /> 
                    </Routes> 
                </main> 
                <Footer />
            </div> 
        </div>
    );
}