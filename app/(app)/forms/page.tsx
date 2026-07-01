import { FORMS, FORM_CATS } from "@/lib/modules";
import FormsLibrary from "@/components/FormsLibrary";

export default function FormsPage() {
  return (
    <>
      <header className="header">
        <h1>Forms & Templates</h1>
        <p>{FORMS.length} controlled forms and appendices, grouped by where they are used in the care journey.</p>
      </header>
      <div className="body">
        <FormsLibrary forms={FORMS} cats={FORM_CATS} />
      </div>
    </>
  );
}
