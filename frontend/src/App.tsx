import {
  Navigate,
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Login from "./pages/Login";
import Callback from "./pages/Callback";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import Root from "./pages/Root";
import { AuthProvider } from "./context/AuthContext";
import { RecommendationsProvider } from "./context/RecommendationsContext";
import { loader as callbackLoader } from "./loaders/callback.loader";
import { loader as protectedLoader } from "./loaders/protected.loader";
import { loader as publicLoader } from "./loaders/public.loader";

const router = createBrowserRouter([
  {
    Component: Root,
    children: [
      {
        index: true,
        Component: Home,
        loader: protectedLoader,
      },
      {
        path: "/onboarding",
        Component: Onboarding,
        loader: protectedLoader,
      },
      {
        path: "/profile",
        Component: Profile,
        loader: protectedLoader,
      },
      {
        path: "/login",
        Component: Login,
        loader: publicLoader,
      },
      {
        path: "/callback",
        Component: Callback,
        loader: callbackLoader,
      },
      {
        path: "*",
        element: <Navigate to="/" />,
      },
    ],
  },
]);

function App() {
  return (
    <AuthProvider>
      <RecommendationsProvider>
        <RouterProvider router={router} />
      </RecommendationsProvider>
    </AuthProvider>
  );
}

export default App;
