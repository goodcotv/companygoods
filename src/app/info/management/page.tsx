import { redirect } from "next/navigation";

export default function InfoManagementRedirect() {
  redirect("/?section=info&sub=management");
}
