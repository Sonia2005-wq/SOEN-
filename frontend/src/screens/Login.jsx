import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../config/axios.js";
import { UserContext } from "../context/user.context.jsx";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const { setUser } = useContext(UserContext);
    const navigate = useNavigate();

    async function submitHandler(e) {
        e.preventDefault();

        setError("");

        if (!email.trim() || !password) {
            setError("Please enter your email and password.");
            return;
        }

        try {
            setLoading(true);

            // 1. Send login request to backend
            const res = await axios.post("/user/login", {
                email: email.trim(),
                password,
            });

            console.log("Login response:", res.data);

            // 2. Extract token and user from backend response
            const token = res.data.token;
            const user = res.data.user;

            // 3. Check whether token and user exist
            if (!token || !user) {
                throw new Error(
                    "Invalid login response: token or user is missing."
                );
            }

            // 4. Save JWT token in localStorage
            localStorage.setItem("token", token);

            // 5. Save user information in localStorage
            localStorage.setItem("user", JSON.stringify(user));

            // 6. Update UserContext
            setUser(user);

            // 7. Navigate to Home page
            navigate("/", { replace: true });

        } catch (err) {
            console.error("Login error:", err);

            setError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.response?.data?.err ||
                err.message ||
                "Login failed. Please check your credentials."
            );

        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">

            <div className="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-lg">

                <h2 className="mb-6 text-2xl font-bold text-white">
                    Login
                </h2>

                <form onSubmit={submitHandler}>

                    {/* Email */}
                    <div className="mb-4">

                        <label
                            className="mb-2 block text-gray-400"
                            htmlFor="email"
                        >
                            Email
                        </label>

                        <input
                            onChange={(e) => setEmail(e.target.value)}
                            value={email}
                            type="email"
                            id="email"
                            autoComplete="email"
                            required
                            className="w-full rounded bg-gray-700 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your email"
                        />

                    </div>

                    {/* Password */}
                    <div className="mb-6">

                        <label
                            className="mb-2 block text-gray-400"
                            htmlFor="password"
                        >
                            Password
                        </label>

                        <input
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            required
                            className="w-full rounded bg-gray-700 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your password"
                        />

                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded bg-blue-500 p-3 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                </form>

                {/* Register Link */}
                <p className="mt-4 text-gray-400">
                    Don't have an account?{" "}

                    <Link
                        to="/register"
                        className="text-blue-500 hover:underline"
                    >
                        Create one
                    </Link>
                </p>

            </div>

        </div>
    );
};

export default Login;