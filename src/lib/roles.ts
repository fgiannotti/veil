export const ROLES = [
  "developer",
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

const ROLE_LABELS: Record<Role, string> = {
  developer: "Developer",
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
};

export function formatRole(value: Role | string): string {
  return ROLE_LABELS[value as Role] ?? value;
}
