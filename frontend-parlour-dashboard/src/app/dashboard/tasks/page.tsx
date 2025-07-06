"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Plus,
  RefreshCcw,
  CircleCheck,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Employee {
  id: string;
  _id?: string;
  name: string;
  email?: string;
}

interface Task {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  assignedTo: string;
  dueDate: string;
  status: string;
  createdAt?: string;
  employee?: {
    id: string;
    name: string;
  };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // Add this state for user role
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: new Date().toISOString().split('T')[0],
  });
  const [formErrors, setFormErrors] = useState({
    title: false,
    assignedTo: false,
    dueDate: false,
  });
  
  // Replace the try-catch approach with localStorage
  useEffect(() => {
    // Get user role from localStorage
    const role = localStorage.getItem("userRole");
    setUserRole(role);
    
    fetchEmployees();
    fetchTasks();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/employees");
      const employeesList = response.data.data || [];
      setEmployees(employeesList.map((emp: { id?: string; _id?: string; name: string }) => ({
        id: emp.id || emp._id || "",
        name: emp.name,
      })));
    } catch (err) {
      console.error("Error fetching employees:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load employees data",
      });
    }
  };

  const fetchTasks = async () => {
    setRefreshing(true);
    try {
      const response = await api.get("/tasks");
      const fetchedTasks = response.data.data || [];
      setTasks(fetchedTasks);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load tasks",
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchTasks();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleEmployeeSelect = (value: string) => {
    setFormData(prev => ({ ...prev, assignedTo: value }));
    if (formErrors.assignedTo) {
      setFormErrors(prev => ({ ...prev, assignedTo: false }));
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    setFormData(prev => ({ ...prev, dueDate: dateString }));
    if (formErrors.dueDate) {
      setFormErrors(prev => ({ ...prev, dueDate: false }));
    }
  };

  const validateForm = () => {
    const errors = {
      title: !formData.title.trim(),
      assignedTo: !formData.assignedTo,
      dueDate: !formData.dueDate,
    };
    
    setFormErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assignedTo: "",
      dueDate: new Date().toISOString().split('T')[0],
    });
    setFormErrors({
      title: false,
      assignedTo: false,
      dueDate: false,
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
      };
      
      await api.post("/tasks", payload);
      
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      
      setShowModal(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      console.error("Error creating task:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create task",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (task: Task) => {
    // Convert the date string to a proper format for the date input
    const formattedDate = task.dueDate ? 
      new Date(task.dueDate).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0];
    
    setFormData({
      title: task.title,
      description: task.description || "",
      assignedTo: task.assignedTo,
      dueDate: formattedDate, // Store as string, not Date object
    });
    
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleUpdateTask = async () => {
    if (!validateForm() || !selectedTask) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    setSubmitting(true);
    try {
      const taskId = selectedTask.id || selectedTask._id;
      const payload = {
        ...formData,
      };
      
      await api.put(`/tasks/${taskId}`, payload);
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      
      setShowEditModal(false);
      setSelectedTask(null);
      resetForm();
      fetchTasks();
    } catch (err) {
      console.error("Error updating task:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (task: Task) => {
    setSelectedTask(task);
    setShowDeleteModal(true);
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    
    setSubmitting(true);
    try {
      const taskId = selectedTask.id || selectedTask._id;
      await api.delete(`/tasks/${taskId}`);
      
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      
      setShowDeleteModal(false);
      setSelectedTask(null);
      
      // Update state without refetching
      setTasks(tasks.filter(t => (t.id || t._id) !== (selectedTask.id || selectedTask._id)));
    } catch (err) {
      console.error("Error deleting task:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete task",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      
      // Update the status locally without refetching all tasks
      setTasks(prevTasks => prevTasks.map(task => 
        (task.id === taskId || task._id === taskId)
          ? { ...task, status: newStatus }
          : task
      ));
      
      toast({
        title: "Status Updated",
        description: `Task status changed to ${newStatus}`,
      });
    } catch (err) {
      console.error("Error updating status:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task status",
      });
    }
  };

  const getEmployeeName = (employeeId: string): string => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.name || "Unknown Employee";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
            <Clock className="mr-1 h-3 w-3" /> Pending
          </span>
        );
      case 'in-progress':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            <RefreshCcw className="mr-1 h-3 w-3" /> In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            <CircleCheck className="mr-1 h-3 w-3" /> Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
            <AlertCircle className="mr-1 h-3 w-3" /> {status}
          </span>
        );
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                Tasks Management
              </CardTitle>
              <CardDescription>
                View and manage employee tasks
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
              
              {userRole === "super-admin" && (
                <Dialog open={showModal} onOpenChange={setShowModal}>
                  <DialogTrigger asChild>
                    <Button variant="default">
                      <Plus className="mr-2 h-4 w-4" /> Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Create New Task</DialogTitle>
                      <DialogDescription>
                        Assign a new task to an employee. Fill in the required details below.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title" className={formErrors.title ? "text-destructive" : ""}>
                          Task Title *
                        </Label>
                        <Input
                          id="title"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          className={formErrors.title ? "border-destructive" : ""}
                          placeholder="Enter task title"
                        />
                        {formErrors.title && (
                          <p className="text-sm text-destructive">Title is required</p>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="description">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Enter task description"
                          rows={3}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="assignedTo" className={formErrors.assignedTo ? "text-destructive" : ""}>
                          Assign To *
                        </Label>
                        <Select 
                          value={formData.assignedTo} 
                          onValueChange={handleEmployeeSelect}
                        >
                          <SelectTrigger className={formErrors.assignedTo ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Employees</SelectLabel>
                              {employees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {formErrors.assignedTo && (
                          <p className="text-sm text-destructive">Please select an employee</p>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="dueDate" className={formErrors.dueDate ? "text-destructive" : ""}>
                          Due Date *
                        </Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={formData.dueDate} // Just use the string directly
                          onChange={handleDateChange}
                          className={cn(formErrors.dueDate && "border-destructive")}
                          required
                        />
                        {formErrors.dueDate && (
                          <p className="text-sm text-destructive">Due date is required</p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowModal(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                          </>
                        ) : (
                          "Create Task"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Tasks table */}
          <Table>
            <TableCaption>A list of all tasks</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <TableRow key={task.id || task._id}>
                    <TableCell className="font-medium">
                      {task.title}
                    </TableCell>
                    <TableCell>
                      {task.employee?.name || getEmployeeName(task.assignedTo)}
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        (() => {
                          try {
                            // Use parseISO for more reliable date parsing
                            return format(parseISO(task.dueDate), 'MMM dd, yyyy');
                          } catch (error) {
                            // Fallback for invalid dates
                            console.error("Invalid date format:", task.dueDate, error);
                            return "Invalid date";
                          }
                        })()
                      ) : "No due date"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 p-0">
                            {getStatusBadge(task.status)}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleStatusUpdate(task.id || task._id || "", "pending")}
                          >
                            <Clock className="mr-2 h-4 w-4 text-yellow-600" /> Mark as Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusUpdate(task.id || task._id || "", "in-progress")}
                          >
                            <RefreshCcw className="mr-2 h-4 w-4 text-blue-600" /> Mark as In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusUpdate(task.id || task._id || "", "completed")}
                          >
                            <CircleCheck className="mr-2 h-4 w-4 text-green-600" /> Mark as Completed
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {userRole === "super-admin" && (
                          <>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleEditClick(task)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-red-500 hover:bg-red-50"
                              onClick={() => handleDeleteClick(task)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No tasks found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Task Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title" className={formErrors.title ? "text-destructive" : ""}>
                Task Title *
              </Label>
              <Input
                id="edit-title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={formErrors.title ? "border-destructive" : ""}
                placeholder="Enter task title"
              />
              {formErrors.title && (
                <p className="text-sm text-destructive">Title is required</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">
                Description
              </Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter task description"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-assignedTo" className={formErrors.assignedTo ? "text-destructive" : ""}>
                Assign To *
              </Label>
              <Select 
                value={formData.assignedTo} 
                onValueChange={handleEmployeeSelect}
              >
                <SelectTrigger className={formErrors.assignedTo ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Employees</SelectLabel>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {formErrors.assignedTo && (
                <p className="text-sm text-destructive">Please select an employee</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-dueDate" className={formErrors.dueDate ? "text-destructive" : ""}>
                Due Date *
              </Label>
              <Input
                id="edit-dueDate"
                type="date"
                value={formData.dueDate} // Just use the string directly
                onChange={handleDateChange}
                className={cn(formErrors.dueDate && "border-destructive")}
                required
              />
              {formErrors.dueDate && (
                <p className="text-sm text-destructive">Due date is required</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTask} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                </>
              ) : (
                "Update Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedTask && (
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium">{selectedTask.title}</p>
                <p className="text-sm text-muted-foreground">
                  Assigned to: {selectedTask.employee?.name || getEmployeeName(selectedTask.assignedTo)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}