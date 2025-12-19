import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "./contexts/DataContext";
import Overview from "./pages/Overview";
import Upload from "./pages/Upload";
import BusinessRules from "./pages/BusinessRules";
import PL from "./pages/PL";
import ByBranch from "./pages/ByBranch";
import ByCategory from "./pages/ByCategory";
import EVA from "./pages/EVA";
import EVAReport from "./pages/EVAReport";
import Expenses from "./pages/Expenses";
import Evolution from "./pages/Evolution";
import Reports from "./pages/Reports";
import Forecast from "./pages/Forecast";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <DataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/business-rules" element={<BusinessRules />} />
            <Route path="/pl" element={<PL />} />
            <Route path="/by-branch" element={<ByBranch />} />
            <Route path="/by-category" element={<ByCategory />} />
            <Route path="/eva" element={<EVA />} />
            <Route path="/eva-report" element={<EVAReport />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/evolution" element={<Evolution />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </DataProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
