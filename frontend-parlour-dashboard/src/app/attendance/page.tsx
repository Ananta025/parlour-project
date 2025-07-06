"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, CheckCircle2, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";
import { socket, connectAuthenticatedSocket } from "@/lib/socket";
import api from "@/lib/api";

// Consistent types for better type safety
interface Employee {
  id: string;
  _id?: string;
  name: string;
  email: string;
  status: boolean;
}

type AttendanceStatus = "in" | "out" | null;

interface AttendanceLog {
  id?: string;
  _id?: string;
  employeeId: string;
  type?: "check-in" | "check-out";
  action?: "in" | "out";
  timestamp: string;
  dateOnly: string; 
}

export default function AttendancePunchPage() {
  // State management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [punchingStatus, setPunchingStatus] = useState<Record<string, boolean>>({});
  const [todayAttendance, setTodayAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [error, setError] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Socket connection and event setup
  useEffect(() => {
    // Connect socket with auth
    connectAuthenticatedSocket();
    
    // Monitor socket connection
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setSocketConnected(true);
    });
    
    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setSocketConnected(false);
    });

    // Listen for attendance updates from both event patterns
    socket.on("attendance:update", handleAttendanceUpdate);
    
    // Initial data fetch
    fetchEmployeesAndAttendance();

    // Cleanup
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("attendance:update");
    };
  }, []);

  // Handle attendance updates from socket
  const handleAttendanceUpdate = useCallback((log: any) => {
    const { employeeId, type, action } = log;
    
    // Determine the status from either type or action field
    let status: AttendanceStatus = null;
    if (type === "check-in" || action === "in") {
      status = "in";
    } else if (type === "check-out" || action === "out") {
      status = "out";
    }
    
    // Only update if we have valid data
    if (employeeId && status) {
      // Update attendance status
      setTodayAttendance(prev => ({
        ...prev,
        [employeeId]: status
      }));
      
      // Reset punching status
      setPunchingStatus(prev => ({
        ...prev,
        [employeeId]: false
      }));
      
      // Show notification
      toast({
        title: "Attendance Updated",
        description: `${getEmployeeName(employeeId)} has ${status === "in" ? "checked in" : "checked out"}`,
      });
    }
  }, []);

  // Fetch employees and their attendance status
  const fetchEmployeesAndAttendance = async () => {
    setLoading(true);
    setError("");
    
    try {
      setRefreshing(true);
      
      // Fetch employees
      const empResponse = await api.get("/employees");
      const employeesList = empResponse.data.data || [];
      
      // Normalize employee data
      const normalizedEmployees = employeesList.map((emp: any) => ({
        ...emp,
        id: emp.id || emp._id
      }));
      
      setEmployees(normalizedEmployees);
      
      // Fetch today's attendance logs
      const attResponse = await api.get(`/attendance?dateOnly=${today}`);
      const attendanceLogs = attResponse.data.data || [];
      
      // Process attendance logs
      const attendanceStatus: Record<string, AttendanceStatus> = {};
      
      // Initialize with null for all employees
      normalizedEmployees.forEach((emp: Employee) => {
        attendanceStatus[emp.id] = null;
      });
      
      // Process logs to find latest status for each employee
      const employeeLogs: Record<string, AttendanceLog[]> = {};
      
      // Group logs by employee
      attendanceLogs.forEach((log: AttendanceLog) => {
        if (!employeeLogs[log.employeeId]) {
          employeeLogs[log.employeeId] = [];
        }
        employeeLogs[log.employeeId].push(log);
      });
      
      // For each employee, find their latest action
      Object.entries(employeeLogs).forEach(([empId, logs]) => {
        // Sort by timestamp, newest first
        const sortedLogs = [...logs].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        if (sortedLogs.length > 0) {
          const latestLog = sortedLogs[0];
          
          // Determine status from either field
          if (latestLog.type === "check-in" || latestLog.action === "in") {
            attendanceStatus[empId] = "in";
          } else if (latestLog.type === "check-out" || latestLog.action === "out") {
            attendanceStatus[empId] = "out";
          }
        }
      });
      
      setTodayAttendance(attendanceStatus);
      
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load employee data. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load employee data",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Get employee name by ID
  const getEmployeeName = (id: string): string => {
    const employee = employees.find(emp => emp.id === id);
    return employee?.name || "Unknown Employee";
  };

  // Handle attendance punch
  const handlePunch = async (employeeId: string) => {
    // Check socket connection
    if (!socketConnected) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Server connection unavailable. Please refresh and try again.",
      });
      return;
    }
    
    // Determine action based on current status
    const lastAction = todayAttendance[employeeId];
    const punchType = lastAction === "in" ? "check-out" : "check-in";
    
    // Update loading state
    setPunchingStatus(prev => ({ ...prev, [employeeId]: true }));
    
    // Create attendance payload
    const payload = {
      employeeId,
      type: punchType,
      timestamp: new Date().toISOString(),
      dateOnly: today,
    };
    
    // Optimistic update
    setTodayAttendance(prev => ({
      ...prev,
      [employeeId]: punchType === "check-in" ? "in" : "out"
    }));
    
    // Set timeout to handle non-responsive server
    const timeoutId = setTimeout(() => {
      setPunchingStatus(prev => ({ ...prev, [employeeId]: false }));
      
      // Revert optimistic update
      setTodayAttendance(prev => ({
        ...prev,
        [employeeId]: lastAction
      }));
      
      toast({
        variant: "destructive",
        title: "Request Timeout",
        description: "Server took too long to respond. Please try again.",
      });
    }, 10000); // 10 seconds timeout
    
    try {
      // Send to server
      const response = await api.post("/attendance", payload);
      
      // Clear timeout since we got a response
      clearTimeout(timeoutId);
      
      // Handle success
      if (response.data.success) {
        setPunchingStatus(prev => ({ ...prev, [employeeId]: false }));
        
        toast({
          title: "Success",
          description: `${getEmployeeName(employeeId)} has ${punchType === "check-in" ? "checked in" : "checked out"} successfully`,
        });
      } else {
        // API returned error
        setPunchingStatus(prev => ({ ...prev, [employeeId]: false }));
        
        // Revert optimistic update
        setTodayAttendance(prev => ({
          ...prev,
          [employeeId]: lastAction
        }));
        
        toast({
          variant: "destructive",
          title: "Error",
          description: response.data.message || "Failed to record attendance",
        });
      }
    } catch (error: any) {
      // Clear timeout
      clearTimeout(timeoutId);
      
      console.error("Attendance punch error:", error);
      
      // Reset state
      setPunchingStatus(prev => ({ ...prev, [employeeId]: false }));
      
      // Revert optimistic update
      setTodayAttendance(prev => ({
        ...prev,
        [employeeId]: lastAction
      }));
      
      // Show error
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Failed to record attendance",
      });
    }
  };

  // Manual state reset for stuck operations
  const resetProcessingState = (employeeId: string) => {
    setPunchingStatus(prev => ({ ...prev, [employeeId]: false }));
    toast({
      description: "Processing state manually reset",
    });
  };

  // Refresh data manually
  const handleRefresh = () => {
    fetchEmployeesAndAttendance();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading employee data...</span>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold flex items-center">
          <Clock className="mr-2" /> Attendance System
          <span className="text-sm font-normal text-muted-foreground ml-4">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </span>
        </h1>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-1 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      
      {/* Connection status indicator */}
      <div className={`mb-4 p-2 rounded-md text-sm flex items-center ${
        socketConnected ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
      }`}>
        {socketConnected ? (
          <CheckCircle2 className="h-4 w-4 mr-2" />
        ) : (
          <AlertTriangle className="h-4 w-4 mr-2" />
        )}
        {socketConnected 
          ? "Connected to server for real-time updates" 
          : "Not connected to server. Some features may be delayed."}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {/* Employee grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.filter(emp => emp.status).map((employee) => {
          const lastAction = todayAttendance[employee.id];
          const isPunching = punchingStatus[employee.id];
          
          return (
            <Card key={employee.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{employee.name}</CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="text-sm text-muted-foreground mb-2">
                  {employee.email}
                </div>
                
                <div className="flex items-center mt-4">
                  <div className="mr-4">
                    <span className="text-sm font-medium">Status:</span>
                  </div>
                  {lastAction === "in" ? (
                    <span className="flex items-center text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Checked In
                    </span>
                  ) : lastAction === "out" ? (
                    <span className="flex items-center text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                      <XCircle className="h-4 w-4 mr-1" /> Checked Out
                    </span>
                  ) : (
                    <span className="flex items-center text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                      Not Checked In Today
                    </span>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col">
                <Button 
                  className="w-full"
                  variant={lastAction === "in" ? "destructive" : "default"}
                  onClick={() => handlePunch(employee.id)}
                  disabled={isPunching || !socketConnected}
                >
                  {isPunching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : lastAction === "in" ? (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Check Out
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Check In
                    </>
                  )}
                </Button>

                {/* Emergency reset button */}
                {isPunching && (
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => resetProcessingState(employee.id)}
                  >
                    Reset Processing State
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}

        {employees.filter(emp => emp.status).length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No active employees found.
          </div>
        )}
      </div>
    </div>
  );
}
