import { auth } from "@/server/auth";
import { getCompanyMeta } from "@/server/companies/domains";
import { getCurrentCompany } from "@/server/verification";
import { NewSalaryForm } from "./NewSalaryForm";

export default async function NewSalaryPage() {
  const session = await auth();
  let companyName: string | null = null;
  if (session?.profileId) {
    const domain = await getCurrentCompany(session.profileId);
    if (domain) {
      companyName = (await getCompanyMeta(domain)).name;
    }
  }

  return <NewSalaryForm companyName={companyName} />;
}
