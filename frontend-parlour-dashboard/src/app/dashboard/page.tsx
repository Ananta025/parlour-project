import { redirect } from "next/navigation";

export default function DashboardPage() {
  // Redirect to the employees page
  redirect("/dashboard/employees");

  // This won't be rendered due to the redirect
  return null;
}
