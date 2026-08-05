import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNav } from "@/components/TopNav";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Vendas from "./pages/Vendas";
import InputDiario from "./pages/InputDiario";
import GestaoSafras from "./pages/GestaoSafras";
import CustosMarketing from "./pages/CustosMarketing";
import Metas from "./pages/Metas";
import Configuracoes from "./pages/Configuracoes";
import CSLive from "./pages/CSLive";
import FunilXPTO from "./pages/FunilXPTO";
import MapaGeografico from "./pages/MapaGeografico";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import AdminLayout from "./pages/admin/AdminLayout";
import Usuarios from "./pages/admin/Usuarios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function Shell() {
  const { pathname } = useLocation();
  const isLive = pathname.startsWith("/live");
  if (isLive) {
    return (
      <Routes>
        <Route path="/live" element={<CSLive />} />
      </Routes>
    );
  }
  return (
    <div className="min-h-screen flex flex-col w-full">
      <TopNav />
      <main className="flex-1 px-4 md:px-6 py-6 mx-auto w-full max-w-[1600px]">
        <Routes>
          {/* Páginas públicas */}
          <Route path="/" element={<Index />} />
          <Route path="/funil-xpto" element={<FunilXPTO />} />
          <Route path="/mapa" element={<MapaGeografico />} />

          {/* Login */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Área administrativa (protegida) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<InputDiario />} />
            <Route path="comercial" element={<Vendas />} />
            <Route path="input-diario" element={<InputDiario />} />
            <Route path="safras" element={<GestaoSafras />} />
            <Route path="marketing" element={<CustosMarketing />} />
            <Route path="metas" element={<Metas />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="usuarios" element={<Usuarios />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
