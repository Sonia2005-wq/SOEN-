import React, { useEffect, useState, useContext } from "react";
import { useLocation } from "react-router-dom";
import axios from "../config/axios";
import { initializeSocket, sendMessage } from "../config/socket";
import { UserContext } from "../context/user.context.jsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getWebContainer } from "../config/webContainer.js";

const Project = () => {
  const location = useLocation();
  const project = location.state?.project;

  const { user } = useContext(UserContext);

  const [currentFile, setCurrentFile] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);

  // UI states
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Users
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addingUsers, setAddingUsers] = useState(false);

  // Chat states
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [webContainer, setWebContainer] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileTree, setFileTree] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("");

  // Send a message
  function send() {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) return;

    if (!project?._id) {
      setError("Project ID is missing.");
      return;
    }

    // Send message to Socket.IO server
    sendMessage("project-message", {
      message: trimmedMessage,
    });

    // Display the sender's message immediately
    setMessages((previousMessages) => [
      ...previousMessages,
      {
        message: trimmedMessage,
        sender: {
          _id: user?._id,
          email: user?.email || "You",
        },
        isOwn: true,
      },
    ]);

    setMessage("");
  }

  useEffect(() => {
    let mounted = true;

    async function bootContainer() {
      try {
        const container = await getWebContainer();

        if (mounted) {
          setWebContainer(container);
          console.log("WebContainer ready!");
        }
      } catch (error) {
        console.error("WebContainer boot error:", error);
        if (mounted) {
          setTerminalOutput(`Boot error: ${error.message}`);
        }
      }
    }

    bootContainer();

    return () => {
      mounted = false;
    };
  }, []);

  // Initialize Socket.IO and fetch users

  useEffect(() => {
    if (!project?._id) {
      console.error("Project ID is missing.");
      return;
    }

    const socket = initializeSocket(project._id);

    // Handle incoming messages from the server
    const handleMessage = (data) => {
      console.log("Received message:", data);

      let messageContent = data.message;
      let aiResponse = null;

      // Case 1: Server ne JSON string bheji
      if (typeof messageContent === "string") {
        try {
          const parsed = JSON.parse(messageContent);

          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            aiResponse = parsed;

            // Generated files milne par state update karo
            if (parsed.fileTree && typeof parsed.fileTree === "object") {
              setFileTree(parsed.fileTree);
              setIsGenerating(true);
              console.log("File tree received:", parsed.fileTree);
            }

            if (typeof parsed.text === "string") {
              messageContent = parsed.text;
            } else if (parsed.type === "file_generation") {
              messageContent = "Files generated successfully.";
            } else {
              messageContent = JSON.stringify(parsed, null, 2);
            }
          }
        } catch {}
      }

      // Case 2: Server ne directly object bheja
      else if (messageContent && typeof messageContent === "object") {
        aiResponse = messageContent;

        if (
          messageContent.fileTree &&
          typeof messageContent.fileTree === "object" &&
          Object.keys(messageContent.fileTree).length > 0
        ) {
          setFileTree(messageContent.fileTree);
          setIsGenerating(true);

          console.log("File tree received:", messageContent.fileTree);
        }

        if (typeof messageContent.text === "string") {
          messageContent = messageContent.text;
        } else {
          messageContent = JSON.stringify(messageContent, null, 2);
        }
      }

      // Chat mein message show karo
      setMessages((previousMessages) => [
        ...previousMessages,
        {
          ...data,
          message: typeof messageContent === "string" ? messageContent : "",
          aiResponse,
          isOwn: false,
        },
      ]);
    };
    socket.on("project-message", handleMessage);

    // Display server-side errors
    const handleMessageError = (data) => {
      console.error("AI message error:", data);

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          message:
            data?.message ||
            "AI response could not be generated. Please try again.",
          sender: {
            _id: "@ai",
            email: "AI",
          },
          isOwn: false,
        },
      ]);
    };

    socket.on("project-message-error", handleMessageError);

    // Fetch users
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get("/user/all");

        console.log("Users API response:", response.data);

        setUsers(response.data.users || []);
      } catch (err) {
        console.error("Error fetching users:", err);

        setError(err.response?.data?.message || "Unable to fetch users.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();

    // Clean up event listeners and socket connection
    return () => {
      socket.off("project-message", handleMessage);
      socket.off("project-message-error", handleMessageError);
      socket.disconnect();
    };
  }, [project?._id]);

  useEffect(() => {
    if (!webContainer || Object.keys(fileTree).length === 0) {
      return;
    }

    let cancelled = false;

    async function runGeneratedApp() {
      try {
        setIsGenerating(true);
        setTerminalOutput("Writing generated files...\n");

        await writeFiles(webContainer, fileTree);

        if (cancelled) return;

        setTerminalOutput((prev) => prev + "Installing dependencies...\n");

        const installProcess = await webContainer.spawn("npm", ["install"]);

        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              if (!cancelled) {
                setTerminalOutput((prev) => prev + data);
              }
            },
          }),
        );

        const installExitCode = await installProcess.exit;

        if (cancelled) return;

        if (installExitCode !== 0) {
          setTerminalOutput((prev) => prev + "\nnpm install failed.");
          return;
        }

        setTerminalOutput(
          (prev) => prev + "\nStarting development server...\n",
        );

        const devProcess = await webContainer.spawn("npm", [
          "run",
          "dev",
          "--",
          "--host",
          "0.0.0.0",
        ]);

        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              if (!cancelled) {
                setTerminalOutput((prev) => prev + data);
              }
            },
          }),
        );

        webContainer.on("server-ready", (port, url) => {
          if (!cancelled) {
            setPreviewUrl(url);
            setTerminalOutput(
              (prev) => prev + `\nPreview ready on port ${port}\n`,
            );
          }
        });
      } catch (error) {
        console.error("Generated app error:", error);

        if (!cancelled) {
          setTerminalOutput((prev) => prev + `\nError: ${error.message}`);
        }
      } finally {
        if (!cancelled) {
          setIsGenerating(false);
        }
      }
    }

    runGeneratedApp();

    return () => {
      cancelled = true;
    };
  }, [webContainer, fileTree]);

  async function writeFiles(container, files) {
    const entries = Object.entries(files || {});

    for (const [name, value] of entries) {
      if (value?.directory) {
        await container.fs.mkdir(name, { recursive: true });
        await writeFiles(container, value.directory);
      } else if (value?.file) {
        const parent = name.split("/").slice(0, -1).join("/");

        if (parent) {
          await container.fs.mkdir(parent, { recursive: true });
        }

        await container.fs.writeFile(name, value.file.contents ?? "");
      }
    }
  }

  // Select or deselect users
  const handleUserClick = (userId) => {
    setSelectedUserIds((previousIds) =>
      previousIds.includes(userId)
        ? previousIds.filter((id) => id !== userId)
        : [...previousIds, userId],
    );
  };

  // Add selected users to the local UI
  const handleAddSelectedUsers = () => {
    if (selectedUserIds.length === 0) return;

    setUsers((previousUsers) =>
      previousUsers.map((item) =>
        selectedUserIds.includes(item._id) ? { ...item, added: true } : item,
      ),
    );

    setSelectedUserIds([]);
    setIsAddingUser(false);
  };

  // Close the add-users popup
  const closePopup = () => {
    setIsAddingUser(false);
    setSelectedUserIds([]);
    setError("");
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      <main className="flex h-full w-full overflow-hidden bg-slate-100">
        {/* Left Sidebar */}
        <section className="left relative flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-slate-700 bg-slate-900">
          {/* Header */}
          <header className="flex w-full shrink-0 items-center justify-between border-b border-slate-700 p-4">
            <button
              onClick={() => setIsSidePanelOpen(true)}
              className="rounded-lg bg-slate-800 p-2.5 text-slate-300 transition hover:bg-violet-600 hover:text-white"
              title="Add Users"
              type="button"
            >
              <i className="ri-user-add-fill text-xl"></i>
            </button>

            <button
              onClick={() => setIsSidePanelOpen(true)}
              className="rounded-lg bg-slate-800 p-2.5 text-slate-300 transition hover:bg-violet-600 hover:text-white"
              title="Collaborators"
              type="button"
            >
              <i className="ri-group-fill text-lg"></i>
            </button>
          </header>

          {/* Conversation Area */}
          <div className="conversation-area flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            <div className="message-box flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-3">
              {messages.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-400">
                  No messages yet. Start the conversation!
                </p>
              )}

              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`max-w-[85%] ${
                    msg.isOwn ? "self-end" : "self-start"
                  }`}
                >
                  {!msg.isOwn && (
                    <div className="mb-1 text-sm text-slate-300">
                      {msg.sender?.email ||
                        (msg.sender?._id === "@ai" ? "AI" : "Unknown user")}
                    </div>
                  )}
                  <div
                    className={`break-words overflow-hidden rounded-xl p-3 ${
                      msg.isOwn
                        ? "rounded-tr-none bg-violet-600 text-white"
                        : "rounded-tl-none bg-slate-800 text-slate-200"
                    }`}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ children }) => <>{children}</>,

                        code: ({ children, className }) => {
                          const match = /language-(\w+)/.exec(className || "");

                          const codeString = String(children).replace(
                            /\n$/,
                            "",
                          );

                          // Inline code
                          if (!match) {
                            return (
                              <code className="rounded bg-slate-700 px-1 py-0.5 text-violet-300">
                                {children}
                              </code>
                            );
                          }

                          // Fenced code block
                          return (
                            <div className="my-3 min-w-0 overflow-hidden rounded-lg">
                              <div className="flex items-center justify-between bg-slate-950 px-3 py-2 text-xs text-slate-300">
                                <span>{match[1]}</span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    navigator.clipboard.writeText(codeString)
                                  }
                                  className="rounded px-2 py-1 hover:bg-slate-700"
                                >
                                  Copy Code
                                </button>
                              </div>

                              <SyntaxHighlighter
                                language={match[1]}
                                style={oneDark}
                                PreTag="div"
                                customStyle={{
                                  margin: 0,
                                  maxWidth: "100%",
                                  overflowX: "auto",
                                  borderRadius: 0,
                                  fontSize: "13px",
                                }}
                                wrapLongLines={false}
                              >
                                {codeString}
                              </SyntaxHighlighter>
                            </div>
                          );
                        },
                      }}
                    >
                      {msg.message}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <form
              className="input-field flex shrink-0 items-center gap-2 border-t border-slate-700 pt-3"
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none placeholder:text-slate-400 focus:border-violet-500"
                type="text"
                placeholder="Enter message..."
              />

              <button
                type="submit"
                className="shrink-0 rounded-lg bg-violet-600 p-3 text-white transition hover:bg-violet-700"
                title="Send message"
              >
                <i className="ri-send-plane-fill"></i>
              </button>
            </form>
          </div>

          {/* Collaborators Side Panel */}
          <div
            className={`sidePanel absolute inset-0 z-10 flex h-full w-full flex-col border-r border-slate-700 bg-slate-800 text-slate-100 shadow-xl transition-transform duration-300 ${
              isSidePanelOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <header className="flex items-center justify-between border-b border-slate-700 p-4">
              <h2 className="text-lg font-semibold">Collaborators</h2>

              <button
                onClick={() => setIsSidePanelOpen(false)}
                className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
                title="Close panel"
                type="button"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </header>

            <div className="border-b border-slate-700 p-3">
              <button
                onClick={() => {
                  setError("");
                  setIsAddingUser(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 p-3 transition hover:bg-violet-700"
                type="button"
              >
                <i className="ri-user-add-fill"></i>
                Add Users
              </button>
            </div>

            {/* Added Users */}
            <div className="flex-1 overflow-y-auto p-3">
              {users
                .filter((item) => item.added)
                .map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-3 rounded-lg p-3 transition hover:bg-slate-700"
                  >
                    <i className="ri-user-fill text-xl text-violet-400"></i>
                    <h3 className="break-all text-white">{item.email}</h3>
                  </div>
                ))}

              {users.every((item) => !item.added) && (
                <p className="p-3 text-center text-sm text-slate-400">
                  No collaborators added yet.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Right Workspace */}
        {/* Right Workspace */}
        <section className="right flex h-full min-w-0 flex-1 overflow-hidden bg-slate-100">
          {/* MIDDLE: FILE EXPLORER + CODE EDITOR */}
          <div className="flex min-w-0 flex-1 flex-col border-r border-slate-300">
            {/* Workspace toolbar */}
            <header className="flex shrink-0 items-center justify-between border-b bg-white p-3">
              <h2 className="font-semibold text-slate-800">Code Editor</h2>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!webContainer || Object.keys(fileTree).length === 0) {
                      setTerminalOutput("No generated files to run.");
                      return;
                    }

                    try {
                      setIsGenerating(true);
                      setTerminalOutput("Writing files...\n");

                      await writeFiles(webContainer, fileTree);

                      setTerminalOutput(
                        (prev) => prev + "Files written successfully.\n",
                      );

                      const installProcess = await webContainer.spawn("npm", [
                        "install",
                      ]);

                      installProcess.output.pipeTo(
                        new WritableStream({
                          write(chunk) {
                            setTerminalOutput((prev) => prev + chunk);
                          },
                        }),
                      );

                      const exitCode = await installProcess.exit;

                      if (exitCode !== 0) {
                        throw new Error("npm install failed.");
                      }

                      setTerminalOutput(
                        (prev) => prev + "\nStarting development server...\n",
                      );

                      const devProcess = await webContainer.spawn("npm", [
                        "run",
                        "dev",
                        "--",
                        "--host",
                        "0.0.0.0",
                      ]);

                      devProcess.output.pipeTo(
                        new WritableStream({
                          write(chunk) {
                            setTerminalOutput((prev) => prev + chunk);
                          },
                        }),
                      );

                      webContainer.on("server-ready", (port, url) => {
                        setPreviewUrl(url);
                        setTerminalOutput(
                          (prev) => prev + `\nPreview ready on port ${port}\n`,
                        );
                      });
                    } catch (err) {
                      console.error(err);
                      setTerminalOutput(
                        (prev) => prev + `\nError: ${err.message}\n`,
                      );
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                  className="rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                  type="button"
                >
                  Run
                </button>

                <button
                  onClick={() => {
                    if (!currentFile) return;

                    const updatedTree = {
                      ...fileTree,
                      [currentFile]: {
                        ...fileTree[currentFile],
                        file: {
                          ...fileTree[currentFile]?.file,
                          contents:
                            document.getElementById("code-editor")?.value ?? "",
                        },
                      },
                    };

                    setFileTree(updatedTree);

                    setTerminalOutput(
                      `Saved ${currentFile} in the current workspace state.`,
                    );
                  }}
                  disabled={!currentFile}
                  className="rounded bg-violet-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                  type="button"
                >
                  Save
                </button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* FILE EXPLORER */}
              <aside className="w-44 shrink-0 overflow-y-auto border-r border-slate-300 bg-slate-200">
                <div className="border-b border-slate-300 p-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                  Explorer
                </div>

                {Object.keys(fileTree).length === 0 ? (
                  <p className="p-3 text-xs text-slate-500">
                    Generated files will appear here.
                  </p>
                ) : (
                  Object.keys(fileTree).map((file) => (
                    <button
                      key={file}
                      type="button"
                      onClick={() => {
                        setCurrentFile(file);

                        setOpenFiles((previousFiles) =>
                          previousFiles.includes(file)
                            ? previousFiles
                            : [...previousFiles, file],
                        );
                      }}
                      className={`block w-full truncate px-3 py-2 text-left text-sm ${
                        currentFile === file
                          ? "bg-violet-200 text-violet-900"
                          : "hover:bg-slate-300"
                      }`}
                      title={file}
                    >
                      📄 {file}
                    </button>
                  ))
                )}
              </aside>

              {/* CODE EDITOR */}
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
                {/* Open file tabs */}
                <div className="flex shrink-0 overflow-x-auto border-b bg-slate-100">
                  {openFiles.map((file) => (
                    <button
                      key={file}
                      type="button"
                      onClick={() => setCurrentFile(file)}
                      className={`shrink-0 border-r px-3 py-2 text-sm ${
                        currentFile === file
                          ? "border-t-2 border-t-violet-600 bg-white"
                          : "hover:bg-slate-200"
                      }`}
                    >
                      {file}
                    </button>
                  ))}
                </div>

                {currentFile && fileTree[currentFile]?.file ? (
                  <textarea
                    id="code-editor"
                    key={currentFile}
                    defaultValue={fileTree[currentFile].file.contents ?? ""}
                    spellCheck={false}
                    className="min-h-0 flex-1 resize-none bg-slate-950 p-4 font-mono text-sm leading-6 text-green-300 outline-none"
                    placeholder="Your code will appear here..."
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-500">
                    Select a file from the Explorer to view and edit its code.
                  </div>
                )}
              </div>
            </div>

            {/* Terminal */}
            <div className="h-28 shrink-0 overflow-auto bg-slate-950 p-3 font-mono text-xs text-green-300">
              <div className="mb-2 font-bold text-white">Terminal</div>
              <pre className="whitespace-pre-wrap">
                {terminalOutput || "Ready."}
              </pre>
            </div>
          </div>

          {/* RIGHT: LIVE PREVIEW */}
          <div className="flex min-w-0 flex-1 flex-col bg-white">
            <header className="flex shrink-0 items-center justify-between border-b p-3">
              <h2 className="font-semibold text-slate-800">Live Preview</h2>

              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded bg-violet-600 px-3 py-2 text-sm text-white"
                >
                  Open in New Tab
                </a>
              )}
            </header>

            {previewUrl ? (
              <iframe
                key={previewUrl}
                title="Generated Application Preview"
                src={previewUrl}
                className="min-h-0 w-full flex-1 border-0"
                allow="cross-origin-isolated"
              />
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-center text-slate-500">
                {isGenerating
                  ? "Generating and starting your application..."
                  : "Send an @ai prompt to generate your application."}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Add Users Popup */}
      {isAddingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closePopup}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">
                Select Users
              </h2>

              <button
                onClick={closePopup}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                title="Close popup"
                type="button"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </header>

            {loading && (
              <p className="py-5 text-center text-slate-500">
                Loading users...
              </p>
            )}

            {!loading && error && (
              <p className="py-4 text-center text-sm text-red-600">{error}</p>
            )}

            {!loading && !error && (
              <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                {users.filter((item) => !item.added).length === 0 ? (
                  <p className="py-5 text-center text-sm text-slate-500">
                    No available users found.
                  </p>
                ) : (
                  users
                    .filter((item) => !item.added)
                    .map((item) => {
                      const isSelected = selectedUserIds.includes(item._id);

                      return (
                        <button
                          type="button"
                          key={item._id}
                          onClick={() => handleUserClick(item._id)}
                          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                            isSelected
                              ? "border-violet-500 bg-violet-50"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <i className="ri-user-fill text-xl text-violet-600"></i>

                          <span className="flex-1 break-all text-slate-800">
                            {item.email}
                          </span>

                          <i
                            className={`text-xl ${
                              isSelected
                                ? "ri-checkbox-circle-fill text-violet-600"
                                : "ri-checkbox-blank-circle-line text-slate-400"
                            }`}
                          ></i>
                        </button>
                      );
                    })
                )}
              </div>
            )}

            <button
              onClick={handleAddSelectedUsers}
              disabled={selectedUserIds.length === 0 || loading || addingUsers}
              className="mt-5 w-full rounded-lg bg-violet-600 p-3 font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
            >
              {addingUsers
                ? "Adding..."
                : `Add Selected Users (${selectedUserIds.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Project;
