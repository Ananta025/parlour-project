"use client";

import { useState, useEffect } from "react";
import { format, parseISO, isValid } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Edit, Trash2, Download, RefreshCcw, Clock } from "lucide-react";
import { socket, connectAuthenticatedSocket } from "@/lib/socket";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  _id?: string;
  name: string;
  email?: string;
}

interface AttendanceDaily {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  dateFormatted: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInTimestamp: string | null;
  checkOutTimestamp: string | null;
  totalHours: number | null;
  logIds: string[];
}

interface EditAttendanceForm {
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
}

export default function DailyAttendancePage() {
  const [attendanceData, setAttendanceData] = useState<AttendanceDaily[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [apiError, setApiError] = useState("");

  // Edit modal state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditAttendanceForm>({
    employeeId: "",
    employeeName: "",
    date: "",
    checkInTime: "",
    checkOutTime: "",
  });

  // Delete confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteItemName, setDeleteItemName] = useState<string>("");
  const [deleteItemDate, setDeleteItemDate] = useState<string>("");

  useEffect(() => {
    // Check user role from localStorage
    const role = localStorage.getItem("userRole");
    setUserRole(role);
    setIsSuperAdmin(role === "super-admin");
    
    // Connect authenticated socket
    connectAuthenticatedSocket();

    // Listen for attendance updates
    socket.on("attendance:daily-update", handleAttendanceUpdate);
    
    // Fetch initial data
    fetchData();

    return () => {
      socket.off("attendance:daily-update");
    };
  }, []);

  // Refetch data when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttendanceData();
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

      // Fetch attendance data
      await fetchAttendanceData();
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

  const fetchAttendanceData = async () => {
    setRefreshing(true);
    setApiError("");
    try {
      // Build query parameters based on filters
      const params = new URLSearchParams();
      
      if (selectedDate) {
        const dateOnly = selectedDate.toISOString().split('T')[0];
        if (new Date(dateOnly) > new Date()) {
          params.append('date', new Date().toISOString().split('T')[0]);
        } else {
          params.append('date', dateOnly);
        }
      }
      
      if (selectedEmployee && selectedEmployee !== 'all') {
        params.append('employeeId', selectedEmployee);
      }
      
      // Fetch aggregated attendance data
      const response = await api.get(`/attendance/daily?${params.toString()}`);
      const fetchedData = response.data.data || [];
      
      setAttendanceData(fetchedData);
    } catch (err: any) {
      console.error("Error fetching attendance data:", err);
      setApiError(
        `Failed to load attendance data: ${err.response?.data?.message || err.message}`
      );
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load attendance data",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleAttendanceUpdate = (data: any) => {
    // Refresh data when receiving update notifications
    fetchAttendanceData();
    
    toast({
      title: "Attendance Updated",
      description: "Attendance records have been updated",
    });
  };

  const handleRefresh = () => {
    fetchAttendanceData();
  };

  const handleEditClick = (item: AttendanceDaily) => {
    // Convert ISO string to local datetime-local format
    const formatDateTimeLocal = (timestamp: string | null) => {
      if (!timestamp) return "";
      
      try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return "";
        
        // Format as YYYY-MM-DDThh:mm
        return new Date(timestamp).toISOString().slice(0, 16);
      } catch (e) {
        console.error("Date formatting error:", e);
        return "";
      }
    };
    
    setEditForm({
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      date: item.date,
      checkInTime: formatDateTimeLocal(item.checkInTimestamp),
      checkOutTime: formatDateTimeLocal(item.checkOutTimestamp),
    });
    
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (item: AttendanceDaily) => {
    setDeleteItemId(item.id);
    setDeleteItemName(item.employeeName);
    setDeleteItemDate(item.dateFormatted);
    setIsDeleteDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editForm.employeeId || !editForm.date) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing required information",
      });
      return;
    }
    
    try {
      // Find the original record ID
      const record = attendanceData.find(
        item => item.employeeId === editForm.employeeId && item.date === editForm.date
      );
      
      if (!record) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Record not found",
        });
        return;
      }
      
      await api.put(`/attendance/${record.id}`, {
        checkInTime: editForm.checkInTime || null,
        checkOutTime: editForm.checkOutTime || null,
      });
      
      toast({
        title: "Success",
        description: "Attendance record updated successfully",
      });
      
      setIsEditDialogOpen(false);
      fetchAttendanceData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.message || "Failed to update attendance record",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItemId) return;
    
    try {
      await api.delete(`/attendance/${deleteItemId}`);
      
      toast({
        title: "Success",
        description: "Attendance record deleted successfully",
      });
      
      setIsDeleteDialogOpen(false);
      fetchAttendanceData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.message || "Failed to delete attendance record",
      });
    }
  };

  const exportToCsv = () => {
    if (!attendanceData.length) {
      toast({
        title: "Export Failed",
        description: "No data available to export",
      });
      return;
    }
    
    // Create CSV content
    const headers = "Employee Name,Date,Check In,Check Out,Total Hours\n";
    const rows = attendanceData.map(item => {
      return `"${item.employeeName}","${item.dateFormatted}","${item.checkInTime || ''}","${item.checkOutTime || ''}","${item.totalHours || ''}"`
    }).join("\n");
    
    const csvContent = `${headers}${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Create download link
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <Clock className="mr-2" />
              Daily Attendance Summary
            </span>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToCsv}
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            View daily attendance records by employee with check-in and check-out times
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
            
            {/* Date filter - Enhanced version */}
            <div className="grid gap-2 w-[200px]">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    disabled={(date) => date > new Date()} // Disable future dates
                    footer={
                      <div className="p-3 border-t border-border">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedDate(new Date())}
                          className="w-full justify-center text-center"
                        >
                          Today
                        </Button>
                      </div>
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Error message if API fails */}
          {apiError && (
            <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-4">
              {apiError}
            </div>
          )}
          
          {/* Attendance table */}
          <Table>
            <TableCaption>Daily attendance summary</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Employee</TableHead>
                <TableHead className="w-[180px]">Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead className="text-right">Total Hours</TableHead>
                {isSuperAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceData.length > 0 ? (
                attendanceData.map((item) => (
                  <TableRow key={`${item.employeeId}-${item.date}`}>
                    <TableCell className="font-medium">
                      {item.employeeName}
                    </TableCell>
                    <TableCell>
                      {item.dateFormatted}
                    </TableCell>
                    <TableCell className={cn(
                      // Highlight late check-ins (after 9:30 AM) in red
                      item.checkInTime && 
                      new Date(`${item.date}T${item.checkInTime}`).getHours() >= 9 &&
                      new Date(`${item.date}T${item.checkInTime}`).getMinutes() >= 30
                        ? "text-destructive"
                        : ""
                    )}>
                      {item.checkInTime || "-"}
                    </TableCell>
                    <TableCell className={cn(
                      // Highlight early check-outs (before 5:00 PM) in amber
                      item.checkOutTime && 
                      new Date(`${item.date}T${item.checkOutTime}`).getHours() < 17
                        ? "text-amber-600"
                        : ""
                    )}>
                      {item.checkOutTime || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.totalHours !== null ? `${item.totalHours.toFixed(2)} hrs` : "-"}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditClick(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => handleDeleteClick(item)}
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
                  <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    No attendance records found for the selected filters
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
              Update check-in and check-out times for {editForm.employeeName} on {editForm.date}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="checkInTime">Check In Time</Label>
              <Input
                id="checkInTime"
                type="datetime-local"
                value={editForm.checkInTime}
                onChange={(e) => setEditForm({ ...editForm, checkInTime: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkOutTime">Check Out Time</Label>
              <Input
                id="checkOutTime"
                type="datetime-local"
                value={editForm.checkOutTime}
                onChange={(e) => setEditForm({ ...editForm, checkOutTime: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the attendance record for {deleteItemName} on {deleteItemDate}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
