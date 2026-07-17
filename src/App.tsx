import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNav } from "@/components/TopNav";
import Index from "./pages/Index";
import Vendas from "./pages/Vendas";
import InputDiario from "./pages/InputDiario";
import GestaoSafras from "./pages/GestaoSafras";
import CustosMarketing from "./pages/CustosMarketing";
import Metas from "./pages/Metas";
import Configuracoes from "./pages/Configuracoes";
import CSLive from "./pages/CSLive";
import FunilXPTO from "./pages/FunilXPTO";
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
          <Route path="/" element={<Index />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/input-diario" element={<InputDiario />} />
          <Route path="/safras" element={<GestaoSafras />} />
          <Route path="/custos" element={<CustosMarketing />} />
          <Route path="/metas" element={<Metas />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/funil-xpto" element={<FunilXPTO />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
