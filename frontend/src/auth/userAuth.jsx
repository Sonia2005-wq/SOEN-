import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../context/user.context.jsx";

const UserAuth = ({ children }) => {
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");

        setIsAuthenticated(Boolean(token && user));
        setLoading(false);
    }, [user]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default UserAuth;