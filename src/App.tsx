import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "./contexts/DataContext";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Upload from "./pages/Upload";
import PL from "./pages/PL";
import ByBranch from "./pages/ByBranch";
import EVA from "./pages/EVA";
import Expenses from "./pages/Expenses";
import Evolution from "./pages/Evolution";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DataProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/pl" element={<PL />} />
            <Route path="/by-branch" element={<ByBranch />} />
            <Route path="/eva" element={<EVA />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/evolution" element={<Evolution />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </DataProvider>
  </QueryClientProvider>
);

export default App;
