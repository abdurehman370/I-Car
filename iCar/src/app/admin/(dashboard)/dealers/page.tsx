import { redirect } from "next/navigation";

export default function AdminDealersRedirectPage() {
  redirect("/admin/users");
}
