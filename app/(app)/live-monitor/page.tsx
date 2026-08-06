import { redirect } from "next/navigation";

// Live monitor and the check-in monitor were merged into one "Live calls" view.
export default function LiveMonitorPage() {
  redirect("/ecm");
}
