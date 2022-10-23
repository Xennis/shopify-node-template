import { BrowserRouter } from "react-router-dom";
import { NavigationMenu } from "@shopify/app-bridge-react";
import { Routes, Route } from "react-router-dom";


import {
  AppBridgeProvider,
  QueryProvider,
  PolarisProvider,
} from "./components";
import HomePage from "./pages";
import ExitIframe from "./pages/ExitIframe";
import NotFound from "./pages/NotFound";
import PageName from "./pages/pagename";

export default function App() {
  return (
    <PolarisProvider>
      <BrowserRouter>
        <AppBridgeProvider>
          <QueryProvider>
            <NavigationMenu
              navigationLinks={[
                {
                  label: "Page name",
                  destination: "/pagename",
                },
              ]}
            />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/exitIframe" element={<ExitIframe />} />
              <Route path="/pagename" element={<PageName />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </QueryProvider>
        </AppBridgeProvider>
      </BrowserRouter>
    </PolarisProvider>
  );
}
