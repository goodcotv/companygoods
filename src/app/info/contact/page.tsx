import { redirect } from "next/navigation";

export default function InfoContactRedirect() {
  redirect("/?section=info&sub=contact");
}
