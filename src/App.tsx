import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "./contexts/DataContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Upload from "./pages/Upload";
import BusinessRules from "./pages/BusinessRules";
import PL from "./pages/PL";
import ByBranch from "./pages/ByBranch";
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
      <AuthProvider>
        <DataProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
              <Route path="/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
              <Route path="/business-rules" element={<ProtectedRoute><BusinessRules /></ProtectedRoute>} />
              <Route path="/pl" element={<ProtectedRoute><PL /></ProtectedRoute>} />
              <Route path="/by-branch" element={<ProtectedRoute><ByBranch /></ProtectedRoute>} />
              <Route path="/eva" element={<ProtectedRoute><EVA /></ProtectedRoute>} />
              <Route path="/eva-report" element={<ProtectedRoute><EVAReport /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/evolution" element={<ProtectedRoute><Evolution /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/forecast" element={<ProtectedRoute><Forecast /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
