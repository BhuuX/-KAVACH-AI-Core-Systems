import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Copilot from './pages/Copilot';
import CaseSearch from './pages/CaseSearch';
import CaseDetail from './pages/CaseDetail';
import PersonSearch from './pages/PersonSearch';
import PersonDetail from './pages/PersonDetail';
import VehicleSearch from './pages/VehicleSearch';
import NetworkGraph from './pages/NetworkGraph';
import CrimeMap from './pages/CrimeMap';
import Reports from './pages/Reports';
import AdminConsole from './pages/AdminConsole';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute><AppShell /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="copilot" element={<Copilot />} />
            <Route path="cases" element={<CaseSearch />} />
            <Route path="cases/:id" element={<CaseDetail />} />
            <Route path="persons" element={<PersonSearch />} />
            <Route path="persons/:id" element={<PersonDetail />} />
            <Route path="vehicles" element={<VehicleSearch />} />
            <Route path="network" element={<NetworkGraph />} />
            <Route path="map" element={<CrimeMap />} />
            <Route path="reports" element={<Reports />} />
            <Route path="admin" element={
              <ProtectedRoute roles={['admin']}><AdminConsole /></ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
