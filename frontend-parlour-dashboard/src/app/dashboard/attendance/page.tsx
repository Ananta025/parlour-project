"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw, UserCheck, CheckCircle2, XCircle, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { socket, connectAuthenticatedSocket } from "@/lib/socket";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Define the type mapping for attendance log actions/types
const typeLabelMap: Record<string, string> = {
  "in": "Check In",
  "out": "Check Out",
  "check-in": "Check In",
  "check-out": "Check Out",
  "checkin": "Check In",
  "checkout": "Check Out"
};

interface Employee {
  id: string;
  _id?: string;
  name: string;
  email?: string;
}

interface AttendanceLog {
  id?: string;
  _id?: string;
  employeeId: string;
  action: "in" | "out";
  timestamp: string;
  dateOnly: string;
  employee?: Employee; // For joined data
  createdAt?: string;
  updatedAt?: string;
}

interface EditAttendanceForm {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;
  type: string;
}

export default function AttendanceDashboardPage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Edit and delete state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditAttendanceForm>({
    id: "",
    employeeId: "",
    employeeName: "",
    timestamp: "",
    type: ""
  });
  const [deleteLogId, setDeleteLogId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Connect socket with auth
    connectAuthenticatedSocket();

    // Listen for real-time attendance updates
    socket.on("attendance:update", handleAttendanceUpdate);

    // Check user role
    const role = localStorage.getItem("userRole");
    setUserRole(role);
    setIsSuperAdmin(role === "super-admin");

    // Fetch initial data
    fetchData();

    return () => {
      socket.off("attendance:update");
    };
  }, []);

  // Refetch when filters change, but with better error handling
  useEffect(() => {
    // Add a small delay to prevent rapid consecutive requests
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [selectedDate, selectedEmployee]);

  const fetchData = async () => {
    setLoading(true);
    setApiError("");
    try {
      // Fetch employees for the filter dropdown
      const empResponse = await api.get("/employees");
      const employeesList = empResponse.data.data || [];
      setEmployees(employeesList.map((emp: any) => ({
        id: emp.id || emp._id,
        name: emp.name,
      })));

      // Fetch logs
      await fetchLogs();
    } catch (err) {
      console.error("Error fetching data:", err);
      setApiError("Failed to load employee data. Please try again later.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load attendance data",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setRefreshing(true);
    setApiError("");
    try {
      // Build query parameters based on filters
      const params = new URLSearchParams();
      
      if (selectedDate) {
        const dateOnly = selectedDate.toISOString().split('T')[0];
        // Use today's date as fallback if we get errors with future dates
        if (new Date(dateOnly) > new Date()) {
          toast({
            title: "Information",
            description: "Showing today's data instead of future date",
          });
          params.append('dateOnly', new Date().toISOString().split('T')[0]);
        } else {
          params.append('dateOnly', dateOnly);
        }
      }
      
      if (selectedEmployee && selectedEmployee !== 'all') {
        params.append('employeeId', selectedEmployee);
      }
      
      // Fetch logs with filters
      const response = await api.get(`/attendance?${params.toString()}`);
      const fetchedLogs = response.data.data || [];
      
      // Sort logs by timestamp (newest first)
      const sortedLogs = [...fetchedLogs].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setLogs(sortedLogs);
    } catch (err: any) {
      console.error("Error fetching logs:", err);
      setApiError(
        `Failed to load attendance logs: ${err.response?.data?.message || err.message}`
      );
      
      // Set empty logs array to prevent showing stale data
      setLogs([]);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load attendance logs. Using cached data if available.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleAttendanceUpdate = (newLog: AttendanceLog) => {
    // Check if this log matches our current filters
    let shouldAdd = true;
    
    if (selectedDate) {
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      if (newLog.dateOnly !== selectedDateStr) {
        shouldAdd = false;
      }
    }
    
    if (selectedEmployee !== 'all' && newLog.employeeId !== selectedEmployee) {
      shouldAdd = false;
    }
    
    if (shouldAdd) {
      // Find employee data
      const employee = employees.find(e => e.id === newLog.employeeId);
      
      // Add the log to the beginning of the list
      setLogs(prev => [
        { 
          ...newLog, 
          employee 
        },
        ...prev.filter(log => 
          // Remove any potential duplicate (same employee and timestamp)
          !(log.employeeId === newLog.employeeId && 
            Math.abs(new Date(log.timestamp).getTime() - new Date(newLog.timestamp).getTime()) < 1000)
        )
      ]);
      
      toast({
        title: "Attendance Updated",
        description: `${employee?.name || 'Employee'} punched ${newLog.action}`,
      });
    }
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const getEmployeeName = (employeeId: string): string => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.name || "Unknown Employee";
  };

  // Add date state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Add useEffect to fetch attendance data when date changes
  useEffect(() => {
    if (date) {
      fetchAttendanceData(date);
    }
  }, [date]);

  // Function to fetch attendance data
  const fetchAttendanceData = async (date: string) => {
    setLoading(true);
    setApiError("");
    try {
      // Build query parameters based on filters
      const params = new URLSearchParams();
      
      if (date) {
        params.append('dateOnly', date);
      }
      
      if (selectedEmployee && selectedEmployee !== 'all') {
        params.append('employeeId', selectedEmployee);
      }
      
      // Fetch logs with filters
      const response = await api.get(`/attendance?${params.toString()}`);
      const fetchedLogs = response.data.data || [];
      
      // Sort logs by timestamp (newest first)
      const sortedLogs = [...fetchedLogs].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setLogs(sortedLogs);
    } catch (err: any) {
      console.error("Error fetching logs:", err);
      setApiError(
        `Failed to load attendance logs: ${err.response?.data?.message || err.message}`
      );
      
      // Set empty logs array to prevent showing stale data
      setLogs([]);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load attendance logs. Using cached data if available.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle edit button click
  const handleEditClick = (log: AttendanceLog) => {
    setEditForm({
      id: log.id || log._id || "",
      employeeId: log.employeeId,
      employeeName: log.employee?.name || getEmployeeName(log.employeeId),
      timestamp: new Date(log.timestamp).toISOString().slice(0, 16), // Format for datetime-local input
      type: log.type || (log.action === "in" ? "check-in" : "check-out")
    });
    setIsEditDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (log: AttendanceLog) => {
    setDeleteLogId(log.id || log._id || "");
    setIsDeleteDialogOpen(true);
  };

  // Handle edit submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editForm.id || !editForm.timestamp) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing required fields",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await api.put(`/attendance/${editForm.id}`, {
        timestamp: new Date(editForm.timestamp).toISOString(),
        type: editForm.type
      });
      
      toast({
        title: "Success",
        description: "Attendance record updated successfully",
      });
      
      setIsEditDialogOpen(false);
      fetchLogs(); // Refresh logs
    } catch (err: any) {
      console.error("Error updating attendance record:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.message || "Failed to update attendance record",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteLogId) return;
    
    setIsSubmitting(true);
    
    try {
      await api.delete(`/attendance/${deleteLogId}`);
      
      toast({
        title: "Success",
        description: "Attendance record deleted successfully",
      });
      
      setIsDeleteDialogOpen(false);
      
      // Update local state to remove the deleted log
      setLogs(logs.filter(log => (log.id || log._id) !== deleteLogId));
    } catch (err: any) {
      console.error("Error deleting attendance record:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.message || "Failed to delete attendance record",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render loading skeletons
  if (loading) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-6">
              <div className="flex gap-4">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <UserCheck className="mr-2" />
              Attendance Logs
            </span>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </CardTitle>
          <CardDescription>
            View and filter attendance records by employee and date
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Employee filter */}
            <Select
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Employees</SelectLabel>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            
            {/* Date picker replacing calendar component */}
            <div className="flex items-center gap-2">
              <Label htmlFor="date">Select Date:</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
          </div>
          
          {/* Error message if API fails */}
          {apiError && (
            <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-4">
              {apiError}
            </div>
          )}
          
          {/* Attendance logs table */}
          <Table>
            <TableCaption>A list of all attendance logs</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Date</TableHead>
                {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id || log._id}>
                    <TableCell className="font-medium">
                      {log.employee?.name || getEmployeeName(log.employeeId)}
                    </TableCell>
                    <TableCell>
                      {log.type === "check-in" || log.type === "in" ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> 
                          {typeLabelMap[log.type?.toLowerCase()] || "Check In"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          <XCircle className="mr-1 h-3 w-3" /> 
                          {typeLabelMap[log.type?.toLowerCase()] || "Check Out"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.time || format(new Date(log.timestamp), 'h:mm a')}
                    </TableCell>
                    <TableCell>
                      {log.date || format(new Date(log.timestamp), 'MMM dd, yyyy')}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditClick(log)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => handleDeleteClick(log)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">
                    {apiError ? "No data available due to an error" : "No attendance logs found for the selected filters"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              Update attendance record for {editForm.employeeName}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="timestamp" className="text-right">
                  Timestamp
                </Label>
                <Input
                  id="timestamp"
                  type="datetime-local"
                  value={editForm.timestamp}
                  onChange={(e) => setEditForm({ ...editForm, timestamp: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                <Select
                  value={editForm.type}
                  onValueChange={(value) => setEditForm({ ...editForm, type: value })}
                >
                  <SelectTrigger id="type" className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check-in">Check In</SelectItem>
                    <SelectItem value="check-out">Check Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this attendance record.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}