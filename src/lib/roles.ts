export const ROLES = [
  "backend",
  "frontend",
  "fullstack",
  "mobile",
  "devops",
  "data",
  "qa",
  "design",
  "product",
  "manager",
] as const;

export type Role = (typeof ROLES)[number];

const ROLE_LABELS: Record<string, string> = {
  backend: "Backend",
  frontend: "Frontend",
  fullstack: "Fullstack",
  mobile: "Mobile",
  devops: "DevOps / SRE",
  data: "Data / ML",
  qa: "QA / Testing",
  design: "Design / UX",
  product: "Product",
  manager: "Engineering Manager",
  // legacy values that may still exist in the DB
  developer: "Developer",
};

export function formatRole(value: Role | string): string {
  return ROLE_LABELS[value] ?? value;
}
