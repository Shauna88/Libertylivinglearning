import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listClients, coverMap, listCarers } from "@/lib/db";
import { carerWeek } from "@/lib/schedule";
import { carerAvailability } from "@/lib/carers";
import CarerWeek from "@/components/CarerWeek";

export default async function MyWeekPage() {
  const session = await auth();
  const role = session!.user.role;
  // The working-week view is for front-line carers; office roles use the roster.
  if (role !== "Healthcare Assistant") redirect("/dashboard");

  const carerName = session!.user.name ?? "";
  const [clients, cover, carers] = await Promise.all([listClients(), coverMap(), listCarers()]);
  const week = carerWeek(clients, carerName, cover);
  const me = carers.find((c) => c.name === carerName);
  const availability = me ? carerAvailability(me) : {};

  return (
    <>
      <header className="header">
        <h1>My working week</h1>
        <p>
          Your Schedule of Service for the week, {carerName}. Calls marked <strong>cover</strong> are yours for this
          week only. Client names are masked here — full details are in your carer app.
        </p>
      </header>
      <div className="body fade">
        <CarerWeek week={week} availability={availability} />
      </div>
    </>
  );
}
