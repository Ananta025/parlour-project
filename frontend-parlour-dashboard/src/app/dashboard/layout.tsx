"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FaUsers, FaTasks, FaCalendarCheck, FaSignOutAlt } from "react-icons/fa";
import { apiService } from "@/lib/api";
import { connectAuthenticatedSocket, disconnectSocket } from "@/lib/socket";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userRole, setUserRole] = useState<string>("Admin");
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // Get user role from session/localStorage and connect socket
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    const role = localStorage.getItem("userRole") || "Admin";
    setUserRole(role);

    // Connect socket with authentication
    connectAuthenticatedSocket();
    setIsLoading(false);

    // Clean up socket on component unmount
    return () => {
      disconnectSocket();
    };
  }, [router]);

  const handleLogout = () => {
    // Use API service for logout
    apiService.logout();
  };

  const navItems = [
    { name: "Employees", path: "/dashboard/employees", icon: <FaUsers /> },
    { name: "Tasks", path: "/dashboard/tasks", icon: <FaTasks /> },
    { name: "Attendance", path: "/dashboard/attendance", icon: <FaCalendarCheck /> },
  ];

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-indigo-700">Parlour Dashboard</h1>
        </div>
        <nav className="mt-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center px-6 py-3 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 ${
                pathname === item.path ? "bg-indigo-50 text-indigo-700 border-r-4 border-indigo-700" : ""
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
            <div className="flex items-center gap-4">
              <div className="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                Role: {userRole}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-red-600 hover:text-red-800"
              >
                <FaSignOutAlt className="mr-1" /> Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}
