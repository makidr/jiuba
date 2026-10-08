import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GuestProvider } from "./contexts/GuestContext";

// Audience pages
import AudienceHome from "./pages/audience/Home";
import PerformerDetail from "./pages/audience/PerformerDetail";
import MyRequests from "./pages/audience/MyRequests";

// Stage (performer workstation)
import Stage from "./pages/stage/Stage";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminPerformers from "./pages/admin/Performers";
import AdminSongs from "./pages/admin/Songs";
import AdminSessions from "./pages/admin/Sessions";
import AdminRevenue from "./pages/admin/Revenue";
import AdminQRCodes from "./pages/admin/QRCodes";
import AdminSiteSettings from "./pages/admin/SiteSettings";

function Router() {
  return (
    <Switch>
      {/* Audience routes */}
      <Route path="/" component={AudienceHome} />
      <Route path="/performer/:id" component={PerformerDetail} />
      <Route path="/my-requests" component={MyRequests} />

      {/* Stage (performer workstation) */}
      <Route path="/stage" component={Stage} />

      {/* Admin routes */}
      <Route path="/admin">
        {() => (
          <AdminLayout>
            <AdminPerformers />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/performers">
        {() => (
          <AdminLayout>
            <AdminPerformers />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/songs">
        {() => (
          <AdminLayout>
            <AdminSongs />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/sessions">
        {() => (
          <AdminLayout>
            <AdminSessions />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/qrcodes">
        {() => (
          <AdminLayout>
            <AdminQRCodes />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/revenue">
        {() => (
          <AdminLayout>
            <AdminRevenue />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/settings">
        {() => (
          <AdminLayout>
            <AdminSiteSettings />
          </AdminLayout>
        )}
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <GuestProvider>
        <TooltipProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "oklch(0.18 0.01 270)",
                border: "1px solid oklch(0.28 0.01 270)",
                color: "oklch(0.93 0.01 80)",
              },
            }}
          />
          <Router />
        </TooltipProvider>
        </GuestProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
