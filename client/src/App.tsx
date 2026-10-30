import { Navigate, Route, Routes } from "react-router";
import Layout from "./components/Layout";
import AdminPage from "./pages/AdminPage";
import AllCodesPage from "./pages/AllCodesPage";
import CodesPage from "./pages/CodesPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import SignupPage from "./pages/SignupPage";

// Which screen shows for which address. Everything sits inside <Layout />,
// which draws the title and account bar around the page.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="codes" element={<CodesPage />}>
          <Route index element={<Navigate to="all" replace />} />
          <Route path="all" element={<AllCodesPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
