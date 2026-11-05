import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute() {
    const location = useLocation();
    return localStorage.getItem("rankpilot-token") ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
