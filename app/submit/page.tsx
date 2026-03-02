import { getMyClasses, getStudentsByClass, getViolationTypes } from "@/features/violations/queries";
import ViolationForm from "@/features/violations/components/ViolationForm";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const [classes, violationTypes] = await Promise.all([
    getMyClasses(),
    getViolationTypes(),
  ]);

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50 p-8">
      <ViolationForm
        classes={classes}
        violationTypes={violationTypes}
        onStudentsFetch={getStudentsByClass}
      />
    </div>
  );
}
