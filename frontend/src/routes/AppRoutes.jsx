import { BrowserRouter, Route, Routes } from "react-router-dom";

import Login from "../screens/Login.jsx";
import Home from "../screens/Home.jsx";
import Project from "../screens/Project.jsx";
import Register from "../screens/Register.jsx";
import UserAuth from "../auth/userAuth.jsx";

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>

                {/* Protected Home Route */}
                <Route
                    path="/"
                    element={
                        <UserAuth>
                            <Home />
                        </UserAuth>
                    }
                />

                {/* Public Login Route */}
                <Route
                    path="/login"
                    element={<Login />}
                />

                {/* Public Register Route */}
                <Route
                    path="/register"
                    element={
                        <div className="min-h-screen bg-[#09090f] p-10 text-white">
                            <Register />
                        </div>
                    }
                />

                {/* Protected Project Route */}
                <Route
                    path="/project"
                    element={
                        <UserAuth>
                            <div className="min-h-screen bg-[#09090f] p-10 text-white">
                                <Project />
                            </div>
                        </UserAuth>
                    }
                />

            </Routes>
        </BrowserRouter>
    );
};

export default AppRoutes;