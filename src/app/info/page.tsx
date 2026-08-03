import { redirect } from "next/navigation";

export default function InfoRedirect() {
  redirect("/?section=info");
}
