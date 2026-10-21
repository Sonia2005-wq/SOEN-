import { useState, useEffect } from "react";
import { useUser } from "../context/user.context.jsx";
import { useNavigate } from "react-router-dom";
import api from "../config/axios.js";

const Home = () => {
    const { user } = useUser();
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Fetch all projects from backend
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await api.get("/projects/all");

                console.log("Projects API response:", response.data);

                // Support common backend response formats
                const fetchedProjects =
                    response.data.projects ??
                    response.data.project ??
                    [];

                setProjects(
                    Array.isArray(fetchedProjects)
                        ? fetchedProjects
                        : [fetchedProjects]
                );
            } catch (err) {
                console.error("Error fetching projects:", err);

                setError(
                    err.response?.data?.message ||
                    err.response?.data?.err ||
                    "Unable to fetch projects."
                );
            }
        };

        fetchProjects();
    }, []);

    // Create project
    const handleCreateProject = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!projectName.trim()) {
            setError("Please enter a project name.");
            return;
        }

        try {
            setLoading(true);

            const token = localStorage.getItem("token");

            if (!token) {
                setError("Please login first.");
                return;
            }

            const response = await api.post(
                "/projects/create",
                {
                    name: projectName.trim(),
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            console.log("Create project response:", response.data);

            // Handle common backend response formats
            const newProject =
                response.data.project ??
                response.data;

            if (!newProject?._id) {
                throw new Error(
                    "Project was created, but its data was not returned correctly."
                );
            }

            setProjects((previousProjects) => [
                ...previousProjects,
                newProject,
            ]);

            setProjectName("");
            setShowForm(false);
            setSuccess("Project created successfully!");
        } catch (err) {
            console.error("Create project error:", err);

            setError(
                err.response?.data?.message ||
                err.response?.data?.err ||
                err.message ||
                "Unable to create project. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090f] text-white">

            {/* Navbar */}
            <nav className="flex items-center justify-between border-b border-white/10 px-6 py-5 md:px-12">

                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-xl font-bold">
                        S
                    </div>

                    <h1 className="text-2xl font-bold tracking-wide">
                        SOEN<span className="text-violet-400">.</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden text-right sm:block">
                        <p className="text-sm text-slate-400">
                            Welcome back
                        </p>

                        <p className="font-semibold">
                            {user?.name || user?.email || "Developer"}
                        </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 font-bold">
                        {(user?.name || user?.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-7xl px-6 py-12 md:px-12">

                {/* Welcome Section */}
                <section className="mb-12">

                    <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-violet-400">
                        Your Workspace
                    </p>

                    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">

                        <div>
                            <h2 className="text-3xl font-bold md:text-5xl">
                                Build something amazing.
                            </h2>

                            <p className="mt-4 max-w-2xl text-slate-400">
                                Manage your projects, organize your workspace,
                                and bring your ideas to life.
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setShowForm(!showForm);
                                setError("");
                                setSuccess("");
                            }}
                            className="rounded-xl bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-500"
                        >
                            + Create Project
                        </button>

                    </div>
                </section>

                {/* Success Message */}
                {success && (
                    <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
                        {success}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
                        {error}
                    </div>
                )}

                {/* Create Project Form */}
                {showForm && (
                    <form
                        onSubmit={handleCreateProject}
                        className="mb-10 rounded-2xl border border-white/10 bg-[#11111b] p-6"
                    >
                        <h3 className="mb-2 text-xl font-bold">
                            Create a new project
                        </h3>

                        <p className="mb-5 text-sm text-slate-400">
                            Give your project a name to get started.
                        </p>

                        <div className="flex flex-col gap-4 sm:flex-row">

                            <input
                                type="text"
                                placeholder="e.g. My Awesome Project"
                                value={projectName}
                                onChange={(e) =>
                                    setProjectName(e.target.value)
                                }
                                className="flex-1 rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-violet-500"
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                className="rounded-xl bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading ? "Creating..." : "Create"}
                            </button>

                        </div>
                    </form>
                )}

                {/* Projects Section */}
                <section>

                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-2xl font-bold">
                                Your Projects
                            </h3>

                            <p className="mt-2 text-sm text-slate-400">
                                Projects in your workspace.
                            </p>
                        </div>

                        <span className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                            {projects.length}{" "}
                            {projects.length === 1
                                ? "Project"
                                : "Projects"}
                        </span>
                    </div>

                    {/* Project Cards */}
                    {projects.length > 0 ? (

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

                            {projects.map((project, index) => (

                                <div
                                    key={project._id || index}
                                    className="group rounded-2xl border border-white/10 bg-[#11111b] p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-500/50"
                                >

                                    <div className="mb-6 flex items-center justify-between">

                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-2xl text-violet-400">
                                            <span aria-hidden="true">
                                                ⌘
                                            </span>
                                        </div>

                                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                                            Created
                                        </span>

                                    </div>

                                    <h4 className="truncate text-xl font-bold">
                                        {project.name}
                                    </h4>

                                    <p className="mt-2 text-sm text-slate-400">
                                        Your workspace is ready.
                                    </p>

                                    <div className="mt-6 border-t border-white/10 pt-5">

                                        <button
                                            onClick={() => {
                                                navigate("/project", {
                                                    state: {
                                                        project,
                                                    },
                                                });
                                            }}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold transition hover:bg-violet-500"
                                        >
                                            <span aria-hidden="true">
                                                {"</>"}
                                            </span>

                                            Open Editor

                                            <span aria-hidden="true">
                                                →
                                            </span>
                                        </button>

                                    </div>

                                </div>

                            ))}

                        </div>

                    ) : (

                        /* Empty State */
                        <div className="rounded-2xl border border-dashed border-white/15 bg-[#11111b]/60 px-6 py-16 text-center">

                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl text-violet-400">
                                +
                            </div>

                            <h4 className="text-xl font-bold">
                                Your workspace is waiting.
                            </h4>

                            <p className="mx-auto mt-3 max-w-md text-slate-400">
                                You haven't created a project yet.
                                Start by creating your first project.
                            </p>

                            <button
                                onClick={() => {
                                    setShowForm(true);
                                    setError("");
                                    setSuccess("");
                                }}
                                className="mt-6 rounded-xl bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-500"
                            >
                                + Create Your First Project
                            </button>

                        </div>

                    )}

                </section>

                {/* Footer */}
                <footer className="mt-16 border-t border-white/10 py-6 text-center text-sm text-slate-500">
                    Made for developers · SOEN Workspace
                </footer>

            </main>
        </div>
    );
};

export default Home;