import { useEffect, useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
axios.defaults.baseURL = backendUrl;
axios.defaults.withCredentials = true;
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [authUser, setAuthUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const socketRef = useRef(null);
    const [socket, setSocket] = useState(null);
    const checkAuth = async () => {
        try {
            const { data } = await axios.get("/api/auth/check");
            if (data.success) {
                setAuthUser(data.user);
                connectSocket(data.user);
            }
        }
        catch (error) {
            toast.error(error.message);
        }
    };
    const login = async (state, credentials) => {
        try {
            const { data } = await axios.post(`/api/auth/${state}`, credentials);
            if (data.success) {
                const userData = {
                    _id: data._id,
                    fullName: data.fullName,
                    email: data.email,
                    profilePic: data.profilePic || { url: "", publicId: "" },
                    bio: data.bio || "",
                };
                setAuthUser(userData);
                connectSocket(userData);
                toast.success("Login successful!");
                localStorage.setItem("token", data.token);
                setToken(data.token);
            }
        }
        catch (error) {
            console.log(error.message);
            toast.error("Login failed. Please check your credentials.");
            setAuthUser(null);
        }
    };
    const logout = async () => {
        localStorage.removeItem("token");
        setToken(null);
        setAuthUser(null);
        setOnlineUsers([]);

        socketRef.current?.disconnect();
        socketRef.current = null;
        setSocket(null);

        toast.success("Logged out successfully!");
    };
    const updateProfile = async (formData) => {
        try {
            const { data } = await axios.put("/api/auth/update-profile", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (data.success) {
                setAuthUser(data.user);
                toast.success("Profile updated successfully");
            }
            else {
                toast.error("Failed to update profile");
            }
        }
        catch (error) {
            toast.error(error.message || "Profile update failed");
            throw error;
        }
    };
    // const connectSocket = (userData) => {
    //     if (!userData || socket?.connected)
    //         return;
    //     const newSocket = io(backendUrl, {
    //         auth: {
    //             userId: userData._id,
    //         },
    //         withCredentials: true,
    //     });
    //     newSocket.connect();
    //     setSocket(newSocket);
    //     newSocket.on("getOnlineUsers", (userIds) => {
    //         setOnlineUsers(userIds);
    //     });
    // };
    const connectSocket = (userData) => {
        if (!userData) return;

        // Don't create another socket if one already exists
        if (socketRef.current?.connected) return;

        const newSocket = io(backendUrl, {
            auth: {
                userId: userData._id,
            },
            withCredentials: true,
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on("getOnlineUsers", (userIds) => {
            setOnlineUsers(userIds);
        });
    };
    useEffect(() => {
        if (token) {
            checkAuth();
        }
    }, [token]);
    
    useEffect(() => {
        if (authUser) {
            connectSocket(authUser);
        }
    }, [authUser]);
    const value = {
        axios,
        authUser,
        onlineUsers,
        socket,
        login,
        logout,
        updateProfile,
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
