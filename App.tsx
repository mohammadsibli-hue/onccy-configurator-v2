import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Configurator } from './pages/Configurator';
import { ProductDetail } from './pages/ProductDetail';
import { CostConfigurator } from './pages/CostConfigurator';
import { AdminDashboard } from './pages/Admin';
import { Login } from './pages/Login';
import { StorageService } from './services/storage';
import { Part, User } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'configurator' | 'admin' | 'login'>('configurator');
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'cost'>('list');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [configuratorType, setConfiguratorType] = useState<'parameter' | 'cost' | null>(null);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if session persists
    const sessionStr = localStorage.getItem('switchcraft_user_session');
    if (sessionStr) {
      try {
        const user = JSON.parse(sessionStr);
        setCurrentUser(user);
      } catch (e) {
        localStorage.removeItem('switchcraft_user_session');
      }
    }
    // Init DB
    StorageService.init();
  }, []);

  // Redirect if on admin page but not logged in
  useEffect(() => {
    if (currentPage === 'admin' && !currentUser) {
      setCurrentPage('login');
    }
  }, [currentPage, currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('switchcraft_user_session', JSON.stringify(user));
    setCurrentPage('admin');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('switchcraft_user_session');
    setCurrentPage('configurator');
    setCurrentView('list');
  };

  const navigateTo = (page: 'configurator' | 'admin' | 'login') => {
    if (page === 'admin' && !currentUser) {
      setCurrentPage('login');
    } else {
      setCurrentPage(page);
      if (page === 'configurator') {
        setCurrentView('list'); // Reset to list when clicking header link
      }
    }
  };

  const handleProductSelect = (part: Part, type: 'parameter' | 'cost') => {
    setSelectedPart(part);
    setConfiguratorType(type);
    if (type === 'parameter') {
      setCurrentView('detail');
    } else {
      setCurrentView('cost');
    }
    window.scrollTo(0,0);
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedPart(null);
  };

  return (
    <Layout 
      currentPage={currentPage} 
      onNavigate={navigateTo} 
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {currentPage === 'configurator' && (
        currentView === 'list' ? (
          <Configurator onProductSelect={handleProductSelect} />
        ) : currentView === 'detail' ? (
          selectedPart && <ProductDetail part={selectedPart} onBack={handleBackToList} />
        ) : currentView === 'cost' ? (
          selectedPart && <CostConfigurator part={selectedPart} onBack={handleBackToList} />
        ) : null
      )}
      {currentPage === 'admin' && currentUser && <AdminDashboard currentUser={currentUser} />}
      {currentPage === 'login' && <Login onLogin={handleLogin} />}
    </Layout>
  );
};

export default App;