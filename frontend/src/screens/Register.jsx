import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../context/user.context.jsx";
import axios from "../config/axios.js";

const Register = () => {
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
            setError("Please enter both email and password.");
            return;
        }

        try {
            setLoading(true);

            // 1. Send registration request to backend
            const res = await axios.post("/user/register", {
                email: email.trim(),
                password,
            });

            console.log("Registration response:", res.data);

            // 2. Get token and user from backend response
            const token = res.data.token;
            const user = res.data.user;

            // 3. If backend returns both, log in automatically
            if (token && user) {
                // Save JWT token
                localStorage.setItem("token", token);

                // Save user information
                localStorage.setItem("user", JSON.stringify(user));

                // Update React Context
                setUser(user);

                // Navigate to Home
                navigate("/", { replace: true });
            } else {
                // Registration succeeded, but no login credentials returned
                navigate("/login", { replace: true });
            }

        } catch (err) {
            console.error(
                "Registration error:",
                err.response?.data || err.message
            );

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.response?.data?.errors
                    ?.map((item) => item.msg)
                    .join(", ") ||
                "Registration failed. Please try again."
            );

        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">

                <h2 className="text-2xl font-bold text-white mb-6">
                    Register
                </h2>

                <form onSubmit={submitHandler}>

                    {/* Email */}
                    <div className="mb-4">
                        <label
                            className="block text-gray-400 mb-2"
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
                            className="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your email"
                        />
                    </div>

                    {/* Password */}
                    <div className="mb-6">
                        <label
                            className="block text-gray-400 mb-2"
                            htmlFor="password"
                        >
                            Password
                        </label>

                        <input
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                            type="password"
                            id="password"
                            autoComplete="new-password"
                            required
                            className="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your password"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <p className="text-red-400 text-sm mb-4">
                            {error}
                        </p>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full p-3 rounded bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Registering..." : "Register"}
                    </button>

                </form>

                {/* Login Link */}
                <p className="text-gray-400 mt-4">
                    Already have an account?{" "}

                    <Link
                        to="/login"
                        className="text-blue-500 hover:underline"
                    >
                        Login
                    </Link>
                </p>

            </div>
        </div>
    );
};

export default Register;