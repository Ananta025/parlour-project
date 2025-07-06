"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import api from "@/lib/api";

// Update the Employee interface to support both id and _id
interface Employee {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  mobile: string;
  position: string;
  joinDate: string;
  status: boolean;
  role: string; // Make this required
}

// Initial state for a new employee form with all fields defined
const initialEmployeeState = {
  name: "",
  email: "",
  mobile: "",
  position: "",
  joinDate: new Date().toISOString().split('T')[0],
  status: true,
  password: "",
  role: "admin",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Form states
  const [newEmployee, setNewEmployee] = useState(initialEmployeeState);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  
  // Toast notifications
  const { toast } = useToast();

  // Filter employees based on search term with proper null checks and mobile search
  const filteredEmployees = employees.filter(employee => {
    const name = (employee.name || "").toLowerCase();
    const email = (employee.email || "").toLowerCase();
    const position = (employee.position || "").toLowerCase();
    const mobile = (employee.mobile || "").toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return (
      name.includes(searchLower) ||
      email.includes(searchLower) ||
      position.includes(searchLower) ||
      mobile.includes(searchLower)
    );
  });
  
  // Load user role and fetch employees on component mount
  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
    fetchEmployees();
  }, []);

  // Function to fetch employees
  const fetchEmployees = async () => {
    setLoading(true);
    setError("");
    
    try {
      const response = await api.get('/employees');
      
      // Handle different response structures
      if (response.data) {
        let employeeData = Array.isArray(response.data.data) 
          ? response.data.data 
          : Array.isArray(response.data) 
            ? response.data 
            : [];
        
        // Map MongoDB _id to id if needed
        employeeData = employeeData.map(emp => ({
          ...emp,
          id: emp.id || emp._id // Use id if it exists, otherwise use _id
        }));
        
        setEmployees(employeeData);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Error loading employees. Please try again.");
      console.error(err);
      
      toast({
        title: "Error",
        description: "Failed to load employees. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Format the data for the API
      const employeeData = {
        ...newEmployee,
        // Ensure status is boolean
        status: Boolean(newEmployee.status)
      };
      
      console.log("Sending employee data:", employeeData);
      const response = await api.post('/employees', employeeData);
      console.log("API response:", response.data);
      
      toast({
        title: "Success",
        description: "Employee added successfully!",
      });
      
      setAddDialogOpen(false);
      setNewEmployee(initialEmployeeState);
      fetchEmployees();
    } catch (err: any) {
      console.error("API error details:", err.response?.data); // Log detailed error
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to add employee. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updating an employee
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    
    setIsSubmitting(true);
    
    try {
      const { id, _id, ...employeeData } = editingEmployee;
      // Use the appropriate ID and ensure data is formatted correctly
      const employeeId = id || _id;
      
      await api.put(`/employees/${employeeId}`, {
        ...employeeData,
        // Ensure status is boolean
        status: Boolean(employeeData.status)
      });
      
      toast({
        title: "Success",
        description: "Employee updated successfully!",
      });
      
      setEditDialogOpen(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update employee. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting an employee
  const handleDeleteEmployee = async () => {
    if (!deletingEmployeeId) return;
    
    setIsSubmitting(true);
    
    try {
      await api.delete(`/employees/${deletingEmployeeId}`);
      
      toast({
        title: "Success",
        description: "Employee deleted successfully!",
      });
      
      setDeleteDialogOpen(false);
      setDeletingEmployeeId(null);
      
      // Update local state without refetching
      setEmployees(employees.filter(emp => emp.id !== deletingEmployeeId));
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete employee. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit dialog with employee data
  const openEditDialog = (employee: Employee) => {
    // Ensure date is properly formatted
    const formattedEmployee = {
      ...employee,
      joinDate: employee.joinDate ? 
        new Date(employee.joinDate).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0]
    };
    
    setEditingEmployee(formattedEmployee);
    setEditDialogOpen(true);
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (id: string) => {
    setDeletingEmployeeId(id);
    setDeleteDialogOpen(true);
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Employees</CardTitle>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search employees..."
              className="pl-8 w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {userRole === "super-admin" && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Table>
          <TableCaption>List of all employees</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Status</TableHead>
              {userRole === "super-admin" && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={userRole === "super-admin" ? 6 : 5} className="text-center py-10">
                  {searchTerm ? (
                    <div className="text-muted-foreground">
                      No employees match your search. Try another keyword.
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">No employees found</p>
                      {userRole === "super-admin" && (
                        <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add your first employee
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id || employee._id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{new Date(employee.joinDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      employee.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.status ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  
                  {userRole === "super-admin" && (
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => openEditDialog(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-500 hover:bg-red-50"
                        onClick={() => openDeleteDialog(employee.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Add Employee Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Fill in the employee details below to create a new record.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddEmployee}>
            <div className="grid gap-4 py-4">
              {/* Name field */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              
              {/* Email field */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              
              {/* Mobile field */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="mobile" className="text-right">
                  Mobile
                </Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={newEmployee.mobile}
                  onChange={(e) => setNewEmployee({ ...newEmployee, mobile: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              
              {/* Position field */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="position" className="text-right">
                  Position
                </Label>
                <Input
                  id="position"
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              
              {/* Join Date field */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="joinDate" className="text-right">
                  Join Date
                </Label>
                <Input
                  id="joinDate"
                  type="date"
                  value={newEmployee.joinDate}
                  onChange={(e) => setNewEmployee({ ...newEmployee, joinDate: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              
              {/* Status field */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select 
                  value={newEmployee.status ? "true" : "false"} 
                  onValueChange={(value) => setNewEmployee({ 
                    ...newEmployee, 
                    status: value === "true" 
                  })}
                >
                  <SelectTrigger id="status" className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Password field */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              
              {/* Role field */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select 
                  value={newEmployee.role} 
                  onValueChange={(value) => setNewEmployee({ ...newEmployee, role: value })}
                >
                  <SelectTrigger id="role" className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                  </>
                ) : (
                  "Add Employee"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update the employee details below.
            </DialogDescription>
          </DialogHeader>
          
          {editingEmployee && (
            <form onSubmit={handleUpdateEmployee}>
              <div className="grid gap-4 py-4">
                {/* Name field */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="edit-name"
                    value={editingEmployee.name}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                
                {/* Email field */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingEmployee.email}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                
                {/* Mobile field */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-mobile" className="text-right">
                    Mobile
                  </Label>
                  <Input
                    id="edit-mobile"
                    type="tel"
                    value={editingEmployee.mobile || ""}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, mobile: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                
                {/* Position field */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-position" className="text-right">
                    Position
                  </Label>
                  <Input
                    id="edit-position"
                    value={editingEmployee.position || ""}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, position: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                
                {/* Join Date field */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-joinDate" className="text-right">
                    Join Date
                  </Label>
                  <Input
                    id="edit-joinDate"
                    type="date"
                    value={editingEmployee.joinDate || ""}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, joinDate: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                
                {/* Status field */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-status" className="text-right">
                    Status
                  </Label>
                  <Select 
                    value={editingEmployee.status ? "true" : "false"} 
                    onValueChange={(value) => setEditingEmployee({ 
                      ...editingEmployee, 
                      status: value === "true" 
                    })}
                  >
                    <SelectTrigger id="edit-status" className="col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                    </>
                  ) : (
                    "Update Employee"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteEmployee}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

